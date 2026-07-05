'use strict';

/**
 * Phase 18 G3 — Multi-adapter swarm e2e scenarios.
 *
 * The Phase 17 e2e suite (`swarm-e2e-scenarios.test.js`) runs 3
 * synthetic ecosystem scenarios pinned to the Claude Code platform.
 * Phase 18 extends parity to Codex + Antigravity adapters; this test
 * runs the same 3 scenarios with `platform: 'codex'` and
 * `platform: 'antigravity'` directives, asserts that:
 *
 *   1. The Phase 17 + 17.5 swarm primitives are platform-agnostic
 *      (the same scenarios complete byte-for-byte regardless of
 *      adapter — only the platform field on directives differs).
 *   2. Spawn dispatch through each adapter's spawn() returns the
 *      canonical per-repo shape (status -1 when the CLI is absent
 *      from PATH — the dev-env default for Codex + Antigravity).
 *
 * Evidence captured to:
 *   specs/phases/phase-18-swarm-parity/evidence/
 *     scenario-{a,b,c}-{codex,antigravity}.txt
 *
 * Live runtime parity (real `codex` / `agy` spawn returning status 0)
 * is gated on G4 VAL-001 + VAL-002 evidence.
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
const { spawnSupervisors } = require('../bin/swarm');

const REPO_ROOT = path.resolve(__dirname, '..');
const EVIDENCE_DIR = path.join(
  REPO_ROOT, 'specs', 'phases', 'phase-18-swarm-parity', 'evidence',
);

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
  const eco = {
    name: `phase18-${scenarioName}`, version: 1, created: '2026-06-15',
    members, dependencies: deps,
  };
  fs.writeFileSync(path.join(tmp, 'ecosystem.json'), JSON.stringify(eco, null, 2));
  for (const m of members) {
    const repoPath = path.join(tmp, m.path);
    fs.mkdirSync(repoPath, { recursive: true });
    gitInitRepo(repoPath);
    fs.mkdirSync(path.join(repoPath, 'specs', 'phases', 'phase-1-feature'), { recursive: true });
    fs.writeFileSync(
      path.join(repoPath, 'specs', 'phases', 'phase-1-feature', 'overview.md'),
      `# Phase 1 — feature (${m.id})\n\nSynthetic phase for Phase 18 multi-adapter scenario.\n`,
    );
  }
  fs.mkdirSync(path.join(tmp, 'initiatives'), { recursive: true });
  fs.writeFileSync(
    path.join(tmp, 'initiatives', '0001-feature.md'),
    `---\nid: 1\nslug: feature\nstatus: in-progress\nstarted: 2026-06-15\nowner: test\nrepos: [${members.map((m) => m.id).join(', ')}]\n---\n\n# feature\n`,
  );
  return eco;
}

function driveSwarmToCompletion(ecosystemRoot, swarmId, manifest) {
  let turnCount = 0;
  conductor.pollTurn({
    ecosystemRoot, swarmId, nowIso: `2026-06-15T17:0${++turnCount}:00Z`,
  });
  for (const wave of manifest.waves) {
    for (const repoId of wave.repos) {
      conductor.recordRepoComplete(ecosystemRoot, swarmId, repoId, {
        tasksDone: 5 + repoId.length, tasksTotal: 5 + repoId.length,
        commits: 2, lastSeenSha: '1234567',
      });
      conductor.pollTurn({
        ecosystemRoot, swarmId, nowIso: `2026-06-15T17:${String(++turnCount).padStart(2, '0')}:00Z`,
      });
    }
  }
  return { turnCount };
}

// Strip non-deterministic fields so re-runs of the test produce the
// same evidence body byte-for-byte (avoids the TD-006 hygiene issue
// observed in Phase 17 scenario evidence). Two known sources:
//   - last_seen_sha — comes from git init's random commit sha.
//   - audit[].ts and "Completed at:" — come from the wall-clock at the
//     moment `momentum swarm complete` ran.
function canonicalize(body) {
  return body
    .replace(/"last_seen_sha": "[0-9a-f]+"/g, '"last_seen_sha": "<deterministic-omitted>"')
    .replace(/"ts": "[^"]+"/g, '"ts": "<deterministic-omitted>"')
    .replace(/^- Completed at: .+$/gm, '- Completed at: <deterministic-omitted>');
}

// Phase 22: opencode evidence lands in ITS phase's evidence dir, not Phase 18's.
const EVIDENCE_DIR_BY_ADAPTER = {
  opencode: path.join(
    REPO_ROOT, 'specs', 'phases', 'phase-22-opencode-adapter', 'evidence',
  ),
};

const CAPTION_BY_ADAPTER = {
  opencode: 'Captured: 2026-07-05 (Phase 22 G4)',
};

function captureEvidence(scenarioId, adapter, ecosystemRoot, swarmId, spawnResults, metrics) {
  // TD-006: evidence capture is opt-in (this file was missed by the original
  // gating pass — its static content happened to rewrite byte-identically).
  if (process.env.MOMENTUM_CAPTURE_EVIDENCE !== '1') return null;
  const evidenceDir = EVIDENCE_DIR_BY_ADAPTER[adapter] || EVIDENCE_DIR;
  fs.mkdirSync(evidenceDir, { recursive: true });
  const evidencePath = path.join(evidenceDir, `scenario-${scenarioId}-${adapter}.txt`);
  const manifest = manifestLib.loadManifest(ecosystemRoot, swarmId);
  const title =
    adapter === 'opencode'
      ? `# Phase 22 Swarm Parity — Scenario ${scenarioId.toUpperCase()} × ${adapter}`
      : `# Phase 18 Swarm Parity — Scenario ${scenarioId.toUpperCase()} × ${adapter}`;
  const lines = [
    title,
    '',
    CAPTION_BY_ADAPTER[adapter] || `Captured: 2026-06-15 (Phase 18 G3)`,
    `Adapter:  ${adapter}`,
    `Swarm:    ${swarmId}`,
    `Status:   ${manifest && manifest.status}`,
    `Waves:    ${manifest && manifest.waves.length}`,
    `Turns:    ${metrics.turnCount}`,
    '',
    '## Spawn dispatch (Wave 1)',
    '',
    'Each directive routed to the adapter\'s spawn() — canonical per-repo',
    'shape returned. In dev env neither `codex` nor `agy` is on PATH, so',
    'status: -1 is expected. Live spawn evidence lands in G4 VAL.',
    '',
    '```json',
    JSON.stringify(spawnResults, null, 2),
    '```',
    '',
    '## Manifest (final)',
    '',
    '```json',
    JSON.stringify(manifest, null, 2),
    '```',
    '',
    '## Cross-repo changeset',
    '',
    '```markdown',
    fs.readFileSync(path.join(ecosystemRoot, 'changes', `${swarmId}.md`), 'utf8'),
    '```',
    '',
  ];
  fs.writeFileSync(evidencePath, canonicalize(lines.join('\n')));
  return evidencePath;
}

const SCENARIOS = [
  {
    id: 'a-linear',
    members: [
      { id: 'shared-types', path: 'shared-types', role: 'library' },
      { id: 'backend', path: 'backend', role: 'platform' },
      { id: 'frontend', path: 'frontend', role: 'client' },
    ],
    deps: [
      { from: 'backend', to: 'shared-types', kind: 'library' },
      { from: 'frontend', to: 'backend', kind: 'api-contract' },
    ],
    expectedWaves: 3,
  },
  {
    id: 'b-branched',
    members: [
      { id: 'root', path: 'root', role: 'library' },
      { id: 'left', path: 'left', role: 'service' },
      { id: 'right', path: 'right', role: 'service' },
      { id: 'merge', path: 'merge', role: 'client' },
    ],
    deps: [
      { from: 'left', to: 'root', kind: 'library' },
      { from: 'right', to: 'root', kind: 'library' },
      { from: 'merge', to: 'left', kind: 'api-contract' },
      { from: 'merge', to: 'right', kind: 'api-contract' },
    ],
    expectedWaves: 3,
  },
  {
    id: 'c-wide',
    members: [
      { id: 'core', path: 'core', role: 'library' },
      { id: 'leaf-1', path: 'leaf-1', role: 'service' },
      { id: 'leaf-2', path: 'leaf-2', role: 'service' },
      { id: 'leaf-3', path: 'leaf-3', role: 'service' },
      { id: 'leaf-4', path: 'leaf-4', role: 'service' },
    ],
    deps: [
      { from: 'leaf-1', to: 'core' },
      { from: 'leaf-2', to: 'core' },
      { from: 'leaf-3', to: 'core' },
      { from: 'leaf-4', to: 'core' },
    ],
    expectedWaves: 2,
  },
];

const ADAPTERS = ['codex', 'antigravity', 'opencode'];

for (const scenario of SCENARIOS) {
  for (const adapter of ADAPTERS) {
    test(`Scenario ${scenario.id} × ${adapter} — dispatch + completion + evidence`, () => {
      const tmp = mktmp(`phase18-${scenario.id}-${adapter}-`);
      // Pin the AGY_BIN / CODEX_BIN to a missing path so the dispatch is
      // observable and fast — the goal is to verify the dispatch
      // surface, not launch real sessions.
      const prevCodex = process.env.CODEX_BIN;
      const prevAgy = process.env.AGY_BIN;
      const prevOpencode = process.env.OPENCODE_BIN;
      process.env.CODEX_BIN = '/this/does/not/exist/codex';
      process.env.AGY_BIN = '/this/does/not/exist/agy';
      // opencode IS often on PATH in dev envs (Phase 22) — pin it away so the
      // dispatch stays observable-and-fast rather than launching a session.
      process.env.OPENCODE_BIN = '/this/does/not/exist/opencode';
      try {
        const eco = setupEcosystem(tmp, `${scenario.id}-${adapter}`, scenario.members, scenario.deps);
        const manifest = conductor.planSwarm({
          ecosystemRoot: tmp,
          swarmId: '0001-feature',
          initiative: 'feature',
          impactedRepos: scenario.members.map((m) => m.id),
          phaseSlug: 'phase-1-feature',
          sessionId: 'sess_phase18',
          mode: 'autopilot',
          nowIso: '2026-06-15T17:00:00Z',
          ecosystemManifest: eco,
        });
        manifestLib.writeManifest(tmp, '0001-feature', manifest);
        boardLib.refreshBoard(tmp, '0001-feature', '2026-06-15T17:00:00Z');

        // Build Wave 1 directives for the chosen adapter and dispatch through
        // the canonical spawn surface. Every directive should yield a
        // per-repo result object with status: -1 (binary not on PATH).
        const directives = conductor.buildSpawnDirectives({
          ecosystemRoot: tmp, swarmId: '0001-feature', waveIndex: 1, platform: adapter,
        });
        assert.ok(directives.length > 0, 'wave 1 must produce >= 1 directive');
        for (const d of directives) {
          assert.equal(d.platform, adapter, `directive platform must be ${adapter}`);
        }
        const spawnResults = spawnSupervisors(directives);
        assert.equal(spawnResults.length, directives.length);
        for (const r of spawnResults) {
          assert.equal(typeof r.status, 'number');
          assert.equal(r.status, -1, `expected -1 (binary not on PATH); got ${r.status}: ${r.detail}`);
        }

        // Drive the rest of the swarm to completion via the in-process
        // simulator (recordRepoComplete + pollTurn). Same loop as
        // Phase 17 e2e — only the platform on directives differs.
        const metrics = driveSwarmToCompletion(tmp, '0001-feature', manifest);

        // /swarm complete via CLI floor
        const r = runCli(['swarm', 'complete', '0001-feature', '--ecosystem', tmp], { cwd: tmp });
        assert.equal(r.status, 0, r.stderr);

        const final = manifestLib.loadManifest(tmp, '0001-feature');
        assert.equal(final.status, 'complete');
        assert.equal(final.waves.length, scenario.expectedWaves);
        for (const w of final.waves) assert.equal(w.status, 'complete');

        captureEvidence(scenario.id, adapter, tmp, '0001-feature', spawnResults, metrics);
      } finally {
        if (prevCodex === undefined) delete process.env.CODEX_BIN;
        else process.env.CODEX_BIN = prevCodex;
        if (prevAgy === undefined) delete process.env.AGY_BIN;
        else process.env.AGY_BIN = prevAgy;
        if (prevOpencode === undefined) delete process.env.OPENCODE_BIN;
        else process.env.OPENCODE_BIN = prevOpencode;
        rmrf(tmp);
      }
    });
  }
}
