'use strict';

/**
 * Phase 16 Rework G0.2 — Claude Code install fingerprint snapshot.
 *
 * Per the user direction "existing things should work as it is" — Claude
 * Code's v0.18.0 install must remain byte-equivalent through the rework.
 *
 * This test installs Claude Code into a tmp project, walks the resulting
 * file tree, and asserts every (path, SHA256(content)) pair matches the
 * committed v0.18.0 baseline at `tests/fixtures/v0.18.0-claude-code-fingerprint.json`.
 *
 * Runs on every group commit during the rework. Pass count is necessary
 * but not sufficient — this test catches silent content drift (e.g. a
 * core/commands/*.md tweak that doesn't break any other test).
 *
 * ONE allowed exception during the rework:
 *   - `core/scripts/brainstorm-gate.sh` source-tree promotion (was
 *     `adapters/claude-code/scripts/brainstorm-gate.sh`). The POST-INSTALL
 *     path is `scripts/brainstorm-gate.sh` either way, so the fingerprint
 *     entry stays the same. The source move is invisible to this test.
 *
 * To re-snapshot intentionally (e.g. after a deliberate v0.19.0 behavior
 * change that we've agreed to ship): regenerate with the capture helper
 * referenced in plan.md G0.2 and update the fixture in the same commit
 * that changes the behavior. NEVER regenerate to "make the test pass"
 * without an explicit reason in the commit message.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli, REPO_ROOT } = require('./_helpers');

const FIXTURE_PATH = path.join(
  REPO_ROOT,
  'tests',
  'fixtures',
  'v0.18.0-claude-code-fingerprint.json',
);

function fingerprintInstall(targetDir) {
  const files = {};
  const walk = (dir, prefix) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('._') || entry.name === '.DS_Store') continue;
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
  assert.ok(fp.files && typeof fp.files === 'object', 'fixture must have files map');
  assert.ok(Object.keys(fp.files).length > 0, 'fixture must have at least one file entry');
});

test('Claude Code install matches v0.18.0 fingerprint byte-for-byte', () => {
  const fp = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  const target = mktmp('momentum-cc-regress-');
  try {
    const res = runCli(['init', target, '--agent', 'claude-code']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);

    const actual = fingerprintInstall(target);

    // Files in baseline must exist with matching hash
    const missing = [];
    const drifted = [];
    for (const [file, expectedHash] of Object.entries(fp.files)) {
      if (!(file in actual)) {
        missing.push(file);
      } else if (actual[file] !== expectedHash) {
        drifted.push({ file, expected: expectedHash, actual: actual[file] });
      }
    }
    // Files now present that weren't in baseline (additive — allowed in
    // principle but flagged so the developer notices)
    const added = Object.keys(actual).filter((f) => !(f in fp.files));

    const errors = [];
    if (missing.length) {
      errors.push(`MISSING files (Claude Code regression): ${missing.join(', ')}`);
    }
    if (drifted.length) {
      errors.push(
        'CONTENT DRIFT in Claude Code install:\n' +
        drifted.map((d) => `  - ${d.file}\n      expected ${d.expected}\n      actual   ${d.actual}`).join('\n')
      );
    }
    if (added.length) {
      errors.push(
        `ADDED files (additive — review whether intentional): ${added.join(', ')}\n` +
        `If this is intentional, re-capture the fixture with the same commit. Otherwise revert.`
      );
    }
    assert.equal(errors.length, 0, errors.join('\n\n'));
  } finally {
    rmrf(target);
  }
});
