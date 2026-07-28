'use strict';

/**
 * Phase 34 G0 — the evaluator, guarded before the loop it scores exists.
 *
 * Rule 11: define the evaluation set, define the scalar, commit them, and only
 * then build the loop. This file is the "commit them" half made enforceable —
 * because an evaluator nobody checks is an evaluator that drifts, and a drifting
 * evaluator turns every score into an unfalsifiable claim.
 *
 * There is deliberately NO detector at this point in the phase. If anything here
 * imports `core/learnings/`, the ordering this phase depends on has been broken.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT } = require('./_helpers');

const BENCH = path.join(REPO_ROOT, 'tests', 'benchmarks', 'recurring-patterns-v1');
const expected = JSON.parse(fs.readFileSync(path.join(BENCH, 'expected.json'), 'utf8'));

test('the v1 evaluator is well-formed: two scored tasks, each with a known-good set', () => {
  assert.equal(expected.version, 'recurring-patterns-v1');
  assert.equal(expected.frozen, '2026-07-28');
  assert.ok(expected.scalar, 'the scalar must be stated, not implied');

  const { recurrence, 'stale-closure': stale } = expected.tasks;

  assert.equal(recurrence.class, 'ships-broken');
  assert.equal(recurrence.required.length, 6, 'six known members of the recurring class');
  assert.equal(typeof recurrence.max_spurious_classes, 'number',
    'precision must be bounded, not merely hoped for');

  assert.deepEqual(stale.required, ['TD-009', 'ENH-063']);
  assert.deepEqual(stale.ambiguous, ['TD-012', 'TD-013']);
  assert.deepEqual(stale.must_not_fire, ['BUG-007', 'BUG-027', 'BUG-028']);

  // The three sets must not overlap, or the scalar is not a number.
  const all = [...stale.required, ...stale.ambiguous, ...stale.must_not_fire];
  assert.equal(new Set(all).size, all.length, 'an id cannot be in two scoring buckets');
});

test('every id the evaluator scores is actually present in the corpus', () => {
  // A known-good answer naming a row that is not in the fixture is a benchmark
  // that cannot be satisfied, and the failure would look like a detector bug.
  const rows = fs.readFileSync(path.join(BENCH, 'corpus', 'stale-closure-rows.md'), 'utf8');
  const s = expected.tasks['stale-closure'];
  for (const id of [...s.required, ...s.ambiguous, ...s.must_not_fire]) {
    assert.ok(rows.includes(`| ${id} |`), `${id} is scored but absent from the corpus`);
  }

  const ships = fs.readFileSync(path.join(BENCH, 'corpus', 'ships-broken-rows.md'), 'utf8');
  const pattern = fs.readFileSync(path.join(BENCH, 'corpus', 'phase-33-pattern.md'), 'utf8');
  for (const id of expected.tasks.recurrence.required) {
    const present = ships.includes(`| ${id} |`) || pattern.toLowerCase().includes('phase 33');
    assert.ok(present, `${id} is scored but absent from the corpus`);
  }
});

test('the corpus contains the pipe-bearing rows that broke the manual audit', () => {
  // The whole reason must_not_fire exists. A detector that splits a backlog row
  // on every '|' misreads these three, which is exactly how the 2026-07-28 hand
  // audit reported seven stale entries with two P1s when it was four and zero.
  const rows = fs.readFileSync(path.join(BENCH, 'corpus', 'stale-closure-rows.md'), 'utf8');
  const bug007 = rows.split('\n').find((l) => l.startsWith('| BUG-007 |'));
  const bug028 = rows.split('\n').find((l) => l.startsWith('| BUG-028 |'));

  assert.ok(/apply_patch\\\|shell/.test(bug007),
    'BUG-007 must retain its escaped pipe — it is the fixture for the parsing failure');
  assert.ok(/Edit\\\|Write/.test(bug028),
    'BUG-028 must retain its escaped pipe');

  // And the naive parse must genuinely go wrong on them, or the fixture proves nothing.
  const naiveStatus = (line) => (line.split('|')[4] || '').trim();
  assert.notEqual(naiveStatus(bug007), 'resolved',
    'if a naive split got BUG-007 right, this fixture would not be testing anything');
});

test('the evaluator is FROZEN — corpus and expected answers match their checksums', () => {
  // Rule 11's "never change the evaluator while the loop is being optimized",
  // made mechanical. Editing a fixture to make a score look better now fails
  // here, in the same commit, instead of silently rebasing the score history.
  const sums = JSON.parse(fs.readFileSync(path.join(BENCH, 'CHECKSUMS.json'), 'utf8'));
  assert.ok(Object.keys(sums).length >= 5, 'every fixture must be covered');

  for (const [rel, want] of Object.entries(sums)) {
    const got = crypto.createHash('sha256')
      .update(fs.readFileSync(path.join(BENCH, rel)))
      .digest('hex');
    assert.equal(got, want,
      `${rel} has changed. If this is a deliberate methodology change, it is a v2 — ` +
      'a NEW directory with its own freeze date - not an edit to v1.');
  }
});

test('G0 ships no detector — the evaluator precedes the loop', () => {
  // The ordering IS the discipline. If this file can resolve a detector, the
  // evaluator was not written first and its independence is gone.
  assert.equal(fs.existsSync(path.join(REPO_ROOT, 'core', 'learnings', 'lib', 'patterns.js')), false,
    'patterns.js must not exist until G1 — Rule 11 requires the evaluator first');
});
