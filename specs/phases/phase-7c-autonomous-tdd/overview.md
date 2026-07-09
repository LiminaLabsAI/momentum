---
type: Phase
status: complete
tags: [phase-7c, autonomous-execution, tdd, rule-13, retry-budget, antigravity, systematic-debug, subagent]
---

# Phase 7c — Autonomous Execution & TDD

> **Overview reconstructed 2026-07-09** (Phase 28 hygiene) from the roadmap +
> changelog. Phase 7c shipped **v0.10.0 on 2026-05-28**; the directory had
> survived only as an OKF-migration ghost. Content is back-filled after the fact.

## Goal

Make the Phase-7a **autonomous-execution contract** real: an engine that runs an
approved phase plan end-to-end on Adapter Contract v3 — proceeding silently
through pre-authorized actions and stopping only at the merge+release gate —
plus **TDD as an opt-in** (Rule 13) and a **per-task retry budget** that turns
repeated failure into a discretionary stop rather than a loop.

Third of the 7a/7b/7c split: 7a authored the planning contracts, 7b delivered
Adapter Contract v3 + the Codex adapter, 7c ships the execution engine.

## Scope

### In
- Subagent/autonomous execution loop over a phase plan (per the 7a contract)
- Rule 13 — test-first (Red → verify-failure → Green → Refactor), opt-in
- Bounded per-task retry budget

### Out
- Adapter Contract changes (delivered in 7b)
- New adapters beyond those from 7b

## Deliverables

| Deliverable | Verification |
|---|---|
| Autonomous execution engine | Regression coverage; one hard stop at merge+release |
| Rule 13 TDD opt-in | Documented in agent rules; red-flag guards present |
| Per-task retry budget | Repeated failure triggers a discretionary stop |

## Acceptance criteria

1. An approved plan executes end-to-end without per-group approvals, stopping
   only at the merge+release gate.
2. Rule 13 is available as an opt-in project-rules extension.
3. A per-task retry budget bounds repeated failure.
4. Released as v0.10.0.
