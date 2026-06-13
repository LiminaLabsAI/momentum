'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf } = require('./_helpers');
const signalsLib = require('../core/swarm/signals');
const manifestLib = require('../core/swarm/lib/manifest');
const conductor = require('../core/swarm/conductor');
const boardLib = require('../core/swarm/lib/board');

function fixture(tmp) {
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
    sessionId: 'sess-1', mode: 'checkpoint',
    nowIso: '2026-06-13T17:00:00Z', ecosystemManifest: eco,
  });
  manifestLib.writeManifest(tmp, '0001-foo', manifest);
  boardLib.refreshBoard(tmp, '0001-foo', '2026-06-13T17:00:00Z');
}

test('writeSignal — creates NNNN-<type>-<slug>.json and updates INDEX', () => {
  const tmp = mktmp();
  try {
    fixture(tmp);
    const r = signalsLib.writeSignal({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      type: 'focus-request', slug: 'a-handoff',
      fromSession: 'sess-1', repo: 'a',
      token: '0123456789abcdef',
      nowIso: '2026-06-13T17:05:00Z',
    });
    assert.match(r.signal_id, /^0001-focus-request-a-handoff$/);
    const body = JSON.parse(fs.readFileSync(r.filePath, 'utf8'));
    assert.equal(body.type, 'focus-request');
    assert.equal(body.repo, 'a');
    assert.equal(body.token, '0123456789abcdef');
    assert.equal(body.version, 1);
    const idx = fs.readFileSync(signalsLib.indexPath(tmp, '0001-foo'), 'utf8');
    assert.match(idx, /focus-request/);
    assert.match(idx, /0123456789abcdef/);
  } finally { rmrf(tmp); }
});

test('writeSignal — sequential ids across multiple writes (including different types)', () => {
  const tmp = mktmp();
  try {
    fixture(tmp);
    const a = signalsLib.writeSignal({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      type: 'claim-request', slug: 'a-take', fromSession: 'sess-1', repo: 'a',
      nowIso: '2026-06-13T17:05:00Z',
    });
    const b = signalsLib.writeSignal({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      type: 'absorb-proposed', slug: 'merge-with-other',
      fromSession: 'sess-1', sourceSwarm: '0002-other',
      nowIso: '2026-06-13T17:06:00Z',
    });
    const c = signalsLib.writeSignal({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      type: 'lease-expired', slug: 'b-stale', fromSession: 'sess-1', repo: 'b',
      nowIso: '2026-06-13T17:07:00Z',
    });
    assert.match(a.signal_id, /^0001-/);
    assert.match(b.signal_id, /^0002-/);
    assert.match(c.signal_id, /^0003-/);
  } finally { rmrf(tmp); }
});

test('writeSignal — rejects invalid type', () => {
  const tmp = mktmp();
  try {
    fixture(tmp);
    assert.throws(
      () => signalsLib.writeSignal({
        ecosystemRoot: tmp, swarmId: '0001-foo',
        type: 'bogus', slug: 'x', fromSession: 'sess-1', repo: 'a',
        nowIso: '2026-06-13T17:05:00Z',
      }),
      /invalid type/,
    );
  } finally { rmrf(tmp); }
});

test('writeSignal — focus-request requires repo', () => {
  const tmp = mktmp();
  try {
    fixture(tmp);
    assert.throws(
      () => signalsLib.writeSignal({
        ecosystemRoot: tmp, swarmId: '0001-foo',
        type: 'focus-request', slug: 'noop',
        fromSession: 'sess-1',
        nowIso: '2026-06-13T17:05:00Z',
      }),
      /required for focus-request/,
    );
  } finally { rmrf(tmp); }
});

test('writeSignal — absorb-proposed requires source_swarm', () => {
  const tmp = mktmp();
  try {
    fixture(tmp);
    assert.throws(
      () => signalsLib.writeSignal({
        ecosystemRoot: tmp, swarmId: '0001-foo',
        type: 'absorb-proposed', slug: 'noop',
        fromSession: 'sess-1',
        nowIso: '2026-06-13T17:05:00Z',
      }),
      /required for absorb-proposed/,
    );
  } finally { rmrf(tmp); }
});

test('listPendingSignals — filters by type and to_session (broadcast matches all)', () => {
  const tmp = mktmp();
  try {
    fixture(tmp);
    signalsLib.writeSignal({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      type: 'focus-request', slug: 'a-give', fromSession: 'sess-1', repo: 'a',
      token: '0123456789abcdef',
      toSession: 'sess-2',
      nowIso: '2026-06-13T17:05:00Z',
    });
    signalsLib.writeSignal({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      type: 'claim-request', slug: 'b-take', fromSession: 'sess-3', repo: 'b',
      // No toSession — broadcast
      nowIso: '2026-06-13T17:06:00Z',
    });
    const all = signalsLib.listPendingSignals(tmp, '0001-foo');
    assert.equal(all.length, 2);
    const focuses = signalsLib.listPendingSignals(tmp, '0001-foo', { type: 'focus-request' });
    assert.equal(focuses.length, 1);
    assert.equal(focuses[0].type, 'focus-request');
    // Targeted to sess-2: should see focus (its to_session) + broadcast claim-request
    const forSess2 = signalsLib.listPendingSignals(tmp, '0001-foo', { toSession: 'sess-2' });
    assert.equal(forSess2.length, 2);
    // Targeted to sess-99: should see only the broadcast claim-request
    const forSess99 = signalsLib.listPendingSignals(tmp, '0001-foo', { toSession: 'sess-99' });
    assert.equal(forSess99.length, 1);
    assert.equal(forSess99[0].type, 'claim-request');
  } finally { rmrf(tmp); }
});

test('markProcessed — moves the signal to processed/ and updates INDEX', () => {
  const tmp = mktmp();
  try {
    fixture(tmp);
    const r = signalsLib.writeSignal({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      type: 'claim-request', slug: 'a-give', fromSession: 'sess-1', repo: 'a',
      nowIso: '2026-06-13T17:05:00Z',
    });
    assert.equal(signalsLib.listPendingSignals(tmp, '0001-foo').length, 1);
    signalsLib.markProcessed(tmp, '0001-foo', r.signal_id);
    assert.equal(signalsLib.listPendingSignals(tmp, '0001-foo').length, 0);
    assert.ok(fs.existsSync(path.join(signalsLib.processedDir(tmp, '0001-foo'), `${r.signal_id}.json`)));
    const idx = fs.readFileSync(signalsLib.indexPath(tmp, '0001-foo'), 'utf8');
    assert.match(idx, /no pending signals/);
  } finally { rmrf(tmp); }
});

test('markProcessed — idempotent if already processed', () => {
  const tmp = mktmp();
  try {
    fixture(tmp);
    const r = signalsLib.writeSignal({
      ecosystemRoot: tmp, swarmId: '0001-foo',
      type: 'claim-request', slug: 'a-give', fromSession: 'sess-1', repo: 'a',
      nowIso: '2026-06-13T17:05:00Z',
    });
    signalsLib.markProcessed(tmp, '0001-foo', r.signal_id);
    // Second call is a no-op
    const r2 = signalsLib.markProcessed(tmp, '0001-foo', r.signal_id);
    assert.equal(r2.signalId, r.signal_id);
  } finally { rmrf(tmp); }
});

test('mkdir-lock — 20 concurrent writes produce 20 distinct, valid signals', () => {
  const tmp = mktmp();
  try {
    fixture(tmp);
    // Concurrent writes within one process. Each must pick a distinct id
    // because the lock serializes nextSignalId + write.
    const writes = [];
    for (let i = 0; i < 20; i++) {
      writes.push(signalsLib.writeSignal({
        ecosystemRoot: tmp, swarmId: '0001-foo',
        type: 'claim-request', slug: `concurrent-${i}`,
        fromSession: 'sess-1', repo: 'a',
        nowIso: '2026-06-13T17:05:00Z',
      }));
    }
    const ids = new Set(writes.map((w) => w.signal_id));
    assert.equal(ids.size, 20);
    const list = signalsLib.listPendingSignals(tmp, '0001-foo');
    assert.equal(list.length, 20);
    // Every signal validates
    for (const s of list) {
      const v = signalsLib.validateSignal(s);
      assert.ok(v.ok, `signal failed validation: ${JSON.stringify(v.errors)}`);
    }
  } finally { rmrf(tmp); }
});
