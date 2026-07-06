'use strict';

/**
 * Phase 21b G5 — `momentum lanes land` (core/lanes/lib/land.js, ADR-0002 §4).
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, write, runCli, REPO_ROOT } = require('./_helpers');

const state = require(path.join(REPO_ROOT, 'core', 'lanes', 'lib', 'state'));

function git(cwd, ...args) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(res.status, 0, `git ${args.join(' ')} failed: ${res.stderr}`);
  return res.stdout.trim();
}

function makeRepo() {
  const container = mktmp('momentum-lanes-land-');
  const dir = path.join(container, 'proj');
  fs.mkdirSync(dir);
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@example.com');
  git(dir, 'config', 'user.name', 'T');
  git(dir, 'config', 'commit.gpgsign', 'false');
  write(path.join(dir, 'README.md'), 'fixture\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '--no-verify', '-m', 'init');
  return { container, dir };
}

/** Create a branch with one commit off main, back on main afterwards. */
function makeBranchWithCommit(dir, branch, file) {
  git(dir, 'checkout', '-q', '-b', branch);
  write(path.join(dir, file), `${branch}\n`);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '--no-verify', '-m', `feat: ${branch}`);
  git(dir, 'checkout', '-q', 'main');
}

function lanes(cwd, ...args) {
  return runCli(['lanes', ...args], { cwd });
}

test('land refuses a lane that is not done, with a clear message', () => {
  const { container, dir } = makeRepo();
  try {
    makeBranchWithCommit(dir, 'fix/a', 'a.txt');
    assert.equal(lanes(dir, 'open', 'fix/a', '--no-worktree').status, 0);
    const res = lanes(dir, 'land', 'fix-a');
    assert.equal(res.status, 1);
    assert.match(res.stdout, /✗ status: 'open'/);
    assert.match(res.stderr, /not landable/);
  } finally {
    rmrf(container);
  }
});

test('quick-task gate: refused without the ad-hoc record, landable with it', () => {
  const { container, dir } = makeRepo();
  try {
    makeBranchWithCommit(dir, 'fix/b', 'b.txt');
    assert.equal(lanes(dir, 'open', 'fix/b', '--no-worktree').status, 0);
    assert.equal(lanes(dir, 'done', 'fix-b').status, 0);

    const refused = lanes(dir, 'land', 'fix-b');
    assert.equal(refused.status, 1);
    assert.match(refused.stdout, /missing ad-hoc record: specs\/adhoc\/fix-b\/record\.md/);

    write(path.join(dir, 'specs', 'adhoc', 'fix-b', 'record.md'), '# fix-b\nevidence\n');
    const landable = lanes(dir, 'land', 'fix-b');
    assert.equal(landable.status, 0, landable.stderr);
    assert.match(landable.stdout, /✓ gate\[quick-task\]/);
    assert.match(landable.stdout, /landable — run with --execute/);
  } finally {
    rmrf(container);
  }
});

test('phase gate requires a non-empty Verification Evidence section', () => {
  const { container, dir } = makeRepo();
  try {
    makeBranchWithCommit(dir, 'phase-5-x', 'x.txt');
    fs.mkdirSync(path.join(dir, 'specs', 'phases', 'phase-5-x'), { recursive: true });
    assert.equal(lanes(dir, 'open', 'phase-5-x', '--no-worktree').status, 0);
    assert.equal(lanes(dir, 'done', 'phase-5-x').status, 0);

    const noRetro = lanes(dir, 'land', 'phase-5-x');
    assert.equal(noRetro.status, 1);
    assert.match(noRetro.stdout, /missing retrospective/);

    write(path.join(dir, 'specs', 'phases', 'phase-5-x', 'retrospective.md'),
      '# retro\n\n## Verification Evidence\n\n');
    const empty = lanes(dir, 'land', 'phase-5-x');
    assert.equal(empty.status, 1);
    assert.match(empty.stdout, /missing or empty/);

    write(path.join(dir, 'specs', 'phases', 'phase-5-x', 'retrospective.md'),
      '# retro\n\n## Verification Evidence\n\nsuite 12/12 green\n');
    const okRun = lanes(dir, 'land', 'phase-5-x');
    assert.equal(okRun.status, 0, okRun.stderr);
    assert.match(okRun.stdout, /✓ gate\[phase\]: retrospective Verification Evidence present/);
  } finally {
    rmrf(container);
  }
});

test('turn: second-in-queue refused without --force, warned with it; spike gate-exempt', () => {
  const { container, dir } = makeRepo();
  try {
    makeBranchWithCommit(dir, 'feat/one', 'one.txt');
    makeBranchWithCommit(dir, 'feat/two', 'two.txt');
    assert.equal(lanes(dir, 'open', 'feat/one', '--no-worktree', '--grade', 'spike').status, 0);
    assert.equal(lanes(dir, 'open', 'feat/two', '--no-worktree', '--grade', 'spike').status, 0);
    assert.equal(lanes(dir, 'done', 'feat-one').status, 0);
    assert.equal(lanes(dir, 'done', 'feat-two').status, 0);

    const refused = lanes(dir, 'land', 'feat-two');
    assert.equal(refused.status, 1);
    assert.match(refused.stdout, /✗ turn: position 2 of 2 — 'feat-one' lands first/);

    const forced = lanes(dir, 'land', 'feat-two', '--force');
    assert.equal(forced.status, 0, forced.stderr);
    assert.match(forced.stdout, /⚠ turn: .*OUT OF TURN/);
    assert.match(forced.stdout, /✓ gate\[spike\]: spike — gate-exempt/);
  } finally {
    rmrf(container);
  }
});

test('freshness: a lane that does not contain the integration ref is refused, never forceable', () => {
  const { container, dir } = makeRepo();
  try {
    makeBranchWithCommit(dir, 'feat/stale', 'stale.txt');
    // advance main AFTER the branch forked → branch no longer contains main
    write(path.join(dir, 'MAIN.md'), 'moved\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '--no-verify', '-m', 'chore: main moves on');

    assert.equal(lanes(dir, 'open', 'feat/stale', '--no-worktree', '--grade', 'spike').status, 0);
    assert.equal(lanes(dir, 'done', 'feat-stale').status, 0);

    const res = lanes(dir, 'land', 'feat-stale', '--force');
    assert.equal(res.status, 1);
    assert.match(res.stdout, /✗ freshness: 'feat\/stale' does not contain 'main' — rebase the lane first/);
  } finally {
    rmrf(container);
  }
});

test('--execute merges --no-ff, marks landed, and nudges other open lanes via inbox', () => {
  const { container, dir } = makeRepo();
  try {
    makeBranchWithCommit(dir, 'feat/land-me', 'land.txt');
    makeBranchWithCommit(dir, 'feat/bystander', 'by.txt');
    assert.equal(lanes(dir, 'open', 'feat/land-me', '--no-worktree', '--grade', 'spike').status, 0);
    assert.equal(lanes(dir, 'open', 'feat/bystander', '--no-worktree', '--grade', 'spike').status, 0);
    assert.equal(lanes(dir, 'done', 'feat-land-me').status, 0);

    const res = lanes(dir, 'land', 'feat-land-me', '--execute');
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /✓ lane 'feat-land-me' landed on 'main'/);
    assert.match(res.stdout, /advisory rebase signal sent to 1 open lane\(s\): feat-bystander/);

    // merge commit exists and the file arrived on main
    assert.ok(fs.existsSync(path.join(dir, 'land.txt')), 'lane content merged into main');
    const last = git(dir, 'log', '-1', '--pretty=%s');
    assert.match(last, /merge: land lane 'feat-land-me' → main/);

    const anchor = state.resolveAnchor(dir);
    assert.equal(state.readManifest(anchor, 'feat-land-me').status, 'landed');
    assert.equal(state.unreadCount(anchor, 'feat-bystander'), 1, 'bystander got the advisory nudge');
    const sig = state.unreadSignals(anchor, 'feat-bystander')[0];
    assert.equal(sig.type, 'message');
    assert.match(sig.text, /rebase your lane/);

    // --execute while checked out on a branch other than --into is refused
    makeBranchWithCommit(dir, 'feat/else', 'e.txt'); // forks from post-merge main → fresh vs main
    assert.equal(lanes(dir, 'open', 'feat/else', '--no-worktree', '--grade', 'spike').status, 0);
    assert.equal(lanes(dir, 'done', 'feat-else').status, 0);
    git(dir, 'checkout', '-q', 'feat/else');
    const wrong = lanes(dir, 'land', 'feat-else', '--into', 'main', '--execute', '--force');
    assert.equal(wrong.status, 1);
    assert.match(wrong.stderr, /merges into the CURRENT branch/);
  } finally {
    rmrf(container);
  }
});

// ─── ENH-048: gate reads evidence from the lane branch ───────────────────

test('ENH-048: quick-task record committed only on the lane branch — gate passes, --execute lands without collision', () => {
  const { container, dir } = makeRepo();
  try {
    // Record committed ON the lane branch (the real-lanes pattern) —
    // NOT present in the invoking worktree before the merge.
    git(dir, 'checkout', '-q', '-b', 'fix/c');
    write(path.join(dir, 'c.txt'), 'fix/c\n');
    write(path.join(dir, 'specs', 'adhoc', 'fix-c', 'record.md'), '# fix-c\nevidence\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '--no-verify', '-m', 'fix: c with record');
    git(dir, 'checkout', '-q', 'main');
    assert.ok(!fs.existsSync(path.join(dir, 'specs', 'adhoc', 'fix-c', 'record.md')),
      'precondition: record absent from the invoking worktree');

    assert.equal(lanes(dir, 'open', 'fix/c', '--no-worktree').status, 0);
    assert.equal(lanes(dir, 'done', 'fix-c').status, 0);

    const validate = lanes(dir, 'land', 'fix-c');
    assert.equal(validate.status, 0, validate.stderr);
    assert.match(validate.stdout, /✓ gate\[quick-task\]: .*read from the lane branch/);

    // The today-failure: with the gate satisfied from the branch, no
    // untracked record copy exists to collide with the incoming file.
    const res = lanes(dir, 'land', 'fix-c', '--execute');
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /✓ lane 'fix-c' landed on 'main'/);
    assert.ok(fs.existsSync(path.join(dir, 'specs', 'adhoc', 'fix-c', 'record.md')),
      'record arrived WITH the merge');
  } finally {
    rmrf(container);
  }
});

test('ENH-048: phase retrospective committed only on the lane branch passes the gate', () => {
  const { container, dir } = makeRepo();
  try {
    git(dir, 'checkout', '-q', '-b', 'phase-6-y');
    write(path.join(dir, 'y.txt'), 'phase-6-y\n');
    write(path.join(dir, 'specs', 'phases', 'phase-6-y', 'retrospective.md'),
      '# retro\n\n## Verification Evidence\n\nsuite 12/12 green\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '--no-verify', '-m', 'docs: retro on the lane');
    git(dir, 'checkout', '-q', 'main');
    assert.ok(!fs.existsSync(path.join(dir, 'specs', 'phases', 'phase-6-y', 'retrospective.md')),
      'precondition: retrospective absent from the invoking worktree');

    assert.equal(lanes(dir, 'open', 'phase-6-y', '--no-worktree').status, 0);
    assert.equal(lanes(dir, 'done', 'phase-6-y').status, 0);

    const res = lanes(dir, 'land', 'phase-6-y');
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /✓ gate\[phase\]: retrospective Verification Evidence present \(\d+ chars, read from the lane branch\)/);
  } finally {
    rmrf(container);
  }
});

// ─── ENH-048: --mark-landed bookkeeping ──────────────────────────────────

test('ENH-048: --mark-landed records an out-of-band merge and nudges open lanes', () => {
  const { container, dir } = makeRepo();
  try {
    makeBranchWithCommit(dir, 'feat/oob', 'oob.txt');
    makeBranchWithCommit(dir, 'feat/watcher', 'w.txt');
    assert.equal(lanes(dir, 'open', 'feat/oob', '--no-worktree', '--grade', 'spike').status, 0);
    assert.equal(lanes(dir, 'open', 'feat/watcher', '--no-worktree', '--grade', 'spike').status, 0);
    assert.equal(lanes(dir, 'done', 'feat-oob').status, 0);

    // Merge happens OUT-OF-BAND (not via lanes land --execute).
    git(dir, 'merge', '--no-ff', 'feat/oob', '-m', 'merge: out of band');

    const res = lanes(dir, 'land', 'feat-oob', '--mark-landed');
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /✓ lane 'feat-oob' marked landed .*bookkeeping only/);
    assert.match(res.stdout, /advisory rebase signal sent to 1 open lane\(s\): feat-watcher/);

    const anchor = state.resolveAnchor(dir);
    const manifest = state.readManifest(anchor, 'feat-oob');
    assert.equal(manifest.status, 'landed');
    assert.ok(manifest.landedAt, 'landedAt recorded');
    assert.equal(state.unreadCount(anchor, 'feat-watcher'), 1, 'bystander got the advisory nudge');
    assert.match(state.unreadSignals(anchor, 'feat-watcher')[0].text, /rebase your lane/);
  } finally {
    rmrf(container);
  }
});

test('ENH-048: --mark-landed refused when the lane is not done, and when the branch is not merged', () => {
  const { container, dir } = makeRepo();
  try {
    makeBranchWithCommit(dir, 'feat/nope', 'n.txt');
    assert.equal(lanes(dir, 'open', 'feat/nope', '--no-worktree', '--grade', 'spike').status, 0);

    // status 'open' → refused
    const notDone = lanes(dir, 'land', 'feat-nope', '--mark-landed');
    assert.equal(notDone.status, 1);
    assert.match(notDone.stderr, /--mark-landed requires status 'done' \(lane 'feat-nope' is 'open'\)/);

    // done but NOT merged into HEAD → refused
    assert.equal(lanes(dir, 'done', 'feat-nope').status, 0);
    const notMerged = lanes(dir, 'land', 'feat-nope', '--mark-landed');
    assert.equal(notMerged.status, 1);
    assert.match(notMerged.stderr, /'feat\/nope' is not merged into HEAD/);

    const anchor = state.resolveAnchor(dir);
    assert.equal(state.readManifest(anchor, 'feat-nope').status, 'done', 'manifest untouched on refusal');
  } finally {
    rmrf(container);
  }
});

test('ENH-050: land refuses to merge a lane onto its own branch (self-landing guard)', () => {
  const { container, dir } = makeRepo();
  try {
    makeBranchWithCommit(dir, 'fix/self', 'self.txt');
    let r = lanes(dir, 'open', 'fix/self', '--no-worktree');
    assert.equal(r.status, 0, r.stderr);
    write(path.join(dir, 'specs/adhoc/fix-self/record.md'), '# rec\n');
    git(dir, 'checkout', '-q', 'fix/self');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '--no-verify', '-m', 'docs: record');
    r = lanes(dir, 'done', 'fix-self');
    assert.equal(r.status, 0, r.stderr);
    // Invoke land FROM THE LANE BRANCH's checkout — must refuse.
    r = lanes(dir, 'land', 'fix-self', '--execute');
    assert.notEqual(r.status, 0, 'self-landing must be refused');
    assert.match(r.stderr + r.stdout, /own branch/, 'message must explain the self-landing refusal');
    // From main it proceeds.
    git(dir, 'checkout', '-q', 'main');
    r = lanes(dir, 'land', 'fix-self', '--execute');
    assert.equal(r.status, 0, `land from main failed: ${r.stderr}\n${r.stdout}`);
  } finally {
    rmrf(container);
  }
});
