'use strict';

/**
 * Codex recipes-as-skills (ENH-036).
 *
 * Each momentum recipe ships as a native Codex skill at
 * `.agents/skills/<name>/SKILL.md` with `name` + `description` frontmatter
 * (https://developers.openai.com/codex/skills). AGENTS.md documents the
 * shipped recipe set so users know what's available; the lookup-by-path
 * pattern from v0.19.0 is gone — Codex auto-discovers skills directly.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli, REPO_ROOT } = require('./_helpers');

const CORE_COMMANDS_DIR = path.join(REPO_ROOT, 'core', 'commands');
const CODEX_OVERLAY_DIR = path.join(REPO_ROOT, 'adapters', 'codex', 'commands');

function shippedRecipeNames() {
  const names = new Set();
  for (const dir of [CORE_COMMANDS_DIR, CODEX_OVERLAY_DIR]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      // Skip macOS AppleDouble sidecars (BUG-003 pattern)
      if (f.startsWith('._') || f === '.DS_Store') continue;
      if (f.endsWith('.md')) names.add(f.replace(/\.md$/, ''));
    }
  }
  return [...names].sort();
}

test('Codex AGENTS.md frames recipes as skills (not lookup fragments)', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'codex']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    const agentsMd = fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf8');
    assert.match(
      agentsMd,
      /## Momentum Recipes — Codex Skills/,
      'AGENTS.md must contain the "Momentum Recipes — Codex Skills" section',
    );
    assert.match(
      agentsMd,
      /\.agents\/skills\//,
      'AGENTS.md must reference the .agents/skills/ canonical skill path',
    );
    assert.doesNotMatch(
      agentsMd,
      /\.codex\/commands\/<name>\.md/,
      'AGENTS.md must NOT reference the legacy .codex/commands/<name>.md lookup path',
    );
  } finally {
    rmrf(target);
  }
});

test('Codex install generates one SKILL.md per shipped recipe', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'codex']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);

    // Every recipe must materialize as a skill on disk.
    const missing = [];
    for (const name of shippedRecipeNames()) {
      const skillPath = path.join(target, '.agents', 'skills', name, 'SKILL.md');
      if (!fs.existsSync(skillPath)) {
        missing.push(name);
        continue;
      }
      const content = fs.readFileSync(skillPath, 'utf8');
      // Each SKILL.md must carry the required frontmatter pair.
      if (!new RegExp(`^---\\nname: ${name}\\n`, 'm').test(content)) {
        missing.push(`${name} (missing frontmatter name)`);
      }
      if (!/^description: /m.test(content)) {
        missing.push(`${name} (missing frontmatter description)`);
      }
    }
    assert.equal(missing.length, 0, `Skill generation gaps: ${missing.join(', ')}`);

    // momentum-orient is shipped via the overlay (not the recipe transform);
    // it must still be there alongside the generated skills.
    assert.ok(
      fs.existsSync(path.join(target, '.agents', 'skills', 'momentum-orient', 'SKILL.md')),
      'momentum-orient skill (overlay) must coexist with generated recipe skills',
    );
  } finally {
    rmrf(target);
  }
});

test('Codex install removes the legacy .codex/commands/ directory', () => {
  // After the transform, the lookup directory is replaced by skills entirely.
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'codex']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    assert.equal(
      fs.existsSync(path.join(target, '.codex', 'commands')),
      false,
      '.codex/commands/ must be removed once recipes ship as skills',
    );
  } finally {
    rmrf(target);
  }
});

test('Codex AGENTS.md documents the Hooks event table with apply_patch matcher', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'codex']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    const agentsMd = fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf8');
    assert.match(agentsMd, /apply_patch/, 'AGENTS.md must mention apply_patch (Codex tool name)');
    assert.match(agentsMd, /\\\|Bash/, 'AGENTS.md must document Bash as the canonical shell tool_name');
    assert.match(agentsMd, /PreToolUse/);
    assert.match(agentsMd, /PostToolUse/);
    assert.match(agentsMd, /SessionStart/);
    assert.match(
      agentsMd,
      /\/hooks/,
      'AGENTS.md must reference the /hooks trust-review flow (project hooks require per-hook trust approval)'
    );
  } finally {
    rmrf(target);
  }
});

test('Codex AGENTS.md preserves Project Extensions marker', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'codex']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    const agentsMd = fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf8');
    assert.match(agentsMd, /## Project Extensions/);
  } finally {
    rmrf(target);
  }
});
