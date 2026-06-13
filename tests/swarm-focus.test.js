'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli } = require('./_helpers');
const manifestLib = require('../core/swarm/lib/manifest');
const tokensLib = require('../core/swarm/lib/tokens');
const signalsLib = require('../core/swarm/signals');
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

// ─── library tests ────────────────────────────────────────────────────────

test('focus — owner can focus; sets FOCUSING, issues token, writes signal', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    const r = focusLib.focus({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      repo: 'a', sessionId: 'sess-1',
      nowIso: '2026-06-14T17:30:00Z',
    });
    assert.match(r.token.token, /^[0-9a-f]{16}$/);
    assert.equal(r.token.kind, 'focus');
    assert.equal(r.token.target_repo, 'a');
    assert.match(r.signal.signal_id, /^0001-focus-request-a-/);
    // Manifest flipped to FOCUSING
    const m = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(m.repos.a.owner, manifestLib.FOCUSING);
    assert.equal(m.repos.a.lease_expires_at, undefined);
    // Audit logged
    assert.ok(m.audit.find((e) => e.event === 'focus' && e.repo === 'a' && e.actor === 'sess-1'));
    // Token persisted
    const tokenFile = path.join(tokensLib.tokensDir(tmp, '0001-foo'), `${r.token.token}.json`);
    assert.ok(fs.existsSync(tokenFile));
    // Signal carries the token
    const sigs = signalsLib.listPendingSignals(tmp, '0001-foo', { type: 'focus-request' });
    assert.equal(sigs.length, 1);
    assert.equal(sigs[0].token, r.token.token);
    assert.equal(sigs[0].repo, 'a');
    // Directive shape
    assert.equal(r.directive.command, 'claude');
    assert.deepEqual(r.directive.args, ['--bg', '--cwd', tmp]);
    assert.equal(r.directive.env.MOMENTUM_FOCUS_TOKEN, r.token.token);
    assert.equal(r.directive.env.MOMENTUM_FOCUS_REPO, 'a');
    assert.match(r.directive.prompt, /swarm join 0001-foo --token/);
  } finally { rmrf(tmp); }
});

test('focus — non-owner is rejected, manifest + tokens left untouched', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    // Set a valid lease so sess-2 can't take over via expiry
    manifestLib.updateManifest(tmp, '0001-foo', (m) => {
      m.repos.a.lease_expires_at = '2099-01-01T00:00:00Z';
    });
    const before = manifestLib.loadManifest(tmp, '0001-foo');
    let err;
    try {
      focusLib.focus({
        ecosystemRoot: tmp, swarmId: '0001-foo',
        repo: 'a', sessionId: 'sess-2',
        nowIso: '2026-06-14T17:30:00Z',
      });
    } catch (e) { err = e; }
    assert.ok(err);
    assert.equal(err.code, 'EOWNERSHIP');
    // Manifest unchanged
    const after = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(after.repos.a.owner, before.repos.a.owner);
    // Token rolled back — tokens dir is empty
    const tokens = fs.readdirSync(tokensLib.tokensDir(tmp, '0001-foo'));
    assert.deepEqual(tokens, []);
  } finally { rmrf(tmp); }
});

test('focus — token expires per --expires-min override', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    const r = focusLib.focus({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      repo: 'a', sessionId: 'sess-1',
      nowIso: '2026-06-14T17:30:00Z',
      expiresInMs: 5 * 60 * 1000, // 5 min
    });
    const issuedMs = Date.parse(r.token.issued_at);
    const expMs = Date.parse(r.token.expires_at);
    assert.equal(expMs - issuedMs, 5 * 60 * 1000);
  } finally { rmrf(tmp); }
});

test('focus — token is single-use; second consume after manual claim fails cleanly', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    const r = focusLib.focus({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      repo: 'a', sessionId: 'sess-1',
      nowIso: '2026-06-14T17:30:00Z',
    });
    // Consume once — receiver pattern
    const consumed = tokensLib.consumeToken(tmp, '0001-foo', r.token.token, '2026-06-14T17:31:00Z');
    assert.equal(consumed.target_repo, 'a');
    // Second consume throws (file gone)
    assert.throws(
      () => tokensLib.consumeToken(tmp, '0001-foo', r.token.token, '2026-06-14T17:32:00Z'),
      /not found/,
    );
  } finally { rmrf(tmp); }
});

test('focus → join-by-token round-trip (in-process simulation)', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    // sess-1 focuses repo a
    const r = focusLib.focus({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      repo: 'a', sessionId: 'sess-1',
      nowIso: '2026-06-14T17:30:00Z',
    });
    // sess-2 consumes the token then claims via FOCUSING sentinel
    const tok = tokensLib.consumeToken(tmp, '0001-foo', r.token.token, '2026-06-14T17:31:00Z');
    assert.equal(tok.target_repo, 'a');
    manifestLib.updateManifestAsOwner({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      sessionId: 'sess-2', repo: 'a',
      nowIso: '2026-06-14T17:31:00Z',
      mutate: (m) => {
        m.repos.a.owner = 'sess-2';
        m.repos.a.claimed_by_session = 'sess-2';
        m.repos.a.lease_renewed_at = '2026-06-14T17:31:00Z';
        m.repos.a.lease_expires_at = '2026-06-15T17:31:00Z';
      },
    });
    const m = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(m.repos.a.owner, 'sess-2');
  } finally { rmrf(tmp); }
});

// ─── CLI tests ────────────────────────────────────────────────────────────

test('CLI: swarm focus — owner JSON output exposes token + directive', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    const r = runCli(
      ['swarm', 'focus', '0001-foo', 'a', '--session', 'sess-1', '--json', '--ecosystem', tmp],
    );
    assert.equal(r.status, 0, r.stderr);
    const json = JSON.parse(r.stdout);
    assert.equal(json.repo, 'a');
    assert.match(json.token, /^[0-9a-f]{16}$/);
    assert.match(json.signal_id, /^0001-focus-request-a-/);
    assert.equal(json.directive.command, 'claude');
    assert.equal(json.directive.env.MOMENTUM_FOCUS_REPO, 'a');
  } finally { rmrf(tmp); }
});

test('CLI: swarm focus — non-owner exits 1', () => {
  const tmp = mktmp();
  try {
    fixture(tmp, 'sess-1');
    manifestLib.updateManifest(tmp, '0001-foo', (m) => {
      m.repos.a.lease_expires_at = '2099-01-01T00:00:00Z';
    });
    const r = runCli(
      ['swarm', 'focus', '0001-foo', 'a', '--session', 'sess-2', '--ecosystem', tmp],
    );
    assert.equal(r.status, 1);
    assert.match(r.stderr, /rejected/);
  } finally { rmrf(tmp); }
});

test('CLI: swarm focus — missing args surfaces usage', () => {
  const r = runCli(['swarm', 'focus']);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /usage/);
});

test('CLI: swarm --help mentions focus', () => {
  const r = runCli(['swarm', '--help']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /momentum swarm focus/);
});
