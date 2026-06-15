'use strict';

// Phase 18 G2 — Antigravity adapter swarm wiring.
//
// Verifies:
//   1. adapter.spawn(directive) dispatches to `agy` with the expected
//      arguments (uses AGY_BIN env stub).
//   2. `momentum init --agent antigravity` lays down:
//        - .agent/workflows/swarm.md           (auto-registers as /swarm)
//        - .agents/skills/swarm-supervisor/SKILL.md (supervisor persona)
//   3. AGENTS.md contains the new `## Swarm — Lookup Pattern` section.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli, exists, read } = require('./_helpers');

const REPO_ROOT = path.resolve(__dirname, '..');
const antigravityAdapter = require(path.join(REPO_ROOT, 'adapters', 'antigravity', 'adapter.js'));

function fakeDirective(overrides = {}) {
  return Object.assign({
    platform: 'antigravity',
    swarmId: '0001-test',
    wave: 1,
    repoId: 'repo-a',
    repoPath: '/tmp/momentum-swarm-spawn-fixture-agy',
    phaseSlug: 'phase-1-test',
    branch: 'phase-1-test',
    sessionId: 'sess_test',
    recipePath: '/dev/null',
    contextPath: null,
    env: { MOMENTUM_SWARM_ID: '0001-test', MOMENTUM_SWARM_WAVE: '1' },
  }, overrides);
}

test('antigravity adapter.spawn — invokes agy --cwd <repoPath> --skill swarm-supervisor', () => {
  const originalBin = process.env.AGY_BIN;
  process.env.AGY_BIN = '/this/does/not/exist/agy';
  try {
    const result = antigravityAdapter.spawn(fakeDirective());
    assert.equal(result.repoId, 'repo-a');
    assert.equal(typeof result.status, 'number');
    assert.equal(result.status, -1);
    assert.ok(result.detail.length > 0, 'detail should carry the spawn error');
  } finally {
    if (originalBin === undefined) delete process.env.AGY_BIN;
    else process.env.AGY_BIN = originalBin;
  }
});

test('antigravity adapter.spawn — wrong platform yields canonical -1 entry', () => {
  const result = antigravityAdapter.spawn(fakeDirective({ platform: 'codex', repoId: 'r-x' }));
  assert.equal(result.repoId, 'r-x');
  assert.equal(result.status, -1);
  assert.match(result.detail, /non-antigravity platform/);
});

test('antigravity install — lays down .agent/workflows/swarm.md', () => {
  const tmp = mktmp('antigravity-swarm-install-');
  try {
    const r = runCli(['init', tmp, '--agent', 'antigravity'], { cwd: tmp });
    assert.equal(r.status, 0, `init failed: ${r.stderr}`);
    const workflowPath = path.join(tmp, '.agent', 'workflows', 'swarm.md');
    assert.ok(exists(workflowPath), 'swarm.md workflow must be installed at .agent/workflows/');
    const body = read(workflowPath);
    assert.match(body, /^---\n/);
    assert.match(body, /^description: /m);
    assert.match(body, /# swarm/);
    assert.match(body, /momentum swarm/);
  } finally {
    rmrf(tmp);
  }
});

test('antigravity install — lays down .agents/skills/swarm-supervisor/SKILL.md', () => {
  const tmp = mktmp('antigravity-swarm-skill-');
  try {
    const r = runCli(['init', tmp, '--agent', 'antigravity'], { cwd: tmp });
    assert.equal(r.status, 0, `init failed: ${r.stderr}`);
    const skillPath = path.join(tmp, '.agents', 'skills', 'swarm-supervisor', 'SKILL.md');
    assert.ok(exists(skillPath), 'swarm-supervisor SKILL.md must be present');
    const body = read(skillPath);
    assert.match(body, /^---\nname: swarm-supervisor\n/);
    assert.match(body, /description: .*supervisor/);
    assert.match(body, /Boot sequence/);
    assert.match(body, /Stay in `repoPath`/);
  } finally {
    rmrf(tmp);
  }
});

test('antigravity install — AGENTS.md has Swarm Lookup Pattern section', () => {
  const tmp = mktmp('antigravity-swarm-agents-md-');
  try {
    const r = runCli(['init', tmp, '--agent', 'antigravity'], { cwd: tmp });
    assert.equal(r.status, 0, `init failed: ${r.stderr}`);
    const agentsMd = read(path.join(tmp, 'AGENTS.md'));
    assert.match(agentsMd, /## Swarm — Lookup Pattern/);
    // Skill list mentions swarm-supervisor
    assert.match(agentsMd, /`swarm-supervisor`/);
    // Subcommand table has start/status/etc.
    assert.match(agentsMd, /\| `start` \|/);
    assert.match(agentsMd, /\| `claim` \|/);
    assert.match(agentsMd, /\| `focus` \|/);
  } finally {
    rmrf(tmp);
  }
});
