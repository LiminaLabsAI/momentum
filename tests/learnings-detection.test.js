'use strict';

/**
 * Phase 34 G1 — the detector, scored against the FROZEN `recurring-patterns-v1`.
 *
 * The thresholds here are not tuned to whatever the detector happens to do.
 * They are read out of `expected.json`, which was committed in G0 before any of
 * this code existed. If a change to the detector makes a number fail, the number
 * is the fixed point — not the thing to adjust.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT } = require('./_helpers');

const BENCH = path.join(REPO_ROOT, 'tests', 'benchmarks', 'recurring-patterns-v1');
const expected = JSON.parse(fs.readFileSync(path.join(BENCH, 'expected.json'), 'utf8'));

const corpusLib = require(path.join(REPO_ROOT, 'core', 'learnings', 'lib', 'corpus'));
const patterns = require(path.join(REPO_ROOT, 'core', 'learnings', 'lib', 'patterns'));

const load = () => corpusLib.fromFixture(BENCH);
const classNamed = (r, n) => r.classes.find((c) => c.name === n);

test('SCORE recurrence: every known member of the class is found', () => {
  const result = patterns.detect(load());
  const cls = classNamed(result, 'recurrence');
  assert.ok(cls, 'the recurring class must be detected at all');

  const want = expected.tasks.recurrence.required;
  const missing = want.filter((id) => !cls.members.includes(id));
  assert.deepEqual(missing, [],
    `recall ${want.length - missing.length}/${want.length} — missed: ${missing.join(', ')}`);
});

test('SCORE stale-closure: required found, must-not-fire untouched', () => {
  const result = patterns.detect(load());
  const cls = classNamed(result, 'stale-closure');
  assert.ok(cls, 'the stale-closure class must be detected');

  const s = expected.tasks['stale-closure'];

  const missing = s.required.filter((id) => !cls.members.includes(id));
  assert.deepEqual(missing, [], `missed required: ${missing.join(', ')}`);

  // The precision half, and the one that encodes a real mistake. These three are
  // `resolved` and carry closing markers; only a correct read of their status
  // cell keeps them out. A parser that splits on every '|' promotes all three.
  const wrong = s.must_not_fire.filter((id) => cls.members.includes(id));
  assert.deepEqual(wrong, [],
    `false positives on already-resolved rows: ${wrong.join(', ')} — ` +
    'this is the exact error the 2026-07-28 manual audit made');
});

test('SCORE precision: no runaway classes', () => {
  const result = patterns.detect(load());
  const max = expected.tasks.recurrence.max_spurious_classes;
  const known = ['recurrence', 'stale-closure'];
  const spurious = result.classes.filter((c) => !known.includes(c.name));
  assert.ok(spurious.length <= max,
    `${spurious.length} spurious classes (max ${max}): ${spurious.map((c) => c.name).join(', ')}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// The honesty tests. The phase plan named the failure mode up front: "if the
// detector only finds what its authors already knew, it is a hardcoded lookup
// wearing a costume." These are what tell the difference.
// ─────────────────────────────────────────────────────────────────────────────

test('HONESTY: an empty corpus finds nothing', () => {
  assert.deepEqual(patterns.detect({ rows: [], markers: {}, prose: [] }).classes, []);
  assert.deepEqual(patterns.detect({}).classes, []);
  assert.deepEqual(patterns.detect(null).classes, []);
});

test('HONESTY: strip the declarations and the class collapses', () => {
  // If membership survives this, the ids are baked in somewhere and the recall
  // number above means nothing.
  const c = load();
  const stripped = {
    ...c,
    prose: c.prose.map((t) => t.replace(
      /\b(second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d+(st|nd|rd|th))\s+(instance|variant|occurrence|time)\b/gi,
      'REDACTED',
    )),
  };
  const cls = classNamed(patterns.detect(stripped), 'recurrence');
  assert.equal(cls, undefined,
    'with no declared recurrence in the text, there is no recurring class to report');
});

test('HONESTY: no member id is hardcoded in the detector', () => {
  // The cheapest possible check on the same question, and it catches the lazy
  // version of the mistake that the strip test catches the clever version of.
  const src = fs.readFileSync(
    path.join(REPO_ROOT, 'core', 'learnings', 'lib', 'patterns.js'), 'utf8');
  const ids = src.match(/\b(?:BUG|TD|ENH|FEAT|VAL)-\d+\b/g) || [];
  const inCode = ids.filter((id) => {
    // Ids inside comments are documentation; ids in code would be a lookup.
    const line = src.split('\n').find((l) => l.includes(id)) || '';
    return !/^\s*(\*|\/\/)/.test(line);
  });
  assert.deepEqual(inCode, [], `member ids in executable code: ${inCode.join(', ')}`);
});

test('HONESTY: the detector generalises to a class it has never seen', () => {
  // Synthetic, with ids that appear nowhere in momentum. If this fails, the
  // detector recognises momentum's history rather than the SHAPE of a recurrence.
  const invented = {
    rows: [],
    markers: {},
    prose: [
      '## Some other project\n\n' +
      'Third instance of the same shape (ZZZ-101 cache key, ZZZ-102 lock order, ' +
      'ZZZ-103 retry storm).\n',
    ],
  };
  // The id pattern is momentum's own convention, so use a real prefix to prove
  // the mechanism rather than the vocabulary.
  invented.prose[0] = invented.prose[0].replace(/ZZZ-/g, 'BUG-9');
  const cls = classNamed(patterns.detect(invented), 'recurrence');
  assert.ok(cls, 'a declared recurrence in unfamiliar text must still be found');
  assert.deepEqual(cls.members.sort(), ['BUG-9101', 'BUG-9102', 'BUG-9103']);
});

// ─────────────────────────────────────────────────────────────────────────────
// The parser, whose failure is the reason this subsystem exists
// ─────────────────────────────────────────────────────────────────────────────

test('the backlog parser honours escaped pipes', () => {
  const rows = corpusLib.parseBacklog(
    '| BUG-007 | Codex hooks `apply_patch\\|shell` misses every Bash call | P1 | resolved | x | d |\n',
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'BUG-007');
  assert.equal(rows[0].priority, 'P1', 'a pipe in the description must not shift the columns');
  assert.equal(rows[0].status, 'resolved');
  assert.equal(corpusLib.isOpen(rows[0]), false);
});

test('the naive split this replaces gets that row wrong', () => {
  // Kept as a live demonstration rather than a comment, so the reason the
  // parser is careful cannot quietly rot into "someone was being fussy".
  const line = '| BUG-007 | Codex hooks `apply_patch\\|shell` misses every Bash call | P1 | resolved | x | d |';
  const naive = line.split('|').map((s) => s.trim());
  assert.notEqual(naive[4], 'resolved',
    'if the naive split were correct, the careful parser would be pointless');
});
