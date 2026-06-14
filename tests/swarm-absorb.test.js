'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli } = require('./_helpers');
const manifestLib = require('../core/swarm/lib/manifest');
const absorbLib = require('../core/swarm/absorb');
const inboxLib = require('../core/swarm/inbox');
const conductor = require('../core/swarm/conductor');
const boardLib = require('../core/swarm/lib/board');

const ECO_NAME = 'absorb-eco';
const ECO_MFST = {
  name: ECO_NAME, version: 1, created: '2026-06-14',
  members: [
    { id: 'shared', path: 'shared', role: 'library' },
    { id: 'backend', path: 'backend', role: 'platform' },
    { id: 'frontend', path: 'frontend', role: 'platform' },
    { id: 'mobile', path: 'mobile', role: 'platform' },
  ],
  dependencies: [
    { from: 'backend', to: 'shared' },
    { from: 'frontend', to: 'backend' },
    { from: 'mobile', to: 'backend' },
  ],
};

function setupEcosystem(tmp) {
  fs.writeFileSync(path.join(tmp, 'ecosystem.json'), JSON.stringify(ECO_MFST, null, 2));
  for (const m of ECO_MFST.members) fs.mkdirSync(path.join(tmp, m.path), { recursive: true });
}

function planAndWrite(tmp, swarmId, repos, sessionId, opts = {}) {
  const phaseSlug = opts.phaseSlug || `phase-1-${swarmId.split('-')[1]}`;
  const m = conductor.planSwarm({
    ecosystemRoot: tmp, swarmId,
    initiative: opts.initiative || 'auth-revamp',
    impactedRepos: repos,
    phaseSlug,
    sessionId, mode: 'checkpoint',
    nowIso: opts.nowIso || '2026-06-14T17:00:00Z',
    ecosystemManifest: ECO_MFST,
  });
  if (opts.contracts) m.contracts = opts.contracts;
  manifestLib.writeManifest(tmp, swarmId, m);
  boardLib.refreshBoard(tmp, swarmId, opts.nowIso || '2026-06-14T17:00:00Z');
}

// ─── helpers (pure) ──────────────────────────────────────────────────────

test('detectContractConflicts — no shared surface → no conflicts', () => {
  const r = absorbLib.detectContractConflicts(
    [{ surface: 'x', owner: 'a', consumers: ['b'], version: 1, content_hash: 'abc12345' }],
    [{ surface: 'y', owner: 'a', consumers: ['b'], version: 1, content_hash: 'def12345' }],
  );
  assert.deepEqual(r, []);
});

test('detectContractConflicts — matching content_hash on shared surface → no conflict', () => {
  const r = absorbLib.detectContractConflicts(
    [{ surface: 'x', owner: 'a', consumers: ['b'], version: 1, content_hash: 'abc12345' }],
    [{ surface: 'x', owner: 'a', consumers: ['b'], version: 1, content_hash: 'abc12345' }],
  );
  assert.deepEqual(r, []);
});

test('detectContractConflicts — diverging owner → flagged', () => {
  const r = absorbLib.detectContractConflicts(
    [{ surface: 'x', owner: 'a', consumers: ['b'], version: 1, content_hash: 'abc12345' }],
    [{ surface: 'x', owner: 'b', consumers: ['c'], version: 1, content_hash: 'abc12345' }],
  );
  assert.equal(r.length, 1);
  assert.equal(r[0].kind, 'owner-divergence');
});

test('detectContractConflicts — diverging content_hash → flagged', () => {
  const r = absorbLib.detectContractConflicts(
    [{ surface: 'x', owner: 'a', consumers: ['b'], version: 1, content_hash: 'abc12345' }],
    [{ surface: 'x', owner: 'a', consumers: ['b'], version: 2, content_hash: 'def67890' }],
  );
  assert.equal(r.length, 1);
  assert.equal(r[0].kind, 'content-hash-divergence');
});

test('mergeSessions — earliest first_seen, latest last_seen, dedupe by id', () => {
  const r = absorbLib.mergeSessions(
    [
      { session_id: 'a', first_seen: '2026-06-14T17:00:00Z', last_seen: '2026-06-14T18:00:00Z' },
      { session_id: 'c', first_seen: '2026-06-14T16:00:00Z', last_seen: '2026-06-14T16:30:00Z' },
    ],
    [
      { session_id: 'a', first_seen: '2026-06-14T17:30:00Z', last_seen: '2026-06-14T17:45:00Z' },
      { session_id: 'b', first_seen: '2026-06-14T17:00:00Z', last_seen: '2026-06-14T17:05:00Z' },
    ],
  );
  assert.equal(r.length, 3);
  const aMerged = r.find((s) => s.session_id === 'a');
  assert.equal(aMerged.first_seen, '2026-06-14T17:00:00Z');
  assert.equal(aMerged.last_seen, '2026-06-14T18:00:00Z');
});

// ─── absorb() — end-to-end ───────────────────────────────────────────────

test('absorb — clean disjoint merge: source repos added, source archived', () => {
  const tmp = mktmp();
  try {
    setupEcosystem(tmp);
    planAndWrite(tmp, '0001-tgt', ['shared', 'backend'], 'sess-tgt');
    planAndWrite(tmp, '0002-src', ['frontend', 'mobile'], 'sess-src');
    const r = absorbLib.absorb({
      ecosystemRoot: tmp,
      targetSwarmId: '0001-tgt', sourceSwarmId: '0002-src',
      sessionId: 'sess-tgt', nowIso: '2026-06-14T18:00:00Z',
    });
    assert.deepEqual(r.reposAdded.sort(), ['frontend', 'mobile']);
    assert.deepEqual(r.reposOverlapped, []);
    const tgt = manifestLib.loadManifest(tmp, '0001-tgt');
    assert.deepEqual(Object.keys(tgt.repos).sort(), ['backend', 'frontend', 'mobile', 'shared']);
    assert.ok(tgt.audit.find((e) => e.event === 'absorb' && /absorbed 0002-src/.test(e.detail)));
    // Source archived
    assert.ok(!manifestLib.loadManifest(tmp, '0002-src'));
    assert.ok(fs.existsSync(r.archivedTo));
  } finally { rmrf(tmp); }
});

test('absorb — wave recomputation respects ecosystem dependency edges', () => {
  const tmp = mktmp();
  try {
    setupEcosystem(tmp);
    planAndWrite(tmp, '0001-tgt', ['shared', 'backend'], 'sess-tgt');
    planAndWrite(tmp, '0002-src', ['frontend', 'mobile'], 'sess-src');
    absorbLib.absorb({
      ecosystemRoot: tmp,
      targetSwarmId: '0001-tgt', sourceSwarmId: '0002-src',
      sessionId: 'sess-tgt', nowIso: '2026-06-14T18:00:00Z',
    });
    const tgt = manifestLib.loadManifest(tmp, '0001-tgt');
    // shared → wave 1; backend → wave 2; frontend + mobile → wave 3
    const byRepo = Object.fromEntries(Object.entries(tgt.repos).map(([k, v]) => [k, v.wave]));
    assert.equal(byRepo.shared, 1);
    assert.equal(byRepo.backend, 2);
    assert.equal(byRepo.frontend, 3);
    assert.equal(byRepo.mobile, 3);
  } finally { rmrf(tmp); }
});

test('absorb — shared repo with matching contracts: merge proceeds, target wins on overlap', () => {
  const tmp = mktmp();
  try {
    setupEcosystem(tmp);
    const contract = {
      surface: 'auth-api', owner: 'backend', consumers: ['frontend'],
      version: 1, content_hash: 'abc12345',
    };
    planAndWrite(tmp, '0001-tgt', ['shared', 'backend'], 'sess-tgt', { contracts: [contract] });
    planAndWrite(tmp, '0002-src', ['backend', 'frontend'], 'sess-src', { contracts: [contract] });
    // Mark target's backend as running so we can verify target wins on overlap
    manifestLib.updateManifest(tmp, '0001-tgt', (m) => {
      m.repos.backend.status = 'running';
    });
    const r = absorbLib.absorb({
      ecosystemRoot: tmp,
      targetSwarmId: '0001-tgt', sourceSwarmId: '0002-src',
      sessionId: 'sess-tgt', nowIso: '2026-06-14T18:00:00Z',
    });
    assert.deepEqual(r.reposOverlapped, ['backend']);
    assert.deepEqual(r.reposAdded, ['frontend']);
    const tgt = manifestLib.loadManifest(tmp, '0001-tgt');
    assert.equal(tgt.repos.backend.status, 'running'); // target wins
    assert.equal(tgt.contracts.length, 1);
  } finally { rmrf(tmp); }
});

test('absorb — shared repo with diverging content_hash: aborts with ECONTRACT, both swarms untouched', () => {
  const tmp = mktmp();
  try {
    setupEcosystem(tmp);
    planAndWrite(tmp, '0001-tgt', ['shared', 'backend'], 'sess-tgt', {
      contracts: [{ surface: 'auth-api', owner: 'backend', consumers: ['frontend'], version: 1, content_hash: 'abc12345' }],
    });
    planAndWrite(tmp, '0002-src', ['backend', 'frontend'], 'sess-src', {
      contracts: [{ surface: 'auth-api', owner: 'backend', consumers: ['frontend'], version: 2, content_hash: 'def67890' }],
    });
    const tgtBefore = manifestLib.loadManifest(tmp, '0001-tgt');
    const srcBefore = manifestLib.loadManifest(tmp, '0002-src');
    let err;
    try {
      absorbLib.absorb({
        ecosystemRoot: tmp,
        targetSwarmId: '0001-tgt', sourceSwarmId: '0002-src',
        sessionId: 'sess-tgt', nowIso: '2026-06-14T18:00:00Z',
      });
    } catch (e) { err = e; }
    assert.ok(err);
    assert.equal(err.code, 'ECONTRACT');
    assert.equal(err.conflicts.length, 1);
    assert.equal(err.conflicts[0].surface, 'auth-api');
    // Both swarms unchanged
    assert.deepEqual(manifestLib.loadManifest(tmp, '0001-tgt'), tgtBefore);
    assert.deepEqual(manifestLib.loadManifest(tmp, '0002-src'), srcBefore);
  } finally { rmrf(tmp); }
});

test('absorb — sessions[] union: earliest first_seen + latest last_seen across overlap', () => {
  const tmp = mktmp();
  try {
    setupEcosystem(tmp);
    planAndWrite(tmp, '0001-tgt', ['shared', 'backend'], 'sess-shared');
    planAndWrite(tmp, '0002-src', ['frontend', 'mobile'], 'sess-shared');
    // Both swarms saw sess-shared at different times — pre-populate
    manifestLib.updateManifest(tmp, '0001-tgt', (m) => {
      const s = m.sessions.find((x) => x.session_id === 'sess-shared');
      s.first_seen = '2026-06-14T15:00:00Z';
      s.last_seen = '2026-06-14T15:30:00Z';
    });
    manifestLib.updateManifest(tmp, '0002-src', (m) => {
      const s = m.sessions.find((x) => x.session_id === 'sess-shared');
      s.first_seen = '2026-06-14T14:00:00Z';
      s.last_seen = '2026-06-14T16:00:00Z';
    });
    absorbLib.absorb({
      ecosystemRoot: tmp,
      targetSwarmId: '0001-tgt', sourceSwarmId: '0002-src',
      sessionId: 'sess-shared', nowIso: '2026-06-14T18:00:00Z',
    });
    const tgt = manifestLib.loadManifest(tmp, '0001-tgt');
    const merged = tgt.sessions.find((s) => s.session_id === 'sess-shared');
    assert.equal(merged.first_seen, '2026-06-14T14:00:00Z');
    assert.equal(merged.last_seen, '2026-06-14T16:00:00Z');
  } finally { rmrf(tmp); }
});

test('absorb — audit timeline interleaved by timestamp + absorb entry appended', () => {
  const tmp = mktmp();
  try {
    setupEcosystem(tmp);
    planAndWrite(tmp, '0001-tgt', ['shared', 'backend'], 'sess-tgt');
    planAndWrite(tmp, '0002-src', ['frontend', 'mobile'], 'sess-src');
    // Add synthetic audit events at different times
    manifestLib.updateManifest(tmp, '0001-tgt', (m) => {
      m.audit.push({ ts: '2026-06-14T17:30:00Z', actor: 'sess-tgt', event: 'tell', detail: 'T1' });
    });
    manifestLib.updateManifest(tmp, '0002-src', (m) => {
      m.audit.push({ ts: '2026-06-14T17:15:00Z', actor: 'sess-src', event: 'tell', detail: 'S1' });
    });
    absorbLib.absorb({
      ecosystemRoot: tmp,
      targetSwarmId: '0001-tgt', sourceSwarmId: '0002-src',
      sessionId: 'sess-tgt', nowIso: '2026-06-14T18:00:00Z',
    });
    const tgt = manifestLib.loadManifest(tmp, '0001-tgt');
    // Audit is sorted by timestamp ascending
    for (let i = 1; i < tgt.audit.length; i++) {
      assert.ok(tgt.audit[i - 1].ts <= tgt.audit[i].ts);
    }
    // absorb event present at the end (latest timestamp)
    const lastIdx = tgt.audit.length - 1;
    assert.equal(tgt.audit[lastIdx].event, 'absorb');
    // Both prior events still present
    assert.ok(tgt.audit.find((e) => e.detail === 'T1'));
    assert.ok(tgt.audit.find((e) => e.detail === 'S1'));
  } finally { rmrf(tmp); }
});

test('absorb — inbox items copied with bumped ids; INDEX regenerated', () => {
  const tmp = mktmp();
  try {
    setupEcosystem(tmp);
    planAndWrite(tmp, '0001-tgt', ['shared', 'backend'], 'sess-tgt');
    planAndWrite(tmp, '0002-src', ['frontend', 'mobile'], 'sess-src');
    // Add inbox items in both
    inboxLib.writeInboxItem({
      ecosystemRoot: tmp, swarmId: '0001-tgt', repo: 'backend',
      slug: 'tgt-question', question: 'target asks',
      nowIso: '2026-06-14T17:30:00Z',
    });
    inboxLib.writeInboxItem({
      ecosystemRoot: tmp, swarmId: '0002-src', repo: 'frontend',
      slug: 'src-question', question: 'source asks',
      nowIso: '2026-06-14T17:30:00Z',
    });
    const r = absorbLib.absorb({
      ecosystemRoot: tmp,
      targetSwarmId: '0001-tgt', sourceSwarmId: '0002-src',
      sessionId: 'sess-tgt', nowIso: '2026-06-14T18:00:00Z',
    });
    assert.equal(r.inboxMoved, 1);
    const items = inboxLib.listPendingInboxItems(tmp, '0001-tgt');
    assert.equal(items.length, 2);
    assert.ok(items.find((it) => it.slug === 'tgt-question'));
    assert.ok(items.find((it) => /^absorbed-src-question$/.test(it.slug)));
    // INDEX file regenerated
    const idx = fs.readFileSync(inboxLib.indexPath(tmp, '0001-tgt'), 'utf8');
    assert.match(idx, /tgt-question/);
    assert.match(idx, /absorbed-src-question/);
  } finally { rmrf(tmp); }
});

test('absorb — cannot absorb a swarm into itself', () => {
  const tmp = mktmp();
  try {
    setupEcosystem(tmp);
    planAndWrite(tmp, '0001-tgt', ['shared', 'backend'], 'sess-tgt');
    assert.throws(
      () => absorbLib.absorb({
        ecosystemRoot: tmp,
        targetSwarmId: '0001-tgt', sourceSwarmId: '0001-tgt',
        sessionId: 'sess-tgt', nowIso: '2026-06-14T18:00:00Z',
      }),
      /into itself/,
    );
  } finally { rmrf(tmp); }
});

test('absorb — missing source swarm throws cleanly', () => {
  const tmp = mktmp();
  try {
    setupEcosystem(tmp);
    planAndWrite(tmp, '0001-tgt', ['shared', 'backend'], 'sess-tgt');
    assert.throws(
      () => absorbLib.absorb({
        ecosystemRoot: tmp,
        targetSwarmId: '0001-tgt', sourceSwarmId: '9999-ghost',
        sessionId: 'sess-tgt', nowIso: '2026-06-14T18:00:00Z',
      }),
      /source swarm 9999-ghost not found/,
    );
  } finally { rmrf(tmp); }
});

// ─── CLI ──────────────────────────────────────────────────────────────────

test('CLI: absorb --yes proceeds with clean merge', () => {
  const tmp = mktmp();
  try {
    setupEcosystem(tmp);
    planAndWrite(tmp, '0001-tgt', ['shared', 'backend'], 'sess-tgt');
    planAndWrite(tmp, '0002-src', ['frontend', 'mobile'], 'sess-src');
    const r = runCli(
      ['swarm', 'absorb', '0001-tgt', '0002-src', '--yes', '--json', '--session', 'sess-tgt', '--ecosystem', tmp],
    );
    assert.equal(r.status, 0, r.stderr);
    const json = JSON.parse(r.stdout);
    assert.equal(json.absorbed, '0002-src');
    assert.equal(json.into, '0001-tgt');
    assert.deepEqual(json.reposAdded.sort(), ['frontend', 'mobile']);
  } finally { rmrf(tmp); }
});

test('CLI: absorb without --yes prints plan + exits 0', () => {
  const tmp = mktmp();
  try {
    setupEcosystem(tmp);
    planAndWrite(tmp, '0001-tgt', ['shared', 'backend'], 'sess-tgt');
    planAndWrite(tmp, '0002-src', ['frontend', 'mobile'], 'sess-src');
    const r = runCli(
      ['swarm', 'absorb', '0001-tgt', '0002-src', '--session', 'sess-tgt', '--ecosystem', tmp],
    );
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /absorb plan/);
    assert.match(r.stdout, /Pass --yes/);
    // Source still on disk (no commit yet)
    assert.ok(manifestLib.loadManifest(tmp, '0002-src'));
  } finally { rmrf(tmp); }
});

test('CLI: absorb with contract conflict exits 1, both swarms untouched', () => {
  const tmp = mktmp();
  try {
    setupEcosystem(tmp);
    planAndWrite(tmp, '0001-tgt', ['shared', 'backend'], 'sess-tgt', {
      contracts: [{ surface: 'auth-api', owner: 'backend', consumers: ['frontend'], version: 1, content_hash: 'abc12345' }],
    });
    planAndWrite(tmp, '0002-src', ['backend', 'frontend'], 'sess-src', {
      contracts: [{ surface: 'auth-api', owner: 'backend', consumers: ['frontend'], version: 2, content_hash: 'def67890' }],
    });
    const r = runCli(
      ['swarm', 'absorb', '0001-tgt', '0002-src', '--yes', '--session', 'sess-tgt', '--ecosystem', tmp],
    );
    assert.equal(r.status, 1);
    assert.match(r.stderr, /contract conflict/);
    // Both swarms still on disk
    assert.ok(manifestLib.loadManifest(tmp, '0001-tgt'));
    assert.ok(manifestLib.loadManifest(tmp, '0002-src'));
  } finally { rmrf(tmp); }
});

test('CLI: absorb missing args surfaces usage', () => {
  const r = runCli(['swarm', 'absorb']);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /usage/);
});

test('CLI: swarm --help mentions absorb', () => {
  const r = runCli(['swarm', '--help']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /momentum swarm absorb/);
});
