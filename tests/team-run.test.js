'use strict';

/**
 * Phase 30b — Team-Run. Presence (heartbeat/liveness), reviewer≠author approvals
 * ledger, and the shared merge-queue turn (single-holder ref-CAS across clones).
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const { mktmp, rmrf, REPO_ROOT } = require('./_helpers');
const presence = require(path.join(REPO_ROOT, 'core', 'team', 'lib', 'presence'));
const approvals = require(path.join(REPO_ROOT, 'core', 'team', 'lib', 'approvals'));
const queue = require(path.join(REPO_ROOT, 'core', 'team', 'lib', 'queue'));
const MOMENTUM = path.join(REPO_ROOT, 'bin', 'momentum.js');

function git(cwd, ...a) { return spawnSync('git', a, { cwd, encoding: 'utf8' }); }
function momentum(cwd, ...a) { return spawnSync('node', [MOMENTUM, ...a], { cwd, encoding: 'utf8', env: { ...process.env } }); }
function initRepo(dir, email) { fs.mkdirSync(dir, { recursive: true }); git(dir, 'init', '-q'); git(dir, 'config', 'user.email', email); git(dir, 'config', 'user.name', 'T'); }
function twoClones(tmp) {
  const bare = path.join(tmp, 'remote.git'); git(tmp, 'init', '--bare', '-q', bare);
  const a = path.join(tmp, 'a'); git(tmp, 'clone', '-q', bare, a); git(a, 'config', 'user.email', 'alice@x'); git(a, 'config', 'user.name', 'Alice');
  const b = path.join(tmp, 'b'); git(tmp, 'clone', '-q', bare, b); git(b, 'config', 'user.email', 'bob@x'); git(b, 'config', 'user.name', 'Bob');
  return { a, b };
}

// ─── presence ────────────────────────────────────────────────────────────

test('presence: heartbeat + liveness thresholds', () => {
  const tmp = mktmp('team-run-');
  try {
    const r = path.join(tmp, 'r'); fs.mkdirSync(r, { recursive: true });
    const t0 = '2026-07-10T00:00:00.000Z';
    presence.heartbeat(r, 'alice', { branch: 'phase-30b', activity: 'coding' }, { ts: t0 });
    const base = new Date(t0).getTime();
    let list = presence.presence(r, base + 60 * 1000); // 1 min later
    assert.equal(list.length, 1);
    assert.equal(list[0].liveness, 'active');
    list = presence.presence(r, base + 20 * 60 * 1000); // 20 min → idle
    assert.equal(list[0].liveness, 'idle');
    list = presence.presence(r, base + 2 * 3600 * 1000); // 2 hr → offline
    assert.equal(list[0].liveness, 'offline');
  } finally { rmrf(tmp); }
});

// ─── reviewer≠author ────────────────────────────────────────────────────────

test('approvals: author self-approval does not satisfy; peer approval does', () => {
  const tmp = mktmp('team-run-');
  try {
    const r = path.join(tmp, 'r'); fs.mkdirSync(r, { recursive: true });
    approvals.approve(r, 'alice', 'phase-30b', { ts: '2026-07-10T00:00:00Z' }); // author self-approves
    assert.equal(approvals.satisfied(r, 'phase-30b', { author: 'alice', threshold: 1 }), false);
    approvals.approve(r, 'bob', 'phase-30b', { ts: '2026-07-10T00:00:01Z' }); // peer approves
    assert.equal(approvals.satisfied(r, 'phase-30b', { author: 'alice', threshold: 1 }), true);
    // allowSelf restores single-operator behavior
    approvals.approve(r, 'carol', 'x', { ts: '2026-07-10T00:00:02Z' });
    assert.equal(approvals.satisfied(r, 'x', { author: 'carol', threshold: 1 }), false);
    assert.equal(approvals.satisfied(r, 'x', { author: 'carol', threshold: 1, allowSelf: true }), true);
  } finally { rmrf(tmp); }
});

test('approvals: threshold of 2 needs two distinct peers', () => {
  const tmp = mktmp('team-run-');
  try {
    const r = path.join(tmp, 'r'); fs.mkdirSync(r, { recursive: true });
    approvals.approve(r, 'bob', 'c', { ts: '2026-07-10T00:00:00Z' });
    assert.equal(approvals.satisfied(r, 'c', { author: 'alice', threshold: 2 }), false);
    approvals.approve(r, 'carol', 'c', { ts: '2026-07-10T00:00:01Z' });
    assert.equal(approvals.satisfied(r, 'c', { author: 'alice', threshold: 2 }), true);
  } finally { rmrf(tmp); }
});

// ─── shared merge-queue turn (two clones) ───────────────────────────────────

test('queue: single-holder turn across clones (take → blocked → release → take)', () => {
  const tmp = mktmp('team-run-');
  try {
    const { a, b } = twoClones(tmp);
    const ta = queue.takeTurn(a, 'main', 'alice');
    assert.equal(ta.held, true);
    const tb = queue.takeTurn(b, 'main', 'bob');
    assert.equal(tb.held, false, 'B must be blocked while A holds');
    assert.equal(tb.holder, 'alice');
    queue.releaseTurn(a, 'main');
    const tb2 = queue.takeTurn(b, 'main', 'bob');
    assert.equal(tb2.held, true, 'B takes the turn after A releases');
  } finally { rmrf(tmp); }
});

// ─── CLI ────────────────────────────────────────────────────────────────

test('momentum team approve + check: gate blocks self, passes peer', () => {
  const tmp = mktmp('team-run-');
  try {
    const r = path.join(tmp, 'r'); initRepo(r, 'alice@x');
    assert.equal(momentum(r, 'team', 'approve', 'phase-30b').status, 0);
    // author=alice, only alice approved → not satisfied (exit 2)
    assert.equal(momentum(r, 'team', 'check', 'phase-30b', '--author', 'alice').status, 2);
    // a peer approves
    momentum(r, 'team', 'approve', 'phase-30b', '--actor', 'bob');
    assert.equal(momentum(r, 'team', 'check', 'phase-30b', '--author', 'alice').status, 0);
  } finally { rmrf(tmp); }
});

test('auto-heartbeat: a team command in a team-active repo refreshes presence', () => {
  const tmp = mktmp('team-run-');
  try {
    const r = path.join(tmp, 'r'); initRepo(r, 'alice@x');
    momentum(r, 'team', 'approve', 'x');   // activates team mode (.momentum/team/ now exists)
    const pres = momentum(r, 'team', 'presence'); // auto-heartbeats alice, then shows presence
    assert.match(pres.stdout, /alice\s+active/, `expected alice active, got:\n${pres.stdout}`);
  } finally { rmrf(tmp); }
});

test('momentum team turn take/holder/release', () => {
  const tmp = mktmp('team-run-');
  try {
    const { a } = twoClones(tmp);
    assert.equal(momentum(a, 'team', 'turn', 'take', 'main').status, 0);
    assert.match(momentum(a, 'team', 'turn', 'holder', 'main').stdout, /held by 'alice'/);
    assert.equal(momentum(a, 'team', 'turn', 'release', 'main').status, 0);
  } finally { rmrf(tmp); }
});

test('Team-Run e2e: shared turn + reviewer≠author gate across two clones', () => {
  const tmp = mktmp('team-run-');
  try {
    const { a, b } = twoClones(tmp);
    // Alice takes the landing turn; Bob is blocked
    assert.equal(queue.takeTurn(a, 'main', 'alice').held, true);
    assert.equal(queue.takeTurn(b, 'main', 'bob').held, false);
    // Alice's change needs a peer approval — her own doesn't count
    approvals.approve(a, 'alice', 'phase-30b-team-run', { ts: '2026-07-10T00:00:00Z' });
    assert.equal(approvals.satisfied(a, 'phase-30b-team-run', { author: 'alice', threshold: 1 }), false);
    approvals.approve(a, 'bob', 'phase-30b-team-run', { ts: '2026-07-10T00:00:01Z' });
    assert.equal(approvals.satisfied(a, 'phase-30b-team-run', { author: 'alice', threshold: 1 }), true);
    // Alice lands + releases; Bob can now take the runway
    queue.releaseTurn(a, 'main');
    assert.equal(queue.takeTurn(b, 'main', 'bob').held, true);
  } finally { rmrf(tmp); }
});
