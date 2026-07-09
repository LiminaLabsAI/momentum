'use strict';

/**
 * Phase 26 — Project Preferences, Group 2.
 *
 * Guards that `/start-project` authors `specs/preferences.md` in its founding
 * batch (ADR-0009): the draft includes the preferences table, the approval
 * step shows it, the write step creates the file + refreshes the derived
 * cache, and the Preferences Format section documents the shape.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT } = require('./_helpers');
const body = fs.readFileSync(path.join(REPO_ROOT, 'core', 'commands', 'start-project.md'), 'utf8');

test('start-project.md: draft step includes preferences (specs/preferences.md) + points to the format', () => {
  const draft = body.slice(body.indexOf('3. **Draft the foundation'), body.indexOf('4. Present the founding draft'));
  assert.match(draft, /specs\/preferences\.md/, 'draft lists specs/preferences.md');
  assert.match(draft, /branch_flow/, 'draft references branch_flow');
  assert.match(draft, /Preferences Format/, 'draft points to the Preferences Format section');
});

test('start-project.md: approval step shows the preferences table + lists the file', () => {
  const approval = body.slice(body.indexOf('4. Present the founding draft'), body.indexOf('5. **On approval'));
  assert.match(approval, /preferences table/, 'approval shows the preferences table');
  assert.match(approval, /specs\/preferences\.md/, 'approval lists specs/preferences.md among created files');
});

test('start-project.md: write step authors specs/preferences.md + refreshes the cache', () => {
  const write = body.slice(body.indexOf('6. Write the foundation in one batch'), body.indexOf('7. Commit the founding'));
  assert.match(write, /specs\/preferences\.md/, 'write step creates specs/preferences.md');
  assert.match(write, /writePreferencesCache/, 'write step refreshes the derived cache for the pre-push hook');
});

test('start-project.md: Preferences Format section documents the shape (all keys)', () => {
  assert.match(body, /## Preferences Format/, 'Preferences Format section exists');
  const fmt = body.slice(body.indexOf('## Preferences Format'));
  assert.match(fmt, /type: Preferences/, 'format includes the OKF type line');
  // the full key set is documented in the format's example table
  for (const k of ['language', 'framework', 'test_command', 'build_command', 'publish_target', 'git_forge', 'release_command', 'release_flow', 'end_state', 'branch_flow', 'protected_branches']) {
    assert.match(fmt, new RegExp(`\\| ${k} \\|`), `format documents ${k}`);
  }
  assert.match(fmt, /ADR-0009/, 'format references ADR-0009 (trust layer invariant)');
});

test('start-project.md: founding overwrites the init-inferred preferences file (founding owns content)', () => {
  const write = body.slice(body.indexOf('6. Write the foundation in one batch'), body.indexOf('7. Commit the founding'));
  assert.match(write, /overwrite/i, 'founding overwrites the inferred file');
  assert.match(write, /momentum init/i, 'references the momentum init-inferred file');
  assert.match(write, /founding owns the content/i, 'founding owns the content');
});
