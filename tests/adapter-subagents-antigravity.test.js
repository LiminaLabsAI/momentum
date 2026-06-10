'use strict';

/**
 * Phase 16 G2.8 — Antigravity subagent + skill overlay smoke.
 *
 * Verifies that `momentum init --agent antigravity` installs the three
 * momentum reviewer subagents into `.agents/agents/` and at least one
 * skill into `.agents/skills/<name>/SKILL.md`, all with the required
 * schema fields populated.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli, exists } = require('./_helpers');

const EXPECTED_AGENTS = [
  'momentum-reviewer-security',
  'momentum-reviewer-qa',
  'momentum-reviewer-architecture',
];

const REQUIRED_AGENT_KEYS = ['name', 'description', 'developer_instructions'];

test('init --agent antigravity installs the reviewer subagents to .agents/agents/', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'antigravity']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);

    for (const subagent of EXPECTED_AGENTS) {
      const file = path.join(target, '.agents', 'agents', `${subagent}.toml`);
      assert.equal(
        exists(file),
        true,
        `expected ${subagent}.toml at ${file} after init`,
      );
      const content = fs.readFileSync(file, 'utf8');
      for (const key of REQUIRED_AGENT_KEYS) {
        const pattern = new RegExp(`^${key}\\s*=`, 'm');
        assert.match(
          content,
          pattern,
          `${subagent}.toml missing required key "${key}"`,
        );
      }
    }
  } finally {
    rmrf(target);
  }
});

test('init --agent antigravity installs momentum-orient skill to .agents/skills/', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'antigravity']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);

    const skill = path.join(target, '.agents', 'skills', 'momentum-orient', 'SKILL.md');
    assert.equal(exists(skill), true, `expected SKILL.md at ${skill}`);
    const content = fs.readFileSync(skill, 'utf8');
    assert.match(
      content,
      /^---[\s\S]*?\bname:\s*momentum-orient\b[\s\S]*?\bdescription:[\s\S]*?---/m,
      'SKILL.md must have a frontmatter block with name and description',
    );
    assert.match(
      content,
      /specs\/status\.md/,
      'momentum-orient SKILL must mention specs/status.md (the orient-first contract)',
    );
  } finally {
    rmrf(target);
  }
});

test('init --agent antigravity installs hooks.json + /review-code overlay at .agents/', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'antigravity']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);

    assert.equal(
      exists(path.join(target, '.agents', 'hooks.json')),
      true,
      '.agents/hooks.json must be installed by the antigravity runInstall',
    );
    assert.equal(
      exists(path.join(target, '.agents', 'commands', 'review-code.md')),
      true,
      '/review-code overlay must install to .agents/commands/review-code.md',
    );

    const hooks = JSON.parse(
      fs.readFileSync(path.join(target, '.agents', 'hooks.json'), 'utf8'),
    );
    assert.ok(
      Array.isArray(hooks.hooks && hooks.hooks.PostToolUse),
      'hooks.json must declare a PostToolUse entry',
    );
    const hasHistoryReminder = hooks.hooks.PostToolUse.some((entry) =>
      (entry.hooks || []).some((h) =>
        /check-history-reminder\.sh/.test(h.command || ''),
      ),
    );
    assert.ok(
      hasHistoryReminder,
      'PostToolUse must wire check-history-reminder.sh',
    );
    // The .antigravity/ path must NOT exist after the rewire.
    assert.equal(
      exists(path.join(target, '.antigravity')),
      false,
      '.antigravity/ must not be created by init after Phase 16 realignment',
    );
  } finally {
    rmrf(target);
  }
});
