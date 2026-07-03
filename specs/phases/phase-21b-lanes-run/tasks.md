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
- [ ] `bin/lanes.js` open/done/close + momentum.js dispatch + help
- [ ] Substrate detection + preflight warnings
- [ ] `tests/lanes-open-close.test.js` green

## Group 3 — Board + queue (LANE)
- [ ] `momentum lanes` board + queue pressure footer
- [ ] `momentum lanes queue` + `--json`
- [ ] `tests/lanes-board.test.js` green

## Group 4 — Signals + inbox (LANE)
- [ ] `momentum lanes signal` (5 types) + `momentum lanes inbox --ack`
- [ ] Board unread badge
- [ ] `tests/lanes-signals.test.js` green

## Group 5 — Landing (FEAT-027 + ENH-047 close-out)
- [ ] G3/G4 lanes landed per Rule 6 (evidence for D8)
- [ ] `momentum lanes land` (turn, freshness, graded gates, overlap warnings, --execute)
- [ ] `tests/lanes-land.test.js` green

## Group 6 — Docs + verification + release prep
- [ ] `core/commands/lanes.md` recipe; template Rule 15 pointer
- [ ] Site + README updates; fingerprints re-baselined
- [ ] Full suite + 3-adapter smoke + site build green
- [ ] Retrospective + version bump 0.24.0 + parked release runbook
