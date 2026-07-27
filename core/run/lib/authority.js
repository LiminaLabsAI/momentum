'use strict';

/**
 * Phase 32a G1 — the decision-authority classifier (ADR-0019).
 *
 *   classify(changeSet, config) → { authority, reason, trigger, triggersEvaluated }
 *
 * A PURE function. No I/O, no clock, no model judgement in the hot path — the
 * same inputs always yield the same authority. That is what makes an autonomous
 * decision auditable months later: `decisions[]` on the run manifest records the
 * trigger evaluation that produced the classification, and anyone can re-run it.
 *
 * The trigger table lives in `./authority-triggers` and is shared verbatim with
 * the tests (ADR-0019 §2) — no second transcription to drift.
 */

const { OPERATOR_TRIGGERS, NON_PRODUCTION_PREFIXES, AUTHORITY } = require('./authority-triggers');

/** Reasons a decision lands with the operator rather than the agent. */
const REASON = Object.freeze({
  OPERATOR_AUTHORITY: 'operator-authority',
  AMBIGUOUS: 'ambiguous',
  WITHIN_BOUNDARY: 'within-boundary',
});

// ─────────────────────────────────────────────────────────────────────────────
// Match evaluation — the tiny interpreter for the table's declarative specs
// ─────────────────────────────────────────────────────────────────────────────

function normalizePath(p) {
  // Table prefixes are repo-relative and forward-slashed. Normalize both sides
  // so a Windows-style or './'-prefixed path cannot slip past a floor trigger.
  return String(p).replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
}

function isProductionPath(p) {
  const norm = normalizePath(p);
  return !NON_PRODUCTION_PREFIXES.some((prefix) => norm.startsWith(prefix));
}

function matchesAnyPathUnder(paths, prefixes) {
  return paths.some((p) => {
    const norm = normalizePath(p);
    return prefixes.some((prefix) => norm === prefix || norm.startsWith(prefix));
  });
}

function matchesAnyPattern(paths, patterns) {
  return paths.some((p) => {
    const norm = normalizePath(p);
    return patterns.some((src) => new RegExp(src).test(norm));
  });
}

/**
 * Evaluate one trigger's declarative match spec against a change set.
 * A spec with several keys fires if ANY key matches (they are alternatives,
 * not conjunctions — e.g. `public-contract` fires on a `bin/` path OR on
 * `package.json`).
 */
function triggerFires(trigger, changeSet, thresholds) {
  const { match } = trigger;
  const paths = changeSet.paths || [];
  const flags = changeSet.flags || {};

  if (match.anyPathUnder && matchesAnyPathUnder(paths, match.anyPathUnder)) return true;
  if (match.anyPathMatching && matchesAnyPattern(paths, match.anyPathMatching)) return true;
  if (match.flag && flags[match.flag] === true) return true;

  if (typeof match.productionFileCountAbove === 'number') {
    // Config may LOWER this threshold (widening operator authority) but never
    // raise it — see resolveThresholds().
    const limit = thresholds.productionFileCount;
    const count = paths.filter(isProductionPath).length;
    if (count > limit) return true;
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Config overrides — WIDEN-ONLY (ADR-0019 §5, inheriting ADR-0009's split)
// ─────────────────────────────────────────────────────────────────────────────

function resolveThresholds(config) {
  const declared = OPERATOR_TRIGGERS
    .find((t) => t.id === 'production-file-count').match.productionFileCountAbove;

  const override = config
    && config.authority_overrides
    && config.authority_overrides.production_file_threshold;

  // Widen-only: a project may claim MORE decisions for its operator by lowering
  // the threshold. A higher threshold would hand the agent authority the floor
  // never granted it, so it is clamped rather than honoured.
  if (typeof override === 'number' && override >= 0 && override < declared) {
    return { productionFileCount: override };
  }
  return { productionFileCount: declared };
}

function extraOperatorTriggers(config) {
  const extra = config
    && config.authority_overrides
    && config.authority_overrides.extra_operator_paths;

  if (!Array.isArray(extra) || extra.length === 0) return [];

  return [{
    id: 'config-extra-operator-paths',
    rule: 'project config (widen-only)',
    floor: false,
    description: 'Project-declared paths reserved for the operator.',
    match: { anyPathUnder: extra.map(normalizePath) },
  }];
}

// ─────────────────────────────────────────────────────────────────────────────
// The classifier
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A change set the classifier cannot assess. Parking here is the whole point of
 * ADR-0019 §4: unknown blast radius is not the agent's to absorb, so absence of
 * evidence is never read as evidence of safety.
 */
function isAssessable(changeSet) {
  if (!changeSet || typeof changeSet !== 'object') return false;
  const paths = changeSet.paths;
  const flags = changeSet.flags;
  const hasPaths = Array.isArray(paths) && paths.length > 0;
  const hasFlags = flags && typeof flags === 'object' && Object.keys(flags).length > 0;
  return hasPaths || hasFlags;
}

/**
 * @param {{paths?: string[], flags?: Record<string, boolean>}} changeSet
 * @param {object} [config] resolved project config (`specs/config.md`)
 * @returns {{authority: string, reason: string, trigger: string|null, triggersEvaluated: string[]}}
 */
function classify(changeSet, config) {
  const thresholds = resolveThresholds(config);
  const table = OPERATOR_TRIGGERS.concat(extraOperatorTriggers(config));
  const triggersEvaluated = [];

  if (!isAssessable(changeSet)) {
    return {
      authority: AUTHORITY.PARK,
      reason: REASON.AMBIGUOUS,
      trigger: null,
      triggersEvaluated,
    };
  }

  for (const trigger of table) {
    triggersEvaluated.push(trigger.id);
    if (triggerFires(trigger, changeSet, thresholds)) {
      return {
        authority: AUTHORITY.OPERATOR,
        reason: REASON.OPERATOR_AUTHORITY,
        trigger: trigger.id,
        triggersEvaluated,
      };
    }
  }

  // Every trigger evaluated, none fired, and the change set was assessable —
  // this is inside the boundary and the agent may proceed. The negative
  // evidence (`triggersEvaluated`) is the interesting part of the audit record.
  return {
    authority: AUTHORITY.AGENT,
    reason: REASON.WITHIN_BOUNDARY,
    trigger: null,
    triggersEvaluated,
  };
}

// `isProductionPath` and `resolveThresholds` are deliberately NOT exported.
// They were, briefly, "for tests" — which the orphan guard correctly flagged as
// the first step toward dead code. Their behaviour is asserted through
// `classify()`, which is the surface production actually uses.
module.exports = {
  classify,
  REASON,
  AUTHORITY,
};
