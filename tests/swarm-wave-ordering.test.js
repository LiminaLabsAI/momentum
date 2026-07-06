'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { computeWaves, computeFullEcosystemWaves } = require('../core/swarm/lib/wave-ordering');

// ─────────────────────────────────────────────────────────────────────────────
// computeWaves — happy paths
// ─────────────────────────────────────────────────────────────────────────────

test('computeWaves — linear chain (A → B → C)', () => {
  const waves = computeWaves(['a', 'b', 'c'], [
    { from: 'b', to: 'a', kind: 'api-contract' },
    { from: 'c', to: 'b', kind: 'api-contract' },
  ]);
  assert.deepEqual(waves, [
    { index: 1, repos: ['a'] },
    { index: 2, repos: ['b'] },
    { index: 3, repos: ['c'] },
  ]);
});

test('computeWaves — diamond (one root → two parallel → one merge)', () => {
  // edges (consumer depends on producer):
  //   b → a,  c → a,  d → b,  d → c
  const waves = computeWaves(['a', 'b', 'c', 'd'], [
    { from: 'b', to: 'a' },
    { from: 'c', to: 'a' },
    { from: 'd', to: 'b' },
    { from: 'd', to: 'c' },
  ]);
  assert.deepEqual(waves, [
    { index: 1, repos: ['a'] },
    { index: 2, repos: ['b', 'c'] },
    { index: 3, repos: ['d'] },
  ]);
});

test('computeWaves — wide fan-out (1 root, 4 leaves)', () => {
  const waves = computeWaves(['root', 'l1', 'l2', 'l3', 'l4'], [
    { from: 'l1', to: 'root' },
    { from: 'l2', to: 'root' },
    { from: 'l3', to: 'root' },
    { from: 'l4', to: 'root' },
  ]);
  assert.deepEqual(waves, [
    { index: 1, repos: ['root'] },
    { index: 2, repos: ['l1', 'l2', 'l3', 'l4'] },
  ]);
});

test('computeWaves — independent repos collapse into a single wave', () => {
  const waves = computeWaves(['a', 'b', 'c'], []);
  assert.deepEqual(waves, [{ index: 1, repos: ['a', 'b', 'c'] }]);
});

test('computeWaves — ignores edges to non-impacted repos', () => {
  // 'd' is not impacted; edge b → d should be dropped
  const waves = computeWaves(['a', 'b', 'c'], [
    { from: 'b', to: 'a' },
    { from: 'b', to: 'd' },
    { from: 'c', to: 'b' },
  ]);
  assert.deepEqual(waves, [
    { index: 1, repos: ['a'] },
    { index: 2, repos: ['b'] },
    { index: 3, repos: ['c'] },
  ]);
});

// ─────────────────────────────────────────────────────────────────────────────
// Cycle detection
// ─────────────────────────────────────────────────────────────────────────────

test('computeWaves — detects 2-node cycle', () => {
  assert.throws(
    () => computeWaves(['a', 'b'], [
      { from: 'b', to: 'a' },
      { from: 'a', to: 'b' },
    ]),
    /cycle detected/
  );
});

test('computeWaves — detects 3-node cycle, names participants', () => {
  try {
    computeWaves(['a', 'b', 'c'], [
      { from: 'b', to: 'a' },
      { from: 'c', to: 'b' },
      { from: 'a', to: 'c' },
    ]);
    assert.fail('should have thrown');
  } catch (e) {
    assert.match(e.message, /cycle detected/);
    assert.match(e.message, /a, b, c/);
  }
});

test('computeWaves — rejects self-dependency', () => {
  assert.throws(
    () => computeWaves(['a'], [{ from: 'a', to: 'a' }]),
    /self-dependency/
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Determinism
// ─────────────────────────────────────────────────────────────────────────────

test('computeWaves — within-wave order is lexicographic (stable)', () => {
  const waves = computeWaves(['root', 'zeta', 'alpha', 'mike'], [
    { from: 'zeta', to: 'root' },
    { from: 'alpha', to: 'root' },
    { from: 'mike', to: 'root' },
  ]);
  assert.deepEqual(waves[1].repos, ['alpha', 'mike', 'zeta']);
});

test('computeWaves — input order does not affect output', () => {
  const a = computeWaves(['a', 'b', 'c'], [
    { from: 'b', to: 'a' }, { from: 'c', to: 'a' },
  ]);
  const b = computeWaves(['c', 'a', 'b'], [
    { from: 'c', to: 'a' }, { from: 'b', to: 'a' },
  ]);
  assert.deepEqual(a, b);
});

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

test('computeWaves — empty impacted list throws', () => {
  assert.throws(() => computeWaves([], []), /non-empty array/);
});

test('computeWaves — non-string repo id throws', () => {
  assert.throws(() => computeWaves(['a', 42], []), /TypeError|non-empty strings/);
});

test('computeWaves — ignores malformed edges silently', () => {
  // null entry, missing from/to, non-string fields — all should be skipped
  const waves = computeWaves(['a', 'b'], [
    null,
    { from: 'b' },
    { to: 'a' },
    { from: 7, to: 'a' },
    { from: 'b', to: 'a' }, // the only valid one
  ]);
  assert.deepEqual(waves, [
    { index: 1, repos: ['a'] },
    { index: 2, repos: ['b'] },
  ]);
});

// ─────────────────────────────────────────────────────────────────────────────
// computeFullEcosystemWaves — convenience over ecosystem manifest
// ─────────────────────────────────────────────────────────────────────────────

test('computeFullEcosystemWaves — uses members + dependencies', () => {
  const manifest = {
    members: [
      { id: 'shared-types', path: '../shared-types', role: 'library' },
      { id: 'backend', path: '../backend', role: 'platform' },
      { id: 'frontend', path: '../frontend', role: 'client' },
    ],
    dependencies: [
      { from: 'backend', to: 'shared-types', kind: 'library' },
      { from: 'frontend', to: 'backend', kind: 'api-contract' },
    ],
  };
  const waves = computeFullEcosystemWaves(manifest);
  assert.deepEqual(waves, [
    { index: 1, repos: ['shared-types'] },
    { index: 2, repos: ['backend'] },
    { index: 3, repos: ['frontend'] },
  ]);
});

test('computeFullEcosystemWaves — handles empty manifest defensively', () => {
  assert.throws(() => computeFullEcosystemWaves({ members: [] }), /non-empty array/);
});
