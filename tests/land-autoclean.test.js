'use strict';

/**
 * Phase 27 G2 — `momentum lanes land --execute` auto-cleans a lane that lands
 * on the TERMINAL integration branch (BUG-026); `--keep` opts out; landing on a
 * non-terminal branch defers cleanup to `momentum lanes reconcile`.
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, write, runCli, REPO_ROOT } = require('./_helpers');

const state = require(path.join(REPO_ROOT, 'core', 'lanes', 'lib', 'state'));
const cleanup = require(path.join(REPO_ROOT, 'core', 'lanes', 'lib', 'cleanup'));

function git(cwd, ...args) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(res.status, 0, `git ${args.join(' ')} failed: ${res.stderr}`);
  return res.stdout.trim();
}

function makeRepo() {
  const container = mktmp('momentum-land-autoclean-');
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

function lanes(cwd, ...args) {
  return runCli(['lanes', ...args], { cwd });
}

/** Open a lane with a worktree, commit one file in it, mark it done. */
function openWorkedDone(dir, branch, from) {
  const args = ['open', branch, '--grade', 'spike'];
  if (from) args.push('--from', from);
  assert.equal(lanes(dir, ...args).status, 0);
  const anchor = state.resolveAnchor(dir);
  const wt = state.readManifest(anchor, state.laneId(branch)).worktree;
  write(path.join(wt, 'work.txt'), 'work\n');
  git(wt, 'add', '-A');
  git(wt, 'commit', '-q', '--no-verify', '-m', `feat: ${branch}`);
  assert.equal(lanes(dir, 'done', state.laneId(branch)).status, 0);
  return wt;
}

test('land --execute on the terminal branch auto-cleans worktree + branch + state (BUG-026)', () => {
  const { container, dir } = makeRepo();
  try {
    const wt = openWorkedDone(dir, 'phase-7-clean');
    assert.ok(fs.existsSync(wt), 'worktree exists before landing');

    const res = lanes(dir, 'land', 'phase-7-clean', '--execute');
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /landed on 'main'/);
    assert.match(res.stdout, /cleanup worktree: .*phase-7-clean/);
    assert.match(res.stdout, /cleanup local-branch: phase-7-clean/);

    assert.ok(!fs.existsSync(wt), 'worktree removed by auto-clean');
    assert.ok(!cleanup.localBranchExists(dir, 'phase-7-clean'), 'branch deleted');
    const m = state.readManifest(state.resolveAnchor(dir), 'phase-7-clean');
    assert.equal(m.status, 'landed');
    assert.equal(m.cleaned, true, 'manifest tombstoned as cleaned');
    assert.equal(m.worktree, null);
    // merged content is on main
    assert.ok(fs.existsSync(path.join(dir, 'work.txt')));
  } finally {
    rmrf(container);
  }
});

test('land --keep leaves the worktree, branch, and state untouched', () => {
  const { container, dir } = makeRepo();
  try {
    const wt = openWorkedDone(dir, 'phase-8-keep');
    const res = lanes(dir, 'land', 'phase-8-keep', '--execute', '--keep');
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /--keep: worktree, branch, and lane state left in place/);

    assert.ok(fs.existsSync(wt), 'worktree kept');
    assert.ok(cleanup.localBranchExists(dir, 'phase-8-keep'), 'branch kept');
    assert.notEqual(state.readManifest(state.resolveAnchor(dir), 'phase-8-keep').cleaned, true);
  } finally {
    rmrf(container);
  }
});

test('land on a non-terminal branch defers cleanup to reconcile', () => {
  const { container, dir } = makeRepo();
  try {
    git(dir, 'checkout', '-q', '-b', 'staging'); // an integration branch that is NOT terminal (default terminal = main)
    const wt = openWorkedDone(dir, 'feat/defer', 'staging');
    git(dir, 'checkout', '-q', 'staging');

    const res = lanes(dir, 'land', 'feat-defer', '--execute');
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /landed on 'staging'/);
    assert.match(res.stdout, /cleanup deferred to .*reconcile.* once it reaches 'main'/);

    assert.ok(fs.existsSync(wt), 'worktree kept until it reaches the terminal branch');
    assert.ok(cleanup.localBranchExists(dir, 'feat/defer'), 'branch kept');
    assert.notEqual(state.readManifest(state.resolveAnchor(dir), 'feat-defer').cleaned, true);
  } finally {
    rmrf(container);
  }
});
