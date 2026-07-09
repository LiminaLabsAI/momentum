'use strict';

/**
 * Phase 27 G0 — shared cleanup action + default-branch helpers
 * (core/lanes/lib/cleanup.js). BUG-025 / BUG-026 / ENH-063.
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

/** A repo inside a container, wired to a bare origin whose default is `main`. */
function makeRepoWithRemote() {
  const container = mktmp('momentum-cleanup-');
  const remote = path.join(container, 'remote.git');
  assert.equal(spawnSync('git', ['init', '--bare', '-b', 'main', remote]).status, 0);
  const dir = path.join(container, 'proj');
  fs.mkdirSync(dir);
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@example.com');
  git(dir, 'config', 'user.name', 'T');
  git(dir, 'config', 'commit.gpgsign', 'false');
  write(path.join(dir, 'README.md'), 'fixture\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '--no-verify', '-m', 'init');
  git(dir, 'remote', 'add', 'origin', remote);
  git(dir, 'push', '-q', '-u', 'origin', 'main');
  return { container, dir, remote };
}

/** Force the bare remote's HEAD (simulates a forge default branch). */
function setRemoteDefault(remote, branch) {
  assert.equal(spawnSync('git', ['--git-dir', remote, 'symbolic-ref', 'HEAD', `refs/heads/${branch}`]).status, 0);
}

/** Create a merged feature branch `name` (one commit, merged --no-ff into main). */
function mergedBranch(dir, name) {
  git(dir, 'checkout', '-q', '-b', name);
  write(path.join(dir, `${name.replace(/\W/g, '_')}.txt`), 'x\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '--no-verify', '-m', `feat: ${name}`);
  git(dir, 'checkout', '-q', 'main');
  git(dir, 'merge', '-q', '--no-ff', '--no-verify', '-m', `merge ${name}`, name);
}

test('remoteDefaultBranch reads the forge default (symref), network fallback', () => {
  const { container, dir, remote } = makeRepoWithRemote();
  try {
    assert.equal(cleanup.remoteDefaultBranch(dir), 'main');
    setRemoteDefault(remote, 'phase-0-x');
    // push the branch so the symref is not dangling
    git(dir, 'checkout', '-q', '-b', 'phase-0-x');
    git(dir, 'push', '-q', 'origin', 'phase-0-x');
    git(dir, 'checkout', '-q', 'main');
    assert.equal(cleanup.remoteDefaultBranch(dir), 'phase-0-x', 'reads the hijacked default');
  } finally {
    rmrf(container);
  }
});

test('cleanupTarget REFUSES to delete a remote branch that is the forge default (BUG-025 guard)', () => {
  const { container, dir, remote } = makeRepoWithRemote();
  try {
    mergedBranch(dir, 'phase-0-x');
    git(dir, 'push', '-q', 'origin', 'phase-0-x');
    setRemoteDefault(remote, 'phase-0-x'); // hijacked: phase-0-x is the default

    const res = cleanup.cleanupTarget({ cwd: dir, branch: 'phase-0-x', deleteRemote: true });
    const remoteAction = res.actions.find((a) => a.step === 'remote-branch');
    assert.equal(remoteAction.status, 'blocked');
    assert.match(remoteAction.detail, /forge DEFAULT branch/);
    assert.ok(res.blocked.includes('remote-branch'));
    // the branch is still on the remote — nothing was deleted
    assert.ok(cleanup.remoteBranchExists(dir, 'phase-0-x'));
  } finally {
    rmrf(container);
  }
});

test('cleanupTarget deletes a non-default remote branch; idempotent on re-run', () => {
  const { container, dir } = makeRepoWithRemote();
  try {
    mergedBranch(dir, 'phase-1-y');
    git(dir, 'push', '-q', 'origin', 'phase-1-y');
    assert.ok(cleanup.remoteBranchExists(dir, 'phase-1-y'));

    const r1 = cleanup.cleanupTarget({ cwd: dir, branch: 'phase-1-y', deleteRemote: true });
    assert.ok(r1.ok, JSON.stringify(r1.actions));
    assert.equal(r1.actions.find((a) => a.step === 'local-branch').status, 'deleted');
    assert.equal(r1.actions.find((a) => a.step === 'remote-branch').status, 'deleted');
    assert.ok(!cleanup.localBranchExists(dir, 'phase-1-y'));
    assert.ok(!cleanup.remoteBranchExists(dir, 'phase-1-y'));

    const r2 = cleanup.cleanupTarget({ cwd: dir, branch: 'phase-1-y', deleteRemote: true });
    assert.ok(r2.ok);
    assert.equal(r2.actions.find((a) => a.step === 'local-branch').status, 'skipped');
    assert.equal(r2.actions.find((a) => a.step === 'remote-branch').status, 'skipped');
  } finally {
    rmrf(container);
  }
});

test('cleanupTarget removes a worktree, deletes the branch, and tombstones lane state', () => {
  const { container, dir } = makeRepoWithRemote();
  try {
    const wt = path.join(container, 'proj.lanes', 'phase-2-z');
    git(dir, 'worktree', 'add', '-q', wt, '-b', 'phase-2-z');
    // land it so the branch is mergeable with -d
    write(path.join(wt, 'z.txt'), 'z\n');
    git(wt, 'add', '-A');
    git(wt, 'commit', '-q', '--no-verify', '-m', 'feat: z');
    git(dir, 'merge', '-q', '--no-ff', '--no-verify', '-m', 'merge z', 'phase-2-z');

    const anchor = state.resolveAnchor(dir);
    state.createLane(anchor, {
      id: 'phase-2-z', branch: 'phase-2-z',
      planNode: { type: 'phase', ref: 'phase-2-z' }, grade: 'phase', worktree: wt,
    });
    // drop a signal so there is inbox state to clear
    fs.mkdirSync(state.inboxDir(anchor, 'phase-2-z'), { recursive: true });
    write(path.join(state.inboxDir(anchor, 'phase-2-z'), '0001-message.json'), '{}');

    const res = cleanup.cleanupTarget({ cwd: dir, branch: 'phase-2-z', worktree: wt, laneId: 'phase-2-z' });
    assert.ok(res.ok, JSON.stringify(res.actions));
    assert.equal(res.actions.find((a) => a.step === 'worktree').status, 'removed');
    assert.equal(res.actions.find((a) => a.step === 'local-branch').status, 'deleted');
    assert.equal(res.actions.find((a) => a.step === 'lane-state').status, 'cleared');

    assert.ok(!fs.existsSync(wt), 'worktree gone');
    assert.ok(!cleanup.localBranchExists(dir, 'phase-2-z'), 'branch gone');
    assert.ok(!fs.existsSync(state.inboxDir(anchor, 'phase-2-z')), 'inbox cleared');
    const m = state.readManifest(anchor, 'phase-2-z');
    assert.equal(m.cleaned, true, 'manifest tombstoned');
    assert.equal(m.worktree, null);
  } finally {
    rmrf(container);
  }
});

test('cleanupTarget blocks an unmerged branch without force; --force deletes it', () => {
  const { container, dir } = makeRepoWithRemote();
  try {
    git(dir, 'checkout', '-q', '-b', 'feat-unmerged');
    write(path.join(dir, 'u.txt'), 'u\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '--no-verify', '-m', 'feat: u');
    git(dir, 'checkout', '-q', 'main'); // NOT merged

    const blocked = cleanup.cleanupTarget({ cwd: dir, branch: 'feat-unmerged', deleteRemote: false });
    assert.ok(!blocked.ok);
    assert.equal(blocked.actions.find((a) => a.step === 'local-branch').status, 'blocked');
    assert.ok(cleanup.localBranchExists(dir, 'feat-unmerged'), 'still there');

    const forced = cleanup.cleanupTarget({ cwd: dir, branch: 'feat-unmerged', deleteRemote: false, force: true });
    assert.ok(forced.ok);
    assert.equal(forced.actions.find((a) => a.step === 'local-branch').status, 'deleted');
    assert.ok(!cleanup.localBranchExists(dir, 'feat-unmerged'));
  } finally {
    rmrf(container);
  }
});

test('cleanupTarget refuses to remove the caller’s own worktree', () => {
  const { container, dir } = makeRepoWithRemote();
  try {
    const res = cleanup.cleanupTarget({ cwd: dir, worktree: dir });
    assert.ok(!res.ok);
    const wtAction = res.actions.find((a) => a.step === 'worktree');
    assert.equal(wtAction.status, 'blocked');
    assert.match(wtAction.detail, /current worktree/);
  } finally {
    rmrf(container);
  }
});

test('ensureTerminalBranchIsRemoteDefault: needs-push when absent, pushes with {push:true}', () => {
  // A FRESH forge: bare remote wired as origin, but nothing pushed yet.
  const container = mktmp('momentum-cleanup-fresh-');
  try {
    const remote = path.join(container, 'remote.git');
    assert.equal(spawnSync('git', ['init', '--bare', '-b', 'main', remote]).status, 0);
    const dir = path.join(container, 'proj');
    fs.mkdirSync(dir);
    git(dir, 'init', '-q', '-b', 'main');
    git(dir, 'config', 'user.email', 't@example.com');
    git(dir, 'config', 'user.name', 'T');
    git(dir, 'config', 'commit.gpgsign', 'false');
    write(path.join(dir, 'README.md'), 'fixture\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '--no-verify', '-m', 'found');
    git(dir, 'remote', 'add', 'origin', remote); // origin wired, nothing pushed

    const plan = cleanup.ensureTerminalBranchIsRemoteDefault(dir, 'main', { push: false });
    assert.equal(plan.status, 'needs-push');
    assert.match(plan.detail, /push it FIRST/);
    assert.ok(!cleanup.remoteBranchExists(dir, 'main'), 'nothing pushed yet');

    const done = cleanup.ensureTerminalBranchIsRemoteDefault(dir, 'main', { push: true });
    assert.equal(done.status, 'ok');
    assert.ok(done.pushed);
    assert.ok(cleanup.remoteBranchExists(dir, 'main'), 'main is now the first branch on origin');

    // no-remote path
    const solo = path.join(container, 'noremote');
    fs.mkdirSync(solo);
    git(solo, 'init', '-q', '-b', 'main');
    assert.equal(cleanup.ensureTerminalBranchIsRemoteDefault(solo, 'main').status, 'no-remote');
  } finally {
    rmrf(container);
  }
});

test('CLI: momentum lanes cleanup <branch> --dry-run reports without changing anything', () => {
  const { container, dir } = makeRepoWithRemote();
  try {
    mergedBranch(dir, 'phase-9-dry');
    git(dir, 'push', '-q', 'origin', 'phase-9-dry');
    const res = runCli(['lanes', 'cleanup', 'phase-9-dry', '--dry-run'], { cwd: dir });
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /would.*git branch -d phase-9-dry|local-branch/);
    assert.match(res.stdout, /dry-run — nothing changed/);
    assert.ok(cleanup.localBranchExists(dir, 'phase-9-dry'), 'dry-run left the branch');
    assert.ok(cleanup.remoteBranchExists(dir, 'phase-9-dry'), 'dry-run left the remote branch');
  } finally {
    rmrf(container);
  }
});
