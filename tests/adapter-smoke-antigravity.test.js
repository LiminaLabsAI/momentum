'use strict';

/**
 * Phase 10 Group 4 — end-to-end smoke for the Antigravity adapter.
 * Phase 11 Group 5 — extended with orchestration scout/dispatch/handoff.
 *
 * Antigravity has chat-driven UI rather than slash commands, but the
 * orchestration CLI floor works identically. The slash-command overlay
 * assertions are skipped (slashCommandsExpected: false).
 */

const { test } = require('node:test');
const { runAdapterSmoke, runOrchestrationSmoke } = require('./helpers/adapter-smoke');

test('adapter smoke: antigravity — init / init --ecosystem / join / leave / doctor / ecosystem status', () => {
  runAdapterSmoke('antigravity', {
    primary: 'AGENTS.md',
    commandsDir: ['.agents', 'workflows'],
  });
});

test('orchestration smoke: antigravity — scout / dispatch / handoff / continue (CLI floor)', () => {
  runOrchestrationSmoke('antigravity', {
    primary: 'AGENTS.md',
    commandsDir: ['.agents', 'workflows'],
    slashCommandsExpected: false, // chat-driven UI; CLI is the canonical path
  });
});
