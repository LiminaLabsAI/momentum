---
type: Phase
status: in-progress
epic: autonomous-execution
tags: []
deps: [phase-32b-epic-tier, phase-32c-adapter-parity]
---

# phase-32d-cross-repo

> **Derived, not brainstormed.**
> Generated from `specs/epics/0001-autonomous-execution.md` on 2026-07-27 with no
> operator interview (Epic D10). Every decision below was settled when the
> epic was written and is NOT re-litigated here. Decisions are durable;
> plans are perishable — this file is the perishable half.

## Goal

Close the epic: lift the runner to the **initiative** tier so a feature spanning
several repos runs on one approval, remove the dead machinery it replaces, and
repay the verification debt 32c uncovered.

Four things, three of them owed:

- **Initiative tier** — the fourth and last scale of D1's one-runner-per-tier.
- **BUG-031** — swarm's wave runner has never had a production caller. Deprecated
  in 32a, superseded by `momentum run`, removed here.
- **BUG-032** — `cross-repo-gate.sh` is advisory but its message reads
  *"before going further"*, which an agent obeys. This is the defect that started
  the whole conversation: *"in ecosystem mode it was not able to execute the whole
  phase in one go."*
- **Guard debt** — 32c found the orphan guard blind to single-line exports. It had
  been green over code it could not see for two phases, so 32a's and 32b's
  "guard clean" claims are **unearned until the repaired guard is run over their
  surface.** That re-run is a deliverable here, not a nicety.

## Inherited decisions

> From the epic record. Never re-asked.

- D1 — **One runner parameterized by tier** (group / phase / epic / initiative) _(Mirrors ADR-0003's one-wave-engine-at-every-scale; three divergent runners is what that ADR exists to prevent)_
- D2 — **Governor invariant is "the next unit starts"**, not "block the stop" _(Only 2 of 4 adapters can block a stop; "block" is a Claude-Code-shaped abstraction)_
- D3 — **Interceptor backend** — Claude Code + Antigravity `Stop` _(Both verified to support blocking (Antigravity live-verified in Phase 22b, five-event surface))_
- D4 — **Re-invoker backend** — Codex `notify`/`agent-turn-complete`, opencode `session.idle` _(Both are observe-only, fire-and-forget. Re-invocation doubles as the external-driver end-state, so the weaker adapters buy the better architecture)_
- D5 — **Decision authority classified mechanically by reusing Rule 14 escalation triggers** _(Rule 14 already encodes blast radius (>5 files, `specs/architecture/`, needs-ADR, public contract). Zero new taxonomy, zero operator burden)_
- D6 — **Ambiguous authority → park, never guess** _(Fail-safe default. Unknown blast radius is not the agent's to absorb)_
- D7 — **`.momentum/run.json` is durable state and the resume point** _(State-in-files is already momentum doctrine (`swarm.md`: *"agents are stateless across turns"*); it is also the compaction survival strategy)_
- D8 — **Scope grant replaces the single-use `merge-approved` sentinel for epic runs** _(**One-way door — ADR-0020 required (32b).** See "The scope grant" below)_
- D9 — **Config model = free axes / coupled constraints / invariant floor** _(Extends ADR-0009's trust-invariant / mechanism-configurable split rather than inventing a parallel one)_
- D10 — **Per-phase specs derived just-in-time from this record; never authored upfront** _(Upfront specs for phase 3 are hypotheses about a codebase phases 1–2 have not changed yet. Worse, they turn every operator amendment into a merge conflict)_
- D11 — **Amendments: forward-only absorbed silently; backward-invalidating = hard stop** _(The human→run channel. Absent from the first draft; added after operator review)_
- D12 — **`tdd: strict` is mandatory in autonomous mode** _(With the human absent, red→green is the only evidence of progress that is not the agent's own opinion. TDD stops being hygiene and becomes the control signal)_
- D13 — **Swarm wave runner deprecated → replaced, not repaired, not yet deleted** _(Fully repaired it still runs one phase per repo. Deprecate in 32a, replace in 32d, delete only once covered. Keep `inbox` (the park primitive) and `wave-ordering` (already a thin `core/waves` adapter))_
- D14 — **The tier is named `epic`** _(Work-type-neutral (a multi-phase *refactor* is not a "feature"); no collision with `FEAT-`/`feat/`; mirrors `initiative` one tier down. Two-way door — codemod-renameable)_

## Scope

**In:** initiative-tier run wiring (`momentum run start initiative <slug>`) ·
swarm wave-runner **removal** (BUG-031) · cross-repo nudge silenced under a run
grant + reworded (BUG-032) · orphan guard **widened beyond `core/run/`** and
re-run over 32a/32b's surface · epic closure.

**Out:** live multi-repo dogfood against the cerebrio fleet (operator-driven,
tracked as a VAL item) · anything not needed to close Epic 0001.

## Deliverables

| Deliverable | Verification |
|---|---|
| `momentum run start initiative <slug>` walks the initiative's member graph | `npm test` |
| Swarm wave runner **removed**; `inbox` + `wave-ordering` retained | `npm test` — swarm suite stays green minus the removed surface |
| BUG-032 — nudge silent under a covering grant; reworded from imperative to observation | `npm test` |
| Orphan guard widened + **re-run over 32a/32b** | `npm test` — the debt 32c named |
| Epic 0001 closed | `momentum epic status` |

## Acceptance criteria

> Checkable. "It works" is not a criterion.

1. An **initiative-tier run** resolves its first ready member from the ecosystem graph.
2. `pollTurn` / `recordRepoComplete` and the wave-advance path are **gone**, not deprecated — and the swarm suite is green without them.
3. The cross-repo nudge is **silent** when an active run grant covers the members, and its residual wording states a fact rather than issuing an instruction.
4. The orphan guard covers **all of `core/run/` plus `core/swarm/` and `core/ecosystem/`**, and reports the true state of 32a's and 32b's exports.
5. Solo / no-run behaviour byte-unchanged; full suite green.

## Run policy (inherited)

release: per-feature · push: per-phase · tdd: strict
