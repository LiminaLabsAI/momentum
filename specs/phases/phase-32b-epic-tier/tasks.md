---
type: Tasks
status: in-progress
epic: autonomous-execution
---

# Phase 32b — Epic Tier — Tasks

> Mirrors `plan.md`. Execution: G0 → (G1 ∥ G2) → G3 → G4 → G5.
> Built under `momentum run` — the 32a governor drives this phase (epic
> criterion #6). Baseline **1285/1285**.

## Group 0 — ADR-0020 + schemas *(blocks)*
- [ ] **ADR-0020** — scope-grant authorization; states plainly what a mistake can now do that it could not before
- [ ] `core/run/schema/epic.schema.json`
- [ ] Grant shape defined into `run.schema.json`'s reserved `grant` field
- [ ] Verify: `npm test`

## Group 1 — Epic library + CLI *(∥ G2)*
- [ ] `core/run/lib/epic.js` — read/write/validate, `nextEpicId`, phase graph **delegated to `core/waves`**
- [ ] `momentum epic create|status|list|close`
- [ ] Round-trips the hand-authored `0001-autonomous-execution.md` **without editing it**
- [ ] Verify: `npm test`

## Group 2 — Scope grant *(∥ G1)*
- [ ] `core/run/lib/grant.js` — mint / verify / consume / revoke, every consumption audited
- [ ] Five distinct refusal reasons: `expired` · `branch-out-of-scope` · `revoked` · `epic-mismatch` · `exhausted`
- [ ] `pre-push` accepts a valid in-scope grant **alongside** the sentinel; invariant floor unchanged
- [ ] Adversarial tests written **before** the happy path
- [ ] Verify: `npm test`

## Group 3 — Derivation + amendments
- [ ] `core/run/lib/derive.js` — pure `(epic, priorHistory) → skeletons`, no model call
- [ ] `core/run/lib/amend.js` — forward-only absorbs silently; backward-invalidating stops and names affected units; unclassified treated as backward-invalidating
- [ ] `momentum run amend` + `momentum epic amend`
- [ ] Verify: `npm test`

## Group 4 — Recipes + wiring
- [ ] `/brainstorm-epic` recipe (core + 4 adapters)
- [ ] `/brainstorm-phase --derive` — no-interview path; interview path untouched
- [ ] `momentum run start epic <slug>` walks the phase graph
- [ ] `tdd: strict` enforcement at task-marking
- [ ] Stacked-lane landing for `release: per-feature`
- [ ] Re-baseline 4 fingerprints; drift verified as only the intended files
- [ ] Verify: `npm test`

## Group 5 — Verification
- [ ] Two-phase epic e2e on a clean clone — **one approval**
- [ ] Amendment e2e — forward-only silent, backward-invalidating stops + names
- [ ] Derivation reproducibility — byte-identical on identical inputs
- [ ] Grant adversarial suite green, all five reasons distinct
- [ ] **Orphan guard green** — run BEFORE the retrospective is written
- [ ] Invariance + swarm **236/236**
- [ ] `retrospective.md` + `## Verification Evidence` (Rule 12 Gate A)
- [ ] Verify: full suite green, net-new ≥ 50
