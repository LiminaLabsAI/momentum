'use strict';

/**
 * Phase 30a — Team-Walk, Group 0 (contracts & identity).
 *
 * Covers the three foundational primitives that make momentum multiplayer-correct:
 *  - actor identity (durable "who" from git config; override; deterministic fallback)
 *  - per-actor append-only fragments (collision-free bulk coordination state)
 *  - git-ref compare-and-swap (atomic cross-machine allocation claims)
 *
 * The refcas tests use a real bare-remote + two-clone fixture — the same shape
 * the Group 4 e2e will use.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const { mktmp, rmrf, REPO_ROOT } = require('./_helpers');

const identity = require(path.join(REPO_ROOT, 'core', 'identity'));
const fragments = require(path.join(REPO_ROOT, 'core', 'team', 'lib', 'fragments'));
const refcas = require(path.join(REPO_ROOT, 'core', 'team', 'lib', 'refcas'));

function git(cwd, ...args) {
  return spawnSync('git', args, { cwd, encoding: 'utf8' });
}
function initRepo(dir, email, name) {
  fs.mkdirSync(dir, { recursive: true });
  git(dir, 'init', '-q');
  if (email) git(dir, 'config', 'user.email', email);
  git(dir, 'config', 'user.name', name || 'Test');
}

// ─── identity ────────────────────────────────────────────────────────────

test('resolveActor: $MOMENTUM_ACTOR override wins', () => {
  const a = identity.resolveActor(process.cwd(), { MOMENTUM_ACTOR: 'Ada Lovelace' });
  assert.equal(a.source, 'env');
  assert.equal(a.id, 'ada-lovelace');
});

test('resolveActor: from git config user.email', () => {
  const tmp = mktmp('team-id-');
  try {
    const repo = path.join(tmp, 'r');
    initRepo(repo, 'grace@example.com', 'Grace Hopper');
    const a = identity.resolveActor(repo, {});
    assert.equal(a.source, 'git');
    assert.equal(a.id, 'grace');
    assert.equal(a.email, 'grace@example.com');
    assert.equal(a.name, 'Grace Hopper');
  } finally { rmrf(tmp); }
});

test('resolveActor: deterministic fallback when git identity unset', () => {
  const tmp = mktmp('team-id-');
  try {
    const repo = path.join(tmp, 'r');
    initRepo(repo, null, 'noone');
    git(repo, 'config', 'user.email', ''); // local empty overrides any global identity
    const a1 = identity.resolveActor(repo, { USER: 'x' });
    const a2 = identity.resolveActor(repo, { USER: 'x' });
    assert.equal(a1.source, 'fallback');
    assert.match(a1.id, /^anon-[0-9a-f]{8}$/);
    assert.equal(a1.id, a2.id); // deterministic
  } finally { rmrf(tmp); }
});

// ─── fragments ───────────────────────────────────────────────────────────

test('fragments: own-prefix files never collide across actors', () => {
  const tmp = mktmp('team-frag-');
  try {
    const repo = path.join(tmp, 'r');
    fs.mkdirSync(repo, { recursive: true });
    const f1 = fragments.writeFragment(repo, 'active-phase', 'alice', 'row', { branch: 'x' }, { ts: '2026-07-10T00:00:00Z' });
    const f2 = fragments.writeFragment(repo, 'active-phase', 'bob', 'row', { branch: 'y' }, { ts: '2026-07-10T00:00:01Z' });
    assert.ok(path.basename(f1.file).startsWith('alice-'));
    assert.ok(path.basename(f2.file).startsWith('bob-'));
    assert.notEqual(f1.file, f2.file);
    const all = fragments.readFragments(repo, 'active-phase');
    assert.equal(all.length, 2);
    assert.equal(all[0].actor, 'alice'); // stable sort by ts
    assert.equal(all[1].actor, 'bob');
  } finally { rmrf(tmp); }
});

test('fragments: seq is monotonic per actor', () => {
  const tmp = mktmp('team-frag-');
  try {
    const repo = path.join(tmp, 'r');
    fs.mkdirSync(repo, { recursive: true });
    const a = fragments.writeFragment(repo, 'v', 'alice', 'k', { n: 1 });
    const b = fragments.writeFragment(repo, 'v', 'alice', 'k', { n: 2 });
    assert.equal(a.seq, 1);
    assert.equal(b.seq, 2);
  } finally { rmrf(tmp); }
});

test('fragments: foldLatest keeps last-writer per key', () => {
  const tmp = mktmp('team-frag-');
  try {
    const repo = path.join(tmp, 'r');
    fs.mkdirSync(repo, { recursive: true });
    fragments.writeFragment(repo, 'v', 'alice', 'row', { branch: 'p', status: 'open' }, { ts: '2026-07-10T00:00:00Z' });
    fragments.writeFragment(repo, 'v', 'alice', 'row', { branch: 'p', status: 'done' }, { ts: '2026-07-10T00:00:02Z' });
    const folded = fragments.foldLatest(fragments.readFragments(repo, 'v'), (f) => f.payload.branch);
    assert.equal(folded.size, 1);
    assert.equal(folded.get('p').payload.status, 'done');
  } finally { rmrf(tmp); }
});

// ─── refcas (bare-remote, two clones) ───────────────────────────────────────

function twoClones(tmp) {
  const bare = path.join(tmp, 'remote.git');
  git(tmp, 'init', '--bare', '-q', bare);
  const a = path.join(tmp, 'a');
  git(tmp, 'clone', '-q', bare, a);
  git(a, 'config', 'user.email', 'alice@x'); git(a, 'config', 'user.name', 'Alice');
  const b = path.join(tmp, 'b');
  git(tmp, 'clone', '-q', bare, b);
  git(b, 'config', 'user.email', 'bob@x'); git(b, 'config', 'user.name', 'Bob');
  return { bare, a, b };
}

test('refcas: concurrent claim — exactly one wins', () => {
  const tmp = mktmp('team-cas-');
  try {
    const { a, b } = twoClones(tmp);
    const ra = refcas.claim(a, { namespace: 'phase', key: '30', actor: 'alice' });
    const rb = refcas.claim(b, { namespace: 'phase', key: '30', actor: 'bob' });
    assert.equal([ra.won, rb.won].filter(Boolean).length, 1, `A.won=${ra.won} B.won=${rb.won}`);
    assert.equal(ra.won, true);  // A pushed first
    assert.equal(rb.won, false);
    assert.ok(rb.winner && rb.winner.actor === 'alice', 'loser can read the winner');
  } finally { rmrf(tmp); }
});

test('refcas: distinct keys both succeed', () => {
  const tmp = mktmp('team-cas-');
  try {
    const { a, b } = twoClones(tmp);
    const ra = refcas.claim(a, { namespace: 'version', key: '0.37.0', actor: 'alice' });
    const rb = refcas.claim(b, { namespace: 'version', key: '0.38.0', actor: 'bob' });
    assert.equal(ra.won, true);
    assert.equal(rb.won, true);
  } finally { rmrf(tmp); }
});

test('refcas: installRefspec is idempotent', () => {
  const tmp = mktmp('team-cas-');
  try {
    const { a } = twoClones(tmp);
    assert.equal(refcas.installRefspec(a, 'origin'), true);  // added
    assert.equal(refcas.installRefspec(a, 'origin'), false); // already present
    const fetch = git(a, 'config', '--get-all', 'remote.origin.fetch').stdout;
    assert.ok(fetch.includes('refs/momentum/*'));
  } finally { rmrf(tmp); }
});
