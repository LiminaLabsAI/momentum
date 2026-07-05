'use strict';

/**
 * Phase 16 Rework G2.8 — Antigravity skills smoke.
 *
 * Asserts the 4 momentum skills install as directories at .agents/skills/
 * with SKILL.md + YAML frontmatter (name + description).
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli, exists } = require('./_helpers');

const EXPECTED_SKILLS = [
  'momentum-orient',
  'momentum-reviewer-security',
  'momentum-reviewer-qa',
  'momentum-reviewer-architecture',
];

test('antigravity install ships all 4 momentum skills at .agents/skills/<name>/SKILL.md', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'antigravity']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    for (const skill of EXPECTED_SKILLS) {
      const file = path.join(target, '.agents', 'skills', skill, 'SKILL.md');
      assert.equal(exists(file), true, `expected ${file}`);
    }
  } finally {
    rmrf(target);
  }
});

test('antigravity skills have YAML frontmatter with name + description', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'antigravity']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    for (const skill of EXPECTED_SKILLS) {
      const file = path.join(target, '.agents', 'skills', skill, 'SKILL.md');
      const content = fs.readFileSync(file, 'utf8');
      assert.match(
        content,
        /^---[\s\S]*?name:\s*\S[\s\S]*?description:[\s\S]*?---/,
        `${skill}/SKILL.md must have YAML frontmatter with name AND description`,
      );
      const nameMatch = content.match(/^name:\s*(\S+)/m);
      assert.ok(nameMatch, `${skill}/SKILL.md frontmatter must declare name:`);
      assert.equal(nameMatch[1], skill, `${skill}/SKILL.md name: must equal directory name`);
    }
  } finally {
    rmrf(target);
  }
});

test('antigravity install ships hooks.json at .agents/hooks.json', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'antigravity']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    const hooksPath = path.join(target, '.agents', 'hooks.json');
    assert.equal(exists(hooksPath), true, `expected ${hooksPath}`);
    const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
    // Phase 22b (ADR-0006): vendor named-group schema, five-event surface.
    assert.ok(Array.isArray(hooks['momentum-brainstorm-gate'].PreToolUse));
    assert.ok(Array.isArray(hooks['momentum-history-reminder'].PostToolUse));
    assert.ok(Array.isArray(hooks['momentum-session-context'].PreInvocation));
    assert.ok(!('SessionStart' in JSON.parse(fs.readFileSync(hooksPath, 'utf8'))), 'no SessionStart on Antigravity');
  } finally {
    rmrf(target);
  }
});
