# Ad-hoc record — lane `phase-21b-lanes-run-g3` (Phase 21b G3 sub-lane)

> Work type: quick-task (bounded single-group implementation executed as a
> CLI-opened lane; Rule 14). This record is the lane's graded landing-gate
> evidence (ADR-0002 §4).

## Current behavior (before)

`momentum lanes` / `momentum lanes queue` routed to a lazy module that
did not exist — the dispatcher reported "not shipped yet". No ambient
visibility into lanes.

## Expected behavior (after)

`core/lanes/lib/board.js` ships `cmdBoard` (one line per non-closed lane
with plan node, grade, status, age, ✉ unread badge, ⚠ overlap flag;
ALWAYS ends with the queue-pressure footer) and `cmdQueue` (FIFO of done
lanes with grade + rebase-freshness flags); both honor `--json` marked
`unstable: true` (internal format per ADR-0002).

## Unchanged

Lane state layer (state.js), signals (G4), landing (land.js), all
non-lanes CLI surfaces. No new dependencies.

## Verification evidence (Rule 12, fresh from the lane session)

- `node --test tests/lanes-board.test.js` → **7/7 pass** (empty board +
  non-repo error; closed-hidden render; pressure footer; ✉ badge from an
  fs-planted signal — no G4 dependency; overlap flag + negative control;
  FIFO + fresh/stale; --json shapes).
- No-regression: `tests/lanes-state.test.js` + `tests/lanes-open-close.test.js` → 13/13 (20/20 combined).
- Live dogfood on this repo: board rendered both real lanes including a
  **real cross-session ✉1** (G4's live signal); G4's queue row read
  `fresh`; `✓ lane 'phase-21b-lanes-run-g3' marked done — position 2 of 2`.
- Lane commit: `3062102` on branch `phase-21b-lanes-run-g3`.
- Handed to G5: dispatcher nit — `momentum lanes --json` (no subcommand)
  is rejected; `lanes board --json` works.
