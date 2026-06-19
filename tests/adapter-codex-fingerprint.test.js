'use strict';

/**
 * Phase 18 G3 — Codex install fingerprint regression.
 *
 * Installs Codex into a tmp project under a fixed-name subdirectory
 * (so BUG-006 project-name substitution in AGENTS.md hashes
 * deterministically), walks the resulting file tree, and asserts every
 * (path, SHA256(content)) pair matches the committed v0.20.4 baseline at
 * `tests/fixtures/v0.20.4-codex-fingerprint.json`.
 *
 * Mirrors `tests/claude-code-regression.test.js`. Runs on every group
 * commit during Phase 18+. Pass count is necessary but not sufficient —
 * this test catches silent content drift (e.g. a tweak to
 * `adapters/codex/instructions/AGENTS.md` that doesn't break any other
 * test).
 *
 * To re-snapshot intentionally: regenerate by running the capture
 * script (the one-shot inline `node -e` in the Phase 18 G3 commit) and
 * update the fixture in the same commit that changes the behavior.
 * NEVER regenerate just to "make the test pass" without an explicit
 * reason in the commit message.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli } = require('./_helpers');

const REPO_ROOT = path.resolve(__dirname, '..');
const FIXTURE_PATH = path.join(
  REPO_ROOT, 'tests', 'fixtures', 'v0.20.4-codex-fingerprint.json',
);

function fingerprintInstall(targetDir) {
  const files = {};
  const walk = (dir, prefix) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('._') || entry.name === '.DS_Store') continue;
      // `.momentum/` is generated runtime state (lock file, sentinels), not a
      // shipped template — exclude it so the fingerprint stays deterministic
      // (installed.json carries a date + version). Phase 20.
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

test('fixture exists and is well-formed', () => {
  assert.ok(fs.existsSync(FIXTURE_PATH), 'baseline fixture must exist');
  const fp = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  assert.ok(fp.meta && fp.meta.captured, 'fixture must have meta.captured');
  assert.equal(fp.meta.adapter, 'codex');
  assert.ok(fp.files && typeof fp.files === 'object', 'fixture must have files map');
  assert.ok(Object.keys(fp.files).length > 0, 'fixture must have at least one file entry');
});

test('Codex install matches v0.20.4 fingerprint byte-for-byte', () => {
  const fp = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  // Pin a fixed-name subdirectory under the random tmp root so the
  // BUG-006 project-name substitution in AGENTS.md hashes deterministically.
  const tmpRoot = mktmp('momentum-codex-regress-');
  const target = path.join(tmpRoot, 'fixture-project');
  fs.mkdirSync(target);
  try {
    const res = runCli(['init', target, '--agent', 'codex']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);

    const actual = fingerprintInstall(target);

    const missing = [];
    const drifted = [];
    for (const [file, expectedHash] of Object.entries(fp.files)) {
      if (!(file in actual)) {
        missing.push(file);
      } else if (actual[file] !== expectedHash) {
        drifted.push({ file, expected: expectedHash, actual: actual[file] });
      }
    }
    const added = Object.keys(actual).filter((f) => !(f in fp.files));

    const errors = [];
    if (missing.length) {
      errors.push(`MISSING files (Codex regression): ${missing.join(', ')}`);
    }
    if (drifted.length) {
      errors.push(
        'CONTENT DRIFT in Codex install:\n' +
        drifted.map((d) => `  - ${d.file}\n      expected ${d.expected}\n      actual   ${d.actual}`).join('\n')
      );
    }
    if (added.length) {
      errors.push(
        `ADDED files (additive — review whether intentional): ${added.join(', ')}\n` +
        `If this is intentional, re-capture the fixture in the same commit. Otherwise revert.`
      );
    }
    assert.equal(errors.length, 0, errors.join('\n\n'));
  } finally {
    rmrf(tmpRoot);
  }
});
