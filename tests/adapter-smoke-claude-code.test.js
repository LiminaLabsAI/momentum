'use strict';

/**
 * Phase 10 Group 4 — end-to-end smoke for the Claude Code adapter.
 * Phase 11 Group 5 — extended with orchestration scout/dispatch/handoff.
 */

const { test } = require('node:test');
const { runAdapterSmoke, runOrchestrationSmoke } = require('./helpers/adapter-smoke');

test('adapter smoke: claude-code — init / init --ecosystem / join / leave / doctor / ecosystem status', () => {
  runAdapterSmoke('claude-code', {
    primary: 'CLAUDE.md',
    commandsDir: ['.claude', 'commands'],
  });
});

test('orchestration smoke: claude-code — scout / dispatch / handoff / continue', () => {
  runOrchestrationSmoke('claude-code', {
    primary: 'CLAUDE.md',
    commandsDir: ['.claude', 'commands'],
    slashCommandsExpected: true,
  });
});
