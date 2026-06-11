'use strict';

/**
 * Phase 11 G0 — capability flag audit (post ENH-023 + ENH-024).
 *
 * Every shipped adapter must declare a uniform-boolean `capabilities`
 * block plus a `roadmap` block for forward-looking notes. Phase 11's
 * orchestration code (`core/orchestration/capability-routing.js`)
 * reads booleans only — caveated strings used to cause routing bugs
 * and are no longer allowed in the capability values.
 *
 * See `core/adapter-capabilities.md` for the human-readable matrix.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT } = require('./_helpers');

const ADAPTERS_DIR = path.join(REPO_ROOT, 'adapters');

function loadAdapter(name) {
  return require(path.join(ADAPTERS_DIR, name, 'adapter.js'));
}

function listShippedAdapters() {
  return fs
    .readdirSync(ADAPTERS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((n) => fs.existsSync(path.join(ADAPTERS_DIR, n, 'adapter.js')));
}

// Required capability surface every adapter must declare. Phase 11
// orchestration code reads these to route primitives per adapter.
const REQUIRED_CAPABILITIES = [
  'hooks',
  'slashCommands',
  'subagents',
  'parallelSubagents',
  'sessionStartHook',
  'skills',
  'browser',
  'computerUse',
];

test('every shipped adapter has a capabilities block', () => {
  for (const name of listShippedAdapters()) {
    const adapter = loadAdapter(name);
    assert.ok(
      adapter.capabilities && typeof adapter.capabilities === 'object',
      `${name}/adapter.js must export a 'capabilities' object`,
    );
  }
});

test('every shipped adapter declares the required capability surface', () => {
  for (const name of listShippedAdapters()) {
    const adapter = loadAdapter(name);
    for (const cap of REQUIRED_CAPABILITIES) {
      assert.ok(
        cap in adapter.capabilities,
        `${name}/adapter.js capabilities missing required key "${cap}"`,
      );
    }
  }
});

test('every required capability declaration is a boolean (ENH-023 + ENH-024 enforced)', () => {
  for (const name of listShippedAdapters()) {
    const adapter = loadAdapter(name);
    for (const cap of REQUIRED_CAPABILITIES) {
      const value = adapter.capabilities[cap];
      assert.strictEqual(
        typeof value,
        'boolean',
        `${name}/adapter.js capabilities.${cap} must be a boolean, got ${typeof value}: ${JSON.stringify(value)}. Move caveats to the 'roadmap' block.`,
      );
    }
  }
});

test('every shipped adapter exposes a roadmap block (may be empty)', () => {
  for (const name of listShippedAdapters()) {
    const adapter = loadAdapter(name);
    assert.ok(
      adapter.roadmap && typeof adapter.roadmap === 'object',
      `${name}/adapter.js must export a 'roadmap' object (use {} when no forward-looking notes apply)`,
    );
  }
});

// Phase 16 Rework G0.7 — destinations contract extension.
// Every adapter must declare commands + agent-rules + scripts + engines
// + workflows + skills + agents (the last three new in Phase 16 Rework).
const REQUIRED_DESTINATION_KEYS = [
  'commands',
  'agent-rules',
  'scripts',
  'engines',
  'workflows',
  'skills',
  'agents',
];

test('every shipped adapter declares the full destinations surface (Phase 16 Rework)', () => {
  for (const name of listShippedAdapters()) {
    const adapter = loadAdapter(name);
    assert.ok(
      adapter.destinations && typeof adapter.destinations === 'object',
      `${name}/adapter.js must export a 'destinations' object`,
    );
    for (const key of REQUIRED_DESTINATION_KEYS) {
      assert.ok(
        key in adapter.destinations,
        `${name}/adapter.js destinations missing required key "${key}" (Phase 16 Rework contract)`,
      );
      const value = adapter.destinations[key];
      assert.ok(
        Array.isArray(value) && value.every((v) => typeof v === 'string'),
        `${name}/adapter.js destinations.${key} must be an array of strings; got ${JSON.stringify(value)}`,
      );
    }
  }
});

test('roadmap entries reference real capability keys', () => {
  for (const name of listShippedAdapters()) {
    const adapter = loadAdapter(name);
    for (const key of Object.keys(adapter.roadmap)) {
      assert.ok(
        key in adapter.capabilities,
        `${name}/adapter.js roadmap key "${key}" must correspond to a declared capability`,
      );
      assert.strictEqual(
        typeof adapter.roadmap[key],
        'string',
        `${name}/adapter.js roadmap.${key} must be a string explaining the forward-looking note`,
      );
    }
  }
});

test('adapter-capabilities.md exists and references each shipped adapter', () => {
  const docPath = path.join(REPO_ROOT, 'core', 'adapter-capabilities.md');
  assert.ok(fs.existsSync(docPath), 'core/adapter-capabilities.md must exist');
  const doc = fs.readFileSync(docPath, 'utf8');
  for (const name of listShippedAdapters()) {
    const adapter = loadAdapter(name);
    const display = adapter.displayName || name;
    const pattern = new RegExp(
      `${escapeRegex(display)}|${escapeRegex(name)}`,
      'i',
    );
    assert.match(
      doc,
      pattern,
      `core/adapter-capabilities.md must mention ${display} (${name})`,
    );
  }
});

test('adapter-capabilities.md records ENH-023 and ENH-024 closure', () => {
  // Audit history check: the matrix doc must explain that the type
  // inconsistencies have been resolved in Phase 11 G0. If a future
  // phase rewrites the doc, update this assertion accordingly.
  const docPath = path.join(REPO_ROOT, 'core', 'adapter-capabilities.md');
  const doc = fs.readFileSync(docPath, 'utf8');
  assert.match(doc, /ENH-023/);
  assert.match(doc, /ENH-024/);
  assert.match(doc, /closed/i, 'matrix doc should explicitly call out that ENH-023 + ENH-024 are closed');
});

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
