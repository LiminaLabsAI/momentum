---
type: Retrospective
---

# Phase 27 — Retrospective: Lifecycle Cleanup & Default-Branch Hardening

> **Released**: v0.34.0 (pending operator merge/release approval)
> **Suite**: 927 → **951** (+24)

## Summary

Closes the two lifecycle bugs the operator hit on a fresh project — **BUG-025**
(a phase branch hijacking the forge default branch) and **BUG-026** (nothing
cleaning worktrees/branches/lane-state after work lands) — plus **ENH-063**
(`lanes close` only removed the worktree). The design is one reusable, git-only,
default-branch-safe `cleanupTarget()` whose *trigger* is driven by `end_state`:
the agent auto-cleans when it performs the terminal merge; a human/forge merge
defers to `momentum lanes reconcile` (verify-before-clean). Two operator
requirements landed as first-class decisions — the confirm→verify→clean
handshake and the tracking-before-release gate — and the PR-review workflow got
a first-class `end_state: open-pr`. G4 fixed the `._*`/`.bak` litter at its
source (the codex/opencode skills generators accepted `._x.md`) and added
`momentum doctor --clean`.

## What went well

- **The mental model held.** "A branch is spent once it lands on the terminal
  branch; only *who merges* changes *when/which command* cleans" collapsed four
  potential cleanup paths into one action + two entry points. No divergent code.
- **The dogfood was real.** This repo carried exactly the cruft the phase fixes:
  2 stale lane worktrees for released work, an orphan Claude worktree, 19 `._*`
  junk skill dirs, 8 `.bak`. G5 cleaned all of it **with the new tools**
  (`lanes reconcile --execute`, `lanes cleanup`, `doctor --clean --execute`) —
  the tree is now provably clean.
- **The default-branch guard is load-bearing and tested.** `cleanupTarget()`
  refuses to delete the forge default; the bare-remote fixtures prove a phase
  branch never becomes default when the terminal branch is established first.

## What didn't (challenges)

- **`start-project.md` was at the Antigravity 12,000-char ceiling**, so the
  BUG-025 detail could not live there. Correct home turned out to be
  `start-phase.md` anyway (founding pushes nothing; the first push is in
  start-phase). Lesson: put the fix at the actual failure site, not the
  conceptually-adjacent one.
- **Recipe edits drift 4 adapter fingerprints every time.** Re-baselined 4×
  across G1/G2/G3/G5. A repeatable `rebaseline` helper (fixed `fixture-project`
  dir name for BUG-006 determinism) made it mechanical.
- **The self-repo upgrade dogfood over-reached.** Running `momentum upgrade .`
  to sync install copies surfaced *pre-existing* Phase-25/26 opencode/AGENTS.md
  drift and a template defect (BUG-027) unrelated to this phase — reverted to
  keep scope clean; filed BUG-027.

## Lessons

- Vendor size limits (Antigravity 12k) are real constraints — check `wc -c`
  before adding to a large recipe.
- Verify-before-clean (Rule 12) applies to *humans* too: `reconcile` never
  trusts "yes I merged it" — it checks ancestor containment.
- macOS `/var`→`/private/var` symlinks require realpath comparison for
  self-worktree detection.

## Follow-ups

- **BUG-027** (P3) — generated AGENTS.md `sync-config` table row missing its
  trailing `|`.
- Self-repo multi-adapter install (opencode surfaces + AGENTS.md) lags Phase
  25/26 — sync at a maintenance pass (out of this phase's scope).

## Verification Evidence

Captured fresh on the phase branch `phase-27-lifecycle-cleanup` (2026-07-09).

### `npm test` (full suite)

```
$ npm test
ℹ tests 951
ℹ pass 951
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

Baseline at phase start was 927; +24 net (G0 +8, G1 +2, G2 +6, G3 +4, G4 +3,
G5 +1). New test files: `lane-cleanup.test.js`, `default-branch-protection.test.js`,
`land-autoclean.test.js`, `complete-phase-gates.test.js`, `lanes-reconcile.test.js`,
`upgrade-hygiene.test.js`.

### Self-repo dogfood — the tree is clean

```
$ git worktree list
/Users/avinash/Workspace/Projects/cerebrio/momentum  95539ee [phase-27-lifecycle-cleanup]

$ momentum doctor --clean
Stray artifacts (dry-run — pass --execute to remove):
  ✓ none — tree is clean

$ git branch --list 'feat/*'      # both released feature branches removed
(none)
```

Before G5: `git worktree list` showed `momentum.lanes/feat-open-knowledge-format`
(Phase 24, v0.27.0) and `momentum.lanes/feat-site-redesign` (landed) plus an
orphan `.claude/worktrees/thirsty-euler-781615`; `find . -name '._*'` = 19;
`.bak` = 8. After cleaning **with the phase's own tools**: all zero.

### New-command smoke

```
$ momentum lanes reconcile
reconcile against 'origin/main' (terminal branch 'main'):
  ℹ no open/landed lanes to reconcile

$ package.json version
0.34.0
```

### BUG-025 guard (from the suite)

`tests/lane-cleanup.test.js` — "cleanupTarget REFUSES to delete a remote branch
that is the forge default (BUG-025 guard)" ✓
`tests/default-branch-protection.test.js` — "phase branch did not hijack the
default" + "guard refuses main" ✓
