---
type: Ad-hoc Record
---

# Ad-hoc Work Record: chore-self-upgrade-v0.29.0

> **Type**: quick-task
> **Created**: 2026-07-06
> **Branch**: chore/self-upgrade-v0.29.0 (lane `chore-self-upgrade-v0.29.0`)
> **Backlog**: files ENH-059 (npx global-shadow hazard)
> **Status**: shipped

## Scope

Self-dogfood: upgrade the momentum repo's own scaffolding from lock 0.27.0
to the latest release (0.29.0) with the released CLI, including the OKF
migration pass.

## What happened (and what it proved)

1. **OKF migration is idempotent in the wild**: the self-repo migrated in
   Phase 24; `momentum upgrade` reports "specs/ is already an OKF bundle
   (no changes)" — no double-conversion, no churn. index.json remains
   retired; the bundle stays conformant (224 files).
2. **Managed files were byte-identical** between 0.27.0 and 0.29.0 for a
   claude-code install (0.28/0.29 changed opencode/antigravity surfaces) —
   the ONLY diff is the lock stamp: momentumVersion 0.27.0 → 0.29.0.
3. **Dogfood discovery (ENH-059)**: the first two upgrade attempts silently
   ran momentum **0.27.0** despite `npx -y @avinash-singh-io/momentum@0.29.0`
   — npx executed the stale GLOBAL install (`/opt/homebrew/bin/momentum`),
   ignoring the pinned spec. Fresh npx cache did not help; the registry
   tarball was verified correct (0.29.0). Traced via a NODE_OPTIONS
   require-shim printing `process.argv[1]`. Resolved by updating the global
   (`npm i -g @latest` → 0.29.0) and re-running. The README's npx-staleness
   warning does not cover this shadow — ENH-059 filed.

## Verification Evidence

- `momentum --version` → 0.29.0 (global, post-update); upgrade output ends
  `✓ Upgrade complete` with CLAUDE.md/gitignore unchanged.
- `.momentum/installed.json`: momentumVersion 0.29.0 (sole content diff).
- `momentum okf check` → conformant bundle, 224 markdown files.
- Full suite green on the lane pre-landing — see landing gate output.
