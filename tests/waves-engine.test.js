'use strict';

/**
 * Phase 21c G1 — the recursive wave engine (core/waves/lib/waves.js,
 * ADR-0003) + byte-stable swarm adapter parity.
 */

const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT } = require('./_helpers');

const { computeWaveLayers } = require(path.join(REPO_ROOT, 'core', 'waves', 'lib', 'waves'));
const swarmWaves = require(path.join(REPO_ROOT, 'core', 'swarm', 'lib', 'wave-ordering'));

test('independent nodes form one wave, lexicographically ordered', () => {
  const waves = computeWaveLayers(['c', 'a', 'b'], []);
  assert.deepEqual(waves, [{ index: 1, nodes: ['a', 'b', 'c'] }]);
});

test('dependency chains layer into sequential waves', () => {
  // ui depends on api and auth; api depends on auth
  const waves = computeWaveLayers(
    ['ui', 'api', 'auth'],
    [
      { from: 'ui', to: 'api' },
      { from: 'ui', to: 'auth' },
      { from: 'api', to: 'auth' },
    ]
  );
  assert.deepEqual(waves, [
    { index: 1, nodes: ['auth'] },
    { index: 2, nodes: ['api'] },
    { index: 3, nodes: ['ui'] },
  ]);
});

test('diamond graphs fan out and re-join', () => {
  const waves = computeWaveLayers(
    ['top', 'left', 'right', 'base'],
    [
      { from: 'left', to: 'base' },
      { from: 'right', to: 'base' },
      { from: 'top', to: 'left' },
      { from: 'top', to: 'right' },
    ]
  );
  assert.deepEqual(waves, [
    { index: 1, nodes: ['base'] },
    { index: 2, nodes: ['left', 'right'] },
    { index: 3, nodes: ['top'] },
  ]);
});

test('edges touching nodes outside the subgraph are ignored', () => {
  const waves = computeWaveLayers(
    ['a', 'b'],
    [
      { from: 'a', to: 'external' },
      { from: 'external', to: 'b' },
      { from: 'b', to: 'a' },
    ]
  );
  assert.deepEqual(waves, [
    { index: 1, nodes: ['a'] },
    { index: 2, nodes: ['b'] },
  ]);
});

test('cycles and self-dependencies throw with participants and the adapter label', () => {
  assert.throws(
    () => computeWaveLayers(['a', 'b'], [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }]),
    /computeWaves: cycle detected involving a, b/
  );
  assert.throws(
    () => computeWaveLayers(['a'], [{ from: 'a', to: 'a' }]),
    /computeWaves: self-dependency on "a"/
  );
});

test('label option prefixes validation errors (adapter compatibility)', () => {
  assert.throws(() => computeWaveLayers([], [], { label: 'phaseWaves' }), /phaseWaves: impactedRepos must be a non-empty array/);
  assert.throws(() => computeWaveLayers([''], []), /computeWaves: impactedRepos must be non-empty strings/);
});

test('swarm adapter parity: identical waves and error strings to the Phase 17 surface', () => {
  // Shape parity: {index, repos} with lexicographic stability.
  const waves = swarmWaves.computeWaves(
    ['frontend', 'api', 'shared'],
    [
      { from: 'frontend', to: 'api', kind: 'runtime' },
      { from: 'api', to: 'shared' },
      { from: 'frontend', to: 'shared' },
    ]
  );
  assert.deepEqual(waves, [
    { index: 1, repos: ['shared'] },
    { index: 2, repos: ['api'] },
    { index: 3, repos: ['frontend'] },
  ]);

  // Error-string parity (byte-stable adapter guarantee).
  assert.throws(() => swarmWaves.computeWaves([], []), /computeWaves: impactedRepos must be a non-empty array/);
  assert.throws(
    () => swarmWaves.computeWaves(['a', 'b'], [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }]),
    /computeWaves: cycle detected involving a, b/
  );
  assert.throws(
    () => swarmWaves.computeWaves(['a'], [{ from: 'a', to: 'a' }]),
    /computeWaves: self-dependency on "a" — invalid edge/
  );

  // Full-manifest helper parity.
  const eco = {
    members: [{ id: 'b' }, { id: 'a' }],
    dependencies: [{ from: 'b', to: 'a' }],
  };
  assert.deepEqual(swarmWaves.computeFullEcosystemWaves(eco), [
    { index: 1, repos: ['a'] },
    { index: 2, repos: ['b'] },
  ]);
});
