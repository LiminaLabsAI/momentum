---
type: Plan
status: in-progress
epic: autonomous-execution
---

# phase-32d-cross-repo — Plan

```
# Execution:  G0 → G1 → G2 → G3
```

> **Derived, not brainstormed.**
> The group breakdown is the one thing the epic CANNOT know — it depends on
> code that exists now and did not when the epic was written. Everything
> above the groups is derived; the groups themselves are authored here.

Depends on: phase-32b-epic-tier, phase-32c-adapter-parity. Those must be complete before this starts.

Run policy: release: per-feature · push: per-phase · tdd: strict

---

## Group 0 — Repay the guard debt *(sequential, blocks all)*

FIRST, deliberately. 32c found the orphan guard blind to single-line exports and
therefore green over `backend.js`, `lock.js`, `grant.js` and `amend.js` for two
phases. Until the repaired guard has actually run over 32a's and 32b's surface,
this epic does not know whether it shipped dead code — and every later group in
this phase would be building on an unverified base.

1. Widen the guard beyond `core/run/` to `core/swarm/` and `core/ecosystem/`.
2. Run it. Fix or unexport whatever it finds.
3. Prove it red against **both** export shapes, not just the one it handled.

**Commit:** `test(run): widen the orphan guard; repay 32a/32b verification debt`

---

## Group 1 — Remove the dead wave runner *(sequential)*

BUG-031. Deprecated in 32a, superseded by `momentum run`. Removal, not repair:
fully wired it still drives one phase per repo, which the tier-parameterized
runner already does better.

1. Delete `pollTurn`, `recordRepoComplete` and the wave-advance path.
2. **Retain** `core/swarm/inbox.js` (the park primitive, now a thin adapter) and
   `lib/wave-ordering.js` (already a thin `core/waves` adapter).
3. Swarm suite green **without** them — a removal that needs test edits to pass
   is a removal that took something real with it.

**Commit:** `refactor(swarm): remove the dead wave runner (BUG-031)`

---

## Group 2 — Initiative tier + BUG-032 *(sequential)*

1. `momentum run start initiative <slug>` — resolve the first ready member from
   the ecosystem dependency graph, same shape as the epic tier reading phase deps.
2. **BUG-032** — suppress the cross-repo nudge when an active run grant covers
   the members, and reword the residual message from *"before going further"* to
   an observation. The exit code was always 0; the wording was the bug.

**Commit:** `feat(run): initiative tier + silence the cross-repo halt (BUG-032)`

---

## Group 3 — Close the epic *(sequential)*

1. Full suite green; invariance; swarm green.
2. Retrospective + `## Verification Evidence`.
3. Epic 0001 retrospective + `momentum epic close`.

**Commit:** `test(run): close Phase 32d and Epic 0001`