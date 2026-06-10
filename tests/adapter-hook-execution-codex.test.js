'use strict';

/**
 * Phase 16 G3.1 — Codex hook execution smoke.
 *
 * Existing tests verify that hooks INSTALL. This test verifies they
 * actually FIRE: install the Codex adapter, then synthesize a tool
 * event against the wired hooks.json and assert the matching hook
 * command produces the expected side effect (exit code or stdout).
 *
 * Uses the fakeToolEvent helper added to _helpers.js in Phase 16 G0.5.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli, fakeToolEvent } = require('./_helpers');

function setupCodexProject() {
  const dir = mktmp('momentum-codex-hooks-');
  const res = runCli(['init', dir, '--agent', 'codex']);
  if (res.status !== 0) {
    rmrf(dir);
    throw new Error(`init failed: ${res.stderr}`);
  }
  return dir;
}

test('codex PreToolUse: brainstorm-gate blocks Write to specs/ when sentinel exists', () => {
  const dir = setupCodexProject();
  try {
    // Activate the brainstorm sentinel.
    fs.mkdirSync(path.join(dir, '.momentum'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.momentum', 'brainstorm-active'), '');

    const result = fakeToolEvent({
      hooksFile: path.join(dir, '.codex', 'hooks.json'),
      event: 'PreToolUse',
      toolName: 'Write',
      payload: {
        tool_name: 'Write',
        tool_input: { file_path: `${dir}/specs/decisions/draft.md` },
      },
      cwd: dir,
    });
    assert.ok(result.exits.length > 0, 'expected at least one hook to fire');
    assert.ok(
      result.exits.some((e) => e === 2),
      `expected at least one hook exit 2 (block); got exits=${JSON.stringify(result.exits)}, stderr=${result.stderrs.join('\n')}`,
    );
    assert.ok(
      result.stderrs.some((s) => /\[brainstorm-gate\] Blocked/.test(s)),
      `expected brainstorm-gate Blocked stderr marker; got ${JSON.stringify(result.stderrs)}`,
    );
  } finally {
    rmrf(dir);
  }
});

test('codex PreToolUse: brainstorm-gate allows Write to specs/ when sentinel absent', () => {
  const dir = setupCodexProject();
  try {
    // Sentinel intentionally absent.
    const result = fakeToolEvent({
      hooksFile: path.join(dir, '.codex', 'hooks.json'),
      event: 'PreToolUse',
      toolName: 'Write',
      payload: {
        tool_name: 'Write',
        tool_input: { file_path: `${dir}/specs/decisions/draft.md` },
      },
      cwd: dir,
    });
    assert.ok(
      result.exits.every((e) => e === 0),
      `expected all hooks exit 0 (allow); got exits=${JSON.stringify(result.exits)}`,
    );
  } finally {
    rmrf(dir);
  }
});

test('codex PreToolUse: brainstorm-gate allows non-Write tools even with sentinel', () => {
  const dir = setupCodexProject();
  try {
    fs.mkdirSync(path.join(dir, '.momentum'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.momentum', 'brainstorm-active'), '');

    const result = fakeToolEvent({
      hooksFile: path.join(dir, '.codex', 'hooks.json'),
      event: 'PreToolUse',
      // Bash isn't in the matcher Write|Edit|MultiEdit, so the matcher
      // step in fakeToolEvent filters it out — no hooks should fire.
      toolName: 'Bash',
      payload: { tool_name: 'Bash', tool_input: { command: 'ls' } },
      cwd: dir,
    });
    assert.equal(
      result.exits.length,
      0,
      `expected no hooks to fire on Bash; got exits=${JSON.stringify(result.exits)}`,
    );
  } finally {
    rmrf(dir);
  }
});

test('codex PostToolUse: history reminder fires on edit to specs/status.md', () => {
  const dir = setupCodexProject();
  try {
    const result = fakeToolEvent({
      hooksFile: path.join(dir, '.codex', 'hooks.json'),
      event: 'PostToolUse',
      toolName: 'Write',
      payload: {
        tool_name: 'Write',
        tool_input: { file_path: 'specs/status.md' },
      },
      cwd: dir,
    });
    assert.ok(result.exits.length > 0, 'expected PostToolUse hook to fire');
    assert.ok(
      result.exits.every((e) => e === 0),
      `expected PostToolUse exit 0; got ${JSON.stringify(result.exits)}`,
    );
    assert.ok(
      result.stdouts.some((s) => /PHASE HISTORY REMINDER/.test(s)),
      `expected PHASE HISTORY REMINDER stdout; got ${JSON.stringify(result.stdouts)}`,
    );
  } finally {
    rmrf(dir);
  }
});
