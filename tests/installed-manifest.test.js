'use strict';

// Phase 20 — Upgrade Hardening, Group 0.
// The `.momentum/installed.json` lock file is momentum's per-repo
// version-of-record (Copier/Cruft model). These tests pin its shape, the
// managed-file set (specs excluded, tool files included), sha256 integrity,
// and that upgrade rewrites it while preserving installedAt.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const { mktmp, rmrf, runCli } = require('./_helpers');

const PKG = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
);
const MANIFEST_REL = path.join('.momentum', 'installed.json');

function readManifest(target) {
  return JSON.parse(fs.readFileSync(path.join(target, MANIFEST_REL), 'utf8'));
}

test('init — writes a well-formed lock file', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target]);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);

    assert.ok(fs.existsSync(path.join(target, MANIFEST_REL)), 'lock file must exist');
    const m = readManifest(target);

    assert.equal(m.schema, 1);
    assert.equal(m.momentumVersion, PKG.version, 'records the CLI version that wrote it');
    assert.equal(m.agent, 'claude-code');
    assert.match(m.installedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(m.updatedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Array.isArray(m.managedFiles) && m.managedFiles.length > 0);
  } finally {
    rmrf(target);
  }
});

test('init — managed set excludes user-owned specs, includes tool files', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    const m = readManifest(target);
    const paths = m.managedFiles.map((f) => f.path);

    // specs/ is install-once / user-owned — must NOT be orphan-eligible
    assert.ok(
      !paths.some((p) => p.startsWith('specs/')),
      `specs files must not be in managed set: ${paths.filter((p) => p.startsWith('specs/')).join(', ')}`
    );
    // tool-owned files must be tracked
    assert.ok(paths.includes('CLAUDE.md'), 'CLAUDE.md (marker-managed) tracked');
    assert.ok(paths.some((p) => p.startsWith('.claude/commands/')), 'commands tracked');
    assert.ok(paths.includes('.agent/rules/project.md'), 'agent rules tracked');
  } finally {
    rmrf(target);
  }
});

test('init — every managed sha256 matches the file on disk', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);
    const m = readManifest(target);
    for (const entry of m.managedFiles) {
      const abs = path.join(target, entry.path);
      assert.ok(fs.existsSync(abs), `managed file missing on disk: ${entry.path}`);
      const actual = crypto
        .createHash('sha256')
        .update(fs.readFileSync(abs))
        .digest('hex');
      assert.equal(actual, entry.sha256, `sha256 mismatch for ${entry.path}`);
    }
  } finally {
    rmrf(target);
  }
});

test('upgrade — rewrites the lock file and preserves installedAt', () => {
  const target = mktmp();
  try {
    runCli(['init', target]);

    // Backdate installedAt to prove upgrade preserves the original install date.
    const manifestPath = path.join(target, MANIFEST_REL);
    const seeded = readManifest(target);
    seeded.installedAt = '2020-01-01';
    fs.writeFileSync(manifestPath, JSON.stringify(seeded, null, 2) + '\n');

    const res = runCli(['upgrade', target]);
    assert.equal(res.status, 0, `upgrade failed: ${res.stderr}`);

    const m = readManifest(target);
    assert.equal(m.installedAt, '2020-01-01', 'installedAt preserved across upgrade');
    assert.equal(m.momentumVersion, PKG.version);
    assert.ok(m.managedFiles.length > 0);
    assert.ok(m.managedFiles.some((f) => f.path === 'CLAUDE.md'));
  } finally {
    rmrf(target);
  }
});

test('init — codex adapter records agent=codex', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'codex']);
    assert.equal(res.status, 0, `codex init failed: ${res.stderr}`);
    const m = readManifest(target);
    assert.equal(m.agent, 'codex');
    assert.ok(m.managedFiles.some((f) => f.path === 'AGENTS.md'), 'AGENTS.md tracked for codex');
  } finally {
    rmrf(target);
  }
});
