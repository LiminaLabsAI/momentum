'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf } = require('./_helpers');
const conductor = require('../core/swarm/conductor');
const manifestLib = require('../core/swarm/lib/manifest');
const boardLib = require('../core/swarm/lib/board');

function setupFixture(tmp) {
  const eco = {
    name: 'test-eco', version: 1, created: '2026-06-12',
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
    sessionId: 'sess_owner', mode: 'checkpoint',
    nowIso: '2026-06-12T17:00:00Z', ecosystemManifest: eco,
  });
  manifestLib.writeManifest(tmp, '0001-foo', manifest);
  boardLib.refreshBoard(tmp, '0001-foo', '2026-06-12T17:00:00Z');
  return manifest;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reserved directories must exist on every new swarm
// ─────────────────────────────────────────────────────────────────────────────

test('reserved directories — signals/ and tokens/ exist on swarm create', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    const swarmRoot = manifestLib.swarmDir(tmp, '0001-foo');
    for (const d of ['signals', 'tokens']) {
      const p = path.join(swarmRoot, d);
      assert.ok(fs.existsSync(p), `${d}/ should exist`);
      assert.ok(fs.statSync(p).isDirectory(), `${d} should be a directory`);
      assert.deepEqual(fs.readdirSync(p), [], `${d}/ should start empty (Phase 17.5 semantics)`);
    }
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Per-repo portability fields populated at plan time
// ─────────────────────────────────────────────────────────────────────────────

test('planSwarm — populates owner / lease_expires_at / lease_renewed_at / claimed_by_session', () => {
  const tmp = mktmp();
  try {
    const manifest = setupFixture(tmp);
    for (const repoId of ['a', 'b']) {
      const r = manifest.repos[repoId];
      assert.equal(r.owner, 'sess_owner');
      assert.equal(r.claimed_by_session, 'sess_owner');
      assert.ok(r.lease_expires_at, 'lease_expires_at must be set');
      assert.ok(r.lease_renewed_at, 'lease_renewed_at must be set');
      // Lease default = 24h
      const diff = Date.parse(r.lease_expires_at) - Date.parse(r.lease_renewed_at);
      assert.equal(diff, 24 * 3600 * 1000, '24h lease default');
    }
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// sessions[] registry
// ─────────────────────────────────────────────────────────────────────────────

test('planSwarm — sessions[] starts with original conductor', () => {
  const tmp = mktmp();
  try {
    const manifest = setupFixture(tmp);
    assert.equal(manifest.sessions.length, 1);
    assert.equal(manifest.sessions[0].session_id, 'sess_owner');
    assert.equal(manifest.sessions[0].first_seen, '2026-06-12T17:00:00Z');
    assert.equal(manifest.sessions[0].last_seen, '2026-06-12T17:00:00Z');
  } finally {
    rmrf(tmp);
  }
});

test('sessions[] — second session join registers without removing first', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    conductor.resumeSwarm(tmp, '0001-foo', 'sess_second', '2026-06-12T18:00:00Z');
    const m = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(m.sessions.length, 2);
    assert.deepEqual(m.sessions.map((s) => s.session_id).sort(), ['sess_owner', 'sess_second']);
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// renewLeases — Phase 17.5 hook lit up in v0.20.0 (audit only)
// ─────────────────────────────────────────────────────────────────────────────

test('renewLeases — renews ALL owned repos, leaves others alone', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    // Hand over repo b to a second session
    manifestLib.updateManifest(tmp, '0001-foo', (m) => {
      m.repos.b.owner = 'sess_second';
    });
    conductor.renewLeases(tmp, '0001-foo', 'sess_owner', '2026-06-12T18:00:00Z');
    const m = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(m.repos.a.lease_renewed_at, '2026-06-12T18:00:00Z',
      'repo a (owned) renewed');
    assert.notEqual(m.repos.b.lease_renewed_at, '2026-06-12T18:00:00Z',
      'repo b (other session) unchanged');
    // Expiry advanced 24h from the renewal point
    assert.equal(
      Date.parse(m.repos.a.lease_expires_at),
      Date.parse('2026-06-13T18:00:00Z')
    );
  } finally {
    rmrf(tmp);
  }
});

test('renewLeases — no-op for sessions that own no repos', () => {
  const tmp = mktmp();
  try {
    const manifest = setupFixture(tmp);
    const beforeA = manifest.repos.a.lease_renewed_at;
    conductor.renewLeases(tmp, '0001-foo', 'sess_unrelated', '2026-06-12T18:00:00Z');
    const m = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(m.repos.a.lease_renewed_at, beforeA,
      'no owned repos → no renewal');
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Schema validation — portability fields accepted by validator
// ─────────────────────────────────────────────────────────────────────────────

test('validateManifest — accepts portability fields on repos', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    const m = manifestLib.loadManifest(tmp, '0001-foo');
    const v = manifestLib.validateManifest(m);
    assert.equal(v.ok, true, v.ok ? '' : JSON.stringify(v.errors));
  } finally {
    rmrf(tmp);
  }
});

test('validateManifest — rejects malformed lease ISO timestamp', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    const m = manifestLib.loadManifest(tmp, '0001-foo');
    m.repos.a.lease_expires_at = 'not-a-date';
    const v = manifestLib.validateManifest(m);
    assert.equal(v.ok, false);
    assert.ok(v.errors.some((e) => e.path.endsWith('.lease_expires_at')));
  } finally {
    rmrf(tmp);
  }
});

test('validateManifest — rejects malformed session entries', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    const m = manifestLib.loadManifest(tmp, '0001-foo');
    m.sessions.push({ session_id: '', first_seen: '2026-06-12T17:00:00Z' });
    const v = manifestLib.validateManifest(m);
    assert.equal(v.ok, false);
    assert.ok(v.errors.some((e) => e.path.includes('sessions')));
  } finally {
    rmrf(tmp);
  }
});

test('validateManifest — accepts contracts[] schema for v0.20.1 readiness', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    const m = manifestLib.loadManifest(tmp, '0001-foo');
    m.contracts = [{
      surface: 'auth-token', owner: 'a', consumers: ['b'], version: 1, content_hash: 'abc12345',
    }];
    const v = manifestLib.validateManifest(m);
    assert.equal(v.ok, true);
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Forward compatibility — schema additions don't break old manifests
// ─────────────────────────────────────────────────────────────────────────────

test('forward compat — manifest without sessions[] still validates', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    const m = manifestLib.loadManifest(tmp, '0001-foo');
    delete m.sessions;
    const v = manifestLib.validateManifest(m);
    assert.equal(v.ok, true);
  } finally {
    rmrf(tmp);
  }
});

test('forward compat — manifest without portability lease fields still validates', () => {
  const tmp = mktmp();
  try {
    setupFixture(tmp);
    const m = manifestLib.loadManifest(tmp, '0001-foo');
    for (const r of Object.values(m.repos)) {
      delete r.lease_expires_at;
      delete r.lease_renewed_at;
      delete r.claimed_by_session;
    }
    const v = manifestLib.validateManifest(m);
    assert.equal(v.ok, true, 'optional portability fields can be absent');
  } finally {
    rmrf(tmp);
  }
});
