'use strict';

/**
 * Phase 26 — Project Config, Group 1.
 *
 * Integration tests: `momentum upgrade` writes inferred config for
 * FOUNDED projects only (ADR-0008 predicate), refreshes the derived cache from
 * an existing file (never clobbering user edits), reports drift, and is
 * idempotent.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli, read, exists } = require('./_helpers');
const P = require('../core/config');

function freshInstall(manifests = {}) {
  const tmp = mktmp('momentum-prefs-up-');
  for (const [name, body] of Object.entries(manifests)) {
    fs.writeFileSync(path.join(tmp, name), body);
  }
  const res = runCli(['init', tmp, '--agent', 'claude-code']);
  assert.equal(res.status, 0, `init failed: ${res.stderr}`);
  return tmp;
}

function foundProject(tmp) {
  fs.mkdirSync(path.join(tmp, 'specs', 'vision'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'specs', 'planning'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'specs', 'vision', 'project-charter.md'), '# Charter\n\nAuthored project vision.\n');
  fs.writeFileSync(path.join(tmp, 'specs', 'planning', 'roadmap.md'), '# Roadmap\n\nAuthored roadmap.\n');
}

function upgrade(tmp) {
  const res = runCli(['upgrade', tmp, '--agent', 'claude-code']);
  assert.equal(res.status, 0, `upgrade failed: ${res.stderr}`);
  return res;
}

test('upgrade: founded project with no config → writes inferred prefs + cache', () => {
  const tmp = freshInstall({ 'package.json': JSON.stringify({ name: 'demo', scripts: { build: 'x' } }) });
  try {
    foundProject(tmp);
    // remove the init-written config so upgrade migrates a "legacy" project
    fs.rmSync(path.join(tmp, 'specs', 'config.md'));
    assert.ok(!exists(path.join(tmp, 'specs', 'config.md')), 'precondition: no prefs file');
    upgrade(tmp);
    const prefs = P.readConfig(path.join(tmp, 'specs'));
    assert.equal(prefs.language, 'node');
    assert.equal(prefs.publish_target, 'npm');
    assert.ok(P.readConfigCache(tmp), 'cache written');
    assert.match(read(path.join(tmp, 'specs', 'config.md')), /Inferred by momentum init/);
  } finally { rmrf(tmp); }
});

test('upgrade: NOT founded → no config written', () => {
  const tmp = freshInstall();
  try {
    // init wrote config (init always does). Remove it to simulate a
    // legacy unfounded install, then upgrade — unfounded → nothing.
    fs.rmSync(path.join(tmp, 'specs', 'config.md'));
    assert.equal(P.isFounded(tmp), false);
    upgrade(tmp);
    assert.ok(!exists(path.join(tmp, 'specs', 'config.md')), 'unfounded upgrade wrote no prefs');
  } finally { rmrf(tmp); }
});

test('upgrade: existing config → cache refreshed, user content preserved', () => {
  const tmp = freshInstall({ 'package.json': JSON.stringify({ name: 'demo' }) });
  try {
    foundProject(tmp);
    // user authors a custom file (feature-branch-only, single branch)
    const prefsPath = path.join(tmp, 'specs', 'config.md');
    fs.writeFileSync(prefsPath, [
      '---', 'type: Config', '---', '',
      '# Project Config', '',
      '| Key | Value |', '|-----|-------|',
      '| language | node |', '| framework | none |',
      '| test_command | npm test |', '| build_command | none |',
      '| publish_target | npm |', '| git_forge | github |',
      '| release_command | gh release create |', '| release_flow | tag-and-publish |',
      '| end_state | feature-branch-only |',
      '| branch_flow | main |', '| protected_branches | main |',
      '', '## Notes', '', 'user-authored.', '',
    ].join('\n'));
    upgrade(tmp);
    const after = read(prefsPath);
    assert.match(after, /\| end_state \| feature-branch-only \|/, 'user end_state preserved');
    assert.match(after, /\| branch_flow \| main \|/, 'user branch_flow preserved');
    assert.match(after, /user-authored\./, 'user notes preserved');
    // cache refreshed from the user's content
    const cache = P.readConfigCache(tmp);
    assert.deepEqual(cache.protected_branches, ['main']);
    assert.equal(cache.end_state, 'feature-branch-only');
  } finally { rmrf(tmp); }
});

test('upgrade: reports drift on inferable fields without clobbering', () => {
  const tmp = freshInstall({ 'pyproject.toml': '[project]\nname = "demo"\n' });
  try {
    foundProject(tmp);
    // init wrote language=python. Overwrite config to claim language=node (drift).
    const prefsLib = require('../core/config');
    const wrong = prefsLib.inferConfig(tmp, { remoteUrl: '' });
    wrong.language = 'node'; // intentionally drifted from the python manifest
    prefsLib.writeConfig(path.join(tmp, 'specs'), wrong);
    const res = upgrade(tmp);
    assert.match(res.stdout, /drifted from manifests/);
    assert.match(res.stdout, /language/);
    // not clobbered — still says node (user must fix by hand)
    const after = P.readConfig(path.join(tmp, 'specs'));
    assert.equal(after.language, 'node', 'drift reported but not auto-corrected');
  } finally { rmrf(tmp); }
});

test('upgrade: idempotent — second run makes no prefs change', () => {
  const tmp = freshInstall({ 'package.json': JSON.stringify({ name: 'demo' }) });
  try {
    foundProject(tmp);
    fs.rmSync(path.join(tmp, 'specs', 'config.md'));
    upgrade(tmp);
    const first = read(path.join(tmp, 'specs', 'config.md'));
    upgrade(tmp);
    const second = read(path.join(tmp, 'specs', 'config.md'));
    assert.equal(first, second, 'idempotent — second upgrade produced identical prefs file');
  } finally { rmrf(tmp); }
});

test('upgrade --dry-run: writes no config + no cache', () => {
  const tmp = freshInstall({ 'package.json': JSON.stringify({ name: 'demo' }) });
  try {
    foundProject(tmp);
    fs.rmSync(path.join(tmp, 'specs', 'config.md'));
    fs.rmSync(path.join(tmp, '.momentum', 'config-cache.json'));
    const res = runCli(['upgrade', tmp, '--agent', 'claude-code', '--dry-run']);
    assert.equal(res.status, 0);
    assert.ok(!exists(path.join(tmp, 'specs', 'config.md')), 'dry-run wrote no prefs');
    assert.ok(!exists(path.join(tmp, '.momentum', 'config-cache.json')), 'dry-run wrote no cache');
    assert.match(res.stdout, /would add:.*specs\/config\.md/);
  } finally { rmrf(tmp); }
});
