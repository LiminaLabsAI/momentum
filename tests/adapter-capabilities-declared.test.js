'use strict';

/**
 * Phase 10 Group 4 — capability flag audit.
 *
 * Every shipped adapter must declare the minimum capability surface
 * Phase 10 commands assume + the surface Phase 11 orchestration code
 * will lean on. Capabilities can be `true`, `false`, or a descriptive
 * string ("supported with caveats") — but they MUST be declared.
 *
 * See `core/adapter-capabilities.md` for the human-readable matrix
 * + tracked inconsistencies (ENH-023, ENH-024).
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

// Capabilities every adapter MUST declare. Phase 10 doesn't actually
// require these at runtime — but Phase 11 will. Declaring them up
// front makes orchestration design predictable.
const REQUIRED_CAPABILITIES = ['hooks', 'slashCommands', 'subagents'];

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

test('adapter-capabilities.md exists and references each shipped adapter', () => {
  const docPath = path.join(REPO_ROOT, 'core', 'adapter-capabilities.md');
  assert.ok(fs.existsSync(docPath), 'core/adapter-capabilities.md must exist');
  const doc = fs.readFileSync(docPath, 'utf8');
  for (const name of listShippedAdapters()) {
    // Match either the directory name (claude-code) or its display name.
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

test('inconsistencies are explicitly tracked (ENH-023, ENH-024)', () => {
  // This is documentation of audit findings. If/when the
  // inconsistencies are resolved, update the matrix doc AND remove the
  // ENH entries from backlog AND prune this test.
  const docPath = path.join(REPO_ROOT, 'core', 'adapter-capabilities.md');
  const doc = fs.readFileSync(docPath, 'utf8');
  assert.match(doc, /ENH-023/);
  assert.match(doc, /ENH-024/);
});

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
