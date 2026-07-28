---
type: Plan
status: in-progress
epic: autonomous-execution
tags: [autonomy, governor, run-manifest, decision-authority, park-primitive, call-path-guard]
---

# Phase 32a — Governor — Plan

```
# Execution:  G0 → (G1 ∥ G2) → G3 → G4 → G5
```

Branch `epic-0001-autonomous-execution` (epic policy: commit + push per group,
**no merge until the epic completes** — D9 `release: per-feature`, dogfooded
manually since the tier ships in 32b).

Baseline suite: **1161/1161** on `main` (v0.42.0). Swarm subset: **236**.

> **Invariance gate.** A repo with no `.momentum/run.json` must behave
> **byte-identically to v0.42.0**. This phase adds a runtime; it changes nothing
> about what any existing hook or command decides when that runtime is absent.

> **G0 blocks everything** — the contracts fix the shapes G1/G2 build against.
> G1 and G2 then proceed independently: one classifies, the other provides the
> sink the classifier's default branch writes to.

## Reference specs

`specs/epics/0001-autonomous-execution.md` · ADR-0003 · ADR-0009 · ADR-0017 ·
ADR-0018 · `core/commands/start-phase.md`

---

## Group 0 — Contracts *(sequential, blocks all)*

**External deps:** none.

The shapes everything else depends on. Authored before any implementation so
G1/G2 cannot drift apart.

1. **ADR-0019 — Decision Authority Model.** Records: authority is classified
   *mechanically* by reusing Rule 14's escalation triggers (D5); ambiguity parks
   (D6); the classifier is a pure function of (change-set, config) with no model
   judgement in the hot path.
2. **`core/run/schema/run.schema.json`** — versioned from commit one (P5).
   Fields: `schema_version`, `tier`, `target`, `status`, `policy`, `cursor`,
   `decisions[]`, `parked[]`, `strikes{}`, `budget`, `audit[]`.
3. **Governor capability contract** — `core/run/CONTRACT.md`. Defines the single
   invariant *"the next unit starts"* and the two backends that satisfy it
   (D2/D3/D4), so 32c implements against a written contract rather than
   against 32a's code.
4. **Authority contract** — the trigger table as data, not prose, so the
   classifier and its tests read the same source.

**Commit:** `docs(adr): ADR-0019 decision-authority model + run contracts`

---

## Group 1 — Authority classifier *(parallel with G2)*

**External deps:** G0 contracts.

`core/run/lib/authority.js`. A pure function: change-set + config → `operator` |
`agent` | `park`.

1. Rule-14 triggers as mechanical predicates — `>5` production files,
   `specs/architecture/` touched, needs-ADR, public-contract change, config /
   trust-layer paths.
2. Config overrides layered on top (D9 free axis), never *below* the floor.
3. **Default is `park`** (D6) — an unmatched change never silently becomes the
   agent's call.
4. Classification table tests, including every trigger in isolation, in
   combination, and the ambiguous fall-through.

**Commit:** `feat(run): mechanical decision-authority classifier`

---

## Group 2 — Park primitive *(parallel with G1)*

**External deps:** G0 contracts. Touches `core/swarm/` — coordinate with the
invariance gate.

Extract swarm's inbox into `core/run/lib/inbox.js`; swarm becomes a consumer.
Exactly the ADR-0003 pattern (one engine, thin adapter).

1. Move the implementation; keep the `mkdir`-locked write + resolve + INDEX
   materializer semantics unchanged.
2. Re-point `core/swarm/inbox.js` as a thin re-export — **public surface
   byte-compatible**.
3. Generalize the record shape from swarm-specific (`repo`, `swarm_id`) to
   tier-agnostic (`scope`, `run_id`) with a back-compat reader.
4. **236 swarm tests must stay green** — this is the gate, not a hope.

**Commit:** `refactor(run): extract inbox as the tier-agnostic park primitive`

---

## Group 3 — Governor + safety rails *(sequential)*

**External deps:** G0, G1, G2.

The keystone.

1. `core/run/lib/manifest.js` — read / write / resume, atomic writes, schema
   validation on load, tolerant of unknown forward fields.
2. `core/run/lib/governor.js` — the decision function:
   `no run / not running → allow` · `kill switch → allow` ·
   `budget or strikes exhausted → allow` · `hard gate → allow` ·
   `parked exceeds threshold → allow` · **`otherwise → continue`**.
3. **Interceptor backend** — Claude Code `Stop` hook and Antigravity `Stop`
   event, both via one shared script (`core/scripts/run-governor.sh`) so the two
   adapters cannot drift.
4. Safety rails: turn/token/wall-clock budget; per-task 3-strike counter;
   **external kill switch checked first** (P3) — `.momentum/run-stop`, touched
   by a human, honoured before any other branch.
5. Contract re-injection on continue — the manifest cursor plus the pre-authorized
   action list, so the contract cannot scroll out of context (the actual defect
   this phase exists to fix).

**Commit:** `feat(run): governor — interceptor backend + safety rails`

---

## Group 4 — Wiring *(sequential)*

**External deps:** G3.

1. `momentum run start | status | continue | stop` in `bin/run.js`, dispatched
   from `bin/momentum.js` and surfaced in `--help`.
   `status` renders decisions taken and parked questions **without interrupting
   a live run** (the pre-mortem's mitigation for the silent-wrong-turn failure).
2. `momentum config validate` — the free / coupled / floor model (D9):
   - **coupled:** release granularity may never be finer than merge granularity
   - **coupled:** `merge: per-feature` requires `tdd: strict` + per-phase evidence
   - **floor:** evidence always captured · autonomous runs push ≥ per phase ·
     suite green between landings · protected-branch pushes always human-authorized
   Each rejection names the rule it violates.
3. `tdd: strict` enforcement — a task may not be marked `[x]` without a recorded
   red→green transition (D12).
4. Adapter capability flag `governorBackend: 'interceptor' | 'reinvoker' | null`
   on all four adapters; 32a sets the two interceptors, leaves the others `null`.
5. Swarm wave runner marked **deprecated** in `core/swarm/conductor.js` +
   `/swarm` recipe, pointing at BUG-031 and 32d (D13).
6. Re-baseline 4 adapter fingerprints via `scripts/rebaseline-fingerprints.js`
   (prove zero drift before use, per Phase 30d precedent).

**Commit:** `feat(run): momentum run CLI + config validation + capability flags`

---

## Group 5 — Verification *(sequential)*

**External deps:** G0–G4.

1. **Extend the enumerative production-call-path guard** over `core/run/` — every
   exported symbol must be reachable from a real entry point. Prove it works by
   deliberately orphaning one export and observing the failure (acceptance #5).
   *This is the test that would have caught BUG-031.*
2. E2E: hands-off multi-group run · kill-switch halt · resume-after-kill with no
   lost work · runaway halts at strike limit · `run.json` absent ⇒ v0.42.0
   behaviour byte-unchanged.
3. **Live dogfood** — run a real multi-group phase hands-off and capture the
   transcript as evidence.
4. Retrospective + `## Verification Evidence` (Rule 12 Gate A).

**Commit:** `test(run): e2e + production-call-path guard over core/run`

---

## Risks

| Risk | Mitigation |
|---|---|
| Governor loops forever | Budget + strikes + external kill switch (G3.4), each independently tested |
| Inbox extraction regresses swarm | 236-test gate in G2; public surface kept byte-compatible |
| New runtime becomes dead code (BUG-031 again) | Call-path guard in G5.1, proven red before trusted |
| Interceptor drifts between the two adapters | One shared script, not two (G3.3) |
| Solo behaviour changes | Invariance gate asserted explicitly in G5.2 |
