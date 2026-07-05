---
type: Ad-hoc Record
---

# Ad-hoc Work Record: fix-ENH-048-land-gate-lane-branch

> **Type**: quick-task
> **Created**: 2026-07-03
> **Branch**: fix/ENH-048-land-gate-lane-branch (lane `fix-ENH-048-land-gate-lane-branch`, opened via `momentum lanes open`)
> **Backlog**: ENH-048
> **Status**: shipped

## Current Behavior

Two frictions from the first real parallel-bugfix landing (BUG-014 ∥ BUG-015):

1. `gateCheck` in `core/lanes/lib/land.js` reads quick-task records
   (`specs/adhoc/<lane-id>/record.md`) and phase retrospectives from the
   INVOKING worktree's filesystem only. A record committed on the lane branch
   only arrives WITH the merge, so validating required copying it into the
   integration worktree as an untracked file — which then collided with the
   incoming tracked file at `--execute` merge time ("untracked working tree
   files would be overwritten").
2. When the merge happened out-of-band (e.g. after that collision workaround),
   there was no CLI way to mark the manifest `landed` — the operator had to
   call `state.updateLane` via a node one-liner.

## Expected Behavior

1. **Gate reads from the lane branch first.** `gateCheck(cwd, repoRoot, lane)`
   tries `git show <lane.branch>:specs/adhoc/<lane-id>/record.md` (quick-task)
   or `git show <lane.branch>:specs/phases/<ref>/retrospective.md` (phase,
   including the `## Verification Evidence` non-empty section check). When the
   branch copy satisfies the gate, the detail notes "(read from the lane
   branch)". When the path is absent on the branch, the existing filesystem
   check runs unchanged (back-compat with the Phase 21b G5 pattern of
   uncommitted records in the invoking worktree).
2. **`--mark-landed` bookkeeping.** `momentum lanes land <id> --mark-landed`
   requires status `done` AND `git merge-base --is-ancestor <branch> HEAD`;
   then sets `landed` + `landedAt` (note annotated "marked landed out-of-band"),
   sends the usual advisory rebase nudges to other open lanes, and skips
   turn/freshness/gate/merge entirely — the merge already happened. Clear
   refusals when status isn't `done` or the branch isn't merged (manifest
   untouched on refusal). Usage line + `bin/lanes.js` HELP updated.

This very record is committed on the lane branch — the feature admits itself:
the landing gate for this lane reads this file via `git show`.

## Unchanged Behavior

- Spike lanes stay gate-exempt; turn (FIFO/`--force`), freshness
  (never forceable), `--execute` current-branch guard, advisory overlap
  warnings, and the never-push stance are all untouched.
- Filesystem fallback keeps the 21b G5 uncommitted-record flow landable;
  existing refusal messages keep their prefixes (tests match on them).
- `gateCheck` remains exported; no other callers existed (grep verified), so
  the `(cwd, repoRoot, lane)` signature change is self-contained.
- land.js/bin/lanes.js are CLI code, not install payload — adapter
  fingerprints unchanged (full suite green with no re-baseline).

## Verification Evidence

```
$ node --test tests/lanes-land.test.js
✔ ENH-048: quick-task record committed only on the lane branch — gate passes,
  --execute lands without collision            (headline: today's exact failure)
✔ ENH-048: phase retrospective committed only on the lane branch passes the gate
✔ ENH-048: --mark-landed records an out-of-band merge and nudges open lanes
✔ ENH-048: --mark-landed refused when the lane is not done, and when the branch
  is not merged
tests 10, pass 10, fail 0    (6 existing back-compat tests stay green)

$ npm test
tests 707, pass 707, fail 0   (703 → 707 with the four new tests; no
                               fingerprint drift)
```

The headline test commits the record ONLY on the lane branch (asserts it is
absent from the invoking worktree), validates (`✓ gate[quick-task]: … read from
the lane branch`), then `--execute` merges cleanly and the record arrives with
the merge — no untracked-file collision.

## Commit

Single commit on `fix/ENH-048-land-gate-lane-branch`:
`fix(lanes): land gate reads evidence from the lane branch; --mark-landed bookkeeping (ENH-048)`
— touches `core/lanes/lib/land.js` (dual-source gateCheck + --mark-landed),
`bin/lanes.js` (HELP), `tests/lanes-land.test.js` (+4), and the lane-scoped
tracking (this record, the ENH-048 backlog row, one changelog bullet).
