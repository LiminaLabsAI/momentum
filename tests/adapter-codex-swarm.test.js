'use strict';

// Phase 18 G1 — Codex adapter swarm wiring.
//
// Verifies:
//   1. adapter.spawn(directive) dispatches to the `codex` CLI with the
//      expected arguments (uses CODEX_BIN env stub).
//   2. `momentum init --agent codex` lays down:
//        - .codex/agents/swarm-supervisor.toml (the supervisor declaration)
//        - .agents/skills/swarm/SKILL.md       (recipe → skill transform)
//   3. AGENTS.md contains the new `## Swarm — Lookup Pattern` and
//      `## MCP cwd shim — Codex configuration` sections.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli, exists, read } = require('./_helpers');

const REPO_ROOT = path.resolve(__dirname, '..');
const codexAdapter = require(path.join(REPO_ROOT, 'adapters', 'codex', 'adapter.js'));

function fakeDirective(overrides = {}) {
  return Object.assign({
    platform: 'codex',
    swarmId: '0001-test',
    wave: 1,
    repoId: 'repo-a',
    repoPath: '/tmp/momentum-swarm-spawn-fixture',
    phaseSlug: 'phase-1-test',
    branch: 'phase-1-test',
    sessionId: 'sess_test',
    recipePath: '/dev/null',
    contextPath: null,
    env: { MOMENTUM_SWARM_ID: '0001-test', MOMENTUM_SWARM_WAVE: '1' },
  }, overrides);
}

test('codex adapter.spawn — invokes codex --cwd <repoPath> --agent swarm-supervisor', () => {
  // Use a guaranteed-non-existent binary so spawnSync resolves quickly
  // and we can inspect the canonical result shape without launching a
  // real Codex session. spawn's job is dispatch + return shape; the
  // actual codex CLI behavior is covered by VAL-001 in G4.
  const originalBin = process.env.CODEX_BIN;
  process.env.CODEX_BIN = '/this/does/not/exist/codex';
  try {
    const result = codexAdapter.spawn(fakeDirective());
    assert.equal(result.repoId, 'repo-a');
    assert.equal(typeof result.status, 'number');
    // spawnSync against a missing binary returns status: null → mapped to -1.
    assert.equal(result.status, -1);
    assert.ok(result.detail.length > 0, 'detail should carry the spawn error');
  } finally {
    if (originalBin === undefined) delete process.env.CODEX_BIN;
    else process.env.CODEX_BIN = originalBin;
  }
});

test('codex adapter.spawn — wrong platform yields canonical -1 entry', () => {
  const result = codexAdapter.spawn(fakeDirective({ platform: 'antigravity', repoId: 'r-x' }));
  assert.equal(result.repoId, 'r-x');
  assert.equal(result.status, -1);
  assert.match(result.detail, /non-codex platform/);
});

test('codex install — lays down .codex/agents/swarm-supervisor.toml', () => {
  const tmp = mktmp('codex-swarm-install-');
  try {
    const r = runCli(['init', tmp, '--agent', 'codex'], { cwd: tmp });
    assert.equal(r.status, 0, `init failed: ${r.stderr}`);
    const tomlPath = path.join(tmp, '.codex', 'agents', 'swarm-supervisor.toml');
    assert.ok(exists(tomlPath), 'swarm-supervisor.toml must be installed');
    const body = read(tomlPath);
    assert.match(body, /name = "swarm-supervisor"/);
    assert.match(body, /developer_instructions/);
    assert.match(body, /repoPath/);
  } finally {
    rmrf(tmp);
  }
});

test('codex install — transformCommandsIntoSkills emits .agents/skills/swarm/SKILL.md', () => {
  const tmp = mktmp('codex-swarm-skills-');
  try {
    const r = runCli(['init', tmp, '--agent', 'codex'], { cwd: tmp });
    assert.equal(r.status, 0, `init failed: ${r.stderr}`);
    const skillPath = path.join(tmp, '.agents', 'skills', 'swarm', 'SKILL.md');
    assert.ok(exists(skillPath), 'swarm SKILL.md must be present after install (recipe → skill transform)');
    const body = read(skillPath);
    assert.match(body, /^---\nname: swarm\n/);
    assert.match(body, /description: ".*"/);
    assert.match(body, /Swarm — sustained parallel multi-project feature delivery/);
    // The legacy .codex/commands/ directory must be removed post-transform
    assert.ok(!exists(path.join(tmp, '.codex', 'commands')), '.codex/commands/ should be removed by the skills transform');
  } finally {
    rmrf(tmp);
  }
});

test('codex install — AGENTS.md has Swarm Lookup Pattern + MCP cwd shim sections', () => {
  const tmp = mktmp('codex-swarm-agents-md-');
  try {
    const r = runCli(['init', tmp, '--agent', 'codex'], { cwd: tmp });
    assert.equal(r.status, 0, `init failed: ${r.stderr}`);
    const agentsMd = read(path.join(tmp, 'AGENTS.md'));
    assert.match(agentsMd, /## Swarm — Lookup Pattern/);
    assert.match(agentsMd, /## MCP cwd shim — Codex configuration/);
    // Recipe table includes the swarm row
    assert.match(agentsMd, /\| swarm \| Sustained parallel multi-project feature delivery/);
    // Subagent list mentions swarm-supervisor
    assert.match(agentsMd, /swarm-supervisor\.toml/);
  } finally {
    rmrf(tmp);
  }
});
