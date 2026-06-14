'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf } = require('./_helpers');
const manifestLib = require('../core/swarm/lib/manifest');
const conductor = require('../core/swarm/conductor');
const boardLib = require('../core/swarm/lib/board');

function fixture(tmp, sessionId = 'sess-1') {
  const eco = {
    name: 'test-eco', version: 1, created: '2026-06-13',
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
    nowIso: '2026-06-13T17:00:00Z', ecosystemManifest: eco,
  });
  manifestLib.writeManifest(tmp, '0001-foo', manifest);
  boardLib.refreshBoard(tmp, '0001-foo', '2026-06-13T17:00:00Z');
}

// ─── assertOwnership (pure helper) ──────────────────────────────────────────

test('assertOwnership — owner write is allowed', () => {
  const m = {
    repos: {
      a: { owner: 'sess-1', lease_expires_at: '2026-06-14T00:00:00Z' },
    },
  };
  const d = manifestLib.assertOwnership(m, 'a', 'sess-1', '2026-06-13T17:00:00Z');
  assert.equal(d.allowed, true);
  assert.equal(d.reason, 'owner');
  assert.equal(d.expired, false);
});

test('assertOwnership — non-owner with valid lease is rejected', () => {
  const m = {
    repos: {
      a: { owner: 'sess-1', lease_expires_at: '2026-06-14T00:00:00Z' },
    },
  };
  const d = manifestLib.assertOwnership(m, 'a', 'sess-2', '2026-06-13T17:00:00Z');
  assert.equal(d.allowed, false);
  assert.match(d.reason, /owned by sess-1/);
});

test('assertOwnership — non-owner after lease expiry is allowed (takeover)', () => {
  const m = {
    repos: {
      a: { owner: 'sess-1', lease_expires_at: '2026-06-13T17:00:00Z' },
    },
  };
  const d = manifestLib.assertOwnership(m, 'a', 'sess-2', '2026-06-13T17:00:01Z');
  assert.equal(d.allowed, true);
  assert.equal(d.expired, true);
  assert.match(d.reason, /lease expired/);
});

test('assertOwnership — unclaimed sentinel allows any caller', () => {
  const m = {
    repos: {
      a: { owner: manifestLib.UNCLAIMED },
    },
  };
  const d = manifestLib.assertOwnership(m, 'a', 'sess-new', '2026-06-13T17:00:00Z');
  assert.equal(d.allowed, true);
  assert.match(d.reason, /unclaimed/);
});

test('assertOwnership — focusing sentinel allows any caller', () => {
  const m = {
    repos: {
      a: { owner: manifestLib.FOCUSING },
    },
  };
  const d = manifestLib.assertOwnership(m, 'a', 'sess-new', '2026-06-13T17:00:00Z');
  assert.equal(d.allowed, true);
});

test('assertOwnership — unknown repo is rejected cleanly', () => {
  const m = { repos: { a: { owner: 'sess-1' } } };
  const d = manifestLib.assertOwnership(m, 'b', 'sess-1', '2026-06-13T17:00:00Z');
  assert.equal(d.allowed, false);
  assert.match(d.reason, /not in manifest/);
});

// ─── updateManifestAsOwner ──────────────────────────────────────────────────

test('updateManifestAsOwner — owner write applies the mutation', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    const next = manifestLib.updateManifestAsOwner({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      sessionId: 'sess-1', repo: 'a',
      nowIso: '2026-06-13T17:30:00Z',
      mutate: (m) => {
        m.repos.a.status = 'running';
        m.repos.a.lease_renewed_at = '2026-06-13T17:30:00Z';
      },
    });
    assert.equal(next.repos.a.status, 'running');
    assert.equal(next.repos.a.lease_renewed_at, '2026-06-13T17:30:00Z');
  } finally { rmrf(tmp); }
});

test('updateManifestAsOwner — non-owner with valid lease is rejected with EOWNERSHIP', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    // Set a valid lease so the takeover path doesn't kick in
    manifestLib.updateManifest(tmp, '0001-foo', (m) => {
      m.repos.a.lease_expires_at = '2026-06-14T00:00:00Z';
      m.repos.a.lease_renewed_at = '2026-06-13T17:00:00Z';
    });
    let err;
    try {
      manifestLib.updateManifestAsOwner({
        ecosystemRoot: tmp, swarmId: '0001-foo',
        sessionId: 'sess-2', repo: 'a',
        nowIso: '2026-06-13T17:30:00Z',
        mutate: (m) => { m.repos.a.status = 'running'; },
      });
    } catch (e) { err = e; }
    assert.ok(err);
    assert.equal(err.code, 'EOWNERSHIP');
    assert.equal(err.decision.allowed, false);
    // Manifest unchanged
    const m = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(m.repos.a.status, 'queued');
  } finally { rmrf(tmp); }
});

test('updateManifestAsOwner — takeover allowed after lease expiry', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    manifestLib.updateManifest(tmp, '0001-foo', (m) => {
      m.repos.a.lease_expires_at = '2026-06-13T17:00:00Z'; // already expired by mutate time
      m.repos.a.lease_renewed_at = '2026-06-13T16:00:00Z';
    });
    const next = manifestLib.updateManifestAsOwner({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      sessionId: 'sess-2', repo: 'a',
      nowIso: '2026-06-13T18:00:00Z',
      mutate: (m, decision) => {
        assert.equal(decision.expired, true);
        m.repos.a.owner = 'sess-2';
        m.repos.a.lease_renewed_at = '2026-06-13T18:00:00Z';
        m.repos.a.lease_expires_at = '2026-06-14T18:00:00Z';
      },
    });
    assert.equal(next.repos.a.owner, 'sess-2');
  } finally { rmrf(tmp); }
});

test('updateManifestAsOwner — UNCLAIMED owner allows takeover regardless of lease', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    manifestLib.updateManifest(tmp, '0001-foo', (m) => {
      m.repos.a.owner = manifestLib.UNCLAIMED;
      // Keep an old, valid lease — should NOT block since sentinel takes precedence
      m.repos.a.lease_expires_at = '2026-06-14T00:00:00Z';
    });
    const next = manifestLib.updateManifestAsOwner({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      sessionId: 'sess-99', repo: 'a',
      nowIso: '2026-06-13T17:30:00Z',
      mutate: (m) => { m.repos.a.owner = 'sess-99'; },
    });
    assert.equal(next.repos.a.owner, 'sess-99');
  } finally { rmrf(tmp); }
});

test('updateManifestAsOwner — postCommit then() fires after lock release', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    let observed = null;
    manifestLib.updateManifestAsOwner({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      sessionId: 'sess-1', repo: 'a',
      nowIso: '2026-06-13T17:30:00Z',
      mutate: (m) => {
        m.repos.a.status = 'running';
        return { manifest: m, then: (next) => { observed = next.repos.a.status; } };
      },
    });
    assert.equal(observed, 'running');
  } finally { rmrf(tmp); }
});

test('updateManifestAsOwner — fails validation rolls back (no write commits)', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    const before = manifestLib.loadManifest(tmp, '0001-foo');
    assert.throws(
      () => manifestLib.updateManifestAsOwner({
        ecosystemRoot: tmp, swarmId: '0001-foo',
        sessionId: 'sess-1', repo: 'a',
        nowIso: '2026-06-13T17:30:00Z',
        mutate: (m) => { m.repos.a.status = 'bogus'; },
      }),
      /validation failed/,
    );
    const after = manifestLib.loadManifest(tmp, '0001-foo');
    assert.deepEqual(after, before);
  } finally { rmrf(tmp); }
});
