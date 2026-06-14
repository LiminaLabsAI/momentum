'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli } = require('./_helpers');
const manifestLib = require('../core/swarm/lib/manifest');
const tokensLib = require('../core/swarm/lib/tokens');
const sessionsLib = require('../core/swarm/lib/sessions');
const joinLib = require('../core/swarm/join');
const focusLib = require('../core/swarm/focus');
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

// ─── library ──────────────────────────────────────────────────────────────

test('join — registration only adds to sessions[] and audit-logs join', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    const r = joinLib.join({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      sessionId: 'sess-2', nowIso: '2026-06-14T17:30:00Z',
    });
    assert.equal(r.sessionId, 'sess-2');
    assert.ok(r.sessions.find((s) => s.session_id === 'sess-2'));
    assert.equal(r.claimed, null);
    assert.equal(r.token, null);
    const m = manifestLib.loadManifest(tmp, '0001-foo');
    assert.ok(m.audit.find((e) => e.event === 'join' && e.actor === 'sess-2' && /registration only/.test(e.detail)));
  } finally { rmrf(tmp); }
});

test('join — re-joining same session bumps last_seen, does not duplicate', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    joinLib.join({ ecosystemRoot: tmp, swarmId: '0001-foo', sessionId: 'sess-2', nowIso: '2026-06-14T17:30:00Z' });
    joinLib.join({ ecosystemRoot: tmp, swarmId: '0001-foo', sessionId: 'sess-2', nowIso: '2026-06-14T17:35:00Z' });
    const m = manifestLib.loadManifest(tmp, '0001-foo');
    const matches = m.sessions.filter((s) => s.session_id === 'sess-2');
    assert.equal(matches.length, 1);
    assert.equal(matches[0].first_seen, '2026-06-14T17:30:00Z');
    assert.equal(matches[0].last_seen, '2026-06-14T17:35:00Z');
  } finally { rmrf(tmp); }
});

test('join --token (focus) — consumes token and claims target_repo', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    // sess-1 focuses repo a
    const f = focusLib.focus({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      repo: 'a', sessionId: 'sess-1', nowIso: '2026-06-14T17:30:00Z',
    });
    // sess-2 joins with the token
    const r = joinLib.join({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      sessionId: 'sess-2', nowIso: '2026-06-14T17:31:00Z',
      token: f.token.token,
    });
    assert.equal(r.claimed.repo, 'a');
    assert.equal(r.claimed.owner, 'sess-2');
    assert.equal(r.token.kind, 'focus');
    assert.equal(r.token.target_repo, 'a');
    const m = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(m.repos.a.owner, 'sess-2');
    assert.equal(m.repos.a.claimed_by_session, 'sess-2');
    assert.ok(m.repos.a.lease_expires_at);
    // Token deleted after consume
    const tokenFile = path.join(tokensLib.tokensDir(tmp, '0001-foo'), `${f.token.token}.json`);
    assert.ok(!fs.existsSync(tokenFile));
  } finally { rmrf(tmp); }
});

test('join --token (join) — registers without claiming', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    const t = tokensLib.writeToken({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      kind: 'join', issuedBy: 'sess-1',
      nowIso: '2026-06-14T17:30:00Z',
    });
    const r = joinLib.join({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      sessionId: 'sess-2', nowIso: '2026-06-14T17:31:00Z',
      token: t.token,
    });
    assert.equal(r.token.kind, 'join');
    assert.equal(r.claimed, null);
    const m = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(m.repos.a.owner, 'sess-1'); // unchanged
  } finally { rmrf(tmp); }
});

test('join --claim — explicit claim when target is unclaimed', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    // Release a so sess-2 can claim
    manifestLib.updateManifest(tmp, '0001-foo', (m) => {
      m.repos.a.owner = manifestLib.UNCLAIMED;
      delete m.repos.a.lease_expires_at;
    });
    const r = joinLib.join({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      sessionId: 'sess-2', nowIso: '2026-06-14T17:30:00Z',
      claim: 'a',
    });
    assert.equal(r.claimed.repo, 'a');
    assert.equal(r.claimed.owner, 'sess-2');
    const m = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(m.repos.a.owner, 'sess-2');
  } finally { rmrf(tmp); }
});

test('join --claim — rejected when target has valid lease', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    manifestLib.updateManifest(tmp, '0001-foo', (m) => {
      m.repos.a.lease_expires_at = '2099-01-01T00:00:00Z';
    });
    let err;
    try {
      joinLib.join({
        ecosystemRoot: tmp, swarmId: '0001-foo',
        sessionId: 'sess-2', nowIso: '2026-06-14T17:30:00Z',
        claim: 'a',
      });
    } catch (e) { err = e; }
    assert.ok(err);
    assert.equal(err.code, 'EOWNERSHIP');
  } finally { rmrf(tmp); }
});

test('join — non-existent swarm throws cleanly', () => {
  const tmp = mktmp();
  try {
    fs.writeFileSync(path.join(tmp, 'ecosystem.json'), JSON.stringify({
      name: 'test-eco', version: 1, created: '2026-06-14', members: [],
    }, null, 2));
    assert.throws(
      () => joinLib.join({
        ecosystemRoot: tmp, swarmId: '9999-ghost',
        sessionId: 'sess-2', nowIso: '2026-06-14T17:30:00Z',
      }),
      /not found/,
    );
  } finally { rmrf(tmp); }
});

test('join — expired token rejected', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    const t = tokensLib.writeToken({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      kind: 'focus', issuedBy: 'sess-1', targetRepo: 'a',
      nowIso: '2026-06-14T17:30:00Z', expiresInMs: 1000,
    });
    assert.throws(
      () => joinLib.join({
        ecosystemRoot: tmp, swarmId: '0001-foo',
        sessionId: 'sess-2', nowIso: '2026-06-14T17:31:00Z',
        token: t.token,
      }),
      /expired/,
    );
  } finally { rmrf(tmp); }
});

test('join — auto-renews owned-repo leases for the joining session', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    // sess-2 claims a then later re-joins — its lease should refresh
    manifestLib.updateManifest(tmp, '0001-foo', (m) => {
      m.repos.a.owner = 'sess-2';
      m.repos.a.lease_expires_at = '2026-06-14T18:00:00Z';
      m.repos.a.lease_renewed_at = '2026-06-14T17:00:00Z';
    });
    const before = manifestLib.loadManifest(tmp, '0001-foo');
    joinLib.join({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      sessionId: 'sess-2', nowIso: '2026-06-14T19:00:00Z',
    });
    const after = manifestLib.loadManifest(tmp, '0001-foo');
    assert.ok(
      Date.parse(after.repos.a.lease_expires_at) > Date.parse(before.repos.a.lease_expires_at),
      'expected lease_expires_at to advance after re-join',
    );
  } finally { rmrf(tmp); }
});

// ─── CLI ──────────────────────────────────────────────────────────────────

test('CLI: join registration-only — JSON output exposes sessions array', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    const r = runCli(
      ['swarm', 'join', '0001-foo', '--session', 'sess-2', '--json', '--ecosystem', tmp],
    );
    assert.equal(r.status, 0, r.stderr);
    const json = JSON.parse(r.stdout);
    assert.equal(json.sessionId, 'sess-2');
    assert.ok(Array.isArray(json.sessions));
    assert.equal(json.claimed, null);
  } finally { rmrf(tmp); }
});

test('CLI: join --token — focus token round-trips with focus CLI', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    const focusOut = runCli(
      ['swarm', 'focus', '0001-foo', 'a', '--session', 'sess-1', '--json', '--ecosystem', tmp],
    );
    assert.equal(focusOut.status, 0, focusOut.stderr);
    const focusJson = JSON.parse(focusOut.stdout);
    const joinOut = runCli(
      ['swarm', 'join', '0001-foo', '--session', 'sess-2', '--token', focusJson.token, '--json', '--ecosystem', tmp],
    );
    assert.equal(joinOut.status, 0, joinOut.stderr);
    const joinJson = JSON.parse(joinOut.stdout);
    assert.equal(joinJson.claimed.repo, 'a');
    assert.equal(joinJson.claimed.owner, 'sess-2');
    assert.equal(joinJson.token.kind, 'focus');
  } finally { rmrf(tmp); }
});

test('CLI: join --claim rejected with exit 1', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    manifestLib.updateManifest(tmp, '0001-foo', (m) => {
      m.repos.a.lease_expires_at = '2099-01-01T00:00:00Z';
    });
    const r = runCli(
      ['swarm', 'join', '0001-foo', '--session', 'sess-2', '--claim', 'a', '--ecosystem', tmp],
    );
    assert.equal(r.status, 1);
    assert.match(r.stderr, /rejected/);
  } finally { rmrf(tmp); }
});

test('CLI: swarm --help mentions join', () => {
  const r = runCli(['swarm', '--help']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /momentum swarm join/);
});
