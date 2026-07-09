'use strict';

/**
 * Phase 27 G3 — `momentum lanes reconcile` (out-of-band merge cleanup),
 * `end_state: open-pr` config, and the Rule-12 verify-before-clean guard.
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, write, runCli, REPO_ROOT } = require('./_helpers');

const state = require(path.join(REPO_ROOT, 'core', 'lanes', 'lib', 'state'));
const cleanup = require(path.join(REPO_ROOT, 'core', 'lanes', 'lib', 'cleanup'));
const cfg = require(path.join(REPO_ROOT, 'core', 'config'));

function git(cwd, ...args) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(res.status, 0, `git ${args.join(' ')} failed: ${res.stderr}`);
  return res.stdout.trim();
}

function makeRepo() {
  const container = mktmp('momentum-reconcile-');
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

/** Open a lane with a worktree + one commit; return its worktree path. */
function openWorked(dir, branch) {
  assert.equal(lanes(dir, 'open', branch, '--grade', 'spike').status, 0);
  const wt = state.readManifest(state.resolveAnchor(dir), state.laneId(branch)).worktree;
  write(path.join(wt, 'w.txt'), `${branch}\n`);
  git(wt, 'add', '-A');
  git(wt, 'commit', '-q', '--no-verify', '-m', `feat: ${branch}`);
  return wt;
}

test('reconcile reports landed vs pending; --execute cleans only the landed lane', () => {
  const { container, dir } = makeRepo();
  try {
    const wtA = openWorked(dir, 'phase-a');
    const wtB = openWorked(dir, 'phase-b');

    // phase-a is merged into main OUT-OF-BAND (a human/forge merge); phase-b is not.
    git(dir, 'merge', '-q', '--no-ff', '--no-verify', '-m', 'merge phase-a (out of band)', 'phase-a');

    const report = lanes(dir, 'reconcile', '--no-fetch');
    assert.equal(report.status, 0, report.stderr);
    assert.match(report.stdout, /landed:\s+phase-a/);
    assert.match(report.stdout, /pending:\s+phase-b/);
    assert.match(report.stdout, /1 lane\(s\) cleanable/);
    // nothing changed yet (validate-first)
    assert.ok(fs.existsSync(wtA) && cleanup.localBranchExists(dir, 'phase-a'));

    const exec = lanes(dir, 'reconcile', '--no-fetch', '--execute');
    assert.equal(exec.status, 0, exec.stderr);
    assert.ok(!fs.existsSync(wtA), 'landed lane worktree cleaned');
    assert.ok(!cleanup.localBranchExists(dir, 'phase-a'), 'landed lane branch deleted');
    assert.equal(state.readManifest(state.resolveAnchor(dir), 'phase-a').cleaned, true);

    // phase-b untouched — never merged, so never cleaned (Rule 12)
    assert.ok(fs.existsSync(wtB), 'pending lane worktree kept');
    assert.ok(cleanup.localBranchExists(dir, 'phase-b'), 'pending lane branch kept');
    assert.notEqual(state.readManifest(state.resolveAnchor(dir), 'phase-b').cleaned, true);
  } finally {
    rmrf(container);
  }
});

test('reconcile --execute with nothing landed cleans nothing', () => {
  const { container, dir } = makeRepo();
  try {
    openWorked(dir, 'phase-c'); // never merged
    const exec = lanes(dir, 'reconcile', '--no-fetch', '--execute');
    assert.equal(exec.status, 0, exec.stderr);
    assert.match(exec.stdout, /pending:\s+phase-c/);
    assert.ok(cleanup.localBranchExists(dir, 'phase-c'), 'unmerged lane never cleaned on trust');
  } finally {
    rmrf(container);
  }
});

test('end_state: open-pr is an accepted config value (not coerced to the default)', () => {
  const { container, dir } = makeRepo();
  try {
    const specs = path.join(dir, 'specs');
    write(path.join(specs, 'config.md'),
      '---\ntype: Config\n---\n\n# Project Config\n\n| Key | Value |\n|-----|-------|\n| end_state | open-pr |\n| branch_flow | staging, main |\n');
    const back = cfg.readConfig(specs);
    assert.equal(back.end_state, 'open-pr', 'open-pr accepted, not coerced to merge-after-yes');
  } finally {
    rmrf(container);
  }
});

test('ENH-063: close does full cleanup — deletes a merged branch + tombstones state', () => {
  const { container, dir } = makeRepo();
  try {
    const wt = openWorked(dir, 'fix/done');
    git(dir, 'merge', '-q', '--no-ff', '--no-verify', '-m', 'merge fix/done', 'fix/done');

    const c = lanes(dir, 'close', 'fix-done', '--rm-worktree');
    assert.equal(c.status, 0, c.stderr);
    assert.match(c.stdout, /local-branch: fix\/done/);
    assert.ok(!fs.existsSync(wt), 'worktree removed');
    assert.ok(!cleanup.localBranchExists(dir, 'fix/done'), 'merged branch deleted (ENH-063)');
    const m = state.readManifest(state.resolveAnchor(dir), 'fix-done');
    assert.equal(m.status, 'closed');
    assert.equal(m.cleaned, true);
  } finally {
    rmrf(container);
  }
});
