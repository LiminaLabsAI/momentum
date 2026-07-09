'use strict';

/**
 * Phase 27 G2 — /complete-phase recipe gates. Guards the two release gates and
 * the default-branch-safe cleanup step against regression (they are recipe
 * TEXT, so a content assertion is the right level of test).
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT } = require('./_helpers');

const RECIPE = fs.readFileSync(
  path.join(REPO_ROOT, 'core', 'commands', 'complete-phase.md'),
  'utf8',
);

test('complete-phase keeps Gate A (Verification Evidence, Rule 12)', () => {
  assert.match(RECIPE, /Gate A \(Rule 12\)/);
  assert.match(RECIPE, /## Verification Evidence/);
});

test('complete-phase has Gate B (tracking-before-release)', () => {
  assert.match(RECIPE, /Gate B \(tracking-before-release\)/);
  assert.match(RECIPE, /release must never precede tracking/i);
  // the ordering check: tracking committed before the merge/tag
  assert.match(RECIPE, /git status --porcelain/);
});

test('complete-phase cleanup uses the default-branch-safe cleanup action, not a bare delete', () => {
  assert.match(RECIPE, /momentum lanes cleanup phase-N-shortname/);
  assert.match(RECIPE, /BUG-025 hijack/);
  // it must NOT have reverted to the old unconditional bare remote delete
  assert.doesNotMatch(RECIPE, /git push origin --delete phase-N-shortname/);
});
