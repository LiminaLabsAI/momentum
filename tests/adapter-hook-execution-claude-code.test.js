'use strict';

/**
 * Phase 16 G3.3 — Claude Code hook execution smoke (symmetry pass).
 *
 * The existing `tests/brainstorm-gate.test.js` exercises the hook script
 * directly against synthetic JSON, but it doesn't go through the
 * adapter-install path. This test mirrors the Codex / Antigravity
 * hook-execution tests by installing the Claude Code adapter and then
 * exercising the wired `.claude/settings.json` hooks via fakeToolEvent.
 *
 * This closes the test-coverage symmetry gap surfaced during Phase 16:
 * we now have equal-rigor hook-execution coverage for all three adapters.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli, fakeToolEvent } = require('./_helpers');

function setupClaudeProject() {
  const dir = mktmp('momentum-claude-hooks-');
  const res = runCli(['init', dir, '--agent', 'claude-code']);
  if (res.status !== 0) {
    rmrf(dir);
    throw new Error(`init failed: ${res.stderr}`);
  }
  return dir;
}

test('claude-code PreToolUse: brainstorm-gate blocks Write to specs/ when sentinel exists', () => {
  const dir = setupClaudeProject();
  try {
    fs.mkdirSync(path.join(dir, '.momentum'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.momentum', 'brainstorm-active'), '');

    const result = fakeToolEvent({
      hooksFile: path.join(dir, '.claude', 'settings.json'),
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

test('claude-code PostToolUse: history reminder fires on edit to specs/status.md', () => {
  const dir = setupClaudeProject();
  try {
    const result = fakeToolEvent({
      hooksFile: path.join(dir, '.claude', 'settings.json'),
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
