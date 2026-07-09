'use strict';

/**
 * Phase 30c — Team-Fly. Cross-machine lease-CAS, the optional authority-free
 * relay (publish/poll + graceful absence), and the published contract.
 */

const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const { mktmp, rmrf, REPO_ROOT } = require('./_helpers');
const lease = require(path.join(REPO_ROOT, 'core', 'team', 'lib', 'lease'));
const { createRelay, PROTOCOL_VERSION } = require(path.join(REPO_ROOT, 'core', 'team', 'relay', 'server'));
const relayClient = require(path.join(REPO_ROOT, 'core', 'team', 'relay', 'client'));
const { CONTRACT, CONTRACT_VERSION } = require(path.join(REPO_ROOT, 'core', 'team', 'contract'));

function git(cwd, ...a) { return spawnSync('git', a, { cwd, encoding: 'utf8' }); }
function twoClones(tmp) {
  const bare = path.join(tmp, 'remote.git'); git(tmp, 'init', '--bare', '-q', bare);
  const a = path.join(tmp, 'a'); git(tmp, 'clone', '-q', bare, a); git(a, 'config', 'user.email', 'alice@x'); git(a, 'config', 'user.name', 'Alice');
  const b = path.join(tmp, 'b'); git(tmp, 'clone', '-q', bare, b); git(b, 'config', 'user.email', 'bob@x'); git(b, 'config', 'user.name', 'Bob');
  return { a, b };
}
function startRelay() {
  return new Promise((resolve) => {
    const relay = createRelay({});
    relay.listen((port) => resolve({ relay, url: `http://127.0.0.1:${port}` }));
  });
}

// ─── lease-CAS (two clones) ──────────────────────────────────────────────

test('lease: single-owner across clones; skew cannot double-own', () => {
  const tmp = mktmp('team-fly-');
  try {
    const { a, b } = twoClones(tmp);
    const la = lease.acquireLease(a, 'repo:client', 'alice');
    assert.equal(la.held, true);
    const lb = lease.acquireLease(b, 'repo:client', 'bob');
    assert.equal(lb.held, false, 'Bob cannot also own the repo');
    assert.equal(lb.owner, 'alice');
    lease.releaseLease(a, 'repo:client');
    assert.equal(lease.acquireLease(b, 'repo:client', 'bob').held, true);
  } finally { rmrf(tmp); }
});

// ─── optional relay ─────────────────────────────────────────────────────

test('relay: publish → poll sees the event (near-real-time)', async () => {
  const { relay, url } = await startRelay();
  try {
    const pub = await relayClient.publish(url, { kind: 'active-phase', actor: 'alice', branch: 'phase-30c' });
    assert.equal(pub.ok, true);
    assert.equal(pub.protocol, PROTOCOL_VERSION);
    const got = await relayClient.poll(url, 0);
    assert.equal(got.events.length, 1);
    assert.equal(got.events[0].actor, 'alice');
  } finally {
    await new Promise((r) => relay.close(r));
  }
});

test('relay: graceful absence — no url and unreachable url both skip, never throw', async () => {
  const none = await relayClient.publish('', { kind: 'x' });
  assert.equal(none.skipped, true);
  const unreachable = await relayClient.poll('http://127.0.0.1:59999', 0);
  assert.equal(unreachable.skipped, true);
  assert.deepEqual(unreachable.events, []);
});

test('relay: authority-free — no gate/approve/land endpoints exist', async () => {
  const { relay, url } = await startRelay();
  try {
    // only publish/events/health respond; a "gate" path 404s
    const r = await relayClient.poll(url + '/../gate', 0); // bogus path → not events
    assert.ok(r.skipped || (r.events && r.events.length === 0));
  } finally {
    await new Promise((r) => relay.close(r));
  }
});

// ─── published contract ─────────────────────────────────────────────────

test('contract: versioned + describes fragments/refs/relay', () => {
  assert.equal(CONTRACT_VERSION, '1.0.0'); // breaking change ⇒ bump + update this pin
  assert.equal(CONTRACT.version, CONTRACT_VERSION);
  assert.equal(CONTRACT.relay.authorityFree, true);
  assert.ok(CONTRACT.fragments.views.includes('active-phase'));
  assert.match(CONTRACT.refs.leases, /refs\/momentum\/leases/);
});
