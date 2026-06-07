'use strict';

/**
 * Phase 10 Group 4 — end-to-end smoke for the Antigravity adapter.
 *
 * Antigravity has chat-driven UI rather than slash commands, but ships
 * the same command recipes under `.antigravity/commands/` for tool
 * guidance. The Phase 10 CLI surface works identically.
 */

const { test } = require('node:test');
const { runAdapterSmoke } = require('./helpers/adapter-smoke');

test('adapter smoke: antigravity — init / init --ecosystem / join / leave / doctor / ecosystem status', () => {
  runAdapterSmoke('antigravity', {
    primary: 'AGENTS.md',
    commandsDir: ['.antigravity', 'commands'],
  });
});
