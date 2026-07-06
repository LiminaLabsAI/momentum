---
type: Ad-hoc Record
---

# Ad-hoc Work Record: fix-issue-sweep-v0.30.1

> **Type**: quick-task
> **Created**: 2026-07-06
> **Branch**: fix/issue-sweep-v0.30.1
> **Backlog**: resolves BUG-018, BUG-021, ENH-050; closes BUG-010 (cannot-reproduce), TD-004/TD-005/ENH-030 (stale rows); releases with the already-landed BUG-022 fix
> **Status**: shipped

## Scope — operator directive: "fix all the issues, then release"

1. **BUG-021 (P1)**: `ecosystem init` refuses to scaffold into an existing
   project (marker detection + sibling-topology guidance; `--force` escape).
   Guard tests assert refusal, README preservation, and the happy paths.
2. **ENH-050 (P1, both foot-guns)**: `lanes open` bases new branches on the
   integration branch (not the parked HEAD) and reports the base;
   `lanes land` refuses self-landing (lane branch == current branch) —
   both failure modes were hit live this week; both regression-tested.
3. **BUG-018 (P2)**: "no ecosystem" test assertions isolated from
   os.tmpdir() cross-suite contamination (nested cwd + bounded parent walk).
4. **Closures with verification**: BUG-010 (16 days unreproducible, write
   path since replaced), TD-004 + TD-005 + ENH-030 (verified already done —
   stale rows).
5. Rides with this release: BUG-022 fix (pointer preservation, landed
   earlier on main but absent from npm 0.30.0 — the release motive).

## Verification Evidence

- New/changed guard tests green: ecosystem-init-guard (2), lanes-land
  self-guard (1), lanes-open base (1), isolated silence tests (2 files).
- Full suite green pre-landing — see landing gate output.
- TD-004/TD-005/ENH-030 verified via zero-match greps recorded in-session.
