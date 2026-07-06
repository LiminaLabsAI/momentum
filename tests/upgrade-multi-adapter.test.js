'use strict';

/**
 * Phase 22c Group 0 — Multi-adapter upgrade tests.
 * Verifies that upgrading one agent does not remove another agent's managed files
 * (BUG-020 fix via ADR-0007 per-agent installed state).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli, read, exists } = require('./_helpers');

function installedState(targetDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(targetDir, '.momentum', 'installed.json'), 'utf8'));
  } catch { return null; }
}

test('multi-adapter init — two agents can coexist without destroying each other\'s files', () => {
  const target = mktmp();
  try {
    const res1 = runCli(['init', target, '--agent', 'claude-code']);
    assert.equal(res1.status, 0, `claude-code init failed: ${res1.stderr}`);
    const claudeFilesBefore = exists(path.join(target, 'CLAUDE.md'));
    const claudeCmdsBefore = exists(path.join(target, '.claude', 'commands'));
    assert.ok(claudeFilesBefore, 'CLAUDE.md should exist after claude-code init');
    assert.ok(claudeCmdsBefore, '.claude/commands/ should exist after claude-code init');

    const res2 = runCli(['init', target, '--agent', 'opencode']);
    assert.equal(res2.status, 0, `opencode init failed: ${res2.stderr}`);
    const claudeFilesAfter = exists(path.join(target, 'CLAUDE.md'));
    const claudeCmdsAfter = exists(path.join(target, '.claude', 'commands'));
    assert.ok(claudeFilesAfter, 'CLAUDE.md should still exist after opencode init');
    assert.ok(claudeCmdsAfter, '.claude/commands/ should still exist after opencode init');

    const opencodeFiles = exists(path.join(target, 'AGENTS.md'));
    const opencodeCmds = exists(path.join(target, '.opencode', 'commands'));
    assert.ok(opencodeFiles, 'AGENTS.md should exist after opencode init');
    assert.ok(opencodeCmds, '.opencode/commands/ should exist after opencode init');

    const state = installedState(target);
    assert.ok(state, 'installed.json should exist');
    assert.ok(state.agents, 'should have agents map');
    assert.ok('claude-code' in state.agents, 'should have claude-code in agents');
    assert.ok('opencode' in state.agents, 'should have opencode in agents');
    assert.equal(Object.keys(state.agents).length, 2, 'should have exactly 2 agents');
  } finally { rmrf(target); }
});

test('multi-adapter upgrade — upgrading one agent does not orphan-clean the other\'s files', () => {
  const target = mktmp();
  try {
    runCli(['init', target, '--agent', 'claude-code']);
    runCli(['init', target, '--agent', 'opencode']);

    const claudeMd = path.join(target, 'CLAUDE.md');
    const claudeCmdDir = path.join(target, '.claude', 'commands');

    // Snapshot claude-code files before upgrade
    assert.ok(exists(claudeMd), 'CLAUDE.md must exist before upgrade');
    const claudeCmds = fs.readdirSync(claudeCmdDir).sort();

    // Upgrade opencode
    const upRes = runCli(['upgrade', target, '--agent', 'opencode']);
    assert.equal(upRes.status, 0, `opencode upgrade failed: ${upRes.stderr}`);

    // claude-code files must still be intact
    assert.ok(exists(claudeMd), 'CLAUDE.md must survive opencode upgrade');
    const claudeCmdsAfter = fs.readdirSync(claudeCmdDir).sort();
    assert.deepEqual(claudeCmdsAfter, claudeCmds, 'all claude-code .claude/commands/ files must survive');

    // Verify no .bak files were created for claude-code files
    const claudeBaks = fs.readdirSync(claudeCmdDir).filter((f) => f.endsWith('.bak'));
    assert.equal(claudeBaks.length, 0, 'claude-code commands should not have .bak files after opencode upgrade');

    // installed.json should have both agents
    const state = installedState(target);
    assert.ok(state.agents['claude-code'], 'claude-code agent must still be in lock');
    assert.ok(state.agents['opencode'], 'opencode agent must be in lock');
  } finally { rmrf(target); }
});

test('multi-adapter upgrade — legacy format auto-migrates on first upgrade preserving the non-upgraded agent', () => {
  const target = mktmp();
  try {
    // Simulate legacy install
    const installedPath = path.join(target, '.momentum', 'installed.json');
    fs.mkdirSync(path.dirname(installedPath), { recursive: true });
    fs.writeFileSync(installedPath, JSON.stringify({
      agent: 'claude-code',
      version: '0.27.0',
      files: ['CLAUDE.md', '.claude/commands/brainstorm-idea.md'],
    }, null, 2));

    // Create the legacy files so orphan cleanup has something to consider
    fs.mkdirSync(path.join(target, '.claude', 'commands'), { recursive: true });
    fs.writeFileSync(path.join(target, 'CLAUDE.md'), '# legacy');
    fs.writeFileSync(path.join(target, '.claude', 'commands', 'brainstorm-idea.md'), '# legacy');

    // Now install opencode (modern init — should migrate legacy first)
    const initRes = runCli(['init', target, '--agent', 'opencode']);
    assert.equal(initRes.status, 0, `opencode init failed: ${initRes.stderr}`);

    const state = installedState(target);
    assert.ok(state.agents, 'should have agents map');
    assert.ok('claude-code' in state.agents, 'legacy claude-code should be in agents');
    assert.ok('opencode' in state.agents, 'new opencode should be in agents');
    assert.ok(!('agent' in state), 'legacy agent field should be gone');

    // Legacy files should still exist
    assert.ok(exists(path.join(target, 'CLAUDE.md')), 'CLAUDE.md must still exist');
    assert.ok(exists(path.join(target, '.claude', 'commands', 'brainstorm-idea.md')), 'legacy command must still exist');
  } finally { rmrf(target); }
});

test('multi-adapter upgrade — orphan cleanup removes only the upgraded agent\'s own files', () => {
  const target = mktmp();
  try {
    runCli(['init', target, '--agent', 'claude-code']);
    runCli(['init', target, '--agent', 'opencode']);

    // Create a file that opencode owned but no longer ships (simulating a removed command)
    const orphanCandidate = path.join(target, '.opencode', 'commands', 'obsolete-command.md');
    fs.mkdirSync(path.dirname(orphanCandidate), { recursive: true });
    fs.writeFileSync(orphanCandidate, '# obsolete');

    // Manually register it in opencode's agent entry
    const installedPath = path.join(target, '.momentum', 'installed.json');
    const state = JSON.parse(fs.readFileSync(installedPath, 'utf8'));
    state.agents['opencode'].files.push('.opencode/commands/obsolete-command.md');
    state.agents['opencode'].files.sort();
    fs.writeFileSync(installedPath, JSON.stringify(state, null, 2) + '\n');

    // Upgrade opencode
    const upRes = runCli(['upgrade', target, '--agent', 'opencode']);
    assert.equal(upRes.status, 0, `opencode upgrade failed: ${upRes.stderr}`);

    // The orphan should be removed (with .bak)
    assert.ok(!exists(orphanCandidate), 'obsolete opencode file should be orphan-removed');
    assert.ok(exists(orphanCandidate + '.bak'), 'orphan should have .bak backup');

    // claude-code files should still exist
    assert.ok(exists(path.join(target, 'CLAUDE.md')), 'CLAUDE.md must still exist');
    assert.ok(exists(path.join(target, '.claude', 'commands', 'brainstorm-idea.md')), 'claude-code command must still exist');

    const finalState = installedState(target);
    assert.ok('claude-code' in finalState.agents, 'claude-code should still be in agents');
    assert.ok('opencode' in finalState.agents, 'opencode should still be in agents');
  } finally { rmrf(target); }
});

test('multi-adapter upgrade — lock file tracks all agents with correct versions', () => {
  const target = mktmp();
  try {
    runCli(['init', target, '--agent', 'claude-code']);

    // Get version from package.json
    const pkg = JSON.parse(read(path.join(__dirname, '..', 'package.json')));
    const momentumVersion = pkg.version;

    runCli(['init', target, '--agent', 'opencode']);

    const state = installedState(target);
    assert.equal(state.version, momentumVersion, 'top-level version should be momentum version');
    assert.equal(state.agents['claude-code'].version, momentumVersion);
    assert.equal(state.agents['opencode'].version, momentumVersion);
    assert.equal(Object.keys(state.agents).length, 2);

    // Verify opencode's files are tracked
    assert.ok(Array.isArray(state.agents['opencode'].files));
    assert.ok(state.agents['opencode'].files.length > 0);
    assert.ok(state.agents['opencode'].files.some((f) => f.startsWith('.opencode/')),
      'opencode files should include .opencode/ paths');
    assert.ok(state.agents['claude-code'].files.some((f) => f.startsWith('.claude/') || f === 'CLAUDE.md'),
      'claude-code files should include .claude/ paths or CLAUDE.md');
  } finally { rmrf(target); }
});
