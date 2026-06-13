'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf } = require('./_helpers');
const tokensLib = require('../core/swarm/lib/tokens');
const sessionsLib = require('../core/swarm/lib/sessions');
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

// ─── tokens ──────────────────────────────────────────────────────────────────

test('writeToken focus — persists record with 16-hex id and 1h default expiry', () => {
  const tmp = mktmp();
  try {
    fixture(tmp);
    const t = tokensLib.writeToken({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      kind: 'focus', issuedBy: 'sess-1', targetRepo: 'a',
      nowIso: '2026-06-13T17:00:00Z',
    });
    assert.match(t.token, /^[0-9a-f]{16}$/);
    assert.equal(t.kind, 'focus');
    assert.equal(t.target_repo, 'a');
    assert.equal(t.issued_by, 'sess-1');
    // 1h expiry
    const expMs = Date.parse(t.expires_at);
    const issuedMs = Date.parse(t.issued_at);
    assert.equal(expMs - issuedMs, 60 * 60 * 1000);
    // File exists at tokens/<token>.json
    const file = path.join(tokensLib.tokensDir(tmp, '0001-foo'), `${t.token}.json`);
    assert.ok(fs.existsSync(file));
  } finally { rmrf(tmp); }
});

test('writeToken join — defaults swarm_id to the issuing swarm', () => {
  const tmp = mktmp();
  try {
    fixture(tmp);
    const t = tokensLib.writeToken({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      kind: 'join', issuedBy: 'sess-1',
      nowIso: '2026-06-13T17:00:00Z',
    });
    assert.equal(t.kind, 'join');
    assert.equal(t.swarm_id, '0001-foo');
  } finally { rmrf(tmp); }
});

test('writeToken focus — requires target_repo', () => {
  const tmp = mktmp();
  try {
    fixture(tmp);
    assert.throws(
      () => tokensLib.writeToken({
        ecosystemRoot: tmp, swarmId: '0001-foo',
        kind: 'focus', issuedBy: 'sess-1',
        nowIso: '2026-06-13T17:00:00Z',
      }),
      /target_repo/,
    );
  } finally { rmrf(tmp); }
});

test('readToken — returns expired:true past expiry without deleting', () => {
  const tmp = mktmp();
  try {
    fixture(tmp);
    const t = tokensLib.writeToken({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      kind: 'focus', issuedBy: 'sess-1', targetRepo: 'a',
      nowIso: '2026-06-13T17:00:00Z',
      expiresInMs: 60 * 1000, // 1 min
    });
    const read = tokensLib.readToken(tmp, '0001-foo', t.token, '2026-06-13T17:02:00Z');
    assert.ok(read);
    assert.equal(read.expired, true);
    // Still on disk — readToken does NOT delete
    assert.ok(fs.existsSync(path.join(tokensLib.tokensDir(tmp, '0001-foo'), `${t.token}.json`)));
  } finally { rmrf(tmp); }
});

test('consumeToken — single-use: removes file on read', () => {
  const tmp = mktmp();
  try {
    fixture(tmp);
    const t = tokensLib.writeToken({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      kind: 'focus', issuedBy: 'sess-1', targetRepo: 'a',
      nowIso: '2026-06-13T17:00:00Z',
    });
    const file = path.join(tokensLib.tokensDir(tmp, '0001-foo'), `${t.token}.json`);
    const consumed = tokensLib.consumeToken(tmp, '0001-foo', t.token, '2026-06-13T17:01:00Z');
    assert.equal(consumed.token, t.token);
    assert.ok(!fs.existsSync(file));
    // Second consume throws
    assert.throws(
      () => tokensLib.consumeToken(tmp, '0001-foo', t.token, '2026-06-13T17:02:00Z'),
      /not found/,
    );
  } finally { rmrf(tmp); }
});

test('consumeToken — rejects expired token', () => {
  const tmp = mktmp();
  try {
    fixture(tmp);
    const t = tokensLib.writeToken({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      kind: 'focus', issuedBy: 'sess-1', targetRepo: 'a',
      nowIso: '2026-06-13T17:00:00Z',
      expiresInMs: 1000,
    });
    assert.throws(
      () => tokensLib.consumeToken(tmp, '0001-foo', t.token, '2026-06-13T17:01:00Z'),
      /expired/,
    );
  } finally { rmrf(tmp); }
});

test('purgeExpired — removes only expired tokens', () => {
  const tmp = mktmp();
  try {
    fixture(tmp);
    const live = tokensLib.writeToken({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      kind: 'focus', issuedBy: 'sess-1', targetRepo: 'a',
      nowIso: '2026-06-13T17:00:00Z',
    });
    const stale = tokensLib.writeToken({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      kind: 'join', issuedBy: 'sess-1',
      nowIso: '2026-06-13T17:00:00Z',
      expiresInMs: 1000,
    });
    const removed = tokensLib.purgeExpired(tmp, '0001-foo', '2026-06-13T17:01:00Z');
    assert.deepEqual(removed, [stale.token]);
    const left = tokensLib.listTokens(tmp, '0001-foo', '2026-06-13T17:01:00Z');
    assert.equal(left.length, 1);
    assert.equal(left[0].token, live.token);
  } finally { rmrf(tmp); }
});

// ─── sessions[] ──────────────────────────────────────────────────────────────

test('registerSession — appends new session; idempotent on re-register', () => {
  const tmp = mktmp();
  try {
    fixture(tmp);
    sessionsLib.registerSession(tmp, '0001-foo', 'sess-2', '2026-06-13T17:05:00Z');
    let sessions = sessionsLib.listSessions(tmp, '0001-foo');
    // fixture already registers sess-1 via planSwarm; sess-2 is new
    assert.ok(sessions.find((s) => s.session_id === 'sess-1'));
    assert.ok(sessions.find((s) => s.session_id === 'sess-2'));
    // Re-register sess-2 — no-op (last_seen NOT bumped by register)
    sessionsLib.registerSession(tmp, '0001-foo', 'sess-2', '2026-06-13T17:10:00Z');
    sessions = sessionsLib.listSessions(tmp, '0001-foo');
    const s2 = sessions.find((s) => s.session_id === 'sess-2');
    assert.equal(s2.first_seen, '2026-06-13T17:05:00Z');
    assert.equal(s2.last_seen, '2026-06-13T17:05:00Z');
  } finally { rmrf(tmp); }
});

test('touchSession — bumps last_seen; inserts if missing', () => {
  const tmp = mktmp();
  try {
    fixture(tmp);
    sessionsLib.touchSession(tmp, '0001-foo', 'sess-3', '2026-06-13T17:05:00Z');
    let s = sessionsLib.findSession(manifestLib.loadManifest(tmp, '0001-foo'), 'sess-3');
    assert.ok(s);
    assert.equal(s.first_seen, '2026-06-13T17:05:00Z');
    assert.equal(s.last_seen, '2026-06-13T17:05:00Z');
    sessionsLib.touchSession(tmp, '0001-foo', 'sess-3', '2026-06-13T17:10:00Z');
    s = sessionsLib.findSession(manifestLib.loadManifest(tmp, '0001-foo'), 'sess-3');
    assert.equal(s.first_seen, '2026-06-13T17:05:00Z');
    assert.equal(s.last_seen, '2026-06-13T17:10:00Z');
  } finally { rmrf(tmp); }
});

test('findSession / listSessions — pure helpers, return null/empty cleanly', () => {
  assert.equal(sessionsLib.findSession(null, 'x'), null);
  assert.equal(sessionsLib.findSession({}, 'x'), null);
  assert.equal(sessionsLib.findSession({ sessions: [] }, 'x'), null);
  assert.deepEqual(
    sessionsLib.findSession({ sessions: [{ session_id: 'x', first_seen: '2026-06-13T17:00:00Z' }] }, 'x'),
    { session_id: 'x', first_seen: '2026-06-13T17:00:00Z' },
  );
});
