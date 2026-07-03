# Phase 21b — Lanes Run — Tasks

> Mirrors `plan.md`. Mark `[/]` in-progress, `[x]` done (fresh Rule 12
> evidence only). Execution: G0 → G1 → G2 → (G3 ∥ G4 as CLI-opened lanes)
> → G5 → G6.

## Group 0 — Scaffold + ADR-0002
- [x] Phase files + tracking (status row, changelog, index.json) — commit 9a450bf
- [x] ADR-0002 `specs/decisions/0002-lane-state-and-graded-gates.md`

## Group 1 — State layer
- [x] `core/lanes/lib/state.js` (anchor, registry, manifests, locks, plan-node inference)
- [x] `tests/lanes-state.test.js` green (6/6 — incl. cross-worktree anchor + 6-process lock stress)

## Group 2 — open / done / close
- [x] `bin/lanes.js` open/done/close + momentum.js dispatch + help (lazy routes for G3/G4/G5 modules — lanes stay file-disjoint)
- [x] Substrate detection (worktree create/reuse, treehouse hint) + preflight warnings (BUG-012-class exec bits, node engines)
- [x] `tests/lanes-open-close.test.js` green (7/7); shared inbox read-helpers pre-landed in state.js (13/13 combined)

## Group 3 — Board + queue (LANE)
- [x] `momentum lanes` board + queue pressure footer
- [x] `momentum lanes queue` + `--json`
- [x] `tests/lanes-board.test.js` green (7/7; state+open-close regression 13/13)

## Group 4 — Signals + inbox (LANE)
- [x] `momentum lanes signal` (5 types) + `momentum lanes inbox --ack` (`core/lanes/lib/signals.js`; monotonic seqs across ack history; live cross-lane signal G4→G3 sent on this repo)
- [x] Board unread badge — data side: the badge counts exactly these inbox files via `state.unreadCount` (G4 writes/acks them); badge *rendering* ships with G3's board
- [x] `tests/lanes-signals.test.js` green (6/6, incl. cross-worktree read+ack; no regression: lanes-state + lanes-open-close 13/13)

## Group 5 — Landing (FEAT-027 + ENH-047 close-out)
- [x] G3/G4 lanes landed per Rule 6 VIA `momentum lanes land --execute` — freshness refusal → rebase → land, quick-task gates fed by `specs/adhoc/<id>/record.md`; suite green after each landing (677/677, then 684/684); evidence at `evidence/d8-landing.txt`
- [x] `momentum lanes land` (turn, freshness, graded gates, overlap warnings, --execute; advisory rebase nudges to open lanes) — pre-built while lanes ran (order swap logged)
- [x] `tests/lanes-land.test.js` green (6/6); dispatcher nit fixed (`momentum lanes --json` now routes to the board)

## Group 6 — Docs + verification + release prep
- [ ] `core/commands/lanes.md` recipe; template Rule 15 pointer
- [ ] Site + README updates; fingerprints re-baselined
- [ ] Full suite + 3-adapter smoke + site build green
- [ ] Retrospective + version bump 0.24.0 + parked release runbook
