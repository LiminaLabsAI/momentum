'use strict';

/**
 * Phase 10 Group 4 — end-to-end smoke for the Claude Code adapter.
 */

const { test } = require('node:test');
const { runAdapterSmoke } = require('./helpers/adapter-smoke');

test('adapter smoke: claude-code — init / init --ecosystem / join / leave / doctor / ecosystem status', () => {
  runAdapterSmoke('claude-code', {
    primary: 'CLAUDE.md',
    commandsDir: ['.claude', 'commands'],
  });
});
