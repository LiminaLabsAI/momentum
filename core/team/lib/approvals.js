'use strict';

/**
 * Reviewer≠author approvals ledger (Phase 30b Team-Run, ADR-0013).
 *
 * The trust gate finally distinguishes self-approval from peer review. Approvals
 * are attributed fragments; a change is `satisfied` when it has >= threshold
 * approvals by actors DIFFERENT from the author. Deliberately CLIENT-SIDE HONEST
 * — ADR-0009's trust invariant is unchanged and true server-side enforcement
 * stays an optional forge-adapter concern. `allowSelf` restores solo behavior
 * (single-operator N=1 compatibility).
 *
 * Zero dependencies — node builtins only.
 */

const fragments = require('./fragments');

const APPROVALS_VIEW = 'approvals';

/** Record an attributed approval (or a `reject` verdict) for `change`. */
function approve(repoRoot, approver, change, opts) {
  opts = opts || {};
  return fragments.writeFragment(repoRoot, APPROVALS_VIEW, approver, 'approval', {
    change: String(change),
    verdict: opts.verdict || 'approve',
  }, opts);
}

/** Distinct approvers (latest verdict = approve) for a change, honoring reviewer≠author. */
function approversFor(repoRoot, change, author, allowSelf) {
  const forChange = fragments
    .readFragments(repoRoot, APPROVALS_VIEW)
    .filter((f) => f.payload.change === String(change));
  const latest = fragments.foldLatest(forChange, (f) => f.actor);
  return [...latest.values()]
    .filter((f) => f.payload.verdict === 'approve')
    .filter((f) => allowSelf || f.actor !== author)
    .map((f) => f.actor);
}

/** True when `change` has >= threshold qualifying approvals. */
function satisfied(repoRoot, change, opts) {
  const { author, threshold = 1, allowSelf = false } = opts || {};
  return approversFor(repoRoot, change, author, allowSelf).length >= threshold;
}

module.exports = { approve, approversFor, satisfied, APPROVALS_VIEW };
