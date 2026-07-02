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

### [DECISION] 2026-07-03 — G0: ADR-0001 accepted; self-repo adopts Rule 15 + lane-scoped rules
Topics: concurrent-workstreams, lanes, merge-discipline, rules
Affects-phases: phase-21a-lanes-walk
Affects-specs: specs/decisions/0001-concurrent-workstreams.md, CLAUDE.md#Rule 15, CLAUDE.md#Rule 6: Git Lifecycle, specs/status.md#Active Phase
Detail: ADR-0001 authored and accepted (multi-active-phase model, branch↔phase binding, sequential-merge discipline, off-lane brainstorms/spikes, three pre-written trial thresholds, TD-008 relationship). Self-repo CLAUDE.md gains Rule 15 (lane binding / lane-scoped tracking / landing / off-lane) with Why + red flags + counters; Rules 2/4/5/8 rebound branch-scoped ("the phase bound to your branch"); Rule 6 gains the Landing Order subsection (one lane at a time, suite green between landings, remaining lanes rebase, stacked lanes parent-first). status.md Active Phase converted to the multi-row lane board (Phase | Branch | Status | Progress) with own-row-touch note. impact-map topics were already in place from the brainstorm commit. Suite 644/644 green after edits.

---

### [DISCOVERY] 2026-07-03 — Tracking-index drift found during /start-phase setup
Topics: tracking, phases-index
Affects-phases: none
Affects-specs: specs/phases/index.json, specs/phases/README.md
Detail: specs/phases/index.json still carried phase-7c as "in-progress" (complete since v0.10.0, 2026-05-28) and had no phase-20 entry; specs/phases/README.md was missing the phase-20 row and still marked 17.5 "pending release". All repaired in the phase-start commit (971c7d3) — no separate backlog item; fixed in place as tracking hygiene.

---

### [FEATURE] 2026-07-03 — G1: branch→phase resolution shipped (script + 5 recipes + tests)
Topics: lanes, branch-phase-resolution, commands, hooks
Affects-phases: phase-21a-lanes-walk
Affects-specs: none
Detail: core/scripts/check-history-reminder.sh now resolves the lane from the current branch (phase-* branch ↔ specs/phases/<branch>/; fallback = status.md Active Phase rows, first row with an existing dir; non-phase branch → ad-hoc sink preserving ENH-044; detached HEAD → fallback; nothing resolvable → original generic wording). log/validate/sync-docs/start-phase/complete-phase recipes gain Rule 15 lane-binding preambles plus multi-row-aware step edits (validate accepts N rows; start-phase adds-own-row; complete-phase removes-own-row + Landing Order gate). tests/phase-resolution.test.js: 7 tests (5 planned cases + generic fallback + core↔self-repo mirror integrity). Suite 651/651.

---

### [NOTE] 2026-07-03 — G1: stale self-repo installed copies self-healed; fingerprints re-baselined
Topics: dogfood, fingerprint-snapshot, tracking
Affects-phases: phase-21a-lanes-walk
Affects-specs: none
Detail: The self-repo's installed copies (.claude/commands/{log,validate,sync-docs,complete-phase}.md and scripts/check-history-reminder.sh) had drifted BEHIND core (missing Phase-19 phase-optional updates — the repo was never re-upgraded post-v0.21.0). Mirroring for G1 copied the new core versions over them, healing the stale drift in the same stroke; a new mirror-integrity test pins script parity going forward. All three adapter install fingerprints re-baselined with meta (6 intended drifts each: 5 recipes + hook script; zero unintentional).

---

### [NOTE] 2026-07-03 — Lanes A and B opened for the G2∥G3 concurrency trial (D6)
Topics: lanes, dogfood, trial-thresholds
Affects-phases: phase-21a-lanes-walk
Affects-specs: specs/status.md#Active Phase
Detail: Fork point for the dogfood-in-phase trial. Two lane branches created from this commit: `phase-21a-lanes-walk-g2` (Lane A — templates + fingerprint) and `phase-21a-lanes-walk-g3` (Lane B — site page + README), each in its own worktree with its own agent session. Board rows added for both lanes (conductor-owned edit); from here each lane touches only its own row/section per Rule 15. Landing in G4 follows the Rule 6 Landing Order with the phase branch as the integration point (recursive per ADR-0001). Trial scored against the three pre-written thresholds.

---
