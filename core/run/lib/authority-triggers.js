'use strict';

/**
 * Phase 32a G0 — the decision-authority trigger table, as DATA (ADR-0019 §2).
 *
 * One source, read by both `core/run/lib/authority.js` and its tests. The
 * duplication this avoids is the exact failure ADR-0018 was written to end:
 * a table transcribed into prose in one place and into assertions in another
 * drifts silently, and the drift is only discovered by the bug it causes.
 *
 * These triggers are NOT invented here. They are Rule 14's work-type escalation
 * triggers, which already encode blast radius, are already mechanically
 * checkable, and are already familiar to anyone who has read CLAUDE.md. Rule 14
 * uses them to pick a work type; ADR-0019 also uses them to pick a decision
 * authority. No new taxonomy, no operator authoring burden.
 *
 * Match specs are declarative so the table stays readable as a table. The tiny
 * evaluator lives in `authority.js`; nothing here executes.
 */

/**
 * Triggers whose firing hands the decision to the operator.
 *
 * `floor: true` means config can never disable it (ADR-0009's invariant/mechanism
 * split, applied to authority — overrides are WIDEN-ONLY).
 */
const OPERATOR_TRIGGERS = Object.freeze([
  Object.freeze({
    id: 'architecture-specs',
    rule: 'Rule 10 / Rule 14',
    floor: true,
    description:
      'Touches specs/architecture/. Rule 10 already forbids editing these mid-phase and routes the change through an ADR — the decision was never the agent\'s to make.',
    match: Object.freeze({ anyPathUnder: Object.freeze(['specs/architecture/']) }),
  }),
  Object.freeze({
    id: 'trust-layer',
    rule: 'ADR-0009',
    floor: true,
    description:
      'Touches the trust layer or project config — the machinery that decides what a human must authorize. A change here can silently widen the agent\'s own authority, so it is permanently outside it.',
    match: Object.freeze({
      anyPathUnder: Object.freeze([
        'specs/config.md',
        'core/git-hooks/',
        '.githooks/',
        'core/run/lib/authority-triggers.js',
      ]),
    }),
  }),
  Object.freeze({
    id: 'public-contract',
    rule: 'Rule 14',
    floor: true,
    description:
      'Changes a published interface — package entry points, CLI surface, JSON schemas, or the governor contract. Downstream consumers cannot be consulted mid-run, so the operator stands in for them.',
    match: Object.freeze({
      anyPathUnder: Object.freeze(['bin/', 'core/run/schema/', 'core/swarm/schema/', 'core/run/CONTRACT.md']),
      anyPathMatching: Object.freeze(['^package\\.json$']),
    }),
  }),
  Object.freeze({
    id: 'needs-adr',
    rule: 'Rule 14',
    floor: true,
    description:
      'The change is decisional rather than additive — the caller flagged it as needing an ADR. By Rule 10 an ADR precedes the change, and an ADR is a record of a human judgement.',
    match: Object.freeze({ flag: 'needs_adr' }),
  }),
  Object.freeze({
    id: 'dependency-change',
    rule: 'Rule 14 (supply chain)',
    floor: true,
    description:
      'Adds or changes a dependency. Momentum is a zero-dependency package by long-standing decision; more generally a new dependency is a durable commitment an agent should not make alone.',
    match: Object.freeze({ flag: 'dependency_change' }),
  }),
  Object.freeze({
    id: 'production-file-count',
    rule: 'Rule 14 (~5 files)',
    floor: false,
    description:
      'Exceeds ~5 production files beyond the plan. Rule 14 treats this as the point where a quick-task must become a phase; the same threshold marks where a mid-run change stops being a detail.',
    match: Object.freeze({ productionFileCountAbove: 5 }),
  }),
  Object.freeze({
    id: 'displaces-planned-work',
    rule: 'Rule 14',
    floor: false,
    description:
      'Displaces planned work. Reordering or dropping a planned unit changes what the operator approved, which makes it theirs.',
    match: Object.freeze({ flag: 'displaces_planned_work' }),
  }),
]);

/**
 * Paths that never count toward `productionFileCountAbove`. Tests, specs and
 * docs are the artifacts an autonomous run is SUPPOSED to produce in volume —
 * counting them would park every well-behaved phase.
 */
const NON_PRODUCTION_PREFIXES = Object.freeze([
  'tests/',
  'specs/',
  'docs/',
  'site/',
  '.momentum/',
]);

/** Authority values. `park` is the default for anything unmatched (ADR-0019 §4). */
const AUTHORITY = Object.freeze({
  OPERATOR: 'operator',
  AGENT: 'agent',
  PARK: 'park',
});

module.exports = {
  OPERATOR_TRIGGERS,
  NON_PRODUCTION_PREFIXES,
  AUTHORITY,
};
