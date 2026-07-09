'use strict';

/**
 * Phase 26 — Project Config, Group 1.
 *
 * Integration tests: `momentum init` writes an inferred `specs/config.md`
 * + the derived `.momentum/config-cache.json` for each manifest family
 * (node/python/rust/go/none), and leaves an authored file alone on re-init.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli, read, exists } = require('./_helpers');
const P = require('../core/config');

function initRepo(manifests = {}) {
  const tmp = mktmp('momentum-prefs-init-');
  for (const [name, body] of Object.entries(manifests)) {
    fs.writeFileSync(path.join(tmp, name), body);
  }
  const res = runCli(['init', tmp, '--agent', 'claude-code']);
  assert.equal(res.status, 0, `init failed: ${res.stderr}`);
  return tmp;
}

function readPrefs(tmp) {
  return P.readConfig(path.join(tmp, 'specs'));
}

test('init: node project → language node, publish npm, build from script', () => {
  const tmp = initRepo({
    'package.json': JSON.stringify({ name: 'demo', scripts: { build: 'astro build', test: 'node --test' } }),
  });
  try {
    const prefs = readPrefs(tmp);
    assert.equal(prefs.language, 'node');
    assert.equal(prefs.publish_target, 'npm');
    assert.equal(prefs.build_command, 'npm run build');
    assert.equal(prefs.test_command, 'npm test');
    assert.equal(prefs.release_flow, 'tag-and-publish');
    // cache written
    const cache = P.readConfigCache(tmp);
    assert.ok(cache, 'cache file written');
    assert.deepEqual(cache.protected_branches, ['staging', 'main']);
    // header note present
    assert.match(read(path.join(tmp, 'specs', 'config.md')), /Inferred by momentum init/);
  } finally { rmrf(tmp); }
});

test('init: python project → language python, publish pypi', () => {
  const tmp = initRepo({ 'pyproject.toml': '[project]\nname = "demo"\n' });
  try {
    const prefs = readPrefs(tmp);
    assert.equal(prefs.language, 'python');
    assert.equal(prefs.publish_target, 'pypi');
    assert.equal(prefs.test_command, 'pytest');
  } finally { rmrf(tmp); }
});

test('init: rust project → language rust, publish crates-io', () => {
  const tmp = initRepo({ 'Cargo.toml': '[package]\nname = "demo"\n' });
  try {
    const prefs = readPrefs(tmp);
    assert.equal(prefs.language, 'rust');
    assert.equal(prefs.publish_target, 'crates-io');
    assert.equal(prefs.build_command, 'cargo build --release');
  } finally { rmrf(tmp); }
});

test('init: go project → language go, publish none', () => {
  const tmp = initRepo({ 'go.mod': 'module demo\n\ngo 1.22\n' });
  try {
    const prefs = readPrefs(tmp);
    assert.equal(prefs.language, 'go');
    assert.equal(prefs.publish_target, 'none');
    assert.equal(prefs.release_flow, 'tag-only');
  } finally { rmrf(tmp); }
});

test('init: no manifest → language none, safe defaults', () => {
  const tmp = initRepo();
  try {
    const prefs = readPrefs(tmp);
    assert.equal(prefs.language, 'none');
    assert.equal(prefs.publish_target, 'none');
    assert.equal(prefs.git_forge, 'github'); // no remote → default
    assert.equal(prefs.test_command, 'npm test');
  } finally { rmrf(tmp); }
});

test('init: config.md is OKF-typed (type: Config)', () => {
  const tmp = initRepo();
  try {
    assert.match(read(path.join(tmp, 'specs', 'config.md')), /^type: Config$/m);
  } finally { rmrf(tmp); }
});

test('init: re-init leaves an authored config.md unchanged', () => {
  const tmp = initRepo({ 'package.json': JSON.stringify({ name: 'demo' }) });
  try {
    // user authors a custom config file
    const prefsPath = path.join(tmp, 'specs', 'config.md');
    const custom = '# Project Config\n\n| Key | Value |\n|-----|-------|\n| language | python |\n| end_state | feature-branch-only |\n| branch_flow | main |\n| protected_branches | main |\n';
    fs.writeFileSync(prefsPath, custom);
    // re-init
    const res = runCli(['init', tmp, '--agent', 'claude-code']);
    assert.equal(res.status, 0);
    const after = read(prefsPath);
    assert.match(after, /\| language \| python \|/, 'user-authored value preserved');
    assert.match(after, /\| end_state \| feature-branch-only \|/);
  } finally { rmrf(tmp); }
});

test('init --dry-run: writes no config file + no cache', () => {
  const tmp = mktmp('momentum-prefs-init-');
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'demo' }));
    const res = runCli(['init', tmp, '--agent', 'claude-code', '--dry-run']);
    assert.equal(res.status, 0);
    assert.ok(!exists(path.join(tmp, 'specs', 'config.md')), 'dry-run wrote no prefs file');
    assert.ok(!exists(path.join(tmp, '.momentum', 'config-cache.json')), 'dry-run wrote no cache');
  } finally { rmrf(tmp); }
});
