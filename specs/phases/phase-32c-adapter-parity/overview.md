---
type: Phase
status: in-progress
epic: autonomous-execution
tags: []
deps: [phase-32a-governor]
---

# phase-32c-adapter-parity

> **Derived, not brainstormed.**
> Generated from `specs/epics/0001-autonomous-execution.md` on 2026-07-27 with no
> operator interview (Epic D10). Every decision below was settled when the
> epic was written and is NOT re-litigated here. Decisions are durable;
> plans are perishable — this file is the perishable half.

## Goal

Bring **all four** supported agents to the same autonomous behaviour.

32a shipped the **interceptor** backend — Claude Code and Antigravity can block a
turn ending, so the governor blocks and injects in place. Codex and opencode
cannot: `notify`/`agent-turn-complete` and `session.idle` are fire-and-forget,
they can only *observe* a turn ending. This phase ships the **re-invoker**
backend, which satisfies the same invariant by launching a fresh agent
invocation pointed at the run manifest.

The operator's requirement was explicit: *"I need all the supported agent should
have this behaviour and feature."* Two of four is not parity.

The re-invoker is also the **external-driver architecture** momentum wanted
eventually — the loop lives in a process rather than in an agent's good
intentions, which is why it is structurally incapable of rotting the way
`pollTurn` did (BUG-031). The weaker adapters bought the better design.

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

## Operator amendments since the epic was written

> Forward-only amendments made during the run. These are INPUTS to this
> phase, which is the whole reason specs are derived rather than authored
> upfront — under upfront authoring each of these would be a merge
> conflict against specs already written.

- 2026-07-27 — prefer GCS over S3 for any later blob storage work

## Scope

**In:** `core/run/lib/reinvoke.js` — the re-invoker backend · headless
invocation contract per adapter · backend selection from the `governorBackend`
capability · **one conformance suite both backends must pass** · Codex `notify`
+ opencode `session.idle` wiring · capability-gated script installation
(deferred here from 32a) · documented degradation per adapter.

**Out:** initiative tier + swarm wave-runner removal → **32d** · widening the
orphan guard beyond `core/run/` → **32d** · live vendor-CLI dogfood of Codex and
opencode (needs their runtimes; tracked as VAL items, not blocking).

## Deliverables

| Deliverable | Verification |
|---|---|
| `core/run/lib/reinvoke.js` — re-invoker backend | `npm test` |
| `core/run/lib/backend.js` — selects interceptor vs re-invoker from capability | `npm test` |
| **Conformance suite** both backends pass, unmodified | `npm test` — the same assertions run twice |
| Codex `notify` wiring (`config.toml`) | `npm test` + fingerprint |
| opencode `session.idle` plugin wiring | `npm test` + fingerprint |
| Capability-gated script install | `npm test` — non-interceptor adapters stop receiving `run-governor.sh` |
| Degradation documented per adapter | `npm test` — `core/adapter-capabilities.md` |

## Acceptance criteria

> Checkable. "It works" is not a criterion.

1. **The conformance suite passes for BOTH backends** — the same assertions,
   run twice, with no backend-specific carve-outs. A suite that special-cases a
   backend is not a parity suite.
2. `governorBackend` is `'reinvoker'` on Codex and opencode; all four adapters
   report a non-null backend.
3. The re-invoker is **idempotent**: firing twice for one logical turn starts the
   next unit once (`CONTRACT.md` requirement, cursor is the guard).
4. The re-invoker **fails open** — every error path allows the stop.
5. Non-interceptor adapters no longer receive `run-governor.sh`.
6. Solo / no-run behaviour byte-unchanged; swarm **236/236**; orphan guard green.
7. Full suite green; net-new ≥ 40.

## Run policy (inherited)

release: per-feature · push: per-phase · tdd: strict
