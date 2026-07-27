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

### [DISCOVERY] 2026-07-27 — The bootstrap epic record was unparseable by momentum's own reader
Topics: okf, adr-0005, frontmatter, epic, dogfood
Affects-phases: phase-32b-epic-tier
Affects-specs: specs/epics/0001-autonomous-execution.md, core/run/schema/epic.schema.json
Detail: The epic record hand-authored during the brainstorm used a nested
`policy:` map. `core/lib/frontmatter.js` — momentum's one frontmatter reader —
returns `data: null` for any file containing a nested map, because momentum's OKF
v0.1 subset (ADR-0005) deliberately excludes them and the documented read rule is
to treat such files as opaque rather than guess. So the first epic record momentum
ever wrote could not be read by momentum.

Two ways out: widen the OKF subset, or flatten the record. **Widening is an
ADR-0005 decision** with consequences for every OKF consumer and every published
bundle; flattening four keys is not. Record flattened to
`policy_release`/`policy_push`/`policy_tdd`/`policy_authority`, and the epic
schema documents *why* the keys are flat so the next person does not "fix" it
back into a nested map.

Worth noting the shape of the error: the record was written by hand, for a human
reader, before the schema existed — and it was the *format*, not the schema, that
it fell outside of. The plan's rule ("if the bootstrap record does not validate,
the schema is wrong, not the record") did not cover this case, and should not
have: a record momentum cannot parse at all is a different failure from a record
whose fields disagree with a schema.

---

### [DISCOVERY] 2026-07-27 — `waves()` presented a guess as a plan
Topics: waves, epic, adr-0003, honesty
Affects-phases: phase-32b-epic-tier
Affects-specs: core/run/lib/epic.js
Detail: The first implementation fed every phase in the epic's `phases` list to
`computeWaveLayers`. Run against the real record it returned *Wave 1: 32a, 32c,
32d · Wave 2: 32b* — flatly contradicting the epic's own prose graph
(`32a → 32b ∥ 32c → 32d`). Cause: 32c and 32d have no `overview.md` yet, so they
carry no `deps:`, and a phase with no recorded dependencies is indistinguishable
from a phase with none.

That distinction is the whole point. Under D10 specs are derived just-in-time, so
an epic in flight *legitimately* has phases not yet scaffolded — and ordering
them is not a computation, it is a guess. `waves()` now returns
`{waves, unscaffolded, complete}` and `momentum epic status` prints the
unscaffolded set with the reason. The wave plan covers what is knowable; what is
not knowable is named rather than filled in.

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
