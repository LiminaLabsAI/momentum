---
type: Phase
status: in-progress
epic: autonomous-execution
tags: [autonomy, governor, run-manifest, decision-authority, park-primitive, kill-switch, tdd-strict, call-path-guard]
deps: []
---

# Phase 32a — Governor

## Goal

A single approved phase executes **end-to-end, hands-off** — durable state, real
safety rails, and a mechanism that cannot be forgotten — on the two adapters
that can intercept a stop.

First phase of **Epic 0001 — Autonomous Execution**. Target **v0.43.0**.

## Why

The Autonomous Execution Contract in `core/commands/start-phase.md:128` is well
written and routinely violated. Its anti-patterns table explicitly forbids
*"Asking 'ready for Group 1?' after Group 0"* — and that is exactly what
happens, because the contract is **prose read once at invocation** and by group
four it has scrolled out of context. Nothing re-asserts it. Nothing enforces it.

Compare the brainstorm gate, which never fails: sentinel file plus a
`PreToolUse` hook that mechanically blocks the write. Momentum can stop an agent
from **writing**. It has no way to stop one from **stopping**.

That asymmetry is this phase. The governor is the dual of the brainstorm gate.

> **BUG-009 discipline.** This phase ships a mechanism, not a claim. Every
> enforcement statement it makes must be backed by a code path the enumerative
> call-path guard proves is reachable from a production entry point — the
> BUG-028/029/030 class, and the reason **BUG-031** exists at all.

## Key decisions

Inherited from the epic record (`specs/epics/0001-autonomous-execution.md`) —
not re-litigated here. Phase-local decisions only:

| # | Decision | Rationale |
|---|---|---|
| P1 | Governor lives at `core/run/`, **not** `core/lanes/` or `core/swarm/` | It is tier-agnostic by construction (D1); nesting it under a tier would pre-commit the abstraction |
| P2 | The park primitive is **extracted** from swarm in this phase, not stubbed | The classifier's `ambiguous → park` branch (D6) needs a real sink, or its default path ships untested |
| P3 | Kill switch is an **external file the hook checks first** | The agent is the thing misbehaving; a kill switch inside its discretion is not a kill switch |
| P4 | Interceptor backend only; re-invoker deferred to 32c | Keeps 32a shippable and gives 32c a proven contract to implement against |
| P5 | `run.json` schema is versioned from commit one | It is the resume point (D7); an unversioned resume format is a migration trap |

## Scope

### In

- Run manifest (`.momentum/run.json`) — schema, read/write, resume
- Mechanical decision-authority classifier (Rule 14 triggers)
- Park primitive — inbox extracted from swarm into `core/run/`
- Governor + **interceptor** backend (Claude Code, Antigravity)
- Safety rails — budget, 3-strike failure counter, external kill switch
- `momentum run start | status | continue | stop`
- `momentum config validate` — free / coupled / floor model
- `tdd: strict` enforcement
- Enumerative production-call-path guard extended over `core/run/`
- Swarm wave runner marked **deprecated** (D13) — not removed

### Out

- The `epic` tier and JIT spec derivation → **32b**
- Scope grant / ADR-0020 → **32b**
- Amendments channel → **32b**
- Re-invoker backend, Codex + opencode → **32c**
- Cross-repo / initiative tier, swarm removal, BUG-032 → **32d**

## Deliverables

| Deliverable | Verification |
|---|---|
| **ADR-0019** — decision-authority model | `npm test` + `node bin/momentum.js validate` |
| `core/run/schema/run.schema.json` (versioned) | `npm test` — schema round-trip + rejection cases |
| `core/run/lib/manifest.js` — read / write / resume | `npm test` |
| `core/run/lib/authority.js` — Rule-14 classifier | `npm test` — full classification table incl. `ambiguous → park` |
| `core/run/lib/inbox.js` — park primitive (extracted) | `npm test` — **236 swarm tests stay green** |
| `core/run/lib/governor.js` + interceptor backend | `npm test` + live hands-off multi-group run |
| Safety rails — budget / strikes / kill switch | `npm test` — runaway sim halts at the limit |
| `momentum run` CLI (4 subcommands) | `npm test` + CLI smoke |
| `momentum config validate` | `npm test` — every illegal combo rejected with a reason |
| Call-path guard over `core/run/` | `npm test` — **fails** if any export loses its production caller |
| 4 adapter fingerprints re-baselined | `npm test` — drift is only the intended files |

Verification defaults from `specs/config.md`: `test_command = npm test`,
`build_command = none`.

## Acceptance criteria

1. A **multi-group phase completes with zero** "shall I continue?" prompts.
2. Kill switch halts within one turn; `momentum run continue` resumes from the
   manifest with **no lost work**.
3. Runaway simulation (a perpetually failing task) **halts at the strike limit**
   rather than looping.
4. Swarm suite stays **236/236** after the inbox extraction; public surface of
   `core/swarm/inbox.js` is byte-compatible.
5. Call-path guard **fails** when any `core/run/` export is orphaned — proven by
   deliberately orphaning one and observing the red.
6. `momentum config validate` rejects `release: per-phase` + `merge: per-feature`.
7. Full suite green; **net-new tests ≥ 40**.
8. Solo / no-run behaviour is **byte-unchanged** — a repo with no `run.json`
   behaves exactly as v0.42.0 did.

## Reference specs

- `specs/epics/0001-autonomous-execution.md` — the governing record
- ADR-0003 — one wave engine at every scale (the principle D1 mirrors)
- ADR-0009 — trust layer invariant vs. configurable mechanisms (D9 extends)
- ADR-0017 — layered ecosystem enforcement (why advice ≠ gate)
- ADR-0018 — shipped runtime (the call-path-guard precedent)
- `core/commands/start-phase.md` — the prose contract being mechanized
