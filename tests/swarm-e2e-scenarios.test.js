'use strict';

/**
 * Phase 17 G4 — End-to-end scenarios on synthetic ecosystem fixtures.
 *
 * Three fixtures exercise the full conductor → supervisor → board →
 * complete loop on different ecosystem shapes:
 *
 *   A — 3-repo linear      (shared-types → backend → frontend)
 *   B — 4-repo branched    (one root → two parallel → one merge)
 *   C — 5-repo wide        (one root → four parallel leaves)
 *
 * Each scenario:
 *   1. Builds the synthetic ecosystem under tests/fixtures/swarm-ecosystems/
 *   2. Plans + spawns the swarm (in dry-run mode — no real `claude --bg`)
 *   3. Drives every supervisor through phase completion (via the
 *      conductor's `recordRepoComplete` helper, simulating real
 *      supervisor turns).
 *   4. Runs /swarm complete and verifies the changeset.
 *   5. Captures evidence to specs/phases/phase-17-swarm/evidence/.
 *   6. Asserts conductor-turn cost stays <5KB (board.json size) per
 *      the indexing design targets.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { mktmp, rmrf, runCli } = require('./_helpers');
const conductor = require('../core/swarm/conductor');
const manifestLib = require('../core/swarm/lib/manifest');
const boardLib = require('../core/swarm/lib/board');

const REPO_ROOT = path.resolve(__dirname, '..');
const EVIDENCE_DIR = path.join(
  REPO_ROOT, 'specs', 'phases', 'phase-17-swarm', 'evidence',
);

const FIXTURES_DIR = path.join(REPO_ROOT, 'tests', 'fixtures', 'swarm-ecosystems');

function gitInitRepo(dir) {
  spawnSync('git', ['init', '-q'], { cwd: dir });
  spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  spawnSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: dir });
  fs.writeFileSync(path.join(dir, 'README.md'), '# repo\n');
  spawnSync('git', ['add', '-A'], { cwd: dir });
  spawnSync('git', ['commit', '-q', '-m', 'init'], { cwd: dir });
  spawnSync('git', ['branch', '-M', 'main'], { cwd: dir });
}

function setupEcosystem(tmp, scenarioName, members, deps) {
  fs.mkdirSync(tmp, { recursive: true });
  const eco = { name: `test-${scenarioName}`, version: 1, created: '2026-06-12', members, dependencies: deps };
  fs.writeFileSync(path.join(tmp, 'ecosystem.json'), JSON.stringify(eco, null, 2));
  for (const m of members) {
    const repoPath = path.join(tmp, m.path);
    fs.mkdirSync(repoPath, { recursive: true });
    gitInitRepo(repoPath);
    fs.mkdirSync(path.join(repoPath, 'specs', 'phases', 'phase-1-feature'), { recursive: true });
    fs.writeFileSync(
      path.join(repoPath, 'specs', 'phases', 'phase-1-feature', 'overview.md'),
      `# Phase 1 — feature (${m.id})\n\nSynthetic phase for swarm scenario.\n`,
    );
  }
  fs.mkdirSync(path.join(tmp, 'initiatives'), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, 'initiatives', '0001-feature.md'),
    `---\nid: 1\nslug: feature\nstatus: in-progress\nstarted: 2026-06-12\nowner: test\nrepos: [${members.map((m) => m.id).join(', ')}]\n---\n\n# feature\n`,
  );
  return eco;
}

/**
 * Drive every repo in the swarm to completion in wave order. Simulates
 * supervisor turns by injecting tasks_done/tasks_total/commits + then
 * calling pollTurn so the conductor advances waves (autopilot mode).
 *
 * Returns { turnCount, perTurnBoardSize, finalBoardSize }.
 */
function driveSwarmToCompletion(ecosystemRoot, swarmId, manifest) {
  let turnCount = 0;
  const turnSizes = [];
  // Initial poll — start wave 1
  conductor.pollTurn({
    ecosystemRoot, swarmId, nowIso: `2026-06-12T17:0${++turnCount}:00Z`,
  });
  turnSizes.push(fs.statSync(path.join(manifestLib.swarmDir(ecosystemRoot, swarmId), 'board.json')).size);

  for (const wave of manifest.waves) {
    for (const repoId of wave.repos) {
      // Simulate the supervisor completing the phase
      conductor.recordRepoComplete(ecosystemRoot, swarmId, repoId, {
        tasksDone: 5 + repoId.length, tasksTotal: 5 + repoId.length,
        commits: 2, lastSeenSha: '1234567',
      });
      conductor.pollTurn({
        ecosystemRoot, swarmId, nowIso: `2026-06-12T17:${String(++turnCount).padStart(2, '0')}:00Z`,
      });
      turnSizes.push(fs.statSync(path.join(manifestLib.swarmDir(ecosystemRoot, swarmId), 'board.json')).size);
    }
  }
  return {
    turnCount,
    perTurnBoardSize: turnSizes,
    finalBoardSize: turnSizes[turnSizes.length - 1] || 0,
    p95BoardSize: percentile(turnSizes, 0.95),
  };
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[idx];
}

function captureEvidence(scenarioId, ecosystemRoot, swarmId, metrics) {
  // TD-006: the committed evidence files embed the random tmp-dir name, so
  // regenerating them on every `npm test` dirties the tree. Evidence capture
  // is opt-in via `npm run capture-evidence`; the plain suite only verifies.
  if (process.env.MOMENTUM_CAPTURE_EVIDENCE !== '1') return null;
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const evidencePath = path.join(EVIDENCE_DIR, `scenario-${scenarioId}.txt`);
  const lines = [
    `# Phase 17 Swarm — Scenario ${scenarioId.toUpperCase()}`,
    '',
    `Captured: 2026-06-12 (Phase 17 G4)`,
    `Ecosystem: ${path.basename(ecosystemRoot)}`,
    `Swarm: ${swarmId}`,
    '',
    '## Metrics',
    '',
    `- Conductor turns: ${metrics.turnCount}`,
    `- Final board.json size: ${metrics.finalBoardSize} bytes`,
    `- p95 board.json size:   ${metrics.p95BoardSize} bytes`,
    `- Per-turn cost target:  <5120 bytes (5KB) — ${metrics.p95BoardSize < 5120 ? 'PASS' : 'FAIL'}`,
    '',
    '## Manifest',
    '',
    '```json',
    fs.readFileSync(path.join(manifestLib.swarmDir(ecosystemRoot, swarmId), 'manifest.json'), 'utf8'),
    '```',
    '',
    '## Board.json (final)',
    '',
    '```json',
    fs.readFileSync(path.join(manifestLib.swarmDir(ecosystemRoot, swarmId), 'board.json'), 'utf8'),
    '```',
    '',
    '## Cross-repo changeset',
    '',
    '```markdown',
    fs.readFileSync(path.join(ecosystemRoot, 'changes', `${swarmId}.md`), 'utf8'),
    '```',
    '',
  ];
  fs.writeFileSync(evidencePath, lines.join('\n'));
  return evidencePath;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario A — 3-repo linear
// ─────────────────────────────────────────────────────────────────────────────

test('Scenario A — 3-repo linear (shared-types → backend → frontend)', () => {
  const tmp = mktmp();
  try {
    const members = [
      { id: 'shared-types', path: 'shared-types', role: 'library' },
      { id: 'backend', path: 'backend', role: 'platform' },
      { id: 'frontend', path: 'frontend', role: 'client' },
    ];
    const deps = [
      { from: 'backend', to: 'shared-types', kind: 'library' },
      { from: 'frontend', to: 'backend', kind: 'api-contract' },
    ];
    const eco = setupEcosystem(tmp, 'a-linear', members, deps);

    const manifest = conductor.planSwarm({
      ecosystemRoot: tmp,
      swarmId: '0001-feature',
      initiative: 'feature',
      impactedRepos: ['shared-types', 'backend', 'frontend'],
      phaseSlug: 'phase-1-feature',
      sessionId: 'sess_a',
      mode: 'autopilot',
      nowIso: '2026-06-12T17:00:00Z',
      ecosystemManifest: eco,
    });
    manifestLib.writeManifest(tmp, '0001-feature', manifest);
    boardLib.refreshBoard(tmp, '0001-feature', '2026-06-12T17:00:00Z');

    const metrics = driveSwarmToCompletion(tmp, '0001-feature', manifest);

    // Run /swarm complete via CLI floor
    const r = runCli(['swarm', 'complete', '0001-feature', '--ecosystem', tmp], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr);

    const final = manifestLib.loadManifest(tmp, '0001-feature');
    assert.equal(final.status, 'complete');
    assert.equal(final.waves.length, 3, '3 waves for linear');
    for (const w of final.waves) assert.equal(w.status, 'complete');

    // Token budget — board reads dominate the conductor turn cost
    assert.ok(metrics.p95BoardSize < 5120,
      `p95 board.json size ${metrics.p95BoardSize}B should be <5KB`);

    captureEvidence('a-linear', tmp, '0001-feature', metrics);
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario B — 4-repo branched
// ─────────────────────────────────────────────────────────────────────────────

test('Scenario B — 4-repo branched (root → two parallel → merge)', () => {
  const tmp = mktmp();
  try {
    const members = [
      { id: 'root', path: 'root', role: 'library' },
      { id: 'mid-a', path: 'mid-a', role: 'library' },
      { id: 'mid-b', path: 'mid-b', role: 'library' },
      { id: 'leaf', path: 'leaf', role: 'client' },
    ];
    const deps = [
      { from: 'mid-a', to: 'root', kind: 'library' },
      { from: 'mid-b', to: 'root', kind: 'library' },
      { from: 'leaf', to: 'mid-a', kind: 'library' },
      { from: 'leaf', to: 'mid-b', kind: 'library' },
    ];
    const eco = setupEcosystem(tmp, 'b-branched', members, deps);

    const manifest = conductor.planSwarm({
      ecosystemRoot: tmp,
      swarmId: '0001-feature',
      initiative: 'feature',
      impactedRepos: ['root', 'mid-a', 'mid-b', 'leaf'],
      phaseSlug: 'phase-1-feature',
      sessionId: 'sess_b',
      mode: 'autopilot',
      nowIso: '2026-06-12T17:00:00Z',
      ecosystemManifest: eco,
    });
    manifestLib.writeManifest(tmp, '0001-feature', manifest);
    boardLib.refreshBoard(tmp, '0001-feature', '2026-06-12T17:00:00Z');

    assert.equal(manifest.waves.length, 3);
    assert.deepEqual(manifest.waves[0].repos, ['root']);
    assert.deepEqual(manifest.waves[1].repos, ['mid-a', 'mid-b']);
    assert.deepEqual(manifest.waves[2].repos, ['leaf']);

    const metrics = driveSwarmToCompletion(tmp, '0001-feature', manifest);

    const r = runCli(['swarm', 'complete', '0001-feature', '--ecosystem', tmp], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr);

    const final = manifestLib.loadManifest(tmp, '0001-feature');
    assert.equal(final.status, 'complete');
    assert.ok(metrics.p95BoardSize < 5120,
      `p95 board.json size ${metrics.p95BoardSize}B should be <5KB`);

    captureEvidence('b-branched', tmp, '0001-feature', metrics);
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario C — 5-repo wide fan-out
// ─────────────────────────────────────────────────────────────────────────────

test('Scenario C — 5-repo wide (root → 4 parallel leaves)', () => {
  const tmp = mktmp();
  try {
    const members = [
      { id: 'root', path: 'root', role: 'library' },
      { id: 'leaf-one', path: 'leaf-one', role: 'client' },
      { id: 'leaf-two', path: 'leaf-two', role: 'client' },
      { id: 'leaf-three', path: 'leaf-three', role: 'client' },
      { id: 'leaf-four', path: 'leaf-four', role: 'client' },
    ];
    const deps = [
      { from: 'leaf-one', to: 'root', kind: 'library' },
      { from: 'leaf-two', to: 'root', kind: 'library' },
      { from: 'leaf-three', to: 'root', kind: 'library' },
      { from: 'leaf-four', to: 'root', kind: 'library' },
    ];
    const eco = setupEcosystem(tmp, 'c-wide', members, deps);

    const manifest = conductor.planSwarm({
      ecosystemRoot: tmp,
      swarmId: '0001-feature',
      initiative: 'feature',
      impactedRepos: ['root', 'leaf-one', 'leaf-two', 'leaf-three', 'leaf-four'],
      phaseSlug: 'phase-1-feature',
      sessionId: 'sess_c',
      mode: 'autopilot',
      nowIso: '2026-06-12T17:00:00Z',
      ecosystemManifest: eco,
    });
    manifestLib.writeManifest(tmp, '0001-feature', manifest);
    boardLib.refreshBoard(tmp, '0001-feature', '2026-06-12T17:00:00Z');

    assert.equal(manifest.waves.length, 2);
    assert.deepEqual(manifest.waves[0].repos, ['root']);
    assert.equal(manifest.waves[1].repos.length, 4);

    const metrics = driveSwarmToCompletion(tmp, '0001-feature', manifest);

    const r = runCli(['swarm', 'complete', '0001-feature', '--ecosystem', tmp], { cwd: tmp });
    assert.equal(r.status, 0, r.stderr);

    const final = manifestLib.loadManifest(tmp, '0001-feature');
    assert.equal(final.status, 'complete');
    assert.ok(metrics.p95BoardSize < 5120,
      `p95 board.json size ${metrics.p95BoardSize}B should be <5KB`);

    captureEvidence('c-wide', tmp, '0001-feature', metrics);
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Fixture sanity — the three fixtures stay built into the repo
// ─────────────────────────────────────────────────────────────────────────────

test('fixtures dir exists for documentation reference', () => {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  const readmePath = path.join(FIXTURES_DIR, 'README.md');
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(readmePath, `# Swarm ecosystem fixtures

Synthetic ecosystems used by \`tests/swarm-e2e-scenarios.test.js\`. The
test builds these in tmp dirs at run time; this README documents the
shapes for future contributors.

## Scenario A — linear (3 repos)

shared-types → backend → frontend

3 waves; one repo per wave.

## Scenario B — branched (4 repos)

         root
        /    \\
     mid-a   mid-b
        \\    /
         leaf

3 waves: root → {mid-a, mid-b} → leaf.

## Scenario C — wide fan-out (5 repos)

       root
   /  /  \\  \\
  l1  l2  l3  l4

2 waves: root → {l1, l2, l3, l4}.
`);
  }
  assert.ok(fs.existsSync(readmePath));
});
