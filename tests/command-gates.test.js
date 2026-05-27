'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { read, REPO_ROOT } = require('./_helpers');

const COMMANDS_DIR = path.join(REPO_ROOT, 'core', 'commands');

const GATED_COMMANDS = [
  'brainstorm-phase.md',
  'brainstorm-idea.md',
  'start-project.md',
];

for (const file of GATED_COMMANDS) {
  const filePath = path.join(COMMANDS_DIR, file);

  test(`${file} contains the Brainstorm Gate Contract section`, () => {
    const content = read(filePath);
    assert.match(content, /## Brainstorm Gate Contract/);
  });

  test(`${file} creates the sentinel on entry`, () => {
    const content = read(filePath);
    assert.match(
      content,
      /mkdir -p \.momentum && touch \.momentum\/brainstorm-active/
    );
  });

  test(`${file} removes the sentinel before/after approval`, () => {
    const content = read(filePath);
    assert.match(content, /rm \.momentum\/brainstorm-active/);
  });

  test(`${file} has the red-flags table`, () => {
    const content = read(filePath);
    assert.match(content, /Red flags — STOP and stay in conversation/);
  });

  test(`${file} has anti-rationalization counters`, () => {
    const content = read(filePath);
    assert.match(content, /Anti-rationalization/);
  });
}

// ---------------------------------------------------------------------------
// Hook configuration sanity — settings.json registers the PreToolUse hook
// ---------------------------------------------------------------------------
test('claude-code settings.json registers the brainstorm-gate PreToolUse hook', () => {
  const settingsPath = path.join(
    REPO_ROOT,
    'adapters',
    'claude-code',
    'settings.json'
  );
  const content = read(settingsPath);
  const settings = JSON.parse(content);

  assert.ok(settings.hooks, 'expected hooks key');
  assert.ok(Array.isArray(settings.hooks.PreToolUse), 'expected PreToolUse array');

  const pre = settings.hooks.PreToolUse;
  const gate = pre.find(entry => {
    if (!Array.isArray(entry.hooks)) return false;
    return entry.hooks.some(h => /brainstorm-gate\.sh/.test(h.command || ''));
  });

  assert.ok(gate, 'expected an entry whose hook command references brainstorm-gate.sh');
  assert.match(gate.matcher, /Write/);
  assert.match(gate.matcher, /Edit/);
  assert.match(gate.matcher, /MultiEdit/);
});

test('claude-code settings.json preserves the existing PostToolUse history-reminder hook', () => {
  const settingsPath = path.join(
    REPO_ROOT,
    'adapters',
    'claude-code',
    'settings.json'
  );
  const settings = JSON.parse(read(settingsPath));

  assert.ok(Array.isArray(settings.hooks.PostToolUse), 'PostToolUse array preserved');
  const reminderEntry = settings.hooks.PostToolUse.find(entry =>
    (entry.hooks || []).some(h =>
      /check-history-reminder\.sh/.test(h.command || '')
    )
  );
  assert.ok(reminderEntry, 'history-reminder hook should be preserved');
});
