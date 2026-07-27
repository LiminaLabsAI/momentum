'use strict';

/**
 * Phase 32a G1 — the decision-authority classifier (ADR-0019).
 *
 * The classification table is the contract, so it is tested exhaustively: every
 * trigger in isolation, triggers in combination, the widen-only override rule,
 * and — most importantly — the ambiguous fall-through, which is the DEFAULT
 * path and therefore the one most likely to ship untested.
 */

const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT } = require('./_helpers');

const authority = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'authority'));
const { classify, AUTHORITY, REASON } = authority;

// ─────────────────────────────────────────────────────────────────────────────
// Each Rule 14 trigger, in isolation
// ─────────────────────────────────────────────────────────────────────────────

test('architecture specs are always the operator\'s', () => {
  const r = classify({ paths: ['specs/architecture/data-model.md'] });
  assert.equal(r.authority, AUTHORITY.OPERATOR);
  assert.equal(r.trigger, 'architecture-specs');
  assert.equal(r.reason, REASON.OPERATOR_AUTHORITY);
});

test('trust-layer paths are always the operator\'s', () => {
  for (const p of ['specs/config.md', 'core/git-hooks/pre-push.sh', '.githooks/contract.js']) {
    const r = classify({ paths: [p] });
    assert.equal(r.authority, AUTHORITY.OPERATOR, p);
    assert.equal(r.trigger, 'trust-layer', p);
  }
});

test('public contracts are the operator\'s — CLI, schemas, package manifest', () => {
  for (const p of ['bin/run.js', 'core/run/schema/run.schema.json', 'package.json', 'core/run/CONTRACT.md']) {
    const r = classify({ paths: [p] });
    assert.equal(r.authority, AUTHORITY.OPERATOR, p);
    assert.equal(r.trigger, 'public-contract', p);
  }
});

test('a needs-ADR flag is the operator\'s — Rule 10 puts the ADR before the change', () => {
  const r = classify({ paths: ['core/lib/thing.js'], flags: { needs_adr: true } });
  assert.equal(r.authority, AUTHORITY.OPERATOR);
  assert.equal(r.trigger, 'needs-adr');
});

test('a dependency change is the operator\'s', () => {
  const r = classify({ paths: ['core/lib/thing.js'], flags: { dependency_change: true } });
  assert.equal(r.authority, AUTHORITY.OPERATOR);
  assert.equal(r.trigger, 'dependency-change');
});

test('displacing planned work is the operator\'s — it changes what they approved', () => {
  const r = classify({ paths: ['core/lib/thing.js'], flags: { displaces_planned_work: true } });
  assert.equal(r.authority, AUTHORITY.OPERATOR);
  assert.equal(r.trigger, 'displaces-planned-work');
});

test('more than ~5 production files trips Rule 14\'s escalation threshold', () => {
  const five = ['a', 'b', 'c', 'd', 'e'].map((n) => `core/lib/${n}.js`);
  assert.equal(classify({ paths: five }).authority, AUTHORITY.AGENT,
    'exactly 5 is at the limit, not above it');

  const six = five.concat(['core/lib/f.js']);
  const r = classify({ paths: six });
  assert.equal(r.authority, AUTHORITY.OPERATOR);
  assert.equal(r.trigger, 'production-file-count');
});

// ─────────────────────────────────────────────────────────────────────────────
// The file-count trigger counts PRODUCTION blast radius, not volume of work
// ─────────────────────────────────────────────────────────────────────────────

test('tests, specs and docs do not count toward the file threshold', () => {
  // Counting these would park every well-behaved phase — an autonomous run is
  // SUPPOSED to produce tests and specs in volume.
  const paths = [
    'tests/a.test.js', 'tests/b.test.js', 'tests/c.test.js',
    'specs/phases/phase-32a-governor/tasks.md', 'specs/changelog/2026-07.md',
    'docs/developer-guide.md', 'site/src/pages/index.astro',
    'core/lib/one.js',
  ];
  const r = classify({ paths });
  assert.equal(r.authority, AUTHORITY.AGENT);
});

test('path normalization cannot be used to slip past a floor trigger', () => {
  for (const p of ['./specs/architecture/x.md', '/specs/architecture/x.md', 'specs\\architecture\\x.md']) {
    const r = classify({ paths: [p] });
    assert.equal(r.authority, AUTHORITY.OPERATOR, p);
    assert.equal(r.trigger, 'architecture-specs', p);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// The default path — the one most likely to ship untested
// ─────────────────────────────────────────────────────────────────────────────

test('an unassessable change set parks rather than guessing', () => {
  // ADR-0019 §4. Absence of evidence is never read as evidence of safety.
  for (const bad of [undefined, null, {}, { paths: [] }, { paths: [], flags: {} }, 'nonsense']) {
    const r = classify(bad);
    assert.equal(r.authority, AUTHORITY.PARK, JSON.stringify(bad));
    assert.equal(r.reason, REASON.AMBIGUOUS, JSON.stringify(bad));
    assert.equal(r.trigger, null);
  }
});

test('an assessable change with no trigger firing is the agent\'s', () => {
  const r = classify({ paths: ['core/lib/formatter.js', 'core/lib/util.js'] });
  assert.equal(r.authority, AUTHORITY.AGENT);
  assert.equal(r.reason, REASON.WITHIN_BOUNDARY);
  assert.equal(r.trigger, null);
});

test('the audit record carries the negative evidence', () => {
  // "Why did it decide that alone?" is answerable only if we recorded which
  // triggers were checked and did NOT fire.
  const r = classify({ paths: ['core/lib/formatter.js'] });
  assert.ok(r.triggersEvaluated.length >= 5);
  assert.ok(r.triggersEvaluated.includes('architecture-specs'));
  assert.ok(r.triggersEvaluated.includes('trust-layer'));
});

test('classification is pure — same input, same output, no hidden state', () => {
  const input = { paths: ['core/lib/a.js'], flags: {} };
  const a = classify(input);
  const b = classify(input);
  const c = classify({ paths: ['core/lib/a.js'], flags: {} });
  assert.deepEqual(a, b);
  assert.deepEqual(a, c);
});

// ─────────────────────────────────────────────────────────────────────────────
// Combination + precedence
// ─────────────────────────────────────────────────────────────────────────────

test('the first firing trigger wins, and floor triggers are evaluated first', () => {
  // A change touching both architecture specs and 20 production files should
  // report the architecture trigger — the more specific, floor-level reason.
  const paths = ['specs/architecture/x.md'].concat(
    Array.from({ length: 20 }, (_, i) => `core/lib/f${i}.js`)
  );
  const r = classify({ paths });
  assert.equal(r.trigger, 'architecture-specs');
});

test('flags and paths combine — either alone is enough', () => {
  const r = classify({ paths: ['tests/only.test.js'], flags: { needs_adr: true } });
  assert.equal(r.authority, AUTHORITY.OPERATOR);
  assert.equal(r.trigger, 'needs-adr');
});

// ─────────────────────────────────────────────────────────────────────────────
// Config overrides are WIDEN-ONLY (ADR-0019 §5 / ADR-0009)
// ─────────────────────────────────────────────────────────────────────────────

test('config may lower the file threshold — claiming more for the operator', () => {
  const cfg = { authority_overrides: { production_file_threshold: 2 } };
  const r = classify({ paths: ['core/a.js', 'core/b.js', 'core/c.js'] }, cfg);
  assert.equal(r.authority, AUTHORITY.OPERATOR);
  assert.equal(r.trigger, 'production-file-count');
});

test('config may NOT raise the file threshold — the clamp is the floor', () => {
  // A project asking for 50 would be handing the agent authority the floor
  // never granted. The override is clamped, not honoured.
  const cfg = { authority_overrides: { production_file_threshold: 50 } };
  const six = Array.from({ length: 6 }, (_, i) => `core/lib/f${i}.js`);
  const r = classify({ paths: six }, cfg);
  assert.equal(r.authority, AUTHORITY.OPERATOR, 'the raised threshold must be ignored');
  assert.equal(authority.resolveThresholds(cfg).productionFileCount, 5);
});

test('config may reserve extra paths for the operator', () => {
  const cfg = { authority_overrides: { extra_operator_paths: ['db/migrations/'] } };
  const r = classify({ paths: ['db/migrations/003_add_col.sql'] }, cfg);
  assert.equal(r.authority, AUTHORITY.OPERATOR);
  assert.equal(r.trigger, 'config-extra-operator-paths');
});

test('config cannot disable a floor trigger', () => {
  // There is deliberately no mechanism for this — asserted so a future
  // "disable" option cannot be added without this test failing loudly.
  const cfg = {
    authority_overrides: {
      disable: ['architecture-specs', 'trust-layer', 'public-contract', 'needs-adr'],
      disabled_triggers: ['architecture-specs'],
    },
  };
  const r = classify({ paths: ['specs/architecture/x.md'] }, cfg);
  assert.equal(r.authority, AUTHORITY.OPERATOR);
  assert.equal(r.trigger, 'architecture-specs');
});

test('a malformed override is ignored rather than crashing a live run', () => {
  for (const bad of [
    { authority_overrides: null },
    { authority_overrides: { production_file_threshold: 'nope' } },
    { authority_overrides: { production_file_threshold: -1 } },
    { authority_overrides: { extra_operator_paths: 'not-an-array' } },
    { authority_overrides: { extra_operator_paths: [] } },
  ]) {
    const r = classify({ paths: ['core/lib/a.js'] }, bad);
    assert.equal(r.authority, AUTHORITY.AGENT, JSON.stringify(bad));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Self-guarding
// ─────────────────────────────────────────────────────────────────────────────

test('editing the authority table is itself the operator\'s decision', () => {
  // Without this, an autonomous run could widen its own boundary and log the
  // change as a routine [DECISION].
  const r = classify({ paths: ['core/run/lib/authority-triggers.js'] });
  assert.equal(r.authority, AUTHORITY.OPERATOR);
  assert.equal(r.trigger, 'trust-layer');
});
