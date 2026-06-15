'use strict';

// Phase 18 G0 — adapter.spawn(directive) contract.
//
// Every adapter at `adapters/*/adapter.js` MUST export a `spawn(directive)`
// function. The conductor produces platform-agnostic directives; the adapter
// dispatches them to its native runtime. Pure stubs MUST return the canonical
// "not implemented" per-repo shape rather than throwing — the conductor stays
// robust to per-repo dispatch failures.
//
// See `bin/momentum.js` for the canonical directive shape.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const ADAPTERS_DIR = path.join(REPO_ROOT, 'adapters');
const { spawnSupervisors, loadAdapterForPlatform } = require(path.join(REPO_ROOT, 'bin', 'swarm.js'));

function listAdapters() {
  return fs.readdirSync(ADAPTERS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => fs.existsSync(path.join(ADAPTERS_DIR, name, 'adapter.js')))
    .sort();
}

function fakeDirective(platform, repoId = 'repo-a') {
  return {
    platform,
    swarmId: '0001-test',
    wave: 1,
    repoId,
    repoPath: '/tmp/momentum-test-spawn-fake',
    phaseSlug: 'phase-1-test',
    branch: 'phase-1-test',
    sessionId: 'sess_test',
    recipePath: '/dev/null',
    contextPath: null,
    env: { MOMENTUM_SWARM_ID: '0001-test' },
  };
}

test('every adapter exports a spawn(directive) function', () => {
  const adapters = listAdapters();
  assert.ok(adapters.length >= 3, `expected >= 3 adapters, got ${adapters.length}`);
  for (const name of adapters) {
    const adapter = require(path.join(ADAPTERS_DIR, name, 'adapter.js'));
    assert.equal(
      typeof adapter.spawn,
      'function',
      `${name} adapter.js must export spawn(directive)`
    );
  }
});

test('adapter.spawn returns canonical per-repo shape (does not throw)', () => {
  const adapters = listAdapters();
  for (const name of adapters) {
    const adapter = require(path.join(ADAPTERS_DIR, name, 'adapter.js'));
    // Use a directive with a clearly non-matching platform so even Claude
    // Code returns its "non-claude-code platform" branch without trying
    // to exec a real binary. Real-launch paths are covered in G3 e2e.
    const result = adapter.spawn(fakeDirective('non-existent-platform'));
    assert.equal(typeof result, 'object', `${name} spawn() must return an object`);
    assert.equal(typeof result.status, 'number', `${name} spawn() result.status must be a number`);
    assert.ok(
      'repoId' in result,
      `${name} spawn() result must include repoId (got ${JSON.stringify(Object.keys(result))})`
    );
    assert.equal(
      result.status,
      -1,
      `${name} spawn() should return status -1 for a non-matching platform`
    );
  }
});

test('spawnSupervisors — dispatches via adapter.spawn for known platforms', () => {
  // Each adapter's spawn() must return the canonical per-repo shape
  // ({ repoId, status, detail }). status == -1 is the canonical
  // "could not launch" code, which fires whether the adapter is still
  // a stub OR the adapter shells out to a CLI that isn't on PATH.
  // This test verifies the DISPATCH surface (each directive routes to
  // its platform's adapter and yields the canonical shape) without
  // pinning the implementation status of any specific adapter.
  // Real launch coverage lives in G3 e2e + G4 live VAL evidence.
  process.env.CODEX_BIN = '/this/does/not/exist/codex';
  process.env.AGY_BIN = '/this/does/not/exist/agy';
  try {
    const directives = [
      fakeDirective('codex', 'repo-codex'),
      fakeDirective('antigravity', 'repo-antigravity'),
    ];
    const results = spawnSupervisors(directives);
    assert.equal(results.length, 2);
    assert.equal(results[0].repoId, 'repo-codex');
    assert.equal(typeof results[0].status, 'number');
    assert.equal(results[0].status, -1);
    assert.ok(results[0].detail.length > 0, 'detail should be populated');
    assert.equal(results[1].repoId, 'repo-antigravity');
    assert.equal(typeof results[1].status, 'number');
    assert.equal(results[1].status, -1);
    assert.ok(results[1].detail.length > 0, 'detail should be populated');
  } finally {
    delete process.env.CODEX_BIN;
    delete process.env.AGY_BIN;
  }
});

test('spawnSupervisors — unknown platform yields canonical -1 entry', () => {
  const results = spawnSupervisors([fakeDirective('does-not-exist', 'repo-x')]);
  assert.equal(results.length, 1);
  assert.equal(results[0].repoId, 'repo-x');
  assert.equal(results[0].status, -1);
  assert.match(results[0].detail, /unknown platform/);
});

test('loadAdapterForPlatform — returns the adapter module for known platforms', () => {
  const claude = loadAdapterForPlatform('claude-code');
  assert.ok(claude, 'claude-code adapter must resolve');
  assert.equal(typeof claude.spawn, 'function');
  const missing = loadAdapterForPlatform('does-not-exist');
  assert.equal(missing, null, 'missing platform returns null');
});
