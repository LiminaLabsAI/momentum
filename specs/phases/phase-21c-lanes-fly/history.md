# Phase 21c — Lanes Fly — History

> Append-only. Format per Rule 8.

### [DECISION] 2026-07-03 — Phase planned under the standing family directive; scope was operator-committed
Topics: waves, lanes, roadmap
Affects-phases: phase-21c-lanes-fly
Affects-specs: specs/planning/platform-parallel-lanes.md
Detail: FEAT-028 (operator-committed 2026-07-02) converted into groups under the operator's "complete this phase family" session goal. plan.md is folded into overview.md (compact phase); stacked on `phase-21b-lanes-run` with releases landing in order on operator approval. Byte-stability of swarm behavior is a hard constraint (its e2e scenarios + full test surface must pass unchanged).

---
### [DECISION] 2026-07-03 — Lane-state contract stays INTERNAL; publication decision handed to the operator
Topics: lanes, lane-state-contract, waves
Affects-phases: phase-21c-lanes-fly
Affects-specs: specs/decisions/0003-recursive-wave-planner.md, specs/planning/platform-parallel-lanes.md
Detail: The arc's one one-way door (publishing the lane-state file format so external UIs can render momentum lanes) is NOT walked through: the format is one day into dogfood, nothing external consumes it, and the operator — whose call an irreversible publication should be — is away. stateVersion stays 1/internal; the recommendation recorded in ADR-0003 §5 is to publish only after multi-week dogfood stability. Surfaced to the operator via status.md Next Actions.

---

### [FEATURE] 2026-07-03 — G3: three-ideas e2e demo green with committed evidence
Topics: waves, three-ideas-demo, lanes, merge-queue
Affects-phases: phase-21c-lanes-fly
Affects-specs: none
Detail: tests/waves-e2e-demo.test.js drives the full FEAT-028 UX on a synthetic repo: `momentum waves` plans (wave 1: auth+api; wave 2: ui[deps both]) → lanes opened per wave-1 node by the CLI → work + done → sequential landings through the queue (second lane correctly refused stale, rebased, landed) → wave-1 phases complete → next `waves` run unblocks ui with a lane suggestion. Evidence at evidence/three-ideas-demo.txt captured by the one-shot scripts/capture-three-ideas-demo.sh (env-gated sink — npm test never rewrites it, per the TD-006 lesson).

---
### [NOTE] 2026-07-03 — G4: docs + verification + v0.25.0 release prep (parked); FAMILY COMPLETE
Topics: waves, site-docs, verification, release
Affects-phases: phase-21c-lanes-fly
Affects-specs: specs/planning/roadmap.md#Timeline, specs/planning/platform-parallel-lanes.md
Detail: Site parallel-work Fly section shipped; lanes recipe gains the waves planning section (fingerprints re-baselined; only intended drift). Fresh verification: suite 697/697, smoke ×3, site build green. Version 0.25.0. This closes the Parallel Lanes family — Walk (conventions) → Run (mechanism) → Fly (planner) — all three built + verified on stacked branches; releases land in order on operator approval per the runbook in status.md Next Actions #1.

---
