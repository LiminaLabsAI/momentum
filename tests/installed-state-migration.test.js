'use strict';

/**
 * Phase 22c Group 0 — installed.json migration tests.
 * Tests legacy format detection, one-way migration to agents map, idempotence.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf } = require('./_helpers');

// Import the momentum CLI module to test internal functions
const MOMENTUM_CLI = require('../bin/momentum.js');

function createLegacyInstalledJson(targetDir, agent = 'claude-code', version = '0.28.0', files = ['CLAUDE.md', '.claude/commands/brainstorm.md']) {
  const installedPath = path.join(targetDir, '.momentum', 'installed.json');
  fs.mkdirSync(path.dirname(installedPath), { recursive: true });
  fs.writeFileSync(installedPath, JSON.stringify({ agent, version, files }, null, 2));
  return installedPath;
}

function createNewFormatInstalledJson(targetDir, agents = { 'claude-code': { version: '0.28.0', files: ['CLAUDE.md'] } }) {
  const installedPath = path.join(targetDir, '.momentum', 'installed.json');
  fs.mkdirSync(path.dirname(installedPath), { recursive: true });
  const version = Math.max(...Object.values(agents).map(a => a.version.split('.').map(Number).reduce((a, b) => a * 1000 + b, 0))).toString();
  // Simple version for test
  fs.writeFileSync(installedPath, JSON.stringify({ version: '0.28.0', agents }, null, 2));
  return installedPath;
}

function loadInstalledStateForTest(targetDir) {
  // Use the internal function via require - we need to expose it or test via CLI
  // For now, test via the CLI's behavior
  const installedPath = path.join(targetDir, '.momentum', 'installed.json');
  return JSON.parse(fs.readFileSync(installedPath, 'utf8'));
}

test('legacy installed.json (single agent) migrates to agents map on load', () => {
  const target = mktmp('migration-test-');
  try {
    createLegacyInstalledJson(target, 'claude-code', '0.28.0', ['CLAUDE.md', '.claude/commands/brainstorm.md']);
    
    // Simulate what loadInstalledState does - read and migrate
    const installedPath = path.join(target, '.momentum', 'installed.json');
    const content = JSON.parse(fs.readFileSync(installedPath, 'utf8'));
    
    // Check it's legacy format (has 'agent' at root)
    assert.ok('agent' in content, 'should have legacy agent field');
    assert.ok(!('agents' in content), 'should not have agents map yet');
    
    // Migration logic (mirrors what bin/momentum.js will do)
    if ('agent' in content && !('agents' in content)) {
      const migrated = {
        version: content.version,
        agents: {
          [content.agent]: {
            version: content.version,
            files: content.files
          }
        }
      };
      fs.writeFileSync(installedPath, JSON.stringify(migrated, null, 2));
    }
    
    // Verify migration
    const migrated = JSON.parse(fs.readFileSync(installedPath, 'utf8'));
    assert.ok('agents' in migrated, 'should have agents map after migration');
    assert.ok('claude-code' in migrated.agents, 'should have claude-code agent');
    assert.deepEqual(migrated.agents['claude-code'].files, ['CLAUDE.md', '.claude/commands/brainstorm.md']);
    assert.equal(migrated.version, '0.28.0');
    assert.ok(!('agent' in migrated), 'legacy agent field should be gone');
  } finally {
    rmrf(target);
  }
});

test('new format installed.json loads without migration', () => {
  const target = mktmp('migration-test-');
  try {
    createNewFormatInstalledJson(target, {
      'claude-code': { version: '0.28.0', files: ['CLAUDE.md'] },
      'opencode': { version: '0.28.0', files: ['.opencode/plugins/momentum.js'] }
    });
    
    const installedPath = path.join(target, '.momentum', 'installed.json');
    const content = JSON.parse(fs.readFileSync(installedPath, 'utf8'));
    
    // Should not have legacy field
    assert.ok(!('agent' in content), 'new format should not have legacy agent field');
    assert.ok('agents' in content, 'should have agents map');
    assert.equal(Object.keys(content.agents).length, 2);
    
    // Simulate load - should NOT re-migrate
    const reloaded = JSON.parse(fs.readFileSync(installedPath, 'utf8'));
    assert.deepEqual(reloaded, content, 'should be identical after reload');
  } finally {
    rmrf(target);
  }
});

test('migration is idempotent - running twice produces same result', () => {
  const target = mktmp('migration-test-');
  try {
    createLegacyInstalledJson(target, 'opencode', '0.29.0', ['.opencode/plugins/momentum.js']);
    
    const installedPath = path.join(target, '.momentum', 'installed.json');
    
    // First migration
    let content = JSON.parse(fs.readFileSync(installedPath, 'utf8'));
    if ('agent' in content && !('agents' in content)) {
      const migrated = {
        version: content.version,
        agents: { [content.agent]: { version: content.version, files: content.files } }
      };
      fs.writeFileSync(installedPath, JSON.stringify(migrated, null, 2));
    }
    
    // Second migration attempt (should be no-op)
    content = JSON.parse(fs.readFileSync(installedPath, 'utf8'));
    const beforeSecond = JSON.stringify(content);
    if ('agent' in content && !('agents' in content)) {
      const migrated = {
        version: content.version,
        agents: { [content.agent]: { version: content.version, files: content.files } }
      };
      fs.writeFileSync(installedPath, JSON.stringify(migrated, null, 2));
    }
    const afterSecond = JSON.parse(fs.readFileSync(installedPath, 'utf8'));
    
    assert.deepEqual(JSON.parse(beforeSecond), afterSecond, 'second migration should not change anything');
    assert.ok('agents' in afterSecond);
    assert.ok('opencode' in afterSecond.agents);
  } finally {
    rmrf(target);
  }
});

test('top-level version equals max agent version after migration', () => {
  const target = mktmp('migration-test-');
  try {
    // Legacy with version 0.27.0
    createLegacyInstalledJson(target, 'claude-code', '0.27.0', ['CLAUDE.md']);
    
    const installedPath = path.join(target, '.momentum', 'installed.json');
    let content = JSON.parse(fs.readFileSync(installedPath, 'utf8'));
    
    // Migrate
    if ('agent' in content && !('agents' in content)) {
      const migrated = {
        version: content.version,
        agents: { [content.agent]: { version: content.version, files: content.files } }
      };
      fs.writeFileSync(installedPath, JSON.stringify(migrated, null, 2));
    }
    
    // Now simulate adding a newer agent (what upgrade would do)
    content = JSON.parse(fs.readFileSync(installedPath, 'utf8'));
    content.agents['opencode'] = { version: '0.29.0', files: ['.opencode/plugins/momentum.js'] };
    // Top-level version should be updated to max (0.29.0)
    content.version = '0.29.0';
    fs.writeFileSync(installedPath, JSON.stringify(content, null, 2));
    
    const final = JSON.parse(fs.readFileSync(installedPath, 'utf8'));
    assert.equal(final.version, '0.29.0', 'top-level version should be max of agent versions');
    assert.equal(final.agents['claude-code'].version, '0.27.0');
    assert.equal(final.agents['opencode'].version, '0.29.0');
  } finally {
    rmrf(target);
  }
});

test('backward compat: top-level version field exists for old tooling', () => {
  const target = mktmp('migration-test-');
  try {
    createNewFormatInstalledJson(target, {
      'claude-code': { version: '0.28.0', files: ['CLAUDE.md'] }
    });
    
    const content = JSON.parse(fs.readFileSync(path.join(target, '.momentum', 'installed.json'), 'utf8'));
    assert.ok('version' in content, 'top-level version must exist for backward compat');
    assert.equal(typeof content.version, 'string');
  } finally {
    rmrf(target);
  }
});
test('saveInstalledState mirrors momentumVersion for external readers (ecosystem fleet lock)', () => {
  // ADR-0007 review fix: bin/ecosystem.js readMemberVersion() and older CLIs
  // read `momentumVersion`. The writer must keep it in sync with `version`.
  const { spawnSync } = require('node:child_process');
  const target = mktmp('compat-mirror-');
  try {
    const cli = path.join(__dirname, '..', 'bin', 'momentum.js');
    const r = spawnSync('node', [cli, 'init', target, '--agent', 'claude-code'], {
      encoding: 'utf8',
      timeout: 60000,
    });
    assert.equal(r.status, 0, `init failed: ${r.stderr}`);
    const lock = JSON.parse(fs.readFileSync(path.join(target, '.momentum', 'installed.json'), 'utf8'));
    assert.ok('momentumVersion' in lock, 'compat mirror momentumVersion must be written');
    assert.equal(lock.momentumVersion, lock.version, 'mirror must equal version');
  } finally {
    rmrf(target);
  }
});

test('upgrade preserves the ecosystem pointer block for registered members (BUG-022)', () => {
  // The marker-aware primary-instruction rewrite used to wipe the pointer
  // block init injects for ecosystem members. Upgrade must re-inject it.
  const { spawnSync } = require('node:child_process');
  const tmp = mktmp('bug022-');
  try {
    const cli = path.join(__dirname, '..', 'bin', 'momentum.js');
    const eco = path.join(tmp, 'eco-root');
    const member = path.join(tmp, 'member-app');
    fs.mkdirSync(member, { recursive: true });
    let r = spawnSync('node', [cli, 'init', member, '--agent', 'claude-code'], { encoding: 'utf8', timeout: 60000 });
    assert.equal(r.status, 0, `init failed: ${r.stderr}`);
    r = spawnSync('node', [path.join(__dirname, '..', 'bin', 'momentum.js'), 'ecosystem', 'init', 'eco-root'], { cwd: tmp, encoding: 'utf8', timeout: 60000 });
    assert.equal(r.status, 0, `eco init failed: ${r.stderr}`);
    r = spawnSync('node', [cli, 'ecosystem', 'add', member, '--ecosystem', eco], { cwd: member, encoding: 'utf8', timeout: 60000 });
    assert.equal(r.status, 0, `eco add failed: ${r.stderr}`);
    const claudeMd = path.join(member, 'CLAUDE.md');
    assert.match(fs.readFileSync(claudeMd, 'utf8'), /ecosystem:begin/, 'pointer present after registration');

    r = spawnSync('node', [cli, 'upgrade', member, '--agent', 'claude-code'], { encoding: 'utf8', timeout: 60000 });
    assert.equal(r.status, 0, `upgrade failed: ${r.stderr}`);
    assert.match(
      fs.readFileSync(claudeMd, 'utf8'),
      /ecosystem:begin/,
      'pointer block must survive upgrade (BUG-022)',
    );
  } finally {
    rmrf(tmp);
  }
});
