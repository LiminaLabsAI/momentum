---
type: Plan
status: in-progress
epic: autonomous-execution
tags: [epic-tier, scope-grant, jit-derivation, amendments, adr-0020]
---

# Phase 32b — Epic Tier — Plan

```
# Execution:  G0 → (G1 ∥ G2) → G3 → G4 → G5
```

Branch `epic-0001-autonomous-execution` (continuing the stack — epic policy
`release: per-feature`, nothing merges until the epic completes).

Baseline suite: **1285/1285** at the close of 32a. Swarm subset: **236**.

> **Dogfood gate (epic criterion #6).** This phase is built under
> `momentum run start phase phase-32b-epic-tier` — the 32a governor drives it.
> If the runner cannot carry its own successor, it does not work.

> **Invariance gate, unchanged from 32a.** A repo with no `run.json` and no epic
> record behaves byte-identically to v0.42.0.

> **G0 blocks:** ADR-0020 must exist before any grant code, per Rule 10 —
> decisional changes get an ADR first, not a retrofit.

---

## Group 0 — ADR-0020 + epic schema *(sequential, blocks all)*

1. **ADR-0020 — Scope-Grant Authorization.** Must argue the counter-case
   honestly: a grant *is* a strictly larger blast radius per human decision, and
   the mitigation is scope + expiry + audit + revocation, not a claim that
   nothing changed. State plainly what an attacker or a mistake can now do that
   it could not before.
2. `core/run/schema/epic.schema.json` — id, slug, status, owner, phases[],
   policy, decisions[], completion_criteria[], amendments[].
3. Grant shape into `run.schema.json`'s reserved `grant` field (32a left it
   `additionalProperties: true` precisely so this phase could decide it).

**Commit:** `docs(adr): ADR-0020 scope-grant authorization + epic schema`

---

## Group 1 — Epic record library + CLI *(parallel with G2)*

1. `core/run/lib/epic.js` — read / write / validate; `nextEpicId`; phase graph
   built by delegating to `core/waves` (ADR-0003 — no second topo-sort).
2. `momentum epic create|status|list|close`.
3. Round-trip the hand-authored `specs/epics/0001-autonomous-execution.md`:
   the library must parse the record this epic already wrote **without editing
   it**. If the bootstrap record does not validate, the schema is wrong, not the
   record.

**Commit:** `feat(run): epic record library + momentum epic CLI`

---

## Group 2 — Scope grant *(parallel with G1)*

1. `core/run/lib/grant.js` — `mint` / `verify` / `consume` / `revoke`.
   Every consumption appends an attributed audit entry.
2. Refusal reasons are **distinct and specific**: `expired`,
   `branch-out-of-scope`, `revoked`, `epic-mismatch`, `exhausted`.
3. `pre-push` accepts a valid in-scope grant *alongside* the existing
   single-use sentinel — additive, never weaker. The invariant floor
   (`main`/`master`/`staging`) is unchanged.
4. Adversarial tests first: expired, wrong branch, revoked, replayed after
   consumption, grant for a different epic.

**Commit:** `feat(run): scope-grant authorization + pre-push integration`

---

## Group 3 — Derivation + amendments *(sequential)*

1. `core/run/lib/derive.js` — pure `(epic, priorHistory) → {overview, plan,
   tasks}` skeletons. Same discipline as the authority classifier: no model call
   in the library, so derivation is reproducible and testable.
2. `core/run/lib/amend.js` — classify an amendment `forward-only` /
   `backward-invalidating` / `unclassified`, the last treated as the second
   (Q5). Forward-only appends to the epic's decisions and returns silently;
   backward-invalidating names the completed units it touches and sets the run
   to `stopped`.
3. `momentum run amend "<text>"` + `momentum epic amend`.

**Commit:** `feat(run): JIT spec derivation + amendments channel`

---

## Group 4 — Recipes + epic-tier wiring *(sequential)*

1. `/brainstorm-epic` recipe (core + 4 adapters) — the ecosystem-tier
   `/brainstorm-initiative` one rung down; same gate contract.
2. `/brainstorm-phase --derive` — the no-interview path; the interview path is
   untouched for cold phases.
3. `momentum run start epic <slug>` — the runner walks the epic's phase graph.
4. `tdd: strict` enforcement at task-marking: no `[x]` without a recorded
   red→green for that task.
5. Stacked-lane landing for `release: per-feature` — parent-first, suite green
   between (Rule 6 Landing Order; no new merge machinery).
6. Re-baseline 4 adapter fingerprints; verify drift is only the intended files.

**Commit:** `feat(run): epic-tier recipes + run wiring + tdd enforcement`

---

## Group 5 — Verification *(sequential)*

1. **Two-phase epic e2e on a clean clone** — one approval, both phases land.
2. Amendment e2e — forward-only silent; backward-invalidating stops and names.
3. Derivation reproducibility — same inputs, byte-identical output.
4. Grant adversarial suite green (all five refusal reasons distinct).
5. **Orphan guard green** over all of `core/run/` — the 32a lesson applies to
   this phase's code too, and it will be run *before* the retrospective, not
   after.
6. Invariance + swarm 236/236.
7. Retrospective + `## Verification Evidence` (Rule 12 Gate A).

**Commit:** `test(run): epic-tier e2e + grant adversarial suite`

---

## Risks

| Risk | Mitigation |
|---|---|
| ADR-0020 rationalizes a real weakening | The ADR is required to state what a mistake can now do that it could not before; the adversarial grant suite is written before the happy path |
| The bootstrap epic record does not validate | Treated as a schema bug, not a record bug (G1.3) |
| New dead exports, as in 32a | Orphan guard is run in G5.5 **before** the retrospective is written |
| Derivation drifts into a model call | `derive.js` is pure by contract and asserted reproducible |
