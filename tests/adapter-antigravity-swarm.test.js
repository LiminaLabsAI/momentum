'use strict';

// Phase 18 G2 — Antigravity adapter swarm wiring.
//
// Verifies:
//   1. adapter.spawn(directive) dispatches to `agy` with the expected
//      arguments (uses AGY_BIN env stub).
//   2. `momentum init --agent antigravity` lays down:
//        - .agents/workflows/swarm.md           (auto-registers as /swarm)
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

test('antigravity adapter.spawn — missing agy binary yields -1 with install hint', () => {
  const originalBin = process.env.AGY_BIN;
  process.env.AGY_BIN = '/this/does/not/exist/agy';
  try {
    const result = antigravityAdapter.spawn(fakeDirective());
    assert.equal(result.repoId, 'repo-a');
    assert.equal(result.status, -1);
    assert.match(result.detail, /agy not found/);
    assert.match(result.detail, /antigravity.google\/cli\/install/);
  } finally {
    if (originalBin === undefined) delete process.env.AGY_BIN;
    else process.env.AGY_BIN = originalBin;
  }
});

test('antigravity adapter.spawn — launches detached agy with the REAL 1.x flag surface', () => {
  const originalBin = process.env.AGY_BIN;
  const tmp = mktmp('momentum-agy-spawn-');
  const repo = fs.realpathSync(tmp);
  const capture = path.join(repo, 'argv-capture.txt');
  const stub = path.join(repo, 'agy-stub.sh');
  fs.writeFileSync(stub, `#!/bin/bash\nprintf '%s\\n' "$PWD" "$@" > "${capture}"\n`, { mode: 0o755 });
  process.env.AGY_BIN = stub;
  try {
    const result = antigravityAdapter.spawn(fakeDirective({ repoPath: repo }));
    assert.equal(result.status, 0, `expected launched status; got ${JSON.stringify(result)}`);
    assert.match(result.detail, /launched pid \d+/);
    // The stub runs detached — poll briefly for its argv capture.
    const deadline = Date.now() + 3000;
    while (!fs.existsSync(capture) && Date.now() < deadline) {
      require('node:child_process').execSync('sleep 0.05');
    }
    const lines = fs.readFileSync(capture, 'utf8').split('\n');
    assert.equal(fs.realpathSync(lines[0]), repo, 'spawn must run FROM directive.repoPath');
    const argv = lines.slice(1);
    assert.ok(argv.includes('--new-project'), 'isolation flag required (fact-sheet §7)');
    assert.ok(argv.includes('--dangerously-skip-permissions'), 'headless supervisors need permission bypass');
    assert.ok(argv.includes('--print-timeout'), 'ENH-052: in-CLI bound required');
    assert.ok(argv.includes('-p'), 'headless print mode');
    assert.ok(!argv.includes('--cwd') && !argv.includes('--skill'), 'Phase 18 fictional flags must be gone');
    // The stub prints one argv entry per line; the multi-line -p prompt is
    // the remainder after the flag.
    const prompt = argv.slice(argv.indexOf('-p') + 1).join('\n');
    assert.match(prompt, /swarm-supervisor skill/);
    assert.match(prompt, /repo-a/);
    // Supervisor log file is provisioned under .momentum/
    assert.ok(fs.readdirSync(path.join(repo, '.momentum')).some((f) => f.startsWith('swarm-supervisor-')),
      'per-repo supervisor log file expected');
  } finally {
    if (originalBin === undefined) delete process.env.AGY_BIN;
    else process.env.AGY_BIN = originalBin;
    rmrf(tmp);
  }
});

test('antigravity adapter.spawn — wrong platform yields canonical -1 entry', () => {
  const result = antigravityAdapter.spawn(fakeDirective({ platform: 'codex', repoId: 'r-x' }));
  assert.equal(result.repoId, 'r-x');
  assert.equal(result.status, -1);
  assert.match(result.detail, /non-antigravity platform/);
});

test('antigravity install — lays down .agents/workflows/swarm.md', () => {
  const tmp = mktmp('antigravity-swarm-install-');
  try {
    const r = runCli(['init', tmp, '--agent', 'antigravity'], { cwd: tmp });
    assert.equal(r.status, 0, `init failed: ${r.stderr}`);
    const workflowPath = path.join(tmp, '.agents', 'workflows', 'swarm.md');
    assert.ok(exists(workflowPath), 'swarm.md workflow must be installed at .agents/workflows/');
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
