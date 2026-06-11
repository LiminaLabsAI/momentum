'use strict';

/**
 * Phase 11 G0 — capability-routing unit tests.
 *
 * Verifies that the router consults adapter capability declarations
 * (post-ENH-023 + ENH-024 uniform booleans) to choose parallel vs
 * sequential, and surfaces degraded-mode notes when appropriate.
 */

const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT } = require('./_helpers');
const routing = require('../core/orchestration/capability-routing');

const MOMENTUM_ROOT = REPO_ROOT;

test('loadAdapter returns the adapter module for a known adapter', () => {
  const adapter = routing.loadAdapter(MOMENTUM_ROOT, 'claude-code');
  assert.strictEqual(adapter.displayName, 'Claude Code');
  assert.strictEqual(adapter.capabilities.subagents, true);
});

test('loadAdapter throws on unknown adapter', () => {
  assert.throws(
    () => routing.loadAdapter(MOMENTUM_ROOT, 'nope-not-real'),
    /adapter "nope-not-real" not found/,
  );
});

test('chooseMode rejects unknown primitive', () => {
  const adapter = routing.loadAdapter(MOMENTUM_ROOT, 'claude-code');
  assert.throws(
    () => routing.chooseMode(adapter, 'fakeprimitive'),
    /unknown primitive/,
  );
});

test('scout/handoff/continue return parallel by default with no notes on full-capability adapter', () => {
  const claudeCode = routing.loadAdapter(MOMENTUM_ROOT, 'claude-code');
  for (const p of ['scout', 'handoff', 'continue']) {
    const result = routing.chooseMode(claudeCode, p);
    assert.strictEqual(result.mode, 'parallel');
    assert.deepStrictEqual(result.notes, []);
  }
});

test('scout on adapter without subagents surfaces a note', () => {
  const fakeAdapter = {
    capabilities: { subagents: false, parallelSubagents: false },
    roadmap: {},
  };
  const result = routing.chooseMode(fakeAdapter, 'scout');
  assert.strictEqual(result.mode, 'parallel');
  assert.strictEqual(result.notes.length, 1);
  assert.match(result.notes[0], /does not declare subagents/);
});

test('dispatch on Claude Code returns parallel with no notes (parallelSubagents=true)', () => {
  const adapter = routing.loadAdapter(MOMENTUM_ROOT, 'claude-code');
  const result = routing.chooseMode(adapter, 'dispatch');
  assert.strictEqual(result.mode, 'parallel');
  assert.deepStrictEqual(result.notes, []);
});

test('dispatch on Codex returns sequential with note referencing roadmap (parallelSubagents=false)', () => {
  const adapter = routing.loadAdapter(MOMENTUM_ROOT, 'codex');
  const result = routing.chooseMode(adapter, 'dispatch');
  assert.strictEqual(result.mode, 'sequential');
  assert.strictEqual(result.notes.length, 1);
  assert.match(result.notes[0], /does not declare parallel subagents/);
  // The roadmap text gets parenthesized into the note so the user
  // understands WHY the adapter is in sequential mode.
  assert.match(result.notes[0], /Promote to true once dispatch parallel/);
});

test('dispatch on Antigravity returns parallel (parallelSubagents=true)', () => {
  const adapter = routing.loadAdapter(MOMENTUM_ROOT, 'antigravity');
  const result = routing.chooseMode(adapter, 'dispatch');
  assert.strictEqual(result.mode, 'parallel');
  assert.deepStrictEqual(result.notes, []);
});

test('dispatch with no subagent capability at all returns sequential with CLI-floor note', () => {
  const fakeAdapter = {
    capabilities: { subagents: false, parallelSubagents: false },
    roadmap: {},
  };
  const result = routing.chooseMode(fakeAdapter, 'dispatch');
  assert.strictEqual(result.mode, 'sequential');
  assert.match(result.notes[0], /CLI floor/);
});

test('supportsSessionStartHook reflects the adapter declaration', () => {
  assert.strictEqual(
    routing.supportsSessionStartHook(routing.loadAdapter(MOMENTUM_ROOT, 'claude-code')),
    true,
  );
  assert.strictEqual(
    routing.supportsSessionStartHook(routing.loadAdapter(MOMENTUM_ROOT, 'codex')),
    true,
  );
  assert.strictEqual(
    routing.supportsSessionStartHook(routing.loadAdapter(MOMENTUM_ROOT, 'antigravity')),
    false,
  );
});

test('supportsSlashCommands reflects the adapter declaration', () => {
  assert.strictEqual(
    routing.supportsSlashCommands(routing.loadAdapter(MOMENTUM_ROOT, 'claude-code')),
    true,
  );
  assert.strictEqual(
    routing.supportsSlashCommands(routing.loadAdapter(MOMENTUM_ROOT, 'codex')),
    true,
  );
  // Phase 16 Rework: Antigravity HAS slash commands via the workflows
  // overlay (.agent/workflows/<name>.md → /<name>). Was false in
  // Phase 11 when we believed Antigravity was chat-only.
  assert.strictEqual(
    routing.supportsSlashCommands(routing.loadAdapter(MOMENTUM_ROOT, 'antigravity')),
    true,
  );
});
