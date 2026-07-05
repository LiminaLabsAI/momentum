'use strict';

/**
 * Phase 22 G1 — opencode commands + skills shape.
 *
 * Recipes install via the standard overlay into `.opencode/commands/` where
 * each file IS a native slash command (filename → /<name>); the adapter's
 * `ensureCommandFrontmatter` transform prepends a `description` frontmatter
 * block for the TUI command picker (https://opencode.ai/docs/commands/).
 * Skills ship at `.opencode/skills/<name>/SKILL.md` with `name` +
 * `description` frontmatter (https://opencode.ai/docs/skills/).
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli, REPO_ROOT } = require('./_helpers');

const CORE_COMMANDS_DIR = path.join(REPO_ROOT, 'core', 'commands');
const OPENCODE_OVERLAY_DIR = path.join(REPO_ROOT, 'adapters', 'opencode', 'commands');
const SKILL_NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function shippedRecipeNames() {
  const names = new Set();
  for (const dir of [CORE_COMMANDS_DIR, OPENCODE_OVERLAY_DIR]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.startsWith('._') || f === '.DS_Store') continue;
      if (f.endsWith('.md')) names.add(f.replace(/\.md$/, ''));
    }
  }
  return [...names].sort();
}

function initOpencode() {
  const target = mktmp();
  const res = runCli(['init', target, '--agent', 'opencode']);
  assert.equal(res.status, 0, `init failed: ${res.stderr}`);
  return target;
}

test('every shipped recipe installs as a native opencode command with description frontmatter', () => {
  const target = initOpencode();
  try {
    const commandsDir = path.join(target, '.opencode', 'commands');
    const expected = shippedRecipeNames();
    assert.ok(expected.length >= 20, `expected >= 20 recipes, got ${expected.length}`);
    for (const name of expected) {
      const p = path.join(commandsDir, `${name}.md`);
      assert.ok(fs.existsSync(p), `missing command: .opencode/commands/${name}.md`);
      const body = fs.readFileSync(p, 'utf8');
      assert.match(
        body,
        /^---\ndescription: ".+"\n---\n\n/,
        `${name}.md must start with a description frontmatter block`,
      );
      // Idempotence: exactly one LEADING frontmatter block (recipes contain
      // `---` horizontal rules in their bodies, so don't count fences).
      assert.doesNotMatch(
        body,
        /^---\ndescription: ".+"\n---\n\n---\ndescription:/,
        `${name}.md must not be double-frontmattered`,
      );
    }
    const installed = fs
      .readdirSync(commandsDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/\.md$/, ''))
      .sort();
    assert.deepEqual(installed, expected, 'installed command set must equal shipped recipe set');
  } finally {
    rmrf(target);
  }
});

test('momentum-orient skill installs at .opencode/skills/ with valid frontmatter', () => {
  const target = initOpencode();
  try {
    const skillPath = path.join(target, '.opencode', 'skills', 'momentum-orient', 'SKILL.md');
    assert.ok(fs.existsSync(skillPath), 'missing .opencode/skills/momentum-orient/SKILL.md');
    const body = fs.readFileSync(skillPath, 'utf8');
    const nameMatch = body.match(/^name: (.+)$/m);
    assert.ok(nameMatch, 'SKILL.md must declare name frontmatter');
    assert.match(nameMatch[1].trim(), SKILL_NAME_RE, 'skill name must match opencode name regex');
    assert.match(body, /^description: .+$/m, 'SKILL.md must declare description frontmatter');
  } finally {
    rmrf(target);
  }
});

test('opencode AGENTS.md documents commands, skills, plugin, and agents surfaces', () => {
  const target = initOpencode();
  try {
    const agentsMd = fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf8');
    assert.match(agentsMd, /## Momentum Recipes — opencode Commands/);
    assert.match(agentsMd, /\.opencode\/commands\//);
    assert.match(agentsMd, /\.opencode\/skills\//);
    assert.match(agentsMd, /\.opencode\/plugins\/momentum\.js/);
    assert.match(agentsMd, /\.opencode\/agents\//);
    assert.doesNotMatch(agentsMd, /<Project Name>/, 'project name must be substituted');
  } finally {
    rmrf(target);
  }
});
