'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { read, REPO_ROOT } = require('./_helpers');

const START_PHASE = path.join(REPO_ROOT, 'core', 'commands', 'start-phase.md');

test('start-phase.md contains the Autonomous Execution Contract section', () => {
  const content = read(START_PHASE);
  assert.match(content, /## Autonomous Execution Contract/);
});

test('start-phase.md declares the hard stop at merge + release (preference-aware)', () => {
  const content = read(START_PHASE);
  assert.match(content, /### Hard stop — always/);
  // Phase 26 (ADR-0009): the gate reads end_state + branch_flow from config
  // and stops at the universal git primitives (merge + tag), not a forge release.
  assert.match(content, /Merge to a protected branch \+ release/);
  assert.match(content, /specs\/config\.md/);
  assert.match(content, /end_state/);
  assert.match(content, /branch_flow/);
  assert.ok(!/create the GitHub Release/i.test(content), 'no forge-specific "GitHub Release" gate step (BUG-024)');
});

test('start-phase.md lists pre-authorized actions', () => {
  const content = read(START_PHASE);
  assert.match(content, /Pre-authorized actions/);
  assert.match(content, /Create the phase feature branch/);
  assert.match(content, /Commit per the conventional commit style/);
  assert.match(content, /Push the phase branch to origin/);
});

test('start-phase.md has the anti-pattern table', () => {
  const content = read(START_PHASE);
  assert.match(content, /Anti-patterns — DO NOT/);
  assert.match(content, /should I commit Group N now\?/);
  assert.match(content, /ready for Group 1\?/);
});

test('start-phase.md cross-references Rules 6, 8, 12', () => {
  const content = read(START_PHASE);
  assert.match(content, /Rule 6 \(Git Lifecycle\)/);
  assert.match(content, /Rule 8 \(History\)/);
  assert.match(content, /Rule 12 \(Verify Before Claim\)/);
});

test('start-phase.md has the per-group execution loop section', () => {
  const content = read(START_PHASE);
  assert.match(content, /After Setup: Execute the Plan Autonomously/);
  assert.match(content, /Mark the group's first task `\[\/\]`/);
  assert.match(content, /Run the group's verification command/);
});

test('start-phase.md keeps the original setup steps', () => {
  const content = read(START_PHASE);
  // Setup heading present
  assert.match(content, /Setup Steps \(run once at phase start\)/);
  // Key setup actions still listed
  assert.match(content, /Read `specs\/status\.md`/);
  assert.match(content, /Scan `specs\/backlog\/backlog\.md`/);
  assert.match(content, /Set phase metadata \(OKF bundle, ADR-0005\)/); // renamed from "Build phase topic index" in Phase 24
  assert.match(content, /Create git branch and initial commit/);
});
