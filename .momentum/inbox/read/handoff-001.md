# handoff-001

<!-- MOMENTUM_HANDOFF_BEGIN -->
**fromRepo:** /Volumes/T7 Shield/Workspace/Projects/cerebrio/cerebrio-sapience
**toRepo:** /Volumes/T7 Shield/Workspace/Projects/cerebrio/momentum
**handoffId:** 001
**createdAt:** 2026-06-20T02:59:48.825Z
**originatingPhase:** phase-52-connector-cdc-retraction
**originatingHistoryRef:** 

## Summary
BUG: init/upgrade skips git-hook install whenever core.hooksPath is set (even to the default .git/hooks) without checking if momentum hooks are present — repos end up with zero enforcement hooks while install reports success. Make hook install additive/self-healing.

## Decisions
- Root cause: bin/momentum.js:619 guard `if (huskyPresent || (existingHooksPath && existingHooksPath !== ourPath))` skips ALL git-hook install when core.hooksPath != '.githooks' (ourPath) — including the default .git/hooks — without checking whether momentum's own hooks already exist there.
- Impact: install/upgrade prints success while the repo has NO commit-msg/pre-push. Rule 6 lifecycle enforcement is silently absent. Reproduced in cerebrio-sapience: core.hooksPath=.git/hooks, hooks dir held only .sample files.
- Desired fix: when a foreign/default hooksPath is configured, detect whether momentum hooks (commit-msg, pre-push, run-check.js, contract.js) are present at that path; if missing, install them ADDITIVELY into the configured hooksPath. Never clobber a non-momentum hook of the same name. Keep husky (.husky/) as a genuine skip.
- Manual fix applied in cerebrio-sapience (= the target automatic behavior): `cp -n core/git-hooks/*` into the configured .git/hooks, then chmod +x commit-msg & pre-push. Verified: commit-msg rejects a non-Conventional subject (exit 1) and accepts a good one (exit 0).
- Edge case: cp onto exFAT volumes creates ._ AppleDouble sidecars; the installer should avoid/clean these (write files directly instead of cp -p, or rm ._* after copy).

## Files touched
- [momentum src to fix] bin/momentum.js — git-hook install block ~lines 598-645; the skip guard is line 619
- [momentum src] core/git-hooks/contract.js — LIFECYCLE.hooksPath = '.githooks' (canonical target)
- [momentum tests] tests/git-hooks.test.js — add case: hooksPath set to .git/hooks with no momentum hooks present -> installs additively
- [momentum tests] tests/lifecycle-contract.test.js — assert warn-not-clobber semantics for the new path
- [evidence, not to edit] cerebrio-sapience/.git/hooks/{commit-msg,pre-push,run-check.js,contract.js} — manually installed + verified working

## Verification commands
- `cd momentum && node --test tests/git-hooks.test.js`
- `Repro/fix check: git init /tmp/mtest && git -C /tmp/mtest config core.hooksPath .git/hooks && node bin/momentum.js upgrade /tmp/mtest && test -x /tmp/mtest/.git/hooks/commit-msg && echo OK`
- `Regression: confirm a real husky (.husky/) setup still produces a genuine skip (no clobber)`

## Open questions
- Detection signature for "is this momentum's hook": match the header comment ("momentum commit-msg hook (Phase 19...")") or add an explicit marker line? Needed to decide install-vs-skip per file.
- When hooksPath != .githooks, install into the configured path (respect user choice) or relocate to .githooks and re-point core.hooksPath? Recommend respecting the configured path, additively.
- Should `upgrade` self-heal repos that installed before this fix (idempotent backfill of missing hooks)?

<!-- MOMENTUM_HANDOFF_END -->
