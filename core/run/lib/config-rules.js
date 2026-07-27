'use strict';

/**
 * Phase 32a G4 — the run-policy configuration model.
 *
 * Three tiers, extending ADR-0009's trust-invariant / mechanism-configurable
 * split rather than inventing a parallel one:
 *
 *   FREE     the operator's call — push cadence, merge and release granularity
 *   COUPLED  legal only in combination — some settings buy others
 *   FLOOR    never configurable — the options do not exist to be chosen wrongly
 *
 * The operator asked for combinations to be configurable "except the ones that
 * are bad practice or break things." That is exactly this shape: a validator
 * that refuses a combination and NAMES THE RULE it violates, rather than a free
 * matrix that lets a project quietly select an unsafe pairing.
 *
 * Pure: `validate(policy) → {ok, violations[]}`. No I/O.
 */

const GRANULARITY_RANK = Object.freeze({ manual: 0, 'per-feature': 1, 'per-phase': 2 });

const VALID = Object.freeze({
  release: Object.freeze(['per-phase', 'per-feature', 'manual']),
  merge: Object.freeze(['per-phase', 'per-feature', 'manual']),
  push: Object.freeze(['per-group', 'per-phase']),
  tdd: Object.freeze(['strict', 'opt-in']),
});

/**
 * FLOOR rules. These are not checks an operator can fail by choosing badly —
 * they are checks that the *option space itself* has not been widened. If a
 * future edit adds `push: never` to the enum, this fails loudly rather than
 * silently permitting three phases of work to live in one local worktree.
 */
const FLOOR = Object.freeze([
  Object.freeze({
    id: 'push-always',
    rule: 'FLOOR — an autonomous run always pushes',
    why: 'Several phases of work held only in a local worktree is one crash from total loss.',
    check: () => !VALID.push.includes('never'),
  }),
  Object.freeze({
    id: 'evidence-always',
    rule: 'FLOOR — verification evidence is always captured (Rule 12)',
    why: 'In autonomous mode evidence is not documentation, it is the control signal that replaces the absent human.',
    check: (p) => p.capture_evidence !== false,
  }),
  Object.freeze({
    id: 'human-authorizes-protected-push',
    rule: 'FLOOR — protected-branch pushes always require human authorization (ADR-0009)',
    why: 'The trust layer is invariant. A run may change WHEN and AT WHAT GRANULARITY a human authorizes, never whether.',
    check: (p) => p.skip_merge_approval !== true,
  }),
]);

/**
 * COUPLED rules. Legal settings that are illegal *together*.
 */
const COUPLED = Object.freeze([
  Object.freeze({
    id: 'release-not-finer-than-merge',
    rule: 'COUPLED — release granularity may never be finer than merge granularity',
    why: 'Tagging a version that has not been merged to the terminal branch is incoherent: the tag would point at a commit no release branch contains.',
    check: (p) => {
      if (!p.merge) return true;               // merge defaults to release granularity
      const r = GRANULARITY_RANK[p.release];
      const m = GRANULARITY_RANK[p.merge];
      if (r === undefined || m === undefined) return true;  // shape errors reported elsewhere
      return r <= m;
    },
  }),
  Object.freeze({
    id: 'coarse-gate-buys-strict-verification',
    rule: 'COUPLED — release: per-feature requires tdd: strict',
    why: 'One approval covering several phases of diff is not a review anybody performs. Gate frequency may be traded away only by buying verification rigor.',
    check: (p) => p.release !== 'per-feature' || p.tdd === 'strict',
  }),
]);

function shapeViolations(policy) {
  const out = [];
  for (const key of ['release', 'push', 'tdd']) {
    if (policy[key] === undefined) {
      out.push({ id: `${key}-required`, rule: `${key} is required`, why: '', got: undefined });
    } else if (!VALID[key].includes(policy[key])) {
      out.push({
        id: `${key}-invalid`,
        rule: `${key} must be one of: ${VALID[key].join(', ')}`,
        why: '',
        got: policy[key],
      });
    }
  }
  if (policy.merge !== undefined && !VALID.merge.includes(policy.merge)) {
    out.push({
      id: 'merge-invalid',
      rule: `merge must be one of: ${VALID.merge.join(', ')}`,
      why: '',
      got: policy.merge,
    });
  }
  return out;
}

/**
 * @param {object} policy
 * @returns {{ok: boolean, violations: Array<{id, rule, why, got}>}}
 */
function validate(policy) {
  const p = policy || {};
  const violations = shapeViolations(p);

  // Only run the semantic rules once the shape is sound — otherwise a typo
  // produces a cascade of confusing secondary errors.
  if (violations.length === 0) {
    for (const rule of FLOOR.concat(COUPLED)) {
      if (!rule.check(p)) {
        violations.push({ id: rule.id, rule: rule.rule, why: rule.why, got: describe(p, rule.id) });
      }
    }
  }
  return { ok: violations.length === 0, violations };
}

function describe(p, ruleId) {
  switch (ruleId) {
    case 'release-not-finer-than-merge': return `release=${p.release}, merge=${p.merge}`;
    case 'coarse-gate-buys-strict-verification': return `release=${p.release}, tdd=${p.tdd}`;
    default: return '';
  }
}

/** Render violations for a terminal, naming the rule each one breaks. */
function format(result) {
  if (result.ok) return '✓ run policy is valid.';
  const lines = ['✗ run policy is invalid:', ''];
  for (const v of result.violations) {
    lines.push(`  ${v.rule}`);
    if (v.got) lines.push(`    got: ${v.got}`);
    if (v.why) lines.push(`    why: ${v.why}`);
    lines.push('');
  }
  return lines.join('\n');
}

// The rule tables are internal; `validate`/`format` are the surface.
module.exports = { validate, format };
