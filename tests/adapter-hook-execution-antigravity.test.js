'use strict';

/**
 * Phase 16 G3.2 — Antigravity hook execution smoke.
 *
 * Same shape as the Codex hook-execution test: install the adapter,
 * synthesize a tool event against the wired `.agents/hooks.json`, and
 * assert the matching hook command produces the expected side effect.
 *
 * Antigravity doesn't wire PreToolUse (no brainstorm-gate event yet
 * confirmed in vendor docs), so the focus here is PostToolUse history
 * reminder + SessionStart fallback hint.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli, fakeToolEvent } = require('./_helpers');

function setupAntigravityProject() {
  const dir = mktmp('momentum-antigravity-hooks-');
  const res = runCli(['init', dir, '--agent', 'antigravity']);
  if (res.status !== 0) {
    rmrf(dir);
    throw new Error(`init failed: ${res.stderr}`);
  }
  return dir;
}

test('antigravity PostToolUse: history reminder fires on edit to specs/status.md', () => {
  const dir = setupAntigravityProject();
  try {
    const result = fakeToolEvent({
      hooksFile: path.join(dir, '.agents', 'hooks.json'),
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

test('antigravity PostToolUse: history reminder silent on non-significant file', () => {
  const dir = setupAntigravityProject();
  try {
    const result = fakeToolEvent({
      hooksFile: path.join(dir, '.agents', 'hooks.json'),
      event: 'PostToolUse',
      toolName: 'Write',
      payload: {
        tool_name: 'Write',
        tool_input: { file_path: 'src/some-source.js' },
      },
      cwd: dir,
    });
    assert.ok(
      result.exits.every((e) => e === 0),
      `expected PostToolUse exit 0; got ${JSON.stringify(result.exits)}`,
    );
    assert.ok(
      result.stdouts.every((s) => !/PHASE HISTORY REMINDER/.test(s)),
      `expected no reminder for non-significant file; got ${JSON.stringify(result.stdouts)}`,
    );
  } finally {
    rmrf(dir);
  }
});

test('antigravity SessionStart: hook is wired (event will fire when runtime supports it)', () => {
  const dir = setupAntigravityProject();
  try {
    const hooks = JSON.parse(
      fs.readFileSync(path.join(dir, '.agents', 'hooks.json'), 'utf8'),
    );
    assert.ok(
      Array.isArray(hooks.hooks && hooks.hooks.SessionStart),
      'SessionStart must be declared even if degraded — AGENTS.md fallback covers it',
    );
    const hasSessionHandoff = hooks.hooks.SessionStart.some((entry) =>
      (entry.hooks || []).some((h) =>
        /sessionstart-handoff\.sh/.test(h.command || ''),
      ),
    );
    assert.ok(
      hasSessionHandoff,
      'SessionStart must reference sessionstart-handoff.sh',
    );
  } finally {
    rmrf(dir);
  }
});
