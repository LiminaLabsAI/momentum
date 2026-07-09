'use strict';

/**
 * Phase 26 — Project Preferences, Group 1.
 *
 * Integration tests: the pre-push hook resolves `protected_branches` from the
 * derived `.momentum/preferences-cache.json` (ADR-0009), falling back to the
 * hardcoded ['main','master','staging'] when the cache is absent. Runs the
 * REAL installed dispatcher against temp git repos.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli } = require('./_helpers');

function git(repo, args) {
  return spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
}

function setupInstalledRepo() {
  const tmp = mktmp('momentum-prefs-hook-');
  const repo = path.join(tmp, 'proj');
  fs.mkdirSync(repo);
  assert.equal(git(repo, ['init', '-q']).status, 0);
  git(repo, ['config', 'user.email', 'test@momentum.test']);
  git(repo, ['config', 'user.name', 'Momentum Test']);
  const res = runCli(['init', repo, '--agent', 'claude-code']);
  assert.equal(res.status, 0, `init failed: ${res.stderr}`);
  return { tmp, repo };
}

function runPrePush(repo, refLine, extraEnv = {}) {
  return spawnSync('node', [path.join(repo, '.githooks', 'run-check.js'), 'pre-push', 'origin', 'git@example:repo.git'], {
    cwd: repo,
    input: refLine.endsWith('\n') ? refLine : refLine + '\n',
    encoding: 'utf8',
    env: { ...process.env, ...extraEnv },
  });
}

const NZ = 'a1b2c3d4'; // non-zero local sha (not a deletion)
function branchRef(b) { return `refs/heads/${b} ${NZ} refs/heads/${b} ${NZ}`; }

function writeCache(repo, protectedBranches) {
  fs.mkdirSync(path.join(repo, '.momentum'), { recursive: true });
  fs.writeFileSync(
    path.join(repo, '.momentum', 'preferences-cache.json'),
    JSON.stringify({ version: 1, protected_branches: protectedBranches, branch_flow: protectedBranches, end_state: 'merge-after-yes' }, null, 2)
  );
}

test('pre-push: cache with custom protected list blocks a listed branch', () => {
  const { tmp, repo } = setupInstalledRepo();
  try {
    writeCache(repo, ['main', 'release']);
    const r = runPrePush(repo, branchRef('release'));
    assert.equal(r.status, 1, 'push to custom-protected "release" blocked');
    assert.match(r.stderr, /release/);
  } finally { rmrf(tmp); }
});

test('pre-push: cache with custom protected list allows a non-listed branch', () => {
  const { tmp, repo } = setupInstalledRepo();
  try {
    writeCache(repo, ['main', 'release']);
    const r = runPrePush(repo, branchRef('feature-x'));
    assert.equal(r.status, 0, 'push to non-protected "feature-x" allowed');
  } finally { rmrf(tmp); }
});

test('pre-push: no cache → falls back to default list (staging blocked, feature allowed)', () => {
  const { tmp, repo } = setupInstalledRepo();
  try {
    // init wrote a cache with [staging, main]; remove it to simulate a legacy repo
    const cachePath = path.join(repo, '.momentum', 'preferences-cache.json');
    if (fs.existsSync(cachePath)) fs.rmSync(cachePath);
    const staging = runPrePush(repo, branchRef('staging'));
    assert.equal(staging.status, 1, 'default list blocks staging');
    const feature = runPrePush(repo, branchRef('feature-x'));
    assert.equal(feature.status, 0, 'default list allows feature-x');
  } finally { rmrf(tmp); }
});

test('pre-push: sentinel authorizes a single push to a cache-protected branch', () => {
  const { tmp, repo } = setupInstalledRepo();
  try {
    writeCache(repo, ['main']);
    fs.writeFileSync(path.join(repo, '.momentum', 'merge-approved'), '');
    const r = runPrePush(repo, branchRef('main'));
    assert.equal(r.status, 0, 'sentinel authorized the push');
    assert.match(r.stderr, /consumed/);
    // single-use: a second push is blocked again
    const r2 = runPrePush(repo, branchRef('main'));
    assert.equal(r2.status, 1, 'sentinel was single-use');
  } finally { rmrf(tmp); }
});

test('pre-push: unparseable cache → falls back to default list (not a crash)', () => {
  const { tmp, repo } = setupInstalledRepo();
  try {
    fs.mkdirSync(path.join(repo, '.momentum'), { recursive: true });
    fs.writeFileSync(path.join(repo, '.momentum', 'preferences-cache.json'), '{ not valid json');
    const staging = runPrePush(repo, branchRef('staging'));
    assert.equal(staging.status, 1, 'fallback blocks staging');
    const feature = runPrePush(repo, branchRef('feature-x'));
    assert.equal(feature.status, 0, 'fallback allows feature-x');
  } finally { rmrf(tmp); }
});

test('protectedBranchesFromCache: pure helper — non-empty array wins, else null', () => {
  const C = require('../core/git-hooks/contract');
  assert.deepEqual(C.protectedBranchesFromCache({ protected_branches: ['main'] }), ['main']);
  assert.equal(C.protectedBranchesFromCache({ protected_branches: [] }), null);
  assert.equal(C.protectedBranchesFromCache(null), null);
  assert.equal(C.protectedBranchesFromCache({}), null);
});
