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

### [FEATURE] 2026-07-27 — G3: the operator can change their mind mid-run
Topics: amendments, d11, jit-derivation, d10, reproducibility
Affects-phases: phase-32b-epic-tier
Affects-specs: core/run/lib/amend.js, core/run/lib/derive.js
Detail: The two halves of the operator's original objection, built together
because they only make sense together. **amend.js** gives the operator a channel
INTO a live run; **derive.js** is what makes using it cheap.

The design question was who classifies an amendment. A library that read the
text and guessed "does this invalidate phase 1?" would be unreproducible and
unauditable — the same objection ADR-0019 raised against model-judged authority,
and it applies with more force here because the consequence is stopping a run.
So the CALLER supplies the signal (`--forward-only` / `--invalidates`), exactly
as the authority classifier takes a caller-supplied `needs_adr` flag, and this
module mechanically enforces the consequence. Judgment stays where judgment
belongs; enforcement is deterministic.

With no signal at all the amendment is `unclassified` and treated as
backward-invalidating (the decision recorded earlier in this file). Worth
restating why: silence would otherwise default to the CHEAP branch, absorbing a
change that may invalidate completed work. An unnecessary stop is recoverable in
seconds; three phases built on an unchecked amendment is not.

**derive.js** is pure and takes its date as an argument rather than reading a
clock. That is not fastidiousness — a derivation that varied run-to-run could
not be reviewed, diffed, or trusted, and the whole claim of D10 is that the
operator can rely on it without re-reading every generated file. The plan
skeleton also states plainly what derivation cannot know: the group breakdown
depends on code that exists now and did not when the epic was written.
Pretending otherwise would be the upfront-specs mistake in miniature.

Verified live rather than only in unit tests: a forward-only amendment was
absorbed with the run still `running`, and then appeared in the derived spec of
`phase-32c-adapter-parity` — a phase that does not exist yet. That round trip is
the entire argument for D10 over upfront authoring, demonstrated end to end.

Verification: 23 tests; orphan guard clean; full suite **1362/1362**.

---

### [DISCOVERY] 2026-07-27 — The grant would have shipped non-functional to every installed project
Topics: runtime-closure, adr-0018, bug-030, grant, packaging
Affects-phases: phase-32b-epic-tier
Affects-specs: core/runtime/closure.js, core/git-hooks/run-check.js
Detail: `run-check.js` reaches `grant.js` through a **computed** path — it tries
`.momentum/runtime/run/lib/grant.js` first (installed projects) and falls back to
`../run/lib/grant.js` (this checkout). The runtime-closure walker
(`core/runtime/closure.js`) discovers vendored files by following **static**
`require` calls from its entry points, so it could not see this one.

Net effect had it shipped: the grant path would work perfectly in the momentum
repo and silently do nothing in every installed project, because `grant.js` would
not be in their `.momentum/runtime/`. `tryScopeGrant` fails closed, so nothing
would break — pushes would just keep being refused with the sentinel message and
nobody would learn why. **That is BUG-030's shape one layer down**: a production
path that works where it is developed and not where it ships.

Caught by adding the entry and checking `computeClosure()` output rather than
assuming. `run/lib/grant.js` now vendors along with its transitive deps
(`lock.js`, `manifest.js`) — 15 files in the closure, up from 12.

Two existing guards also fired and were right to: ADR-0018's dual-maintenance
fence (`.githooks/` must mirror `core/git-hooks/` byte-for-byte) and the four
adapter fingerprints.

---

### [DECISION] 2026-07-27 — The grant has six refusal reasons, not five
Topics: grant, adr-0020, diagnostics
Affects-phases: phase-32b-epic-tier
Affects-specs: core/run/lib/grant.js
Detail: The plan enumerated five (`expired`, `branch-out-of-scope`, `revoked`,
`epic-mismatch`, `exhausted`). Building it, `no-grant` is plainly its own case and
must be distinguishable: "there is no grant" and "your grant does not cover this
branch" send an operator to completely different places. A refusal an operator
cannot diagnose is a refusal they will work around.

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
