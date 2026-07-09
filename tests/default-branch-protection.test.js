'use strict';

/**
 * Phase 27 G1 — default-branch protection (BUG-025).
 *
 * A local bare remote cannot reproduce GitHub's server rule that the FIRST
 * pushed branch becomes the repo default — that behavior is what makes push
 * ORDER matter. What we CAN pin here is momentum's mechanism: the founding
 * helper establishes the terminal branch as origin's default BEFORE any phase
 * branch is pushed, and the cleanup guard then refuses to ever delete it.
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, write, REPO_ROOT } = require('./_helpers');
const cleanup = require(path.join(REPO_ROOT, 'core', 'lanes', 'lib', 'cleanup'));

function git(cwd, ...args) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(res.status, 0, `git ${args.join(' ')} failed: ${res.stderr}`);
  return res.stdout.trim();
}

/** A fresh forge: bare origin wired, nothing pushed (the BUG-025 starting point). */
function freshFounding() {
  const container = mktmp('momentum-defbranch-');
  const remote = path.join(container, 'remote.git');
  assert.equal(spawnSync('git', ['init', '--bare', '-b', 'main', remote]).status, 0);
  const dir = path.join(container, 'proj');
  fs.mkdirSync(dir);
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@example.com');
  git(dir, 'config', 'user.name', 'T');
  git(dir, 'config', 'commit.gpgsign', 'false');
  write(path.join(dir, 'README.md'), 'founding\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '--no-verify', '-m', 'found');
  git(dir, 'remote', 'add', 'origin', remote);
  return { container, dir, remote };
}

test('founding establishes the terminal branch as default BEFORE a phase branch is pushed', () => {
  const { container, dir } = freshFounding();
  try {
    // Founding order (the fix): terminal branch reaches origin first.
    const done = cleanup.ensureTerminalBranchIsRemoteDefault(dir, 'main', { push: true });
    assert.equal(done.status, 'ok');
    assert.equal(cleanup.remoteDefaultBranch(dir), 'main');

    // Now a phase begins and pushes its branch — the default must NOT change.
    git(dir, 'checkout', '-q', '-b', 'phase-0-bootstrap');
    write(path.join(dir, 'x.txt'), 'x\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '--no-verify', '-m', 'feat: g0');
    git(dir, 'push', '-q', '-u', 'origin', 'phase-0-bootstrap');

    assert.equal(cleanup.remoteDefaultBranch(dir), 'main', 'phase branch did not hijack the default');
    assert.ok(cleanup.remoteBranchExists(dir, 'phase-0-bootstrap'));

    // And the phase branch is safely deletable while main is guarded.
    git(dir, 'checkout', '-q', 'main');
    git(dir, 'merge', '-q', '--no-ff', '--no-verify', '-m', 'merge g0', 'phase-0-bootstrap');
    const res = cleanup.cleanupTarget({ cwd: dir, branch: 'phase-0-bootstrap', deleteRemote: true });
    assert.ok(res.ok, JSON.stringify(res.actions));
    assert.ok(!cleanup.remoteBranchExists(dir, 'phase-0-bootstrap'), 'spent phase branch removed');
    assert.equal(cleanup.remoteDefaultBranch(dir), 'main', 'default still main');

    // The guard would refuse main itself.
    const guard = cleanup.cleanupTarget({ cwd: dir, branch: 'main', deleteRemote: true });
    assert.ok(!guard.ok);
    assert.equal(guard.actions.find((a) => a.step === 'remote-branch').status, 'blocked');
  } finally {
    rmrf(container);
  }
});

test('start-phase safety net: helper reports needs-push when the terminal branch is missing on origin', () => {
  const { container, dir } = freshFounding();
  try {
    // Founding did NOT push main (regression of the old flow). start-phase's
    // safety net detects it before the phase branch goes out.
    const plan = cleanup.ensureTerminalBranchIsRemoteDefault(dir, 'main', { push: false });
    assert.equal(plan.status, 'needs-push');
    assert.ok(!cleanup.remoteBranchExists(dir, 'main'));
  } finally {
    rmrf(container);
  }
});
