'use strict';

/**
 * Phase 10 Group 4 — end-to-end smoke for the Codex adapter.
 * Phase 11 Group 5 — extended with orchestration scout/dispatch/handoff.
 */

const { test } = require('node:test');
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
