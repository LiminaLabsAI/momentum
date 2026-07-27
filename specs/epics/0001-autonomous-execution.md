---
type: Epic
id: "0001"
slug: autonomous-execution
status: planned
owner: avinash-singh-io
started: 2026-07-27
phases:
  - phase-32a-governor
  - phase-32b-epic-tier
  - phase-32c-adapter-parity
  - phase-32d-cross-repo
policy_release: per-feature
policy_push: per-phase
policy_tdd: strict
policy_authority: rule-14-triggers
tags: [autonomy, governor, run-manifest, decision-authority, scope-grant, epic-tier, adapter-parity]
---

# Epic 0001 — Autonomous Execution

> **This is the first `Epic` record.** The tier it describes does not exist yet
> (it ships in phase 32b), so this file is authored by hand as the bootstrap
> instance. Everything below is what `/brainstorm-epic` will emit once built.

## Objective

Momentum executes an approved plan end-to-end — one phase or five, one repo or
many — **without re-interviewing the operator** and **without stopping for
pre-authorized actions**, while preserving spec-driven discipline and the human
trust boundary.

## Why now

Momentum plans at four tiers and executes at one.

| Tier | Ordering engine | Runner |
|---|---|---|
| ecosystem / initiative | `swarm` waves | ☠️ dead — zero production callers (**BUG-031**) |
| repo, multi-phase | `momentum waves` (phase scale) | ❌ never existed |
| phase, multi-group | `momentum waves --tasks` | ⚠️ prose contract, no enforcing mechanism |
| group | — | ✅ works |

The single execution engine momentum has is governed by prose in
`core/commands/start-phase.md` that is read once at invocation and forgotten by
group four. The cross-repo runtime it advertises is dead code. And there is no
record type at all for "one feature, several phases" — although the project has
been *running* epics for months under a letter-suffix convention
(`21a/b/c`, `30a/b/c/d/e`, `31a/b/c`), held together by operator memory rather
than by a record.

### The measured premise

The naive form of "brainstorm exhaustively, then run blind" is **empirically
dead in this repo**. Across `specs/phases/*/history.md`:

| Entry type | Count |
|---|---|
| `[DECISION]` | 221 |
| `[SCOPE_CHANGE]` | 30 |

Every phase has some; the median is ~6. Phase 14 had 19 of its 20 entries be
decisions or scope changes. These arose *during* implementation, after the
brainstorm closed. Any design that does not answer **"what happens at decision
#7"** is decoration.

## Decisions

Settled during the 2026-07-27 design session. **These are never re-asked** —
per-phase specs are derived from this table, not re-interviewed.

| # | Decision | Rationale |
|---|---|---|
| D1 | **One runner parameterized by tier** (group / phase / epic / initiative) | Mirrors ADR-0003's one-wave-engine-at-every-scale; three divergent runners is what that ADR exists to prevent |
| D2 | **Governor invariant is "the next unit starts"**, not "block the stop" | Only 2 of 4 adapters can block a stop; "block" is a Claude-Code-shaped abstraction |
| D3 | **Interceptor backend** — Claude Code + Antigravity `Stop` | Both verified to support blocking (Antigravity live-verified in Phase 22b, five-event surface) |
| D4 | **Re-invoker backend** — Codex `notify`/`agent-turn-complete`, opencode `session.idle` | Both are observe-only, fire-and-forget. Re-invocation doubles as the external-driver end-state, so the weaker adapters buy the better architecture |
| D5 | **Decision authority classified mechanically by reusing Rule 14 escalation triggers** | Rule 14 already encodes blast radius (>5 files, `specs/architecture/`, needs-ADR, public contract). Zero new taxonomy, zero operator burden |
| D6 | **Ambiguous authority → park, never guess** | Fail-safe default. Unknown blast radius is not the agent's to absorb |
| D7 | **`.momentum/run.json` is durable state and the resume point** | State-in-files is already momentum doctrine (`swarm.md`: *"agents are stateless across turns"*); it is also the compaction survival strategy |
| D8 | **Scope grant replaces the single-use `merge-approved` sentinel for epic runs** | **One-way door — ADR-0020 required (32b).** See "The scope grant" below |
| D9 | **Config model = free axes / coupled constraints / invariant floor** | Extends ADR-0009's trust-invariant / mechanism-configurable split rather than inventing a parallel one |
| D10 | **Per-phase specs derived just-in-time from this record; never authored upfront** | Upfront specs for phase 3 are hypotheses about a codebase phases 1–2 have not changed yet. Worse, they turn every operator amendment into a merge conflict |
| D11 | **Amendments: forward-only absorbed silently; backward-invalidating = hard stop** | The human→run channel. Absent from the first draft; added after operator review |
| D12 | **`tdd: strict` is mandatory in autonomous mode** | With the human absent, red→green is the only evidence of progress that is not the agent's own opinion. TDD stops being hygiene and becomes the control signal |
| D13 | **Swarm wave runner deprecated → replaced, not repaired, not yet deleted** | Fully repaired it still runs one phase per repo. Deprecate in 32a, replace in 32d, delete only once covered. Keep `inbox` (the park primitive) and `wave-ordering` (already a thin `core/waves` adapter) |
| D14 | **The tier is named `epic`** | Work-type-neutral (a multi-phase *refactor* is not a "feature"); no collision with `FEAT-`/`feat/`; mirrors `initiative` one tier down. Two-way door — codemod-renameable |

### The scope grant (D8) — reasoning captured now, formalized in ADR-0020

Today `.momentum/merge-approved` is a **single-use** sentinel: one human "yes"
buys one protected-branch push. `release: per-feature` needs an authorization
that covers N landings from one approval.

The grant is **not** a weakening of the trust layer; it is a re-granularization:

- scoped to **one named epic**, with an explicit branch allowlist it cannot exceed
- **hard expiry**
- every consumption **audited and attributed**
- **revocable** at any time
- minted **once, at plan approval** — the moment the operator has maximum context

ADR-0009 declares the trust layer invariant. What changes is *when* and *at what
granularity* a human authorizes, never *whether*. This reasoning is recorded
here so ADR-0020 can be written in 32b against real machinery rather than
against a sketch — but the argument is not deferred, only its formalization.

## Phase graph

```
Wave 1:  32a Governor
Wave 2:  32b Epic Tier    ∥    32c Adapter Parity
Wave 3:  32d Cross-Repo
```

| Phase | Deps | Delivers |
|---|---|---|
| **32a** Governor | — | One phase runs hands-off, with durable state and real rails, on the interceptor adapters |
| **32b** Epic Tier | 32a | The `epic` record, JIT spec derivation, `release: per-feature`, scope grant, amendments |
| **32c** Adapter Parity | 32a | Re-invoker backend; all four adapters run the same conformance suite |
| **32d** Cross-Repo | 32b + 32c | Runner lifted to the initiative tier; swarm wave runner removed; BUG-032 nudge silenced |

`32b` and `32c` are independent surfaces over 32a's contract, so the epic
exercises `momentum waves` at phase scale on itself.

## Completion criteria

Checkable, per `/brainstorm-initiative`'s standard — "it works" is not a criterion.

1. A ≥2-phase epic runs to completion with **exactly one** human approval, from a clean clone.
2. The same run completes on **all four adapters** — interceptor on two, re-invoker on two — under one conformance suite.
3. A **forward-only amendment** mid-run is absorbed with **zero** prompts; a **backward-invalidating** one hard-stops and names the affected completed work.
4. `momentum config validate` **rejects** `release: per-phase` + `merge: per-feature` with an explanation naming the incoherence.
5. Every production entry point under `core/run/` is covered by the enumerative call-path guard — **no second `pollTurn`**.
6. **Phases 32b, 32c and 32d were each built by the 32a runner.** Dogfood is a release gate on 32a, not a follow-up.

## Non-goals

- Cross-machine / team runs — the v0.37–0.39 team plane absorbs this later; do not couple now.
- Interactive mid-run steering beyond `momentum run status` and the kill switch.
- Replacing `/brainstorm-idea` or `/start-project`.
- **Repairing** swarm's wave runner (D13).
- A configuration matrix beyond the free/coupled/floor model in D9.

## Open questions

| # | Question | Resolve by |
|---|---|---|
| Q1 | Does the scope grant re-granularize or weaken ADR-0009's trust layer? | ADR-0020, phase 32b |
| Q2 | Does the re-invoker's cold-start-per-phase cost outweigh its context-hygiene benefit? | Measured in 32c |
| Q3 | Is `epic` the right noun once operators use it? | Reviewable any time — two-way door |

## Amendments

> Operator changes made *during* the epic run land here, newest last, and become
> inputs to the derivation of every not-yet-started phase (D10/D11).

_(none yet)_
