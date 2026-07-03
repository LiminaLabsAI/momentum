'use strict';

/**
 * `momentum lanes land` — merge queue with graded evidence gates
 * (Phase 21b G5, FEAT-027 — see ADR-0002 §4).
 *
 * Validate-first: without --execute the command only reports the
 * checklist. Checks, in order:
 *   1. lane exists and is marked `done`
 *   2. turn — FIFO by doneAt among done lanes (--force overrides, loudly)
 *   3. freshness — the integration ref must be an ancestor of the lane
 *      branch (the lane already rebased/merged it); never forceable
 *   4. graded evidence gate (Rule 14 → Rule 12 lineage):
 *        spike      → none
 *        quick-task → specs/adhoc/<lane-id>/record.md exists
 *        phase      → specs/phases/<planNode.ref>/retrospective.md has a
 *                     non-empty "## Verification Evidence" section
 *   5. touch-overlap re-warning (advisory)
 *
 * Gate evidence is read from the LANE BRANCH first (`git show
 * <branch>:<path>` — a record committed on the lane arrives WITH the
 * merge, so the invoking worktree can't see it beforehand; ENH-048),
 * falling back to the invoking worktree's filesystem for the 21b G5
 * pattern of uncommitted records.
 *
 * --execute merges (--no-ff) into the CURRENT branch (which must equal
 * --into when given), marks the lane `landed`, and drops an advisory
 * `message` signal into every other open lane's inbox. It never pushes —
 * protected-branch pushes stay behind the Phase-19 hooks + operator
 * approval.
 *
 * --mark-landed is bookkeeping only (ENH-048): when the merge already
 * happened out-of-band, it records `landed` + landedAt and sends the
 * advisory nudges — no turn/freshness/gate checks, no merge. Requires
 * status `done` and the lane branch already merged into HEAD.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const state = require('./state');

function git(cwd, ...args) {
  return spawnSync('git', args, { cwd, encoding: 'utf8' });
}

function parseFlags(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--execute' || a === '--force' || a === '--json' || a === '--mark-landed') flags[a.slice(2)] = true;
    else if (a.startsWith('--')) flags[a.slice(2)] = argv[++i];
    else positional.push(a);
  }
  return { flags, positional };
}

/** Minimal advisory signal write — inline so land.js has no module coupling. */
function writeAdvisorySignal(anchor, laneId, text, from) {
  const inbox = state.inboxDir(anchor, laneId);
  const processed = state.processedDir(anchor, laneId);
  state.withLock(anchor, () => {
    fs.mkdirSync(inbox, { recursive: true });
    const seqs = [];
    for (const dir of [inbox, processed]) {
      let names = [];
      try { names = fs.readdirSync(dir); } catch { /* absent */ }
      for (const n of names) {
        const m = n.match(/^(\d{4})-/);
        if (m) seqs.push(Number(m[1]));
      }
    }
    const seq = (seqs.length ? Math.max(...seqs) : 0) + 1;
    const file = path.join(inbox, `${String(seq).padStart(4, '0')}-message.json`);
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({
      stateVersion: state.STATE_VERSION,
      seq,
      type: 'message',
      text,
      from,
      at: new Date().toISOString(),
    }, null, 2) + os.EOL);
    fs.renameSync(tmp, file);
  });
}

/** Blob content at `<branch>:<relPath>` (repo-root-relative), or null when absent. */
function readFromBranch(cwd, branch, relPath) {
  const res = git(cwd, 'show', `${branch}:${relPath}`);
  return res.status === 0 ? res.stdout : null;
}

/** Trimmed "## Verification Evidence" section body, or null when missing/empty. */
function evidenceSection(body) {
  const m = body.match(/^## Verification Evidence\s*$([\s\S]*?)(?=^## |\s*$(?![\s\S]))/m);
  return (m && m[1] && m[1].trim()) || null;
}

/**
 * Gate check per ADR-0002 §4. Returns { ok, detail }.
 *
 * Evidence is read from the LANE BRANCH first (ENH-048 — a record
 * committed on the lane only arrives in the integration worktree WITH
 * the merge), falling back to the invoking worktree's filesystem for
 * the 21b G5 pattern of uncommitted records. `cwd` is where git runs.
 */
function gateCheck(cwd, repoRoot, lane) {
  if (lane.grade === 'spike') {
    return { ok: true, detail: 'spike — gate-exempt by declaration' };
  }
  if (lane.grade === 'quick-task') {
    const rel = `specs/adhoc/${lane.id}/record.md`;
    const fromBranch = readFromBranch(cwd, lane.branch, rel);
    if (fromBranch && fromBranch.trim()) {
      return { ok: true, detail: `ad-hoc record present (${rel}, read from the lane branch)` };
    }
    const rec = path.join(repoRoot, 'specs', 'adhoc', lane.id, 'record.md');
    return fs.existsSync(rec)
      ? { ok: true, detail: `ad-hoc record present (${rel})` }
      : { ok: false, detail: `missing ad-hoc record: ${rel} — not on '${lane.branch}' nor in the worktree (Rule 14 quick-task evidence)` };
  }
  // phase grade
  const ref = (lane.planNode && lane.planNode.ref) || lane.id;
  const rel = `specs/phases/${ref}/retrospective.md`;
  const fromBranch = readFromBranch(cwd, lane.branch, rel);
  if (fromBranch !== null) {
    const section = evidenceSection(fromBranch);
    if (section) {
      return { ok: true, detail: `retrospective Verification Evidence present (${section.length} chars, read from the lane branch)` };
    }
    // present on the branch but section missing/empty — the worktree copy may still carry it
  }
  const retro = path.join(repoRoot, 'specs', 'phases', ref, 'retrospective.md');
  if (!fs.existsSync(retro)) {
    return fromBranch !== null
      ? { ok: false, detail: `retrospective on '${lane.branch}' exists but "## Verification Evidence" is missing or empty (${rel})` }
      : { ok: false, detail: `missing retrospective: ${rel} (Rule 12 phase evidence)` };
  }
  const section = evidenceSection(fs.readFileSync(retro, 'utf8'));
  return section
    ? { ok: true, detail: `retrospective Verification Evidence present (${section.length} chars)` }
    : { ok: false, detail: `retrospective exists but "## Verification Evidence" is missing or empty (${rel})` };
}

function cmdLand(cwd, argv) {
  const { flags, positional } = parseFlags(argv);
  const id = positional[0];
  if (!id) {
    console.error('✗ usage: momentum lanes land <lane-id> [--into <ref>] [--execute] [--force] [--mark-landed]');
    return 1;
  }
  const anchor = state.resolveAnchor(cwd);
  if (!anchor) {
    console.error('✗ not inside a git repository');
    return 1;
  }
  const repoRoot = state.worktreeRoot(cwd);
  const lane = state.readManifest(anchor, id);
  if (!lane) {
    console.error(`✗ no such lane: '${id}'`);
    return 1;
  }

  const currentBranch = (git(cwd, 'rev-parse', '--abbrev-ref', 'HEAD').stdout || '').trim();
  const into = flags.into || currentBranch;

  // ── --mark-landed: bookkeeping for a merge that already happened
  // out-of-band (ENH-048). No turn/freshness/gate checks, no merge.
  if (flags['mark-landed']) {
    if (lane.status !== 'done') {
      console.error(`✗ --mark-landed requires status 'done' (lane '${id}' is '${lane.status}') — mark it first: momentum lanes done ${id}`);
      return 1;
    }
    const merged = git(cwd, 'merge-base', '--is-ancestor', lane.branch, 'HEAD').status === 0;
    if (!merged) {
      console.error(`✗ --mark-landed: '${lane.branch}' is not merged into HEAD — this flag only RECORDS an out-of-band merge that already happened (to actually merge: momentum lanes land ${id} --execute)`);
      return 1;
    }
    const landed = state.updateLane(anchor, id, {
      status: 'landed',
      landedAt: new Date().toISOString(),
      note: `${lane.note ? lane.note + '; ' : ''}marked landed out-of-band (--mark-landed)`,
    });
    const others = state.listLanes(anchor).filter((l) => l.id !== id && l.status === 'open');
    for (const other of others) {
      writeAdvisorySignal(anchor, other.id,
        `lane '${id}' landed on ${currentBranch} — rebase your lane before landing (git rebase ${currentBranch})`,
        currentBranch);
    }
    console.log(`✓ lane '${id}' marked landed (${landed.landedAt}) — bookkeeping only, the merge was already in HEAD`);
    if (others.length) {
      console.log(`ℹ advisory rebase signal sent to ${others.length} open lane(s): ${others.map((l) => l.id).join(', ')}`);
    }
    return 0;
  }

  const checks = [];
  let ok = true;

  // 1. status
  if (lane.status === 'done') {
    checks.push(`✓ status: done (since ${lane.doneAt})`);
  } else {
    checks.push(`✗ status: '${lane.status}' — mark it first: momentum lanes done ${id}`);
    ok = false;
  }

  // 2. turn (FIFO by doneAt)
  const queue = state.listLanes(anchor)
    .filter((l) => l.status === 'done')
    .sort((a, b) => String(a.doneAt).localeCompare(String(b.doneAt)));
  const pos = queue.findIndex((l) => l.id === id);
  if (pos === 0 || queue.length === 0) {
    checks.push('✓ turn: head of the landing queue');
  } else if (pos > 0 && flags.force) {
    checks.push(`⚠ turn: position ${pos + 1} of ${queue.length} — landing OUT OF TURN (--force; ahead: ${queue.slice(0, pos).map((l) => l.id).join(', ')})`);
  } else if (pos > 0) {
    checks.push(`✗ turn: position ${pos + 1} of ${queue.length} — '${queue[0].id}' lands first (or use --force, loudly)`);
    ok = false;
  }

  // 3. freshness — `into` must be an ancestor of the lane branch
  const fresh = git(cwd, 'merge-base', '--is-ancestor', into, lane.branch).status === 0;
  if (fresh) {
    checks.push(`✓ freshness: '${into}' is contained in '${lane.branch}'`);
  } else {
    checks.push(`✗ freshness: '${lane.branch}' does not contain '${into}' — rebase the lane first (git rebase ${into}); freshness is never forceable`);
    ok = false;
  }

  // 4. graded gate
  const gate = gateCheck(cwd, repoRoot, lane);
  checks.push(`${gate.ok ? '✓' : '✗'} gate[${lane.grade}]: ${gate.detail}`);
  if (!gate.ok) ok = false;

  // 5. overlap advisory
  for (const w of state.overlapWarnings(anchor, id, lane.touches)) {
    checks.push(`⚠ touch overlap with '${w.laneId}': ${w.mine} ↔ ${w.theirs} (advisory)`);
  }

  console.log(`landing checklist for '${id}' → ${into}:`);
  for (const c of checks) console.log(`  ${c}`);

  if (!ok) {
    console.error(`✗ lane '${id}' is not landable`);
    return 1;
  }

  if (!flags.execute) {
    console.log(`✓ landable — run with --execute to merge into '${into}'`);
    return 0;
  }

  if (into !== currentBranch) {
    console.error(`✗ --execute merges into the CURRENT branch ('${currentBranch}') but --into is '${into}' — check out '${into}' first`);
    return 1;
  }

  const merge = git(cwd, 'merge', '--no-ff', lane.branch, '-m',
    `merge: land lane '${id}' → ${into} (momentum lanes)`);
  if (merge.status !== 0) {
    console.error(`✗ merge failed:\n${merge.stderr || merge.stdout}`);
    console.error('  resolve manually, or abort with: git merge --abort');
    return 1;
  }

  const landed = state.updateLane(anchor, id, {
    status: 'landed',
    landedAt: new Date().toISOString(),
    note: flags.force ? `${lane.note ? lane.note + '; ' : ''}landed out of turn (--force)` : lane.note,
  });

  // Advisory rebase nudge to every other open lane (ADR-0002 — advisory only).
  const others = state.listLanes(anchor).filter((l) => l.id !== id && l.status === 'open');
  for (const other of others) {
    writeAdvisorySignal(anchor, other.id,
      `lane '${id}' landed on ${into} — rebase your lane before landing (git rebase ${into})`,
      currentBranch);
  }

  console.log(`✓ lane '${id}' landed on '${into}' (${landed.landedAt})`);
  if (others.length) {
    console.log(`ℹ advisory rebase signal sent to ${others.length} open lane(s): ${others.map((l) => l.id).join(', ')}`);
  }
  console.log('ℹ run the suite on the updated branch before the next landing (Rule 6 Landing Order)');
  return 0;
}

module.exports = { cmdLand, gateCheck };
