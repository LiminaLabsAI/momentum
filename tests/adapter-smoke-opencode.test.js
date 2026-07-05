'use strict';

/**
 * Phase 22 G4 — end-to-end smoke for the opencode adapter.
 *
 * Mirrors adapter-smoke-codex.test.js: init / init --ecosystem / join /
 * leave / doctor / ecosystem status, plus the orchestration surface, plus
 * opencode-native install path assertions (agents, plugin, skills).
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli } = require('./_helpers');
const { runAdapterSmoke, runOrchestrationSmoke } = require('./helpers/adapter-smoke');

// Recipes ship as native opencode commands at .opencode/commands/<name>.md.
const opencodeRecipePath = (name) => ['.opencode', 'commands', `${name}.md`];

test('adapter smoke: opencode — init / init --ecosystem / join / leave / doctor / ecosystem status', () => {
  runAdapterSmoke('opencode', {
    primary: 'AGENTS.md',
    recipePath: opencodeRecipePath,
  });
});

test('orchestration smoke: opencode — scout / dispatch / handoff / continue', () => {
  runOrchestrationSmoke('opencode', {
    primary: 'AGENTS.md',
    recipePath: opencodeRecipePath,
    slashCommandsExpected: true,
  });
});

test('adapter smoke: opencode — agents + plugin + skills install paths', () => {
  const target = mktmp('momentum-opencode-smoke-');
  try {
    const r = runCli(['init', target, '--agent', 'opencode']);
    assert.equal(r.status, 0, `init failed: ${r.stderr}`);
    for (const lens of ['security', 'qa', 'architecture']) {
      assert.ok(
        fs.existsSync(path.join(target, '.opencode', 'agents', `momentum-reviewer-${lens}.md`)),
        `missing reviewer agent: ${lens}`,
      );
    }
    assert.ok(fs.existsSync(path.join(target, '.opencode', 'agents', 'swarm-supervisor.md')));
    assert.ok(fs.existsSync(path.join(target, '.opencode', 'plugins', 'momentum.js')));
    assert.ok(
      fs.existsSync(path.join(target, '.opencode', 'skills', 'momentum-orient', 'SKILL.md')),
    );
    // No opencode.json is ever shipped — user config stays user-owned.
    assert.ok(
      !fs.existsSync(path.join(target, 'opencode.json')),
      'momentum must not ship opencode.json',
    );
    assert.ok(
      !fs.existsSync(path.join(target, '.opencode', 'opencode.json')),
      'momentum must not ship .opencode/opencode.json',
    );
  } finally {
    rmrf(target);
  }
});
