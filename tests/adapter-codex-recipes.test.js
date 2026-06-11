'use strict';

/**
 * Phase 16 Rework G1.6 — Codex AGENTS.md recipe lookup pattern.
 *
 * Verifies that the rewritten AGENTS.md contains:
 *   - The "Momentum Recipes — Lookup Pattern" section
 *   - A row in the recipe table for every shipped recipe (core + overlay)
 *
 * The lookup pattern is Codex's substitute for native per-project slash
 * commands. AGENTS.md teaches the agent to find recipes by name and
 * follow them.
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

test('Codex AGENTS.md contains the Recipes Lookup Pattern section', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'codex']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    const agentsMd = fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf8');
    assert.match(
      agentsMd,
      /## Momentum Recipes — Lookup Pattern/,
      'AGENTS.md must contain the "Momentum Recipes — Lookup Pattern" section',
    );
    assert.match(
      agentsMd,
      /\.codex\/commands\/<name>\.md/,
      'AGENTS.md must reference the .codex/commands/<name>.md lookup path',
    );
  } finally {
    rmrf(target);
  }
});

test('Codex AGENTS.md recipe table mentions every shipped recipe', () => {
  const target = mktmp();
  try {
    const res = runCli(['init', target, '--agent', 'codex']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    const agentsMd = fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf8');
    const missing = [];
    for (const name of shippedRecipeNames()) {
      // Each recipe should be mentioned with its file path in the table.
      const pattern = new RegExp(`\\.codex/commands/${name}\\.md`);
      if (!pattern.test(agentsMd)) missing.push(name);
    }
    assert.equal(missing.length, 0, `AGENTS.md missing recipe rows for: ${missing.join(', ')}`);
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
    assert.match(agentsMd, /PreToolUse/);
    assert.match(agentsMd, /PostToolUse/);
    assert.match(agentsMd, /SessionStart/);
    assert.match(agentsMd, /features\.hooks/, 'AGENTS.md must instruct users on the features.hooks opt-in');
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
