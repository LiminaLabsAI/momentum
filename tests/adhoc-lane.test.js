'use strict';

/**
 * Phase 19 — Lifecycle Hardening, Group 2.
 *
 * The ad-hoc work lane (FEAT-020 /hotfix + ENH-044 phase-optional plumbing).
 * Verifies the /hotfix recipe ships to ALL THREE adapters at parity (command /
 * skill / workflow), that the recipe carries its load-bearing steps, and that
 * the phase-optional recipes (log / sync-docs / validate) + status template
 * were updated.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli, read, REPO_ROOT } = require('./_helpers');

function installInto(agent) {
  const tmp = mktmp(`momentum-adhoc-${agent}-`);
  const repo = path.join(tmp, 'proj');
  fs.mkdirSync(repo);
  const res = runCli(['init', repo, '--agent', agent]);
  assert.equal(res.status, 0, `init --agent ${agent} failed: ${res.stderr}`);
  return { tmp, repo };
}

test('/hotfix ships to all three adapters at parity', () => {
  // Claude Code → slash command
  let { tmp, repo } = installInto('claude-code');
  try {
    assert.ok(fs.existsSync(path.join(repo, '.claude', 'commands', 'hotfix.md')),
      'claude-code: .claude/commands/hotfix.md missing');
  } finally { rmrf(tmp); }

  // Codex → native skill
  ({ tmp, repo } = installInto('codex'));
  try {
    assert.ok(fs.existsSync(path.join(repo, '.agents', 'skills', 'hotfix', 'SKILL.md')),
      'codex: .agents/skills/hotfix/SKILL.md missing');
  } finally { rmrf(tmp); }

  // Antigravity → workflow
  ({ tmp, repo } = installInto('antigravity'));
  try {
    assert.ok(fs.existsSync(path.join(repo, '.agent', 'workflows', 'hotfix.md')),
      'antigravity: .agent/workflows/hotfix.md missing');
  } finally { rmrf(tmp); }
});

test('/hotfix recipe carries its load-bearing steps', () => {
  const recipe = read(path.join(REPO_ROOT, 'core', 'commands', 'hotfix.md'));
  // work types
  assert.match(recipe, /quick-task/);
  assert.match(recipe, /spike/);
  // Rule 14 escalation guard
  assert.match(recipe, /Rule 14|escalat/i);
  // ad-hoc record from the Group 0 template
  assert.match(recipe, /specs\/adhoc\/<id>\/record\.md/);
  assert.match(recipe, /_TEMPLATE\.md/);
  // Rule 12 evidence gate
  assert.match(recipe, /Verification Evidence/);
  // merge-approved sentinel (single-use, consumed by pre-push)
  assert.match(recipe, /\.momentum\/merge-approved/);
});

test('ENH-044: phase-optional recipes updated', () => {
  const log = read(path.join(REPO_ROOT, 'core', 'commands', 'log.md'));
  assert.match(log, /No active phase/i);
  assert.match(log, /specs\/adhoc/);

  const sync = read(path.join(REPO_ROOT, 'core', 'commands', 'sync-docs.md'));
  assert.match(sync, /No active phase|nothing to sync/i);

  const validate = read(path.join(REPO_ROOT, 'core', 'commands', 'validate.md'));
  assert.match(validate, /VALID state|valid.*between-phases|No active phase.*VALID/i);
});

test('ENH-044: status template has an Ad-hoc / Patch Releases section', () => {
  const tpl = read(path.join(REPO_ROOT, 'core', 'specs-templates', 'specs', 'status.md'));
  assert.match(tpl, /## Ad-hoc \/ Patch Releases/);
  // and a fresh install scaffolds it
  const { tmp, repo } = installInto('claude-code');
  try {
    const status = read(path.join(repo, 'specs', 'status.md'));
    assert.match(status, /## Ad-hoc \/ Patch Releases/);
  } finally { rmrf(tmp); }
});
