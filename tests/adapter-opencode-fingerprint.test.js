'use strict';

/**
 * Phase 22 G4 — opencode install fingerprint regression + upgrade idempotence.
 *
 * Mirrors `tests/adapter-codex-fingerprint.test.js`. Installs opencode into
 * a tmp project under a fixed-name subdirectory (so project-name
 * substitution in AGENTS.md hashes deterministically), walks the resulting
 * file tree, and asserts every (path, SHA256(content)) pair matches the
 * committed baseline at `tests/fixtures/v0.28.0-opencode-fingerprint.json`.
 *
 * Also asserts `momentum upgrade` on a fresh install is byte-identical —
 * this pins the command-frontmatter transform as idempotent (no double
 * frontmatter, no churn on momentum-managed files).
 *
 * To re-snapshot intentionally: MOMENTUM_RESNAPSHOT_OPENCODE=1 node --test
 * tests/adapter-opencode-fingerprint.test.js — and commit the fixture in the
 * same commit that changes install behavior, with the reason in the message.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli } = require('./_helpers');

const REPO_ROOT = path.resolve(__dirname, '..');
const FIXTURE_PATH = path.join(
  REPO_ROOT, 'tests', 'fixtures', 'v0.28.0-opencode-fingerprint.json',
);

function fingerprintInstall(targetDir) {
  const files = {};
  const walk = (dir, prefix) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('._') || entry.name === '.DS_Store') continue;
      // `.momentum/` is generated runtime state (lock file, sentinels), not a
      // shipped template — exclude it so the fingerprint stays deterministic.
      if (entry.name === '.momentum') continue;
      const abs = path.join(dir, entry.name);
      const rel = prefix ? path.join(prefix, entry.name) : entry.name;
      if (entry.isDirectory()) walk(abs, rel);
      else files[rel] = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
    }
  };
  walk(targetDir, '');
  return files;
}

function freshInstall() {
  const tmpRoot = mktmp('momentum-opencode-regress-');
  const target = path.join(tmpRoot, 'fixture-project');
  fs.mkdirSync(target);
  const res = runCli(['init', target, '--agent', 'opencode']);
  assert.equal(res.status, 0, `init failed: ${res.stderr}`);
  return { tmpRoot, target };
}

// Intentional re-snapshot path (explicit env opt-in, never in CI).
if (process.env.MOMENTUM_RESNAPSHOT_OPENCODE === '1') {
  test('re-snapshot opencode fingerprint fixture', () => {
    const { tmpRoot, target } = freshInstall();
    try {
      const fixture = {
        meta: {
          captured: new Date().toISOString().slice(0, 10),
          adapter: 'opencode',
          note: 'Phase 22 G4 baseline — v0.28.0 opencode adapter install',
        },
        files: fingerprintInstall(target),
      };
      fs.writeFileSync(FIXTURE_PATH, JSON.stringify(fixture, null, 2) + '\n');
      assert.ok(Object.keys(fixture.files).length > 0);
    } finally {
      rmrf(tmpRoot);
    }
  });
}

test('fixture exists and is well-formed', () => {
  assert.ok(fs.existsSync(FIXTURE_PATH), 'baseline fixture must exist');
  const fp = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  assert.ok(fp.meta && fp.meta.captured, 'fixture must have meta.captured');
  assert.equal(fp.meta.adapter, 'opencode');
  assert.ok(fp.files && typeof fp.files === 'object', 'fixture must have files map');
  assert.ok(Object.keys(fp.files).length > 0, 'fixture must have at least one file entry');
});

test('opencode install matches the committed fingerprint byte-for-byte', () => {
  const fp = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  const { tmpRoot, target } = freshInstall();
  try {
    const actual = fingerprintInstall(target);

    const missing = [];
    const drifted = [];
    for (const [file, expectedHash] of Object.entries(fp.files)) {
      if (!(file in actual)) missing.push(file);
      else if (actual[file] !== expectedHash) drifted.push(file);
    }
    const added = Object.keys(actual).filter((f) => !(f in fp.files));

    const errors = [];
    if (missing.length) errors.push(`missing from install: ${missing.join(', ')}`);
    if (drifted.length) errors.push(`content drifted: ${drifted.join(', ')}`);
    if (added.length) errors.push(`unexpected new files: ${added.join(', ')}`);
    assert.equal(
      errors.length,
      0,
      `opencode install drifted from fixture (re-snapshot ONLY with an explicit reason):\n${errors.join('\n')}`,
    );
  } finally {
    rmrf(tmpRoot);
  }
});

test('momentum upgrade on a fresh opencode install is byte-identical (idempotent)', () => {
  const { tmpRoot, target } = freshInstall();
  try {
    const before = fingerprintInstall(target);
    const res = runCli(['upgrade', target, '--agent', 'opencode']);
    assert.equal(res.status, 0, `upgrade failed: ${res.stderr}`);
    const after = fingerprintInstall(target);
    assert.deepEqual(
      after,
      before,
      'upgrade on a pristine install must not change any file (frontmatter transform must be idempotent)',
    );
  } finally {
    rmrf(tmpRoot);
  }
});
