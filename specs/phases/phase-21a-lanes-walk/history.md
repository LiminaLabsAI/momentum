# Phase 21a — Lanes Walk — History

> Append-only. Format per Rule 8.

### [DECISION] 2026-07-03 — Phase 21 structured as family 21a/21b/21c
Topics: lanes, concurrent-workstreams, roadmap
Affects-phases: phase-21a-lanes-walk, phase-21b-lanes-run, phase-21c-lanes-fly
Affects-specs: specs/planning/platform-parallel-lanes.md, specs/planning/roadmap.md#Timeline
Detail: Operator wants everything from the 2026-07-02 platform session covered in this phase's plan. Sized per the 7a/7b/7c precedent as a planned-together family: 21a Walk (conventions + branch resolution, v0.23.0), 21b Run (FEAT-026/027 + ENH-047, v0.24.0), 21c Fly (FEAT-028, v0.25.0). Reach/Intelligence version targets slide to v0.26.0/v0.27.0.

---

### [DECISION] 2026-07-03 — Dogfood-in-phase trial gates the template release
Topics: dogfood, verification, concurrent-workstreams
Affects-phases: phase-21a-lanes-walk
Affects-specs: none
Detail: G2 ∥ G3 execute as two live lanes (own branch/worktree/session) under the G0/G1 conventions — the phase IS the trial. Thresholds written before the trial (SIEVE discipline): zero tracking corruption, zero misorientation, merge overhead <15 min/week. Breach ⇒ learnings recorded, no template release in v0.23.0.

---

### [DECISION] 2026-07-03 — Branch→phase resolution is in Walk scope
Topics: lanes, commands, rules
Affects-phases: phase-21a-lanes-walk
Affects-specs: none
Detail: Minimal enabling mechanism included (script + 5 recipe preambles resolve "your phase" from the current branch): without it two sessions cannot know which tasks.md is theirs and the conventions would be unfollowable prose. Registry/board/signals stay 21b.

---

### [NOTE] 2026-07-03 — ADR-0001 is the first real ADR; brainstorm provenance
Topics: rules, concurrent-workstreams
Affects-phases: phase-21a-lanes-walk
Affects-specs: specs/decisions/0001-concurrent-workstreams.md
Detail: specs/decisions/ contained only the template until now. Full provenance of this phase: recurring operator pain (2026-07-02) → SIEVE (ENH-046) → landscape research (research-parallel-agent-landscape.md) → FORGE platform direction (platform-parallel-lanes.md) → operator roadmap decision (Lanes over Reach) → /brainstorm-phase (this file set).

---
