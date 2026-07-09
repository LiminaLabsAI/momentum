'use strict';

/**
 * Phase 28 G1 — `momentum upgrade` (no --agent) refreshes EVERY installed agent,
 * not just claude-code (cause #1 of the CLAUDE.md/AGENTS.md divergence, ADR-0010).
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli } = require('./_helpers');

function installed(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, '.momentum', 'installed.json'), 'utf8'));
}

test('upgrade with no --agent refreshes all installed agents (claude-code + opencode)', () => {
  const root = mktmp('momentum-upgrade-all-');
  const dir = path.join(root, 'proj');
  fs.mkdirSync(dir);
  try {
    // 1. install claude-code, then add opencode → two-agent project
    assert.equal(runCli(['init', dir, '--agent', 'claude-code']).status, 0);
    assert.equal(runCli(['upgrade', dir, '--agent', 'opencode']).status, 0);
    const agents = Object.keys(installed(dir).agents || {});
    assert.ok(agents.includes('claude-code') && agents.includes('opencode'),
      `expected both agents, got ${agents.join(',')}`);

    // 2. corrupt AGENTS.md's managed region (simulate the drift)
    const agentsFile = path.join(dir, 'AGENTS.md');
    fs.writeFileSync(agentsFile, '# stale AGENTS.md\n\ndrifted — missing all managed rules\n');
    assert.doesNotMatch(fs.readFileSync(agentsFile, 'utf8'), /Rule 1: Always Orient First/);

    // 3. plain `upgrade` (NO --agent) must refresh BOTH agents
    const res = runCli(['upgrade', dir]);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /Upgrading all installed agents:.*opencode/);

    // 4. AGENTS.md managed region restored; CLAUDE.md still present
    assert.match(fs.readFileSync(agentsFile, 'utf8'), /Rule 1: Always Orient First/,
      'plain upgrade refreshed the opencode AGENTS.md (no drift)');
    assert.ok(fs.existsSync(path.join(dir, 'CLAUDE.md')), 'claude-code still present');
  } finally {
    rmrf(root);
  }
});

test('upgrade --agent X still targets only that agent', () => {
  const root = mktmp('momentum-upgrade-one-');
  const dir = path.join(root, 'proj');
  fs.mkdirSync(dir);
  try {
    assert.equal(runCli(['init', dir, '--agent', 'claude-code']).status, 0);
    assert.equal(runCli(['upgrade', dir, '--agent', 'opencode']).status, 0);

    // corrupt AGENTS.md, then upgrade ONLY claude-code → AGENTS.md stays stale
    const agentsFile = path.join(dir, 'AGENTS.md');
    fs.writeFileSync(agentsFile, '# stale\n');
    const res = runCli(['upgrade', dir, '--agent', 'claude-code']);
    assert.equal(res.status, 0, res.stderr);
    assert.doesNotMatch(res.stdout, /Upgrading all installed agents/);
    assert.equal(fs.readFileSync(agentsFile, 'utf8'), '# stale\n', 'targeted upgrade left the other agent alone');
  } finally {
    rmrf(root);
  }
});
