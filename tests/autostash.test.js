'use strict';

// Phase 20 follow-up — `--autostash` for upgrade / ecosystem upgrade.
// Lets a dirty repo be upgraded without manual stashing: stash → upgrade →
// restore. Safety invariant under test: if the restore can't apply cleanly,
// the user's work is NEVER dropped (stays in `git stash list`).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const { mktmp, rmrf, runCli, read, write } = require('./_helpers');
const { withAutostash } = require('../bin/momentum');

function git(repo, cmd) {
  return execSync(`git ${cmd}`, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}
function initGitRepo() {
  const dir = mktmp();
  git(dir, 'init -q');
  git(dir, 'config user.email t@e');
  git(dir, 'config user.name t');
  return dir;
}
function commit(repo, msg) {
  git(repo, 'add -A');
  execSync(`git commit -q -m ${JSON.stringify(msg)}`, { cwd: repo, env: { ...process.env, MOMENTUM_SKIP_HOOKS: '1' } });
}
const stashCount = (repo) => git(repo, 'stash list').trim().split('\n').filter(Boolean).length;

test('withAutostash — clean repo is a no-op that still runs fn', () => {
  const dir = initGitRepo();
  try {
    write(path.join(dir, 'a.txt'), 'x\n');
    commit(dir, 'seed');
    let ran = false;
    const r = withAutostash(dir, () => { ran = true; return 42; });
    assert.equal(ran, true);
    assert.equal(r.stashed, false);
    assert.equal(r.result, 42);
    assert.equal(stashCount(dir), 0);
  } finally { rmrf(dir); }
});

test('withAutostash — non-git dir is a no-op', () => {
  const dir = mktmp();
  try {
    let ran = false;
    const r = withAutostash(dir, () => { ran = true; });
    assert.equal(ran, true);
    assert.equal(r.stashed, false);
  } finally { rmrf(dir); }
});

test('withAutostash — dirty repo: stashes, runs fn, restores, leaves no stash', () => {
  const dir = initGitRepo();
  try {
    write(path.join(dir, 'app.txt'), 'v1\n');
    commit(dir, 'seed');
    write(path.join(dir, 'app.txt'), 'v1\nWIP\n');      // tracked dirty
    write(path.join(dir, 'untracked.txt'), 'note\n');   // untracked dirty

    let sawClean = null;
    const r = withAutostash(dir, () => {
      // Inside the wrapper the tree must be clean (work stashed away).
      sawClean = git(dir, 'status --porcelain').trim() === '';
      write(path.join(dir, 'tool.txt'), 'installed\n');  // simulate the upgrade
    });

    assert.equal(sawClean, true, 'tree must be clean during the upgrade');
    assert.equal(r.stashed, true);
    assert.equal(r.restored, true);
    assert.equal(r.conflict, false);
    assert.match(read(path.join(dir, 'app.txt')), /WIP/, 'tracked WIP restored');
    assert.ok(fs.existsSync(path.join(dir, 'untracked.txt')), 'untracked WIP restored');
    assert.ok(fs.existsSync(path.join(dir, 'tool.txt')), 'upgrade output kept');
    assert.equal(stashCount(dir), 0, 'no stash left behind');
  } finally { rmrf(dir); }
});

test('withAutostash — CONFLICT: work is preserved in the stash, never dropped', () => {
  const dir = initGitRepo();
  try {
    write(path.join(dir, 'shared.txt'), 'base\n');
    commit(dir, 'seed');
    // User dirties shared.txt; the "upgrade" will write the SAME file → pop conflict.
    write(path.join(dir, 'shared.txt'), 'USER-EDIT\n');

    const r = withAutostash(dir, () => {
      write(path.join(dir, 'shared.txt'), 'UPGRADE-EDIT\n');
    });

    assert.equal(r.stashed, true);
    assert.equal(r.conflict, true, 'pop should conflict');
    assert.equal(r.restored, false);
    // The safety invariant: the user's work is NOT lost.
    assert.equal(stashCount(dir), 1, 'stash preserved on conflict — work recoverable');
    const recovered = execSync('git stash show -p stash@{0}', { cwd: dir, encoding: 'utf8' });
    assert.match(recovered, /USER-EDIT/, 'user work is in the stash');
  } finally { rmrf(dir); }
});

test('upgrade --autostash — dirty repo upgrades and restores WIP (CLI)', () => {
  const dir = initGitRepo();
  try {
    runCli(['init', dir]);
    commit(dir, 'chore: baseline');
    write(path.join(dir, 'app.py'), "print('wip')\n");   // untracked WIP

    const res = runCli(['upgrade', dir, '--autostash']);
    assert.equal(res.status, 0, `autostash upgrade failed: ${res.stderr}`);
    assert.match(res.stdout, /autostash: stashed/);
    assert.match(res.stdout, /autostash: restored/);

    assert.ok(fs.existsSync(path.join(dir, 'app.py')), 'WIP restored after CLI autostash upgrade');
    assert.equal(stashCount(dir), 0);
    const m = JSON.parse(read(path.join(dir, '.momentum', 'installed.json')));
    assert.ok(m.momentumVersion, 'lock file written');
  } finally { rmrf(dir); }
});

test('ecosystem upgrade --autostash — upgrades a dirty member instead of skipping', () => {
  const tmp = mktmp();
  try {
    runCli(['ecosystem', 'init', 'eco'], { cwd: tmp });
    const root = path.join(tmp, 'eco');
    const member = path.join(tmp, 'm');
    runCli(['init', member, '--agent', 'claude-code']);
    git(member, 'init -q');
    git(member, 'config user.email t@e');
    git(member, 'config user.name t');
    commit(member, 'chore: baseline');
    write(path.join(member, 'wip.txt'), 'in flight\n');  // dirty
    runCli(['ecosystem', 'add', '../m', '--role', 'library', '--id', 'm'], { cwd: root });

    // Without autostash → skipped.
    const skip = runCli(['ecosystem', 'upgrade'], { cwd: root });
    assert.match(skip.stdout, /1 dirty-skip/);

    // With autostash → upgraded + restored.
    const res = runCli(['ecosystem', 'upgrade', '--autostash'], { cwd: root });
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /1 upgraded/);
    assert.match(res.stdout, /autostashed/);
    assert.ok(fs.existsSync(path.join(member, 'wip.txt')), 'member WIP restored');
    assert.equal(stashCount(member), 0);
  } finally { rmrf(tmp); }
});
