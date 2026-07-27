'use strict';

/**
 * Phase 32b G3 — the amendments channel (Epic 0001 D11).
 *
 * 32a built one direction of the operator↔run conversation: the run parks a
 * question FOR the operator. This is the other direction — the operator pushes
 * a change INTO a live run. It was missing from the first design and the
 * operator caught it: "after one phase or the second phase, user observes
 * something and wants to contribute or update something."
 *
 * TWO KINDS, and the distinction decides everything:
 *
 *   forward-only            nothing already built depends on it → absorb
 *                           silently, record it, keep going. ZERO prompts.
 *   backward-invalidating   completed work is called into question → hard stop,
 *                           naming exactly which units are affected.
 *
 * WHO CLASSIFIES. Not this module, and deliberately not by reading the text.
 * A library that guessed "does this sentence invalidate phase 1?" would be
 * unreproducible and unauditable — the same objection ADR-0019 raised against
 * model-judged authority. Instead the CALLER supplies the signal (`invalidates`
 * or `forwardOnly`), exactly as ADR-0019's classifier takes a caller-supplied
 * `needs_adr` flag, and this module mechanically enforces the consequence.
 *
 * WHEN THE SIGNAL IS ABSENT the amendment is `unclassified`, and unclassified is
 * treated as backward-invalidating. D11 is silent on the ambiguous case, and
 * silence would default to the CHEAP branch — absorbing a change that may
 * invalidate completed work. The failure mode we want is an unnecessary stop,
 * not three phases built on an amendment nobody checked.
 */

const manifestLib = require('./manifest');

const KIND = Object.freeze({
  FORWARD_ONLY: 'forward-only',
  BACKWARD_INVALIDATING: 'backward-invalidating',
  UNCLASSIFIED: 'unclassified',
});

/**
 * PURE. `(amendment, context) → {kind, invalidates, stops}`.
 *
 * @param {{text: string, invalidates?: string[], forwardOnly?: boolean}} amendment
 * @param {{completedUnits?: string[]}} [context]
 */
function classify(amendment, context = {}) {
  const completed = Array.isArray(context.completedUnits) ? context.completedUnits : [];
  const named = Array.isArray(amendment && amendment.invalidates)
    ? amendment.invalidates.filter(Boolean)
    : [];

  // Naming affected work is itself the backward signal — an operator who can
  // name a unit has already decided the answer.
  if (named.length > 0) {
    return { kind: KIND.BACKWARD_INVALIDATING, invalidates: named, stops: true };
  }

  if (amendment && amendment.forwardOnly === true) {
    return { kind: KIND.FORWARD_ONLY, invalidates: [], stops: false };
  }

  // No signal. Report which completed units COULD be affected so the operator
  // has something concrete to adjudicate rather than an abstract warning.
  return { kind: KIND.UNCLASSIFIED, invalidates: completed.slice(), stops: true };
}

/**
 * Which units has this run already completed? Read from the audit trail rather
 * than inferred: `advance` records each cursor move, so every unit the cursor
 * has LEFT is one the run considered done.
 */
function completedUnits(manifest) {
  if (!manifest || !Array.isArray(manifest.audit)) return [];
  const seen = [];
  for (const entry of manifest.audit) {
    if (entry.event === 'continue' && entry.detail && !/^turn \d+$/.test(entry.detail)) {
      if (!seen.includes(entry.detail)) seen.push(entry.detail);
    }
  }
  const current = manifest.cursor && manifest.cursor.unit;
  return seen.filter((u) => u !== current);
}

/**
 * Record an amendment against the live run and apply its consequence.
 *
 * @returns {{ok, kind, invalidates, stopped, message}}
 */
function apply(repoRoot, amendment, nowIso) {
  const manifest = manifestLib.loadSafe(repoRoot);
  if (!manifest) {
    return { ok: false, kind: null, invalidates: [], stopped: false, message: 'no active run' };
  }

  const verdict = classify(amendment, { completedUnits: completedUnits(manifest) });

  manifestLib.update(repoRoot, (m) => {
    if (!Array.isArray(m.amendments)) m.amendments = [];
    m.amendments.push({
      ts: nowIso,
      text: amendment.text,
      kind: verdict.kind,
      invalidates: verdict.invalidates,
    });
    if (!Array.isArray(m.audit)) m.audit = [];
    m.audit.push({
      ts: nowIso, event: 'amend', actor: 'operator',
      detail: `${verdict.kind}: ${String(amendment.text).slice(0, 120)}`,
    });
  });

  if (!verdict.stops) {
    // The whole point of D11: a forward-only amendment costs the run nothing.
    // It becomes an input when later phases derive their specs.
    return {
      ok: true,
      kind: verdict.kind,
      invalidates: [],
      stopped: false,
      message: 'absorbed — it becomes an input when later phases derive their specs',
    };
  }

  manifestLib.setStatus(repoRoot, 'stopped', nowIso,
    `amendment (${verdict.kind}) affects completed work`);

  return {
    ok: true,
    kind: verdict.kind,
    invalidates: verdict.invalidates,
    stopped: true,
    message: verdict.kind === KIND.UNCLASSIFIED
      ? 'stopped — no forward-only signal was given, so this is treated as invalidating'
      : 'stopped — named completed work is affected',
  };
}

/**
 * Amendments that should feed a not-yet-started phase's derivation (D10/D11).
 * Forward-only ones only: a backward-invalidating amendment stopped the run, so
 * whatever happens next is the operator's call, not a derivation input.
 */
function forwardAmendments(manifest) {
  if (!manifest || !Array.isArray(manifest.amendments)) return [];
  return manifest.amendments.filter((a) => a.kind === KIND.FORWARD_ONLY);
}

module.exports = { classify, apply, completedUnits, forwardAmendments, KIND };
