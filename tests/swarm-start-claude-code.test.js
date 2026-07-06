'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf } = require('./_helpers');
const conductor = require('../core/swarm/conductor');
const manifestLib = require('../core/swarm/lib/manifest');
const boardLib = require('../core/swarm/lib/board');
const briefLib = require('../core/swarm/lib/brief');
const sagaLib = require('../core/swarm/lib/saga');

function fakeEcosystem(tmp, members, deps) {
  const ecoManifest = {
    name: 'test-eco',
    version: 1,
    created: '2026-06-12',
    members,
    dependencies: deps || [],
  };
  fs.writeFileSync(path.join(tmp, 'ecosystem.json'), JSON.stringify(ecoManifest, null, 2));
  for (const m of members) {
    const memberPath = path.join(tmp, m.path);
    fs.mkdirSync(memberPath, { recursive: true });
  }
  return ecoManifest;
}

// ─────────────────────────────────────────────────────────────────────────────
// planSwarm — pure manifest construction
// ─────────────────────────────────────────────────────────────────────────────

test('planSwarm — builds manifest with topological waves', () => {
  const tmp = mktmp();
  try {
    const eco = fakeEcosystem(tmp, [
      { id: 'shared-types', path: 'shared-types', role: 'library' },
      { id: 'backend', path: 'backend', role: 'platform' },
      { id: 'frontend', path: 'frontend', role: 'client' },
    ], [
      { from: 'backend', to: 'shared-types', kind: 'library' },
      { from: 'frontend', to: 'backend', kind: 'api-contract' },
    ]);
    const manifest = conductor.planSwarm({
      ecosystemRoot: tmp,
      swarmId: '0001-user-auth',
      initiative: 'user-auth',
      impactedRepos: ['shared-types', 'backend', 'frontend'],
      phaseSlug: 'phase-3-user-auth',
      sessionId: 'sess_test',
      mode: 'checkpoint',
      nowIso: '2026-06-12T17:00:00Z',
      ecosystemManifest: eco,
    });
    assert.equal(manifest.swarm_id, '0001-user-auth');
    assert.equal(manifest.ecosystem, 'test-eco');
    assert.equal(manifest.waves.length, 3);
    assert.deepEqual(manifest.waves[0].repos, ['shared-types']);
    assert.deepEqual(manifest.waves[1].repos, ['backend']);
    assert.deepEqual(manifest.waves[2].repos, ['frontend']);
    for (const repoId of ['shared-types', 'backend', 'frontend']) {
      assert.equal(manifest.repos[repoId].status, 'queued');
      assert.equal(manifest.repos[repoId].phase_slug, 'phase-3-user-auth');
      assert.equal(manifest.repos[repoId].owner, 'sess_test');
      assert.ok(manifest.repos[repoId].lease_expires_at);
    }
    assert.equal(manifest.sessions.length, 1);
    assert.equal(manifest.audit[0].event, 'start');
    const v = manifestLib.validateManifest(manifest);
    assert.equal(v.ok, true, v.ok ? '' : JSON.stringify(v.errors));
  } finally {
    rmrf(tmp);
  }
});

test('planSwarm — rejects invalid inputs', () => {
  const tmp = mktmp();
  try {
    const eco = fakeEcosystem(tmp, [
      { id: 'a', path: 'a', role: 'library' },
    ], []);
    const base = {
      ecosystemRoot: tmp, swarmId: '0001-foo', initiative: 'foo',
      impactedRepos: ['a'], phaseSlug: 'phase-1-foo',
      sessionId: 'sess', mode: 'checkpoint',
      nowIso: '2026-06-12T17:00:00Z', ecosystemManifest: eco,
    };
    assert.throws(() => conductor.planSwarm(Object.assign({}, base, { swarmId: 'bad' })), /invalid swarmId/);
    assert.throws(() => conductor.planSwarm(Object.assign({}, base, { initiative: 'Bad Slug' })), /invalid initiative/);
    assert.throws(() => conductor.planSwarm(Object.assign({}, base, { impactedRepos: [] })), /impactedRepos/);
    assert.throws(() => conductor.planSwarm(Object.assign({}, base, { phaseSlug: 'badphase' })), /invalid phaseSlug/);
    assert.throws(() => conductor.planSwarm(Object.assign({}, base, { mode: 'yolo' })), /invalid mode/);
    assert.throws(() => conductor.planSwarm(Object.assign({}, base, { nowIso: '' })), /nowIso required/);
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// buildSpawnDirectives — env wiring + recipe path
// ─────────────────────────────────────────────────────────────────────────────

test('buildSpawnDirectives — emits one directive per repo in wave', () => {
  const tmp = mktmp();
  try {
    const eco = fakeEcosystem(tmp, [
      { id: 'a', path: 'a', role: 'library' },
      { id: 'b', path: 'b', role: 'platform' },
    ], [{ from: 'b', to: 'a' }]);
    const manifest = conductor.planSwarm({
      ecosystemRoot: tmp, swarmId: '0001-foo', initiative: 'foo',
      impactedRepos: ['a', 'b'], phaseSlug: 'phase-1-foo',
      sessionId: 'sess', mode: 'checkpoint',
      nowIso: '2026-06-12T17:00:00Z', ecosystemManifest: eco,
    });
    manifestLib.writeManifest(tmp, '0001-foo', manifest);

    const wave1 = conductor.buildSpawnDirectives({
      ecosystemRoot: tmp, swarmId: '0001-foo', waveIndex: 1,
    });
    assert.equal(wave1.length, 1);
    assert.equal(wave1[0].repoId, 'a');
    assert.equal(wave1[0].platform, 'claude-code');
    assert.equal(wave1[0].repoPath, path.join(tmp, 'a'));
    assert.equal(wave1[0].phaseSlug, 'phase-1-foo');
    assert.equal(wave1[0].env.MOMENTUM_SWARM_ID, '0001-foo');
    assert.equal(wave1[0].env.MOMENTUM_SWARM_WAVE, '1');
    assert.equal(wave1[0].env.MOMENTUM_SWARM_INITIATIVE, 'foo');
    assert.equal(wave1[0].env.MOMENTUM_ECOSYSTEM_ROOT, tmp);
    assert.match(wave1[0].recipePath, /supervise\.md$/);

    const wave2 = conductor.buildSpawnDirectives({
      ecosystemRoot: tmp, swarmId: '0001-foo', waveIndex: 2,
    });
    assert.equal(wave2.length, 1);
    assert.equal(wave2[0].repoId, 'b');
  } finally {
    rmrf(tmp);
  }
});

test('buildSpawnDirectives — throws when repo missing from ecosystem manifest', () => {
  const tmp = mktmp();
  try {
    const eco = fakeEcosystem(tmp, [
      { id: 'a', path: 'a', role: 'library' },
    ], []);
    const manifest = conductor.planSwarm({
      ecosystemRoot: tmp, swarmId: '0001-foo', initiative: 'foo',
      impactedRepos: ['a'], phaseSlug: 'phase-1-foo',
      sessionId: 'sess', mode: 'checkpoint',
      nowIso: '2026-06-12T17:00:00Z', ecosystemManifest: eco,
    });
    // Tamper: add an unknown repo to manifest waves
    manifest.waves.push({ index: 2, repos: ['ghost'] });
    manifest.repos.ghost = Object.assign({}, manifest.repos.a, { wave: 2 });
    manifestLib.writeManifest(tmp, '0001-foo', manifest);

    assert.throws(
      () => conductor.buildSpawnDirectives({ ecosystemRoot: tmp, swarmId: '0001-foo', waveIndex: 2 }),
      /cannot resolve path/
    );
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Brief frontmatter injection from env (the /start-phase wiring)
// ─────────────────────────────────────────────────────────────────────────────

test('injectBriefFrontmatter — populates brief from spawn directive env', () => {
  const tmp = mktmp();
  try {
    const briefDir = path.join(tmp, 'specs', 'phases', 'phase-3-user-auth');
    fs.mkdirSync(briefDir, { recursive: true });
    fs.writeFileSync(path.join(briefDir, 'overview.md'), '# Phase 3 — User Auth\n\nSolo.\n');

    conductor.injectBriefFrontmatter(tmp, 'phase-3-user-auth', {
      swarm: '0007-user-auth', wave: 2, initiative: 'user-auth',
      claimed_by_session: 'sess_abc',
    });

    const written = fs.readFileSync(path.join(briefDir, 'overview.md'), 'utf8');
    const { frontmatter, body } = briefLib.parseSwarmFrontmatter(written);
    assert.equal(frontmatter.swarm, '0007-user-auth');
    assert.equal(frontmatter.wave, 2);
    assert.equal(frontmatter.initiative, 'user-auth');
    assert.equal(frontmatter.claimed_by_session, 'sess_abc');
    assert.match(body, /# Phase 3/);
  } finally {
    rmrf(tmp);
  }
});

test('readEnvSwarmContext — parses MOMENTUM_SWARM_* vars', () => {
  const ctx = conductor.readEnvSwarmContext({
    MOMENTUM_SWARM_ID: '0007-foo',
    MOMENTUM_SWARM_WAVE: '3',
    MOMENTUM_SWARM_INITIATIVE: 'foo',
    MOMENTUM_SWARM_SESSION: 'sess_x',
  });
  assert.equal(ctx.swarm, '0007-foo');
  assert.equal(ctx.wave, 3);
  assert.equal(ctx.initiative, 'foo');
  assert.equal(ctx.claimed_by_session, 'sess_x');
});

test('readEnvSwarmContext — null when no swarm vars set', () => {
  const ctx = conductor.readEnvSwarmContext({});
  assert.equal(ctx, null);
});

// ─────────────────────────────────────────────────────────────────────────────
// Saga records
// ─────────────────────────────────────────────────────────────────────────────

test('saga.openRecord — allocates fresh record once per (swarm,wave)', () => {
  const tmp = mktmp();
  try {
    const repoPath = tmp;
    const seed = {
      saga_id: 'sg_test1234',
      repo: 'a',
      phase_slug: 'phase-1-foo',
      branch: 'phase-1-foo',
      started: '2026-06-12T17:00:00Z',
      claimed_by_session: 'sess',
    };
    const r1 = sagaLib.openRecord(repoPath, '0001-foo', 1, seed);
    assert.equal(r1.run_id, '001');
    assert.equal(r1.primitive, 'swarm-supervise');
    assert.equal(r1.swarm_id, '0001-foo');
    assert.equal(r1.wave, 1);
    assert.equal(r1.done, false);

    // Re-open returns same record (no new alloc)
    const r2 = sagaLib.openRecord(repoPath, '0001-foo', 1, seed);
    assert.equal(r2.run_id, '001');

    // Different wave → new id
    const r3 = sagaLib.openRecord(repoPath, '0001-foo', 2, seed);
    assert.equal(r3.run_id, '002');
  } finally {
    rmrf(tmp);
  }
});

test('saga.updateRecord — bumps step_n, persists', () => {
  const tmp = mktmp();
  try {
    const seed = {
      saga_id: 'sg_test1234', repo: 'a', phase_slug: 'phase-1-foo',
      branch: 'phase-1-foo', started: '2026-06-12T17:00:00Z', claimed_by_session: 'sess',
    };
    const r = sagaLib.openRecord(tmp, '0001-foo', 1, seed);
    const after = sagaLib.updateRecord(tmp, r.run_id, (rec) => {
      rec.tasks_done = 3;
      rec.tasks_total = 9;
      rec.last_commit = 'feat(auth): middleware';
    });
    assert.equal(after.step_n, 1);
    assert.equal(after.tasks_done, 3);
    const reloaded = sagaLib.loadRecord(tmp, r.run_id);
    assert.equal(reloaded.tasks_done, 3);
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// pollTurn — Strategies A + B + C
// ─────────────────────────────────────────────────────────────────────────────

test('pollTurn — starts wave 1 when all queued', () => {
  const tmp = mktmp();
  try {
    const eco = fakeEcosystem(tmp, [
      { id: 'a', path: 'a', role: 'library' },
    ], []);
    const manifest = conductor.planSwarm({
      ecosystemRoot: tmp, swarmId: '0001-foo', initiative: 'foo',
      impactedRepos: ['a'], phaseSlug: 'phase-1-foo',
      sessionId: 'sess', mode: 'autopilot',
      nowIso: '2026-06-12T17:00:00Z', ecosystemManifest: eco,
    });
    manifestLib.writeManifest(tmp, '0001-foo', manifest);
    boardLib.refreshBoard(tmp, '0001-foo', '2026-06-12T17:00:00Z');

    const r = conductor.pollTurn({
      ecosystemRoot: tmp, swarmId: '0001-foo', nowIso: '2026-06-12T17:01:00Z',
    });
    assert.equal(r.advancedToWave, 1);
    const after = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(after.waves[0].status, 'running');
    assert.equal(after.repos.a.status, 'running');
  } finally {
    rmrf(tmp);
  }
});

test('pollTurn — advances to next wave when current wave done (autopilot)', () => {
  const tmp = mktmp();
  try {
    const eco = fakeEcosystem(tmp, [
      { id: 'a', path: 'a', role: 'library' },
      { id: 'b', path: 'b', role: 'platform' },
    ], [{ from: 'b', to: 'a' }]);
    const manifest = conductor.planSwarm({
      ecosystemRoot: tmp, swarmId: '0001-foo', initiative: 'foo',
      impactedRepos: ['a', 'b'], phaseSlug: 'phase-1-foo',
      sessionId: 'sess', mode: 'autopilot',
      nowIso: '2026-06-12T17:00:00Z', ecosystemManifest: eco,
    });
    manifestLib.writeManifest(tmp, '0001-foo', manifest);
    boardLib.refreshBoard(tmp, '0001-foo', '2026-06-12T17:00:00Z');

    // Tick to start wave 1
    conductor.pollTurn({ ecosystemRoot: tmp, swarmId: '0001-foo', nowIso: '2026-06-12T17:00:01Z' });

    // Mark repo a complete (simulate supervisor done)
    conductor.recordRepoComplete(tmp, '0001-foo', 'a', { tasksDone: 7, tasksTotal: 7 });

    // Tick again — should detect wave 1 done and advance to wave 2
    const r = conductor.pollTurn({
      ecosystemRoot: tmp, swarmId: '0001-foo', nowIso: '2026-06-12T17:02:00Z',
    });
    assert.equal(r.completedWave, 1);
    assert.equal(r.advancedToWave, 2);
    const after = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(after.waves[0].status, 'complete');
    assert.equal(after.waves[1].status, 'running');
    assert.equal(after.repos.b.status, 'running');
  } finally {
    rmrf(tmp);
  }
});

test('pollTurn — checkpoint mode marks wave complete but does NOT auto-advance', () => {
  const tmp = mktmp();
  try {
    const eco = fakeEcosystem(tmp, [
      { id: 'a', path: 'a', role: 'library' },
      { id: 'b', path: 'b', role: 'platform' },
    ], [{ from: 'b', to: 'a' }]);
    const manifest = conductor.planSwarm({
      ecosystemRoot: tmp, swarmId: '0001-foo', initiative: 'foo',
      impactedRepos: ['a', 'b'], phaseSlug: 'phase-1-foo',
      sessionId: 'sess', mode: 'checkpoint',
      nowIso: '2026-06-12T17:00:00Z', ecosystemManifest: eco,
    });
    manifestLib.writeManifest(tmp, '0001-foo', manifest);
    boardLib.refreshBoard(tmp, '0001-foo', '2026-06-12T17:00:00Z');

    conductor.pollTurn({ ecosystemRoot: tmp, swarmId: '0001-foo', nowIso: '2026-06-12T17:00:01Z' });
    conductor.recordRepoComplete(tmp, '0001-foo', 'a', { tasksDone: 7, tasksTotal: 7 });
    const r = conductor.pollTurn({
      ecosystemRoot: tmp, swarmId: '0001-foo', nowIso: '2026-06-12T17:02:00Z',
    });
    assert.equal(r.completedWave, 1);
    assert.equal(r.advancedToWave, null);
    const after = manifestLib.loadManifest(tmp, '0001-foo');
    assert.equal(after.waves[0].status, 'complete');
    assert.equal(after.waves[1].status, 'queued', 'wave 2 stays queued — user must approve');
  } finally {
    rmrf(tmp);
  }
});
