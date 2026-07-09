'use strict';

/**
 * Phase 30a — Team-Walk, Group 1 (collision-free claims via `momentum claim`).
 *
 * Drives the CLI through a real bare-remote + two-clone fixture: exactly one
 * clone wins a contested claim (the fix ENH-057 needs — reserve the version at
 * the runway before tagging), and the loser's exit code lets a recipe gate on it.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const { mktmp, rmrf, REPO_ROOT } = require('./_helpers');

const MOMENTUM = path.join(REPO_ROOT, 'bin', 'momentum.js');
const claimLib = require(path.join(REPO_ROOT, 'core', 'team', 'lib', 'claim'));

function git(cwd, ...args) {
  return spawnSync('git', args, { cwd, encoding: 'utf8' });
}
function momentum(cwd, ...args) {
  return spawnSync('node', [MOMENTUM, ...args], { cwd, encoding: 'utf8', env: { ...process.env } });
}
function twoClones(tmp) {
  const bare = path.join(tmp, 'remote.git');
  git(tmp, 'init', '--bare', '-q', bare);
  const a = path.join(tmp, 'a');
  git(tmp, 'clone', '-q', bare, a);
  git(a, 'config', 'user.email', 'alice@x'); git(a, 'config', 'user.name', 'Alice');
  const b = path.join(tmp, 'b');
  git(tmp, 'clone', '-q', bare, b);
  git(b, 'config', 'user.email', 'bob@x'); git(b, 'config', 'user.name', 'Bob');
  return { a, b };
}

test('claimKey installs the refspec so the claim travels on fetch', () => {
  const tmp = mktmp('team-claim-');
  try {
    const { a } = twoClones(tmp);
    claimLib.claimKey(a, 'phase', '30a', { actor: 'alice' });
    const fetch = git(a, 'config', '--get-all', 'remote.origin.fetch').stdout;
    assert.ok(fetch.includes('refs/momentum/*'), 'refspec installed by claim');
  } finally { rmrf(tmp); }
});

test('momentum claim: exactly one clone wins; loser exits 2', () => {
  const tmp = mktmp('team-claim-');
  try {
    const { a, b } = twoClones(tmp);
    const ra = momentum(a, 'claim', 'version', '0.37.0');
    const rb = momentum(b, 'claim', 'version', '0.37.0');
    assert.equal(ra.status, 0, `A should win: ${ra.stdout}${ra.stderr}`);
    assert.match(ra.stdout, /claimed version\/0\.37\.0/);
    assert.equal(rb.status, 2, `B should lose with exit 2: ${rb.stdout}${rb.stderr}`);
    assert.match(rb.stderr, /already claimed by 'alice'/);
  } finally { rmrf(tmp); }
});

test('momentum claim: usage error without namespace+key', () => {
  const tmp = mktmp('team-claim-');
  try {
    const { a } = twoClones(tmp);
    const res = momentum(a, 'claim');
    assert.equal(res.status, 1);
    assert.match(res.stderr, /usage: momentum claim/);
  } finally { rmrf(tmp); }
});

test('momentum team whoami resolves the actor', () => {
  const tmp = mktmp('team-claim-');
  try {
    const { a } = twoClones(tmp);
    const res = momentum(a, 'team', 'whoami');
    assert.equal(res.status, 0);
    assert.match(res.stdout, /alice\s+\(source: git/);
  } finally { rmrf(tmp); }
});
