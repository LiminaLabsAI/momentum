'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli } = require('./_helpers');
const manifestLib = require('../core/swarm/lib/manifest');
const signalsLib = require('../core/swarm/signals');
const conductor = require('../core/swarm/conductor');
const boardLib = require('../core/swarm/lib/board');

function fixture(tmp, sessionId = 'sess-1') {
  const eco = {
    name: 'test-eco', version: 1, created: '2026-06-14',
    members: [
      { id: 'a', path: 'a', role: 'library' },
      { id: 'b', path: 'b', role: 'platform' },
    ],
    dependencies: [{ from: 'b', to: 'a' }],
  };
  fs.writeFileSync(path.join(tmp, 'ecosystem.json'), JSON.stringify(eco, null, 2));
  for (const m of eco.members) fs.mkdirSync(path.join(tmp, m.path), { recursive: true });
  const manifest = conductor.planSwarm({
    ecosystemRoot: tmp, swarmId: '0001-foo', initiative: 'foo',
    impactedRepos: ['a', 'b'], phaseSlug: 'phase-1-foo',
    sessionId, mode: 'checkpoint',
    nowIso: '2026-06-14T17:00:00Z', ecosystemManifest: eco,
  });
  manifestLib.writeManifest(tmp, '0001-foo', manifest);
  boardLib.refreshBoard(tmp, '0001-foo', '2026-06-14T17:00:00Z');
}

function setOwnerWithLease(tmp, swarmId, repo, owner, leaseExpiresAt) {
  manifestLib.updateManifest(tmp, swarmId, (m) => {
    m.repos[repo].owner = owner;
    m.repos[repo].lease_expires_at = leaseExpiresAt;
    m.repos[repo].lease_renewed_at = '2026-06-14T17:00:00Z';
  });
}

// ─── claim ────────────────────────────────────────────────────────────────

test('claim — succeeds against unclaimed repo and sets lease', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    // Release it to UNCLAIMED first so a different session can claim
    manifestLib.updateManifest(tmp, '0001-foo', (m) => {
      m.repos.a.owner = manifestLib.UNCLAIMED;
      delete m.repos.a.lease_expires_at;
    });
    const r = runCli(
      ['swarm', 'claim', '0001-foo', 'a', '--session', 'sess-2', '--lease-hours', '24', '--json', '--ecosystem', tmp],
    );
    assert.equal(r.status, 0, r.stderr);
    const json = JSON.parse(r.stdout);
    assert.equal(json.repo, 'a');
    assert.equal(json.owner, 'sess-2');
    const m = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(m.repos.a.owner, 'sess-2');
    assert.ok(m.repos.a.lease_expires_at);
    assert.ok(m.audit.find((e) => e.event === 'claim' && e.repo === 'a' && e.actor === 'sess-2'));
  } finally { rmrf(tmp); }
});

test('claim — rejected when another session holds a valid lease; writes claim-request signal', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    // Far-future expiry so the lease is unambiguously valid regardless of host wall-clock
    setOwnerWithLease(tmp, '0001-foo', 'a', 'sess-1', '2099-01-01T00:00:00Z');
    const r = runCli(
      ['swarm', 'claim', '0001-foo', 'a', '--session', 'sess-2', '--ecosystem', tmp],
    );
    assert.equal(r.status, 1, `expected exit 1, got ${r.status}\n${r.stderr}`);
    assert.match(r.stderr, /rejected/);
    assert.match(r.stderr, /claim-request signal/);
    // Manifest unchanged
    const m = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(m.repos.a.owner, 'sess-1');
    // Signal written
    const signals = signalsLib.listPendingSignals(tmp, '0001-foo', { type: 'claim-request' });
    assert.equal(signals.length, 1);
    assert.equal(signals[0].repo, 'a');
    assert.equal(signals[0].from_session, 'sess-2');
  } finally { rmrf(tmp); }
});

test('claim — succeeds via lease takeover after expiry; logs lease-takeover audit', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    // Far-past expiry so this works regardless of host wall-clock time
    setOwnerWithLease(tmp, '0001-foo', 'a', 'sess-1', '2024-01-01T00:00:00Z');
    // Now is later than the lease expiry — sess-2 may take over
    const r = runCli(
      ['swarm', 'claim', '0001-foo', 'a', '--session', 'sess-2', '--json', '--ecosystem', tmp],
    );
    assert.equal(r.status, 0, r.stderr);
    const json = JSON.parse(r.stdout);
    assert.equal(json.owner, 'sess-2');
    const m = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(m.repos.a.owner, 'sess-2');
    assert.ok(m.audit.find((e) => e.event === 'claim' && e.repo === 'a'));
    assert.ok(m.audit.find((e) => e.event === 'lease-takeover' && e.repo === 'a'));
  } finally { rmrf(tmp); }
});

test('claim — owner re-claim refreshes own lease without changing owner', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    // Start with sess-1 as owner with a past lease (refresh should bump well past it)
    setOwnerWithLease(tmp, '0001-foo', 'a', 'sess-1', '2024-01-01T00:00:00Z');
    const before = manifestLib.loadManifest(tmp, '0001-foo');
    const r = runCli(
      ['swarm', 'claim', '0001-foo', 'a', '--session', 'sess-1', '--lease-hours', '24', '--json', '--ecosystem', tmp],
    );
    assert.equal(r.status, 0, r.stderr);
    const m = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(m.repos.a.owner, 'sess-1');
    // New lease is later than the old one (and the wall-clock-now)
    assert.ok(Date.parse(m.repos.a.lease_expires_at) > Date.parse(before.repos.a.lease_expires_at));
  } finally { rmrf(tmp); }
});

// ─── release ──────────────────────────────────────────────────────────────

test('release — owner can release; sets UNCLAIMED and clears lease fields', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    setOwnerWithLease(tmp, '0001-foo', 'a', 'sess-1', '2099-01-01T00:00:00Z');
    const r = runCli(
      ['swarm', 'release', '0001-foo', 'a', '--session', 'sess-1', '--json', '--ecosystem', tmp],
    );
    assert.equal(r.status, 0, r.stderr);
    const m = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(m.repos.a.owner, manifestLib.UNCLAIMED);
    assert.equal(m.repos.a.lease_expires_at, undefined);
    assert.equal(m.repos.a.lease_renewed_at, undefined);
    assert.ok(m.audit.find((e) => e.event === 'release' && e.repo === 'a'));
  } finally { rmrf(tmp); }
});

test('release — idempotent on already-unclaimed repo (no-op exit 0)', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    manifestLib.updateManifest(tmp, '0001-foo', (m) => {
      m.repos.a.owner = manifestLib.UNCLAIMED;
      delete m.repos.a.lease_expires_at;
    });
    const beforeAuditLen = (manifestLib.loadManifest(tmp, '0001-foo').audit || []).length;
    const r = runCli(
      ['swarm', 'release', '0001-foo', 'a', '--session', 'sess-2', '--json', '--ecosystem', tmp],
    );
    assert.equal(r.status, 0, r.stderr);
    const json = JSON.parse(r.stdout);
    assert.equal(json.noop, true);
    const afterAuditLen = (manifestLib.loadManifest(tmp, '0001-foo').audit || []).length;
    assert.equal(afterAuditLen, beforeAuditLen);
  } finally { rmrf(tmp); }
});

test('release — non-owner is rejected with exit 1', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    setOwnerWithLease(tmp, '0001-foo', 'a', 'sess-1', '2099-01-01T00:00:00Z');
    const r = runCli(
      ['swarm', 'release', '0001-foo', 'a', '--session', 'sess-2', '--ecosystem', tmp],
    );
    assert.equal(r.status, 1, `expected exit 1, got ${r.status}\n${r.stderr}`);
    assert.match(r.stderr, /rejected/);
    // Manifest unchanged
    const m = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(m.repos.a.owner, 'sess-1');
  } finally { rmrf(tmp); }
});

// ─── usage / error surfaces ───────────────────────────────────────────────

test('claim — missing positional args surfaces usage', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    const r = runCli(['swarm', 'claim'], { cwd: tmp });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /usage/);
  } finally { rmrf(tmp); }
});

test('release — missing positional args surfaces usage', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    const r = runCli(['swarm', 'release'], { cwd: tmp });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /usage/);
  } finally { rmrf(tmp); }
});

test('swarm --help mentions claim + release', () => {
  const r = runCli(['swarm', '--help']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /momentum swarm claim/);
  assert.match(r.stdout, /momentum swarm release/);
});
