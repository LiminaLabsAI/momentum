---
type: Ad-hoc Record
---

# Ad-hoc record — lane `phase-21b-lanes-run-g4` (Phase 21b G4 sub-lane)

> Work type: quick-task (bounded single-group implementation executed as a
> CLI-opened lane; Rule 14). This record is the lane's graded landing-gate
> evidence (ADR-0002 §4).

## Current behavior (before)

`momentum lanes signal` / `momentum lanes inbox` routed to a lazy module
that did not exist — the dispatcher reported "not shipped yet". No
cross-session messaging for lanes.

## Expected behavior (after)

`core/lanes/lib/signals.js` ships `cmdSignal` (pause/resume/redirect/
kill/message; monotonic 4-digit seqs surviving ack history; locked
atomic writes; `from` = sender branch) and `cmdInbox` (oldest-first
listing; `--ack <seq>` / `--ack-all` move to `processed/`). Signals
written from any worktree are readable/ackable from any other.

## Unchanged

Lane state layer (state.js), board (G3), landing (land.js), all
non-lanes CLI surfaces. No new dependencies.

## Verification evidence (Rule 12, fresh from the lane session)

- `node --test tests/lanes-signals.test.js` → **6/6 pass** (type
  round-trips + seq monotonicity, listing format, single ack, ack-all +
  seq continuation, error paths exit 1, cross-worktree read/ack).
- No-regression: `tests/lanes-state.test.js` + `tests/lanes-open-close.test.js` → 13/13.
- Live dogfood on this repo: `✓ signal 0001-message → lane
  'phase-21b-lanes-run-g3'` (cross-lane, sender recorded as
  `phase-21b-lanes-run-g4`); `✓ lane 'phase-21b-lanes-run-g4' marked done
  — position 1 of 1 in the landing queue`.
- Lane commit: `0137e30` on branch `phase-21b-lanes-run-g4`.
