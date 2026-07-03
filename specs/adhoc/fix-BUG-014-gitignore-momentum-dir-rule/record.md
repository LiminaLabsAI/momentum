# Ad-hoc Work Record: fix-BUG-014-gitignore-momentum-dir-rule

> **Type**: quick-task
> **Created**: 2026-07-03
> **Branch**: fix/BUG-014-gitignore-momentum-dir-rule (lane: fix-BUG-014-gitignore-momentum-dir-rule, opened via `momentum lanes open`)
> **Backlog**: BUG-014
> **Status**: shipped

## Current Behavior

`refreshGitignore()` (`bin/momentum.js`, FEAT-024) additively appends
`.momentum/*` + `!.momentum/installed.json` to the target repo's `.gitignore`
— but when the repo already has a directory-level rule `.momentum/` (every
pre-Phase-20 install has one, e.g. the Phase-7a self-repo line and the
cerebrio fleet), git cannot re-include a file under an ignored DIRECTORY. The
negation never takes effect: `git add .momentum/installed.json` refuses with
"paths ignored", the Phase-20 D1 committed lock file stays silently ignored,
and `upgrade` reports success anyway.

## Expected Behavior

`refreshGitignore()` detects any line that is exactly `.momentum/` or
`/.momentum/` (modulo surrounding whitespace) and neutralizes it by commenting
it out in place:

```
# .momentum/   (disabled by momentum upgrade — directory rule defeats !.momentum/installed.json, BUG-014)
```

After the upgrade, `git check-ignore` confirms `.momentum/installed.json` is
committable while `.momentum/<anything-else>` stays ignored. The
neutralization runs even when the modern pair is already present (a prior
upgrade may have appended it under the still-winning legacy rule), matching
the function's existing contract: `.bak` backup before modifying, idempotent
(second run returns `unchanged`, zero byte changes), `--dry-run` aware
(prints intent per legacy-rule count and per missing-rule count, writes
nothing, makes no `.bak`).

## Unchanged Behavior

- No user line is ever removed — commenting-out is the single designed
  exception here and preserves the line's content in place.
- `.momentum/*`, `!.momentum/…` negations, comments (including pre-existing
  `#` lines), and all unrelated lines are never touched by the neutralizer.
- The additive append path (missing-rules-only, marker comment, `.bak`,
  return values `added`/`updated`/`unchanged`) is unchanged when no legacy
  directory rule exists.
- `.gitignore` remains user-owned: still never recorded as a managed file,
  never orphan-eligible.
- CLI-only change — no install payload touched, so adapter fingerprints must
  not (and did not) drift.

## Verification Evidence

```
$ node --test tests/gitignore-refresh.test.js
✔ upgrade — appends missing momentum/OS rules to an old .gitignore (with .bak)
✔ upgrade — .gitignore refresh is idempotent (re-run appends nothing)
✔ upgrade — .gitignore is never recorded as a managed file (not orphan-eligible)
✔ upgrade --dry-run — does not modify .gitignore
✔ upgrade — comments out a legacy .momentum/ dir rule so the lock-file negation takes effect (BUG-014)
✔ upgrade — legacy .momentum/ neutralization is idempotent (re-run changes nothing)
✔ upgrade --dry-run — reports the legacy .momentum/ rule but leaves .gitignore byte-identical (BUG-014)
✔ upgrade — modern .momentum/* rule and negation are NOT commented (BUG-014 scope guard)
tests 8, pass 8, fail 0

$ npm test
tests 701, pass 701, fail 0
```

The headline new test initializes a real git repo, recreates a pre-Phase-20
`.gitignore` (`.momentum/`, no negation), runs `upgrade`, and asserts with
`git check-ignore` itself: `.momentum/installed.json` NOT ignored,
`.momentum/other-file` still ignored — plus commented-line presence, appended
pair, preserved user lines, and `.bak`.

## Lane Commit

Single lane commit on `fix/BUG-014-gitignore-momentum-dir-rule`
(`fix(upgrade): neutralize legacy .momentum/ dir rule so the lock-file
negation works (BUG-014)`) — sha is the branch tip; this record is part of
that commit, so the sha is recorded in the lane's `lanes done` output and
`git log` rather than inline here.
