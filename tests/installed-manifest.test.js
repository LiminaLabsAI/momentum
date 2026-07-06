'use strict';

// Phase 22c (ADR-0007) — Multi-adapter `.momentum/installed.json` lock file.
// The lock file now uses a per-agent `agents` map instead of a single agent lock.
// Each agent has its own `{ version, files: string[] }` entry.
// Top-level `version` = max of all agent versions (backward compat).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const { mktmp, rmrf, runCli } = require('./_helpers');

const PKG = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
);
const MANIFEST_REL = path.join('.momentum', 'installed.json');

function readManifest(target) {
  return JSON.parse(fs.readFileSync(path.join(target, MANIFEST_REL), 'utf8'));
}

test('init — writes a well-formed lock file with agents map', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target]);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);

    assert.ok(fs.existsSync(path.join(target, MANIFEST_REL)), 'lock file must exist');
    const m = readManifest(target);

    assert.ok(m.version, 'top-level version must exist');
    assert.equal(m.version, PKG.version, 'records the CLI version that wrote it');
    assert.ok(m.agents, 'agents map must exist');
    assert.ok('claude-code' in m.agents, 'default agent claude-code must be in agents');
    assert.equal(m.agents['claude-code'].version, PKG.version);
    assert.ok(Array.isArray(m.agents['claude-code'].files) && m.agents['claude-code'].files.length > 0);
  } finally {
    rmrf(target);
  }
});

test('init — managed set excludes user-owned specs, includes tool files', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    const m = readManifest(target);

    // Phase 22c: files stored as string array under agents[agent].files
    const agent = Object.keys(m.agents)[0];
    const paths = m.agents[agent].files;

    // specs/ is install-once / user-owned — must NOT be orphan-eligible
    assert.ok(
      !paths.some((p) => p.startsWith('specs/')),
      `specs files must not be in managed set: ${paths.filter((p) => p.startsWith('specs/')).join(', ')}`
    );
    // tool-owned files must be tracked
    assert.ok(paths.includes('CLAUDE.md'), 'CLAUDE.md (marker-managed) tracked');
    assert.ok(paths.some((p) => p.startsWith('.claude/commands/')), 'commands tracked');
    assert.ok(!paths.includes('.agent/rules/project.md'), 'retired agent-rules file must not be managed (Phase 23)');
  } finally {
    rmrf(target);
  }
});

test('init — every managed file exists on disk', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    const m = readManifest(target);
    const agent = Object.keys(m.agents)[0];
    for (const relPath of m.agents[agent].files) {
      const abs = path.join(target, relPath);
      assert.ok(fs.existsSync(abs), `managed file missing on disk: ${relPath}`);
    }
  } finally {
    rmrf(target);
  }
});

test('upgrade — rewrites the lock file and preserves agent entry', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);

    const m = readManifest(target);
    assert.ok(m.agents['claude-code'], 'claude-code agent must be present');

    const res = runCli(['upgrade', target]);
    assert.equal(res.status, 0, `upgrade failed: ${res.stderr}`);

    const m2 = readManifest(target);
    assert.equal(m2.version, PKG.version);
    assert.ok(m2.agents['claude-code'], 'claude-code agent must still be present');
    assert.ok(m2.agents['claude-code'].files.length > 0);
    assert.ok(m2.agents['claude-code'].files.includes('CLAUDE.md'));
  } finally {
    rmrf(target);
  }
});

test('init — lock file is git-trackable (D1) while sentinels stay ignored', () => {
  const target = mktmp();
  try {
    execSync('git init -q', { cwd: target });
    runCli(['init', target]);
    fs.writeFileSync(path.join(target, '.momentum', 'merge-approved'), '');

    const ignored = (rel) => {
      try {
        execSync(`git check-ignore -q ${rel}`, { cwd: target });
        return true;
      } catch {
        return false;
      }
    };

    assert.equal(ignored('.momentum/installed.json'), false, 'lock file must be committable');
    assert.equal(ignored('.momentum/merge-approved'), true, 'sentinels must stay ignored');
    execSync('git add .momentum/installed.json', { cwd: target });
    const staged = execSync('git diff --cached --name-only', { cwd: target, encoding: 'utf8' });
    assert.match(staged, /\.momentum\/installed\.json/);
  } finally {
    rmrf(target);
  }
});

test('init — codex adapter records agent=codex in agents map', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'codex']);
    assert.equal(res.status, 0, `codex init failed: ${res.stderr}`);
    const m = readManifest(target);
    assert.ok(m.agents['codex'], 'codex must be in agents map');
    const codex = m.agents['codex'];
    assert.ok(Array.isArray(codex.files), 'codex files must be an array');
    assert.ok(codex.files.some((f) => f === 'AGENTS.md'), 'AGENTS.md tracked for codex');
  } finally {
    rmrf(target);
  }
});
