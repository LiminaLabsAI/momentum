'use strict';

/**
 * Phase 10 Group 4 — end-to-end smoke for the Codex adapter.
 * Phase 11 Group 5 — extended with orchestration scout/dispatch/handoff.
 * Phase 16 Group 1.8 — extended with /review-code overlay + .codex/agents/ TOMLs.
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

// Phase 16 G1.8 — Codex /review-code overlay + .codex/agents/ TOMLs install.
test('adapter smoke: codex — /review-code overlay + .codex/agents/ TOMLs install', () => {
  const target = mktmp('momentum-codex-review-');
  try {
    const r = runCli(['init', target, '--agent', 'codex']);
    assert.equal(r.status, 0, `init failed: ${r.stderr}`);
    assert.equal(
      fs.existsSync(path.join(target, '.codex', 'commands', 'review-code.md')),
      true,
      '/review-code overlay must install to .codex/commands/review-code.md',
    );
    for (const lens of ['security', 'qa', 'architecture']) {
      const toml = path.join(target, '.codex', 'agents', `momentum-reviewer-${lens}.toml`);
      assert.equal(fs.existsSync(toml), true, `expected ${toml}`);
    }
  } finally {
    rmrf(target);
  }
});
