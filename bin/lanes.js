'use strict';

/**
 * `momentum lanes` — single-repo lane registry CLI (Phase 21b, FEAT-026/027).
 *
 * Subcommand modules load lazily so groups of Phase 21b could ship them
 * independently (board → core/lanes/lib/board.js, signals →
 * core/lanes/lib/signals.js, land → core/lanes/lib/land.js); a missing
 * module reports "not shipped yet" instead of crashing the dispatcher.
 *
 * State: <git-common-dir>/momentum/lanes (see core/lanes/lib/state.js,
 * ADR-0002). No daemon; every command computes from files.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const MOMENTUM_ROOT = path.resolve(__dirname, '..');
const state = require(path.join(MOMENTUM_ROOT, 'core', 'lanes', 'lib', 'state'));

// ─── small helpers ───────────────────────────────────────────────────────

function git(cwd, ...args) {
  return spawnSync('git', args, { cwd, encoding: 'utf8' });
}

let failed = false;

function fail(msg) {
  console.error(`✗ ${msg}`);
  failed = true;
  return null;
}

function parseFlags(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-worktree' || a === '--rm-worktree' || a === '--execute' ||
        a === '--force' || a === '--json' || a === '--ack-all') {
      flags[a.slice(2)] = true;
    } else if (a.startsWith('--')) {
      flags[a.slice(2)] = argv[++i];
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

function requireAnchor(cwd) {
  const anchor = state.resolveAnchor(cwd);
  if (!anchor) return fail('not inside a git repository');
  return anchor;
}

function printOverlaps(warnings) {
  for (const w of warnings) {
    console.log(`⚠ touch overlap with lane '${w.laneId}': ${w.mine} ↔ ${w.theirs} (advisory — coordinate before landing)`);
  }
}

// ─── open / done / close ─────────────────────────────────────────────────

function branchExists(cwd, branch) {
  return git(cwd, 'rev-parse', '--verify', '--quiet', `refs/heads/${branch}`).status === 0;
}

/** Path of the worktree that already has `branch` checked out, or null. */
function worktreeFor(cwd, branch) {
  const out = git(cwd, 'worktree', 'list', '--porcelain');
  if (out.status !== 0) return null;
  let current = null;
  for (const line of out.stdout.split('\n')) {
    if (line.startsWith('worktree ')) current = line.slice('worktree '.length);
    if (line === `branch refs/heads/${branch}` && current) return current;
  }
  return null;
}

/** Fresh-worktree preflight (21a trial learnings) — warnings only. */
function preflight(worktree) {
  const warnings = [];
  const modes = git(worktree, 'ls-files', '-s');
  if (modes.status === 0) {
    const bad = modes.stdout.split('\n')
      .filter((l) => l.trim().endsWith('.sh') && !l.startsWith('100755'));
    if (bad.length) {
      warnings.push(`${bad.length} committed *.sh without the exec bit — hook scripts will silently no-op in this worktree (BUG-012 class)`);
    }
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(worktree, 'package.json'), 'utf8'));
    const wanted = pkg.engines && pkg.engines.node;
    if (wanted) {
      const major = Number(process.versions.node.split('.')[0]);
      const minMajor = Number((wanted.match(/(\d+)/) || [])[1]);
      if (minMajor && major < minMajor) {
        warnings.push(`node ${process.versions.node} < engines.node ${wanted}`);
      }
    }
  } catch { /* no package.json — nothing to check */ }
  return warnings;
}

function cmdOpen(cwd, argv) {
  const { flags, positional } = parseFlags(argv);
  const branch = positional[0];
  if (!branch) return fail('usage: momentum lanes open <branch> [--path P] [--grade phase|quick-task|spike] [--touches a,b] [--from ref] [--no-worktree] [--note s]');

  const anchor = requireAnchor(cwd);
  if (!anchor) return;
  const repoRoot = state.worktreeRoot(cwd);
  const id = state.laneId(branch);
  const planNode = state.inferPlanNode(branch, repoRoot);
  const grade = flags.grade || state.defaultGrade(planNode);
  const touches = flags.touches ? flags.touches.split(',').map((s) => s.trim()).filter(Boolean) : [];

  // Substrate: reuse an existing checkout, else create a plain git worktree.
  let worktree = null;
  if (!flags['no-worktree']) {
    worktree = worktreeFor(cwd, branch);
    if (!worktree) {
      const home = flags.path ||
        path.join(path.dirname(repoRoot), `${path.basename(repoRoot)}.lanes`, id);
      // ENH-050: a NEW lane branch bases on the integration branch (main)
      // by default — basing on the invoking checkout's HEAD silently stacked
      // lanes on whatever branch happened to be checked out. `--from HEAD`
      // (or any explicit ref) remains available for deliberate stacking.
      const preExisting = branchExists(cwd, branch);
      let base = flags.from;
      if (!base && !preExisting) {
        const headRef = git(cwd, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD');
        base = headRef.status === 0 && headRef.stdout.trim()
          ? headRef.stdout.trim().replace(/^origin\//, '')
          : (git(cwd, 'rev-parse', '--verify', 'main').status === 0 ? 'main' : 'HEAD');
      }
      const args = preExisting
        ? ['worktree', 'add', home, branch]
        : ['worktree', 'add', home, '-b', branch, base];
      const res = git(cwd, ...args);
      if (res.status !== 0) return fail(`git worktree add failed:\n${res.stderr}`);
      worktree = home;
      console.log(`✓ worktree created at ${home}${preExisting ? '' : ` (branched from ${base})`}`);
    } else {
      console.log(`✓ reusing existing checkout at ${worktree}`);
    }
  }

  let lane;
  try {
    lane = state.createLane(anchor, {
      id, branch, planNode, grade, touches,
      worktree, note: flags.note || null,
    });
  } catch (err) {
    return fail(err.message);
  }

  console.log(`✓ lane '${lane.id}' open — branch ${branch}, plan node ${planNode.type}${planNode.ref ? `:${planNode.ref}` : ''}, grade ${grade}`);
  if (planNode.type === 'phase' && planNode.dirExists === false) {
    console.log(`  note: specs/phases/${branch}/ does not exist yet — sessions will fall back to status.md until it does`);
  }

  printOverlaps(state.overlapWarnings(anchor, id, touches));

  if (worktree) {
    for (const w of preflight(worktree)) console.log(`⚠ preflight: ${w}`);
  }

  // Substrate hints — detection only, never a dependency.
  if (spawnSync('sh', ['-c', 'command -v treehouse'], { encoding: 'utf8' }).status === 0) {
    console.log('ℹ treehouse detected — its worktree pools can make lane opens near-instant (optional)');
  }
}

function cmdDone(cwd, argv) {
  const { positional } = parseFlags(argv);
  const id = positional[0];
  if (!id) return fail('usage: momentum lanes done <lane-id>');
  const anchor = requireAnchor(cwd);
  if (!anchor) return;
  try {
    state.updateLane(anchor, id, { status: 'done', doneAt: new Date().toISOString() });
  } catch (err) {
    return fail(err.message);
  }
  const queue = state.listLanes(anchor)
    .filter((l) => l.status === 'done')
    .sort((a, b) => String(a.doneAt).localeCompare(String(b.doneAt)));
  const pos = queue.findIndex((l) => l.id === id) + 1;
  console.log(`✓ lane '${id}' marked done — position ${pos} of ${queue.length} in the landing queue`);
}

function cmdClose(cwd, argv) {
  const { flags, positional } = parseFlags(argv);
  const id = positional[0];
  if (!id) return fail('usage: momentum lanes close <lane-id> [--rm-worktree]');
  const anchor = requireAnchor(cwd);
  if (!anchor) return;
  let lane;
  try {
    lane = state.updateLane(anchor, id, { status: 'closed' });
  } catch (err) {
    return fail(err.message);
  }
  if (flags['rm-worktree'] && lane.worktree) {
    const res = git(cwd, 'worktree', 'remove', lane.worktree, '--force');
    if (res.status === 0) console.log(`✓ worktree removed: ${lane.worktree}`);
    else console.log(`⚠ could not remove worktree (${res.stderr.trim()}) — remove manually`);
  }
  console.log(`✓ lane '${id}' closed`);
}

// ─── lazy subcommand modules ─────────────────────────────────────────────

function lazy(module, exportName) {
  const file = path.join(MOMENTUM_ROOT, 'core', 'lanes', 'lib', `${module}.js`);
  if (!fs.existsSync(file)) {
    return () => fail(`'momentum lanes' subcommand backed by core/lanes/lib/${module}.js is not shipped yet`);
  }
  return require(file)[exportName];
}

// ─── help + dispatch ─────────────────────────────────────────────────────

const HELP = `momentum lanes — concurrent workstreams in one repo (Rule 15 mechanism)

Usage:
  momentum lanes                          Board: every lane + queue pressure
  momentum lanes open <branch> [flags]    Register a lane (creates a git worktree
                                          by default at ../<repo>.lanes/<id>)
      --path <dir>       worktree location    --grade phase|quick-task|spike
      --touches <a,b>    intended touch paths (overlap warnings, advisory)
      --from <ref>       base for a new branch --no-worktree   --note <s>
  momentum lanes done <id>                Mark ready to land (enters the queue)
  momentum lanes close <id> [--rm-worktree]
  momentum lanes queue                    Landing order + gate grades
  momentum lanes signal <id> <pause|resume|redirect|kill|message> [text]
  momentum lanes inbox <id> [--ack <n>|--ack-all]
  momentum lanes land <id> [--into <ref>] [--execute] [--force] [--mark-landed]
      --mark-landed      bookkeeping only: record an out-of-band merge that
                         already happened (done + merged lane → landed)

State lives at <git-common-dir>/momentum/lanes — shared by all worktrees,
untracked, no daemon. Substrate: plain git worktrees by default; treehouse
pools are detected and suggested; GitButler virtual branches work too (skip
worktrees with --no-worktree). Landing follows the Rule 6 Landing Order with
Rule-14-graded evidence gates.`;

/** Dispatch a `momentum lanes` invocation. Returns the exit code. */
function runLanes(argv, cwd = process.cwd()) {
  failed = false;
  dispatch(argv, cwd);
  return failed ? 1 : 0;
}

function dispatch(argv, cwd) {
  const sub = argv[0];
  const rest = argv.slice(1);
  // Lazy subcommand modules signal failure by RETURNING 1 (they print
  // their own message); inline commands use fail().
  const delegate = (module, exportName, args) => {
    if (lazy(module, exportName)(cwd, args) === 1) failed = true;
  };
  // A leading flag (e.g. `momentum lanes --json`) means the default board.
  if (sub && sub.startsWith('--') && sub !== '--help') {
    return delegate('board', 'cmdBoard', argv);
  }
  switch (sub) {
    case undefined:
    case 'board':
      return delegate('board', 'cmdBoard', sub === 'board' ? rest : argv);
    case 'queue':
      return delegate('board', 'cmdQueue', rest);
    case 'open':
      return cmdOpen(cwd, rest);
    case 'done':
      return cmdDone(cwd, rest);
    case 'close':
      return cmdClose(cwd, rest);
    case 'signal':
      return delegate('signals', 'cmdSignal', rest);
    case 'inbox':
      return delegate('signals', 'cmdInbox', rest);
    case 'land':
      return delegate('land', 'cmdLand', rest);
    case '--help':
    case '-h':
    case 'help':
      console.log(HELP);
      return;
    default:
      return fail(`unknown lanes subcommand: '${sub}' (see: momentum lanes help)`);
  }
}

module.exports = { runLanes };
