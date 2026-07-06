'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf } = require('./_helpers');
const conductor = require('../core/swarm/conductor');
const manifestLib = require('../core/swarm/lib/manifest');
const boardLib = require('../core/swarm/lib/board');

function setupSwarm(tmp, mode = 'checkpoint') {
  const eco = {
    name: 'test-eco', version: 1, created: '2026-06-12',
    members: [
      { id: 'a', path: 'a', role: 'library' },
      { id: 'b', path: 'b', role: 'platform' },
    ],
    dependencies: [{ from: 'b', to: 'a', kind: 'library' }],
  };
  fs.writeFileSync(path.join(tmp, 'ecosystem.json'), JSON.stringify(eco, null, 2));
  for (const m of eco.members) fs.mkdirSync(path.join(tmp, m.path), { recursive: true });

  const manifest = conductor.planSwarm({
    ecosystemRoot: tmp, swarmId: '0001-foo', initiative: 'foo',
    impactedRepos: ['a', 'b'], phaseSlug: 'phase-1-foo',
    sessionId: 'sess', mode,
    nowIso: '2026-06-12T17:00:00Z', ecosystemManifest: eco,
  });
  manifestLib.writeManifest(tmp, '0001-foo', manifest);
  boardLib.refreshBoard(tmp, '0001-foo', '2026-06-12T17:00:00Z');
  return manifest;
}

test('cancelSwarm — moves all queued/running repos to cancelled', () => {
  const tmp = mktmp();
  try {
    setupSwarm(tmp);
    // Move wave 1 to running
    conductor.markWaveStatus(tmp, '0001-foo', 1, 'running');
    conductor.cancelSwarm(tmp, '0001-foo', 'user requested', '2026-06-12T17:30:00Z');

    const after = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(after.status, 'cancelled');
    assert.equal(after.repos.a.status, 'cancelled');
    assert.equal(after.repos.b.status, 'cancelled');
    assert.equal(after.waves[0].status, 'cancelled');
    assert.equal(after.waves[1].status, 'cancelled');
    const cancelAudit = after.audit.find((a) => a.event === 'cancel');
    assert.ok(cancelAudit);
    assert.match(cancelAudit.detail, /user requested/);
  } finally {
    rmrf(tmp);
  }
});

test('cancelSwarm — preserves completed repos', () => {
  const tmp = mktmp();
  try {
    setupSwarm(tmp);
    conductor.markWaveStatus(tmp, '0001-foo', 1, 'running');
    conductor.recordRepoComplete(tmp, '0001-foo', 'a');
    conductor.cancelSwarm(tmp, '0001-foo', 'mid-flight', '2026-06-12T17:30:00Z');

    const after = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(after.repos.a.status, 'complete', 'completed repos preserved');
    assert.equal(after.repos.b.status, 'cancelled');
  } finally {
    rmrf(tmp);
  }
});

test('cancelSwarm — board status reflects cancelled', () => {
  const tmp = mktmp();
  try {
    setupSwarm(tmp);
    conductor.cancelSwarm(tmp, '0001-foo', 'test', '2026-06-12T17:30:00Z');
    const board = boardLib.loadBoard(tmp, '0001-foo');
    assert.equal(board.status, 'cancelled');
    assert.ok(board.recent_activity.some((a) => a.msg.includes('test')));
  } finally {
    rmrf(tmp);
  }
});

test('resumeSwarm — registers new session and refreshes board', () => {
  const tmp = mktmp();
  try {
    setupSwarm(tmp);
    const manifest = conductor.resumeSwarm(tmp, '0001-foo', 'sess_new', '2026-06-12T18:00:00Z');
    assert.equal(manifest.sessions.length, 2);
    assert.equal(manifest.sessions[1].session_id, 'sess_new');
    const resumeAudit = manifest.audit.find((a) => a.event === 'resume');
    assert.ok(resumeAudit);
    const board = boardLib.loadBoard(tmp, '0001-foo');
    assert.equal(board.rendered_at, '2026-06-12T18:00:00Z');
  } finally {
    rmrf(tmp);
  }
});

test('resumeSwarm — updates last_seen for known sessions', () => {
  const tmp = mktmp();
  try {
    setupSwarm(tmp);
    conductor.resumeSwarm(tmp, '0001-foo', 'sess', '2026-06-12T18:00:00Z');
    const manifest = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(manifest.sessions.length, 1);
    assert.equal(manifest.sessions[0].last_seen, '2026-06-12T18:00:00Z');
  } finally {
    rmrf(tmp);
  }
});

test('renewLeases — extends lease_expires_at for owned repos only', () => {
  const tmp = mktmp();
  try {
    setupSwarm(tmp);
    const before = manifestLib.loadManifest(tmp, '0001-foo');
    // Pretend another session owns repo b
    manifestLib.updateManifest(tmp, '0001-foo', (m) => {
      m.repos.b.owner = 'sess_other';
    });
    conductor.renewLeases(tmp, '0001-foo', 'sess', '2026-06-12T18:00:00Z');
    const after = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(after.repos.a.lease_renewed_at, '2026-06-12T18:00:00Z',
      'owned repo a renewed');
    assert.notEqual(after.repos.b.lease_renewed_at, '2026-06-12T18:00:00Z',
      'unowned repo b unchanged');
    // Expiry advanced 24h from 2026-06-12T18:00:00Z
    const exp = Date.parse(after.repos.a.lease_expires_at);
    const expected = Date.parse('2026-06-13T18:00:00Z');
    assert.equal(exp, expected);
  } finally {
    rmrf(tmp);
  }
});
