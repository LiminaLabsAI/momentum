# Phase 21b — Lanes Run — History

> Append-only. Format per Rule 8.

### [DECISION] 2026-07-03 — Phase planned under the standing family directive; scope was operator-committed
Topics: lanes, roadmap, concurrent-workstreams
Affects-phases: phase-21b-lanes-run
Affects-specs: specs/planning/platform-parallel-lanes.md
Detail: The operator's session goal ("complete this phase family as I will be away") authorizes converting the ALREADY operator-committed 21b scope (FEAT-026 + FEAT-027 + ENH-047, adopted 2026-07-02 in the platform brainstorm and the roadmap row) into this plan without a live brainstorm dialogue. Refinements from the 21a trial are folded in (explicit registry binding; substrate preflight; computed board replaces shared-table rows). The release itself stays parked on operator approval, stacked below 21a's.

---

### [DECISION] 2026-07-03 — 21b runs as a stacked lane on the unreleased 21a branch
Topics: lanes, merge-discipline
Affects-phases: phase-21b-lanes-run, phase-21a-lanes-walk
Affects-specs: none
Detail: v0.23.0's merge to main is parked at the session permission gate, so this phase branches from `phase-21a-lanes-walk` — exactly the Rule 15 stacked-lane case (child rebases onto parent until the parent lands, then onto main). The family becomes a real-world stacked-landing exercise for the queue mechanics it builds.

---
