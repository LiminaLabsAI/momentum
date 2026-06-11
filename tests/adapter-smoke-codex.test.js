'use strict';

/**
 * Phase 10 Group 4 — end-to-end smoke for the Codex adapter.
 * Phase 11 Group 5 — extended with orchestration scout/dispatch/handoff.
 * Phase 16 Rework G1.9 — extended with .codex/agents/ + .agents/skills/ install.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli } = require('./_helpers');
const { runAdapterSmoke, runOrchestrationSmoke } = require('./helpers/adapter-smoke');

test('adapter smoke: codex — init / init --ecosystem / join / leave / doctor / ecosystem status', () => {
  runAdapterSmoke('codex', {
    primary: 'AGENTS.md',
    commandsDir: ['.codex', 'commands'],
  });
});

test('orchestration smoke: codex — scout / dispatch / handoff / continue', () => {
  runOrchestrationSmoke('codex', {
    primary: 'AGENTS.md',
    commandsDir: ['.codex', 'commands'],
    slashCommandsExpected: true,
  });
});

// Phase 16 Rework G1.9 — new install path assertions
test('adapter smoke: codex — .codex/agents/ TOMLs + .agents/skills/momentum-orient install', () => {
  const target = mktmp('momentum-codex-rework-');
  try {
    const r = runCli(['init', target, '--agent', 'codex']);
    assert.equal(r.status, 0, `init failed: ${r.stderr}`);
    // 3 reviewer TOMLs
    for (const lens of ['security', 'qa', 'architecture']) {
      const toml = path.join(target, '.codex', 'agents', `momentum-reviewer-${lens}.toml`);
      assert.equal(fs.existsSync(toml), true, `expected ${toml}`);
    }
    // orient skill
    assert.equal(
      fs.existsSync(path.join(target, '.agents', 'skills', 'momentum-orient', 'SKILL.md')),
      true,
      'expected .agents/skills/momentum-orient/SKILL.md',
    );
    // AGENTS.md recipe table present
    const agentsMd = fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf8');
    assert.match(agentsMd, /## Momentum Recipes — Lookup Pattern/);
    assert.match(agentsMd, /\.codex\/commands\/brainstorm-phase\.md/);
  } finally {
    rmrf(target);
  }
});
