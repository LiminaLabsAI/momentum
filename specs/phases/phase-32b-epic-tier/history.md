---
type: History
status: in-progress
epic: autonomous-execution
---

# Phase 32b — Epic Tier — History

### [NOTE] 2026-07-27 — This phase's specs were derived, not brainstormed
Topics: jit-derivation, d10, epic, no-re-interview
Affects-phases: phase-32b-epic-tier
Affects-specs: specs/epics/0001-autonomous-execution.md
Detail: Per Epic 0001 **D10**, `overview.md` / `plan.md` / `tasks.md` were
generated from the epic record plus 32a's deferred list and discoveries, with
**no operator interview**. The operator was asked nothing they had already
answered on 2026-07-27; every decision the phase rests on was read from the
record. Produced by hand because the `--derive` mechanism ships in this phase —
which makes this file the specification of what `--derive` must reproduce
mechanically, and a fair test of whether the derivation D10 promises is actually
available from the inputs D10 names.

---

### [DECISION] 2026-07-27 — The epic record is in-repo, not at the ecosystem root
Topics: epic, tier, initiative, ecosystem
Affects-phases: phase-32b-epic-tier
Affects-specs: core/run/schema/epic.schema.json, specs/epics/
Detail: An epic is one repo's multi-phase unit; `initiative` remains the
cross-repo tier at the ecosystem root. Putting epics beside initiatives would
force a solo repo to have an ecosystem root before it could group two phases,
which inverts the relationship — the lighter unit must not depend on the heavier
one. `specs/epics/<NNNN>-<slug>.md` mirrors `initiatives/<NNNN>-<slug>.md`
exactly one tier down, so the two read the same way.

---

### [DECISION] 2026-07-27 — An unclassifiable amendment is treated as backward-invalidating
Topics: amendments, d11, blast-radius, safe-default
Affects-phases: phase-32b-epic-tier
Affects-specs: core/run/lib/amend.js
Detail: D11 says forward-only amendments absorb silently and
backward-invalidating ones hard-stop. It does not say what happens when the
classifier cannot tell — and silence there would default to the *cheap* branch,
absorbing a change that may invalidate completed work. This phase resolves it the
same way ADR-0019 resolved ambiguous authority: the safe direction wins.
`unclassified` is treated as `backward-invalidating`, so the failure mode is an
unnecessary stop rather than three phases built on an amendment nobody checked.
