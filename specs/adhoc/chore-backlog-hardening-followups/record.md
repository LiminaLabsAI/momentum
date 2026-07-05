---
type: Ad-hoc Record
title: "chore-backlog-hardening-followups"
description: "Backlog grooming after the 2026-07-05 four-lane landing day: registry fixes + two mechanism-hardening items + FEAT-008 closure."
---

# Ad-hoc Work Record: chore-backlog-hardening-followups

> **Type**: quick-task
> **Created**: 2026-07-05
> **Branch**: chore/backlog-hardening-followups
> **Backlog**: ENH-053 (registry fix), ENH-056, ENH-057 (filed); FEAT-008 (closed)
> **Status**: shipped

## Current Behavior

Loose ends after the busiest landing day in the repo's history (four lanes,
three releases, one release race): ENH-053 referenced by the OKF record but
never filed (dangling ID in the shared registry); two mechanism gaps observed
live with no backlog rows (`lanes land --execute` self-merge when run from the
lane's own worktree — hit twice; unserialized releases — npm 0.28.0 burned
permanently); FEAT-008 (Gemini CLI adapter) still `open` despite the product
being sunsetted 2026-06-18 and the operator signing off on closure at the
v0.29.0 release.

## Expected Behavior

Backlog rows exist for every referenced/observed item: ENH-053 filed with
attribution to the OKF record; ENH-056 (self-merge guard) and ENH-057
(release serialization) filed with full incident context; FEAT-008 closed
won't-do with the sign-off recorded. Docs-only change.

## Unchanged Behavior

No code, templates, or adapter surfaces change. Other lanes' backlog rows
untouched (append/own-row only, Rule 15).

## Verification Evidence

```
$ grep -c 'ENH-053\|ENH-056\|ENH-057' specs/backlog/backlog.md   # rows present
$ grep 'FEAT-008.*closed-wont-do' specs/backlog/backlog.md        # closure applied
$ npm test  → suite green (docs-only delta vs v0.29.0 main)       output: ℹ tests 804 ℹ pass 804 ℹ fail 0
```
