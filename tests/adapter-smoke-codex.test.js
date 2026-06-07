'use strict';

/**
 * Phase 10 Group 4 — end-to-end smoke for the Codex adapter.
 */

const { test } = require('node:test');
const { runAdapterSmoke } = require('./helpers/adapter-smoke');

test('adapter smoke: codex — init / init --ecosystem / join / leave / doctor / ecosystem status', () => {
  runAdapterSmoke('codex', {
    primary: 'AGENTS.md',
    commandsDir: ['.codex', 'commands'],
  });
});
