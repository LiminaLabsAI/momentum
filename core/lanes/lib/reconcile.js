'use strict';

/**
 * `momentum lanes reconcile` — sweep lanes whose terminal merge happened
 * OUT-OF-BAND (Phase 27 G3, BUG-026). For the `end_state`s where a human or the
 * forge performs the terminal merge (`staging-promotion` after promotion,
 * `feature-branch-only`, `open-pr`), the agent never auto-cleans at land time;
 * this command detects lanes now contained in the terminal branch upstream and
 * runs the same default-branch-safe `cleanupTarget()` on them.
 *
 * Validate-first: without --execute it only reports which lanes are landed
 * (cleanable) vs still pending. `git fetch --prune` runs first (unless
 * --no-fetch) so containment is judged against the freshest `origin/<terminal>`.
 *
 * Verify-before-clean (Rule 12): a lane is cleaned ONLY when its branch is a
 * verified ancestor of the terminal branch — a human's "yes, I merged it" is
 * never taken on trust.
 */

const path = require('path');
const { spawnSync } = require('child_process');

const state = require('./state');
const cleanup = require('./cleanup');
const config = require('../../config');

function git(cwd, ...args) {
  return spawnSync('git', args, { cwd, encoding: 'utf8' });
}
function ok(res) { return res && res.status === 0; }

function terminalBranch(repoRoot) {
  try {
    const cfg = config.readConfig(path.join(repoRoot, 'specs'));
    const bf = cfg && cfg.branch_flow;
    if (Array.isArray(bf) && bf.length) return bf[bf.length - 1];
  } catch { /* config absent — default below */ }
  return 'main';
}

/** The best ref to test containment against: origin/<terminal> if present, else local. */
function containerRef(cwd, terminal) {
  if (ok(git(cwd, 'rev-parse', '--verify', '--quiet', `refs/remotes/origin/${terminal}`))) {
    return `origin/${terminal}`;
  }
  return terminal;
}

function parseFlags(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--execute' || a === '--json' || a === '--no-fetch' || a === '--force') flags[a.slice(2)] = true;
    else if (a.startsWith('--')) flags[a.slice(2)] = argv[++i];
    else positional.push(a);
  }
  return { flags, positional };
}

/**
 * Classify a lane: landed (branch contained in the terminal ref, or already
 * gone) vs pending (still not merged). Returns { lane, verdict, reason }.
 */
function classify(cwd, lane, container) {
  const local = cleanup.localBranchExists(cwd, lane.branch);
  const remote = cleanup.remoteBranchExists(cwd, lane.branch);
  if (!local && !remote) {
    // Branch already deleted everywhere — only residual worktree/state remains.
    return { lane, verdict: 'landed', reason: `branch '${lane.branch}' already gone — residual state only` };
  }
  const ref = local ? lane.branch : `origin/${lane.branch}`;
  if (cleanup.isMerged(cwd, ref, container)) {
    return { lane, verdict: 'landed', reason: `'${lane.branch}' is contained in '${container}'` };
  }
  return { lane, verdict: 'pending', reason: `'${lane.branch}' not yet contained in '${container}'` };
}

function cmdReconcile(cwd, argv) {
  const { flags } = parseFlags(argv);
  const anchor = state.resolveAnchor(cwd);
  if (!anchor) { console.error('✗ not inside a git repository'); return 1; }
  const repoRoot = state.worktreeRoot(cwd);
  const terminal = flags.into || terminalBranch(repoRoot);

  if (!flags['no-fetch']) git(cwd, 'fetch', '--prune'); // best-effort; offline is fine
  const container = containerRef(cwd, terminal);

  // Sweep every non-cleaned, non-closed lane.
  const lanes = state.listLanes(anchor).filter((l) => !l.cleaned && l.status !== 'closed');
  const classified = lanes.map((l) => classify(cwd, l, container));
  const landed = classified.filter((c) => c.verdict === 'landed');
  const pending = classified.filter((c) => c.verdict === 'pending');

  if (flags.json && !flags.execute) {
    console.log(JSON.stringify({ terminal, container, landed, pending }, null, 2));
    return 0;
  }

  console.log(`reconcile against '${container}' (terminal branch '${terminal}'):`);
  if (!classified.length) console.log('  ℹ no open/landed lanes to reconcile');
  for (const c of pending) console.log(`  · pending: ${c.lane.id} — ${c.reason}`);
  for (const c of landed) console.log(`  ✓ landed:  ${c.lane.id} — ${c.reason}`);

  if (!flags.execute) {
    if (landed.length) {
      console.log(`✓ ${landed.length} lane(s) cleanable — run with --execute to clean worktree + branch + state`);
    } else {
      console.log('✓ nothing to clean');
    }
    return 0;
  }

  let failures = 0;
  for (const { lane } of landed) {
    console.log(`cleaning '${lane.id}'…`);
    const res = cleanup.cleanupTarget({
      cwd, branch: lane.branch, worktree: lane.worktree, laneId: lane.id,
      deleteRemote: true, force: Boolean(flags.force),
    });
    const glyph = { removed: '✓', deleted: '✓', cleared: '✓', skipped: 'ℹ', blocked: '⚠' };
    for (const a of res.actions) console.log(`  ${glyph[a.status] || '·'} ${a.step}: ${a.detail}`);
    if (!res.ok) { failures++; console.log(`  ⚠ '${lane.id}' cleanup incomplete: ${res.blocked.join(', ')}`); }
  }
  console.log(`✓ reconcile complete — cleaned ${landed.length - failures}/${landed.length} landed lane(s); ${pending.length} still pending`);
  return failures ? 1 : 0;
}

module.exports = { cmdReconcile, classify, terminalBranch };
