'use strict';

/**
 * Phase 26 — Project Config, Group 2.
 *
 * Guards that the recipe templates are preference-aware: they read
 * `specs/config.md` and adapt gate copy, verification commands, and the
 * merge/release walk to the project's `end_state`, `branch_flow`,
 * `test_command`, and `build_command` (ADR-0009). Content-assertion tests on
 * the markdown the agent follows — they catch regression if preference
 * wiring is removed.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT } = require('./_helpers');
const readCmd = (name) => fs.readFileSync(path.join(REPO_ROOT, 'core', 'commands', name), 'utf8');

test('start-phase.md: hard-stop reads end_state + branch_flow from config', () => {
  const body = readCmd('start-phase.md');
  const hardStop = body.slice(body.indexOf('### Hard stop'));
  assert.match(hardStop, /specs\/config\.md/, 'hard-stop reads specs/config.md');
  assert.match(hardStop, /end_state/, 'hard-stop branches on end_state');
  assert.match(hardStop, /branch_flow/, 'hard-stop uses branch_flow');
  // all three end_states are handled
  assert.match(hardStop, /merge-after-yes/);
  assert.match(hardStop, /staging-promotion/);
  assert.match(hardStop, /feature-branch-only/);
});

test('complete-phase.md: step 3 reads test_command + build_command from config', () => {
  const body = readCmd('complete-phase.md');
  const step3 = body.slice(body.indexOf('3. **Run project-specific'), body.indexOf('4. If this phase'));
  assert.match(step3, /specs\/config\.md/, 'step 3 reads specs/config.md');
  assert.match(step3, /test_command/, 'step 3 uses test_command');
  assert.match(step3, /build_command/, 'step 3 uses build_command');
  assert.match(step3, /npm test/, 'step 3 declares the npm test fallback');
});

test('complete-phase.md: release step 9-10 walks branch_flow in order', () => {
  const body = readCmd('complete-phase.md');
  const release = body.slice(body.indexOf('9. Ask the user ONCE'));
  assert.match(release, /branch_flow/, 'release walks branch_flow');
  assert.match(release, /branch_flow\[0\]/, 'release references branch_flow[0]');
  assert.match(release, /branch_flow\[1\]/, 'release references branch_flow[1]');
  // default documented
  assert.match(release, /staging.*main|main.*staging/, 'default branch_flow documented');
});

test('brainstorm-phase.md: reads verification defaults from config', () => {
  const body = readCmd('brainstorm-phase.md');
  const step2b = body.slice(body.indexOf('2b. Read verification defaults'), body.indexOf('3. Define scope'));
  assert.match(step2b, /specs\/config\.md/, 'brainstorm-phase reads specs/config.md');
  assert.match(step2b, /test_command/, 'brainstorm-phase uses test_command as the default');
  assert.match(step2b, /build_command/, 'brainstorm-phase uses build_command as the default');
});

test('brainstorm-idea.md: config discovery questions gathered in-conversation', () => {
  const body = readCmd('brainstorm-idea.md');
  const step4b = body.slice(body.indexOf('4b. **Config discovery**'), body.indexOf('5. **Exit the brainstorm gate**'));
  assert.match(step4b, /Git forge|git_forge/i, 'asks forge');
  assert.match(step4b, /Language|language/i, 'asks language/framework');
  assert.match(step4b, /Publish|publish_target/i, 'asks publish/deploy target');
  assert.match(step4b, /Branch flow|branch_flow/i, 'asks branch flow');
  assert.match(step4b, /specs\/config\.md/, 'references specs/config.md');
});
