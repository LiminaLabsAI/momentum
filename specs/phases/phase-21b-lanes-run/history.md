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

### [FEATURE] 2026-07-03 — G4 (lane): cross-session signals + lane inbox
Topics: lanes, signals, inbox
Affects-phases: phase-21b-lanes-run
Affects-specs: none
Detail: `core/lanes/lib/signals.js` ships `momentum lanes signal <id> <pause|resume|redirect|kill|message> [text]` (typed JSON files written under the state lock into the lane's inbox at the shared git dir, monotonic 4-digit seqs surviving ack history) and `momentum lanes inbox <id> [--ack <seq>|--ack-all]` (ack moves to processed/). `tests/lanes-signals.test.js` 6/6 green — including a signal written from the main worktree read+acked from a linked lane worktree — with lanes-state + lanes-open-close 13/13 no-regression. Dogfooded live as a CLI-opened lane (D8): sent `momentum lanes signal phase-21b-lanes-run-g3 message "G4 lane says hello across sessions"` → `✓ signal 0001-message → lane 'phase-21b-lanes-run-g3'` — a real cross-lane signal into the concurrent G3 sibling's inbox on this repo.

---

### [FEATURE] 2026-07-03 — G3 (lane): ambient board + landing queue
Topics: lanes, board, queue-pressure
Affects-phases: phase-21b-lanes-run
Affects-specs: none
Detail: `core/lanes/lib/board.js` ships `momentum lanes` (per-lane line with plan node, grade, status, age, ✉ unread badge, ⚠overlap flag + the always-on queue-pressure footer) and `momentum lanes queue` (FIFO by doneAt with rebase-freshness vs the current worktree's HEAD), both with `--json` marked `unstable: true` per ADR-0002. `tests/lanes-board.test.js` 7/7 green; state + open-close regression 13/13. Dogfood evidence (D8): executed inside a lane opened by the new CLI itself, and the board rendered this repo's two live lanes — including G4's cross-session signal as ✉1 on this lane's row.

---
### [NOTE] 2026-07-03 — G5: both sub-lanes landed THROUGH the merge queue; FEAT-027 dogfood complete
Topics: lanes, merge-queue, graded-gates, landing
Affects-phases: phase-21b-lanes-run
Affects-specs: none
Detail: `momentum lanes land` landed its own phase's G4 then G3 lanes: the pre-rebase validate correctly refused on freshness ("never forceable"), each lane rebased (G3's rebase = the usual keep-both tracking appends), quick-task gates read the lanes' `specs/adhoc/<id>/record.md`, `--execute` merged --no-ff and stamped `landed`, board showed the queue draining to empty, suite green after each landing (677/677 → 684/684). land.js itself was pre-built while the lanes ran (file-disjoint; order swap within G5 noted). Dispatcher nit from G3's report fixed (`momentum lanes --json` → board). Evidence: `evidence/d8-landing.txt` + `evidence/d8-lane-open.txt`.

---
### [NOTE] 2026-07-03 — G6: docs + verification + v0.24.0 release prep (parked, stacked behind 21a)
Topics: lanes, site-docs, verification, release
Affects-phases: phase-21b-lanes-run
Affects-specs: specs/planning/roadmap.md#Timeline, specs/planning/platform-parallel-lanes.md
Detail: /lanes recipe shipped to all three adapters (fingerprints re-baselined; drift = recipe + template Rule 15 mechanism pointer only); site parallel-work page's "What's coming in Run" replaced with the shipped momentum-lanes section; README updated. Verification fresh: suite 684/684, 3-adapter smoke exit 0, site build exit 0 with content probes. Version bumped to 0.24.0. Release parked on operator approval, stacked behind v0.23.0 — the two-step runbook (rebase-onto-updated-main per Landing Order, suite, merge, tag, gh release, npm publish) recorded in status.md Next Actions #1.

---
