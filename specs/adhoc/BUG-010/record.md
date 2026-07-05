---
type: Ad-hoc Record
---

# Ad-hoc Work Record: BUG-010

> **Type**: quick-task
> **Created**: 2026-07-02
> **Branch**: fix/BUG-010-sweep-error-visibility
> **Backlog**: BUG-010
> **Status**: shipped

## Current Behavior

`momentum ecosystem upgrade --autostash` caught per-repo upgrade failures and
stored `err.message` in the sweep's results array, and printed it once live
(`❌ upgrade failed: <message>`) — but `printSweepSummary()` (`bin/ecosystem.js`)
only ever rendered `r.status` in the final summary table, never `r.error`. On
a multi-repo sweep the live line scrolls off; the only durable record was
`✗ <id>: failed`, with no way to know why after the fact.

## Expected Behavior

The final sweep summary line for a `failed` member includes the captured
error message inline, e.g. `✗ open-guard: failed  — EACCES: permission
denied, ...`, so the cause is visible in the durable summary without needing
to scroll back through the live per-repo upgrade log.

## Unchanged Behavior

- Partial-failure tolerance is unchanged: one bad repo still never aborts
  the fleet sweep (exit code stays 0, other members still process).
- No change to `upgrade()`, `withAutostash()`, or the autostash safety
  invariant (stash is still never dropped on conflict).
- Non-`failed` summary lines (`upgraded`, `dirty-skip`, `missing`, `no-agent`,
  `would-upgrade`) are byte-for-byte unchanged.

## Scope note — deeper root cause still open

BUG-010's second half — "make the upgrade write-path resilient so a mid-write
throw under autostash doesn't leave a half-upgrade requiring a manual re-run"
— is **not** addressed here. That throw was not reproducible synthetically
(per the original bug report) and the two real repos that hit it
(open-guard, open-shield-python) are already past the failure (re-run
completed cleanly, now at lock 0.22.1), so there is no live state left to
diagnose against. BUG-010 stays open for that half; this record closes only
the "error message scrolled / wasn't durable" complaint.

## Verification Evidence

```
$ node --test tests/ecosystem-upgrade.test.js
✔ ecosystem upgrade — sweeps all clean members and reports per-repo
✔ ecosystem upgrade — skips a dirty member, --force upgrades it
✔ ecosystem upgrade --dry-run — writes nothing to any member
✔ ecosystem upgrade — a failed member reports its error in the sweep summary (BUG-010)
✔ ecosystem upgrade — reports a missing member and continues the sweep
tests 5, pass 5, fail 0

$ npm test
tests 644, pass 644, fail 0
```

New test simulates a mid-write throw (modify a shipped file so upgrade must
rewrite it, then lock the containing directory so the `.bak` write throws
EACCES) and asserts the final `Sweep summary` block — not just the live
log — contains the error text.
