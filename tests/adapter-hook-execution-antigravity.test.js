'use strict';

/**
 * Phase 16 Rework G2.9 — Antigravity hook execution smoke.
 *
 * Synthesizes Antigravity-native tool events (run_command, view_file,
 * apply_patch) against the wired .agents/hooks.json and asserts side
 * effects.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli, fakeToolEvent, payloads } = require('./_helpers');

function setupAntigravityProject() {
  const dir = mktmp('momentum-antigravity-hooks-');
  const res = runCli(['init', dir, '--agent', 'antigravity']);
  if (res.status !== 0) {
    rmrf(dir);
    throw new Error(`init failed: ${res.stderr}`);
  }
  return dir;
}

test('antigravity PreToolUse: run_command matcher dispatches brainstorm-gate', () => {
  const dir = setupAntigravityProject();
  try {
    const result = fakeToolEvent({
      hooksFile: path.join(dir, '.agents', 'hooks.json'),
      event: 'PreToolUse',
      toolName: 'run_command',
      payload: payloads.antigravityRunCommand('echo hi', 'specs/status.md'),
      cwd: dir,
    });
    assert.ok(result.exits.length > 0, 'expected PreToolUse hook to fire on run_command');
  } finally {
    rmrf(dir);
  }
});

test('antigravity PreToolUse: view_file matcher dispatches brainstorm-gate', () => {
  const dir = setupAntigravityProject();
  try {
    const result = fakeToolEvent({
      hooksFile: path.join(dir, '.agents', 'hooks.json'),
      event: 'PreToolUse',
      toolName: 'view_file',
      payload: payloads.antigravityViewFile('specs/status.md'),
      cwd: dir,
    });
    assert.ok(result.exits.length > 0, 'expected PreToolUse hook to fire on view_file');
  } finally {
    rmrf(dir);
  }
});

test('antigravity PreToolUse: non-matching tool is bypassed', () => {
  const dir = setupAntigravityProject();
  try {
    const result = fakeToolEvent({
      hooksFile: path.join(dir, '.agents', 'hooks.json'),
      event: 'PreToolUse',
      toolName: 'unrelated_tool',
      payload: { tool_name: 'unrelated_tool', tool_input: {} },
      cwd: dir,
    });
    assert.equal(result.exits.length, 0, 'unrelated_tool should not match');
  } finally {
    rmrf(dir);
  }
});

test('antigravity PostToolUse: history reminder fires on apply_patch to spec', () => {
  const dir = setupAntigravityProject();
  try {
    const result = fakeToolEvent({
      hooksFile: path.join(dir, '.agents', 'hooks.json'),
      event: 'PostToolUse',
      toolName: 'apply_patch',
      payload: { tool_name: 'apply_patch', tool_input: { file_path: 'specs/status.md' } },
      cwd: dir,
    });
    assert.ok(result.exits.length > 0, 'expected PostToolUse hook to fire');
    assert.ok(
      result.exits.every((e) => e === 0),
      `PostToolUse should exit 0; got ${JSON.stringify(result.exits)}`,
    );
    assert.ok(
      result.stdouts.some((s) => /PHASE HISTORY REMINDER/.test(s)),
      `expected PHASE HISTORY REMINDER; got ${JSON.stringify(result.stdouts)}`,
    );
  } finally {
    rmrf(dir);
  }
});

test('antigravity SessionStart hook is wired', () => {
  const dir = setupAntigravityProject();
  try {
    const hooks = JSON.parse(fs.readFileSync(path.join(dir, '.agents', 'hooks.json'), 'utf8'));
    assert.ok(
      Array.isArray(hooks.hooks.SessionStart) && hooks.hooks.SessionStart.length > 0,
      'SessionStart must be wired',
    );
  } finally {
    rmrf(dir);
  }
});
