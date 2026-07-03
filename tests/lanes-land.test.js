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
