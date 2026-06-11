'use strict';

/**
 * Phase 16 Rework G1.8 — Codex hook execution smoke.
 *
 * Proves hooks actually FIRE (not just install) by synthesizing
 * Codex-native tool events (apply_patch, shell) against the wired
 * hooks.json and asserting side effects (exit codes, stderr markers).
 *
 * Uses the fakeToolEvent helper + payloads.* builders added in G0.6.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli, fakeToolEvent, payloads } = require('./_helpers');

function setupCodexProject() {
  const dir = mktmp('momentum-codex-hooks-');
  const res = runCli(['init', dir, '--agent', 'codex']);
  if (res.status !== 0) {
    rmrf(dir);
    throw new Error(`init failed: ${res.stderr}`);
  }
  return dir;
}

test('codex PreToolUse: apply_patch matcher dispatches brainstorm-gate', () => {
  const dir = setupCodexProject();
  try {
    // Activate the brainstorm sentinel.
    fs.mkdirSync(path.join(dir, '.momentum'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.momentum', 'brainstorm-active'), '');

    const result = fakeToolEvent({
      hooksFile: path.join(dir, '.codex', 'hooks.json'),
      event: 'PreToolUse',
      toolName: 'apply_patch',
      payload: payloads.codexApplyPatch(`${dir}/specs/decisions/draft.md`),
      cwd: dir,
    });
    assert.ok(result.exits.length > 0, 'expected PreToolUse hook to fire on apply_patch');
    // Note: brainstorm-gate is generalized in Group 3 to parse apply_patch
    // input. Before G3 lands, exit may be 0 (script doesn't see file_path).
    // After G3 it should be 2. This assertion runs on the brainstorm-gate
    // matcher itself, not the exit code — exit-code assertion in G3 test.
  } finally {
    rmrf(dir);
  }
});

test('codex PreToolUse: shell matcher dispatches brainstorm-gate', () => {
  const dir = setupCodexProject();
  try {
    fs.mkdirSync(path.join(dir, '.momentum'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.momentum', 'brainstorm-active'), '');

    const result = fakeToolEvent({
      hooksFile: path.join(dir, '.codex', 'hooks.json'),
      event: 'PreToolUse',
      toolName: 'shell',
      payload: payloads.codexShell('echo > specs/status.md'),
      cwd: dir,
    });
    assert.ok(result.exits.length > 0, 'expected PreToolUse hook to fire on shell');
  } finally {
    rmrf(dir);
  }
});

test('codex PreToolUse: non-matching tool is bypassed', () => {
  const dir = setupCodexProject();
  try {
    fs.mkdirSync(path.join(dir, '.momentum'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.momentum', 'brainstorm-active'), '');

    const result = fakeToolEvent({
      hooksFile: path.join(dir, '.codex', 'hooks.json'),
      event: 'PreToolUse',
      // view_file isn't in matcher apply_patch|shell — should bypass
      toolName: 'view_file',
      payload: { tool_name: 'view_file', tool_input: { file_path: 'src/a.js' } },
      cwd: dir,
    });
    assert.equal(result.exits.length, 0, 'view_file should not trigger PreToolUse hook');
  } finally {
    rmrf(dir);
  }
});

test('codex PostToolUse: history reminder fires on apply_patch to spec file', () => {
  const dir = setupCodexProject();
  try {
    const result = fakeToolEvent({
      hooksFile: path.join(dir, '.codex', 'hooks.json'),
      event: 'PostToolUse',
      toolName: 'apply_patch',
      payload: {
        tool_name: 'apply_patch',
        tool_input: { file_path: 'specs/status.md' },
      },
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

test('codex SessionStart hook is wired', () => {
  const dir = setupCodexProject();
  try {
    const hooks = JSON.parse(fs.readFileSync(path.join(dir, '.codex', 'hooks.json'), 'utf8'));
    assert.ok(
      Array.isArray(hooks.hooks.SessionStart) && hooks.hooks.SessionStart.length > 0,
      'SessionStart must be wired',
    );
    const hasHandoff = hooks.hooks.SessionStart.some((e) =>
      (e.hooks || []).some((h) => /sessionstart-handoff\.sh/.test(h.command || '')),
    );
    assert.ok(hasHandoff, 'SessionStart must reference sessionstart-handoff.sh');
  } finally {
    rmrf(dir);
  }
});
