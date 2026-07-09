---
type: Plan
---

# Phase 7c — Plan (reconstructed)

> **Reconstructed 2026-07-09** (Phase 28 hygiene) from the roadmap, changelog,
> and status record. Phase 7c shipped v0.10.0 on 2026-05-28, before the 4-file
> phase discipline was rigorously enforced; its directory survived only as an
> `overview.md` ghost (recreated in the Phase-24 OKF migration). This file
> documents the completed work after the fact — it is not the original plan.

```
# Sequential: G0 → G1 → G2 → G3
```

Phase 7c is the third of the 7a/7b/7c split of the original Phase 7
(subagent engine). 7a authored the planning contracts (brainstorm write-gate +
the `/start-phase` autonomous-execution contract, spec only); 7b delivered
Adapter Contract v3 + the Codex adapter; 7c ships the **execution engine** that
makes the 7a autonomy contract real, plus TDD (Rule 13) and a per-task retry
budget.

## Group 0 — Autonomous execution engine
**Sequential.** Implement the subagent/autonomous execution loop that runs a
phase plan end-to-end per the 7a contract on Adapter Contract v3 — proceed
silently through pre-authorized actions, stop only at the merge+release gate.

## Group 1 — TDD opt-in (Rule 13)
**Sequential.** Rule 13 (test-first development) as an opt-in project-rules
extension: Red → verify-failure → Green → Refactor loop, with the red-flag
guards against post-hoc tests.

## Group 2 — Per-task retry budget
**Sequential.** A bounded retry budget per task so repeated unresolved failure
on the same task triggers a discretionary stop rather than an infinite loop.

## Group 3 — Verification + release
**Sequential.** Regression coverage for the engine + contract; docs; v0.10.0
release.
