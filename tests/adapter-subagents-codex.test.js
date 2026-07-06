'use strict';

/**
 * Phase 16 Rework G1.7 — Codex subagent overlay smoke.
 *
 * Asserts the three momentum reviewer TOMLs install at .codex/agents/
 * with required schema fields AND `sandbox_mode = "read-only"`.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli, exists } = require('./_helpers');

const EXPECTED = [
  'momentum-reviewer-security',
  'momentum-reviewer-qa',
  'momentum-reviewer-architecture',
];

test('codex install ships the three reviewer subagents at .codex/agents/', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'codex']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    for (const subagent of EXPECTED) {
      const file = path.join(target, '.codex', 'agents', `${subagent}.toml`);
      assert.equal(exists(file), true, `expected ${subagent}.toml`);
      const content = fs.readFileSync(file, 'utf8');
      for (const key of ['name', 'description', 'developer_instructions', 'sandbox_mode']) {
        assert.match(content, new RegExp(`^${key}\\s*=`, 'm'), `${subagent} missing key "${key}"`);
      }
      assert.match(
        content,
        /sandbox_mode\s*=\s*"read-only"/,
        `${subagent} must set sandbox_mode = "read-only" (reviewers cannot modify files)`,
      );
    }
  } finally {
    rmrf(target);
  }
});

test('codex install ships the momentum-orient skill at .agents/skills/', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'codex']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    const skillPath = path.join(target, '.agents', 'skills', 'momentum-orient', 'SKILL.md');
    assert.equal(exists(skillPath), true, `expected ${skillPath}`);
    const content = fs.readFileSync(skillPath, 'utf8');
    assert.match(content, /^---\s*$/m, 'SKILL.md must have YAML frontmatter');
    assert.match(content, /name:\s*momentum-orient/);
    assert.match(content, /description:/);
    assert.match(content, /specs\/status\.md/, 'orient skill must mention specs/status.md');
  } finally {
    rmrf(target);
  }
});
