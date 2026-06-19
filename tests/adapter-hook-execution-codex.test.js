'use strict';

/**
 * Phase 16 Rework G1.8 — Codex hook execution smoke.
 *
 * Proves hooks actually FIRE (not just install) by synthesizing
 * Codex-native tool events (apply_patch, Bash) against the wired
 * hooks.json and asserting side effects (exit codes, stderr markers).
 *
 * 2026-06-13: matcher fixed from `apply_patch|shell` to `apply_patch|Bash`
 * (BUG-007). Per Codex docs, canonical tool_name for shell commands is
 * "Bash" — using "shell" silently bypassed every Bash event in live runtime.
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

test('codex PreToolUse: Bash matcher dispatches brainstorm-gate (real tool_name)', () => {
  const dir = setupCodexProject();
  try {
    fs.mkdirSync(path.join(dir, '.momentum'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.momentum', 'brainstorm-active'), '');

    const result = fakeToolEvent({
      hooksFile: path.join(dir, '.codex', 'hooks.json'),
      event: 'PreToolUse',
      toolName: 'Bash',
      payload: payloads.codexBash('echo > specs/status.md'),
      cwd: dir,
    });
    assert.ok(result.exits.length > 0, 'expected PreToolUse hook to fire on Bash');
  } finally {
    rmrf(dir);
  }
});

test('codex PreToolUse: legacy "shell" tool_name does NOT fire (regression guard for BUG-007)', () => {
  // Codex docs are explicit: canonical tool_name is "Bash". Prior versions
  // of the matcher accepted "shell" — guard against re-introduction.
  const dir = setupCodexProject();
  try {
    fs.mkdirSync(path.join(dir, '.momentum'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.momentum', 'brainstorm-active'), '');

    const result = fakeToolEvent({
      hooksFile: path.join(dir, '.codex', 'hooks.json'),
      event: 'PreToolUse',
      toolName: 'shell',
      payload: { tool_name: 'shell', tool_input: { command: 'echo > specs/x' } },
      cwd: dir,
    });
    assert.equal(result.exits.length, 0, 'shell (legacy) must not match — matcher is apply_patch|Bash');
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
      // view_file isn't in matcher apply_patch|Bash — should bypass
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
      result.stdouts.some((s) => /HISTORY REMINDER/.test(s)),
      `expected HISTORY REMINDER; got ${JSON.stringify(result.stdouts)}`,
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
