---
type: Phase
status: not-started
tags: [preferences, lifecycle, release-gate, forge-aware, workflow-config]
---

# Phase 26 — Project Preferences

## Goal

Build a structured preferences surface (`specs/preferences.md`) that recipe
templates read at execution time, so gate copy, verification commands, release
commands, and the merge/landing flow ADAPT to the actual project instead of
hardcoding npm/GitHub/staging-main assumptions. Separates the trust layer's
invariant principle (human authorization for protected-branch pushes) from its
configurable mechanisms (which branches, how far the agent goes, which commands
run).

Closes: ENH-061, BUG-024. Pairs with ADR-0008 (Phase 25 lifecycle).

## Key Decisions

| # | Decision | Source |
|---|----------|--------|
| D1 | Preferences live in `specs/preferences.md` — authored markdown, version-controlled, same model as status.md/backlog.md (ENH-061 Option A) | ENH-061 analysis |
| D2 | Trust layer principle (human authorization for protected-branch pushes) is INVARIANT; mechanisms (branch_flow, end_state, protected_branches) are PREFERENCES | Operator brainstorm 2026-07-09 |
| D3 | "No human approval" stays an auditable escape hatch (`MOMENTUM_SKIP_HOOKS=1`), NEVER a preference toggle | Operator brainstorm 2026-07-09 |
| D4 | Three git-only end-states ship: `merge-after-yes`, `staging-promotion`, `feature-branch-only`. `pull-request` deferred (needs forge API → Platform phase) | Operator brainstorm 2026-07-09 |
| D5 | `momentum upgrade` writes inferred preferences for FOUNDED projects only; gate stays charter+roadmap; preferences-exists is a `/validate` WARNING not failure | Operator brainstorm 2026-07-09 |
| D6 | `/brainstorm-idea` collects preferences conversationally as the idea crystallizes (suggests defaults if user unsure); `/start-project` authors `specs/preferences.md` in its batch | Operator brainstorm 2026-07-09 |
| D7 | `protected_branches` derived from `branch_flow` by the CLI, written to `.momentum/preferences-cache.json`; `pre-push` hook reads cache, falls back to `['main','master','staging']` if missing | Implementation design |
| D8 | `readPreferences()` fails closed: unknown/missing value → current default (npm/GitHub) with a warning, never a wrong action | ENH-061 recommendation |

## Scope

### In
- `core/preferences.js` — read/write/infer/derive library with tests
- `specs/preferences.md` as the preference surface (authored, version-controlled)
- `momentum init` infers + writes default preferences from manifests + git remote
- `momentum upgrade` writes inferred preferences for founded projects; re-infers on manifest drift
- `.momentum/preferences-cache.json` — derived machine-readable cache for hook consumption
- `pre-push` hook reads `protected_branches` from cache (falls back to hardcoded defaults)
- `/brainstorm-idea` gains preference questions in-conversation
- `/start-project` authors `specs/preferences.md` in its founding batch
- `/brainstorm-phase` reads preferences (verification command defaults)
- `/start-phase` reads preferences (release gate copy, end_state, branch_flow)
- `/complete-phase` reads preferences (release commands, verification commands, branch_flow walk)
- `/validate` gains "founded ⟹ preferences exist" WARNING check + drift detection
- BUG-024 fix: drop forge-specific `gh release create` from global templates
- ADR-0009: trust layer invariant-by-default, mechanisms are preferences
- Self-repo dogfood: upgrade writes preferences for momentum itself
- Site docs + README: preferences documented
- Adapter fingerprint re-baseline x4 (claude-code/codex/antigravity/opencode)

### Out
- `pull-request` end-state (needs forge API -> Platform phase, filed as FEAT-031)
- Forge API integration of any kind (gh/glab CLI calls, auth, PR creation)
- `versioning_scheme: calver` support (pre-push tag regex stays semver — filed as ENH-062)
- `auto_delete_branch_after_merge` preference (always-true default stays)
- `escalation_file_threshold` preference (Rule 14's ~5 files stays hardcoded)
- `lint_command` / `typecheck_command` preference fields (deferred — recipes can add later)
- Per-agent preference overrides (ENH-061 open-question #4 -> no, prefs are project-wide per ADR-0007)
- `momentum config` / `momentum preferences` CLI subcommand (file is hand-editable; `momentum doctor` surfaces drift)

## v1 Preference Field Set

### Project
| Key | Type | Values | Default inference |
|-----|------|--------|-------------------|
| `language` | enum | `node`/`python`/`rust`/`go`/`dotnet`/`ruby`/`java`/`none` | from manifest file |
| `framework` | string | `nextjs`/`astro`/`fastapi`/`actix`/`none`/... | from deps |

### Verification
| Key | Type | Default inference |
|-----|------|-------------------|
| `test_command` | string | `npm test` / `pytest` / `cargo test` / `go test ./...` / `dotnet test` |
| `build_command` | string/`none` | `npm run build` / `cargo build --release` / `go build` / `none` |

### Release
| Key | Type | Values | Default inference |
|-----|------|--------|-------------------|
| `publish_target` | enum | `npm`/`pypi`/`crates-io`/`nuget`/`none`/`custom` | from manifest |
| `git_forge` | enum | `github`/`gitlab`/`bitbucket`/`gitea`/`forgejo`/`bare-ssh` | from `git remote get-url origin` |
| `release_command` | string | `gh release create` / `glab release create` / `none` | from git_forge |
| `release_flow` | enum | `tag-and-publish`/`tag-and-deploy`/`tag-only`/`custom` | from publish_target |

### Git workflow
| Key | Type | Values | Default |
|-----|------|--------|---------|
| `end_state` | enum | `merge-after-yes`/`staging-promotion`/`feature-branch-only` | `merge-after-yes` |
| `branch_flow` | list | e.g. `[staging, main]` / `[main]` / `[uat, staging, main]` | `[staging, main]` |
| `protected_branches` | list | derived from `branch_flow` (all entries in the promotion sequence) | `[staging, main]` |

## Deliverables + Verification

| # | Deliverable | Verification command |
|---|-------------|---------------------|
| D1 | `core/preferences.js` library (read/write/infer/derive) + tests | `npm test -- --grep preferences` |
| D2 | `momentum init` writes inferred `specs/preferences.md` | `tests/preferences-init.test.js` |
| D3 | `momentum upgrade` writes inferred preferences for founded projects | `tests/preferences-upgrade.test.js` |
| D4 | `pre-push` hook reads `protected_branches` from cache | `tests/git-hooks-preferences.test.js` |
| D5 | Recipe templates read preferences (start-phase, complete-phase, brainstorm-phase) | `tests/recipe-preferences.test.js` |
| D6 | `/brainstorm-idea` + `/start-project` author preferences | `tests/start-project-preferences.test.js` |
| D7 | `/validate` preferences warning + drift check | `tests/validate-preferences.test.js` |
| D8 | BUG-024 fix: no forge-specific commands in global templates | `tests/template-no-forge-leak.test.js` |
| D9 | Self-repo dogfood: `specs/preferences.md` exists + valid | `momentum okf check` + `/validate` |
| D10 | Site + README docs updated | `npm run build` (site) green |
| D11 | Full suite green | `npm test` |
| D12 | 4 adapter fingerprints re-baselined | `tests/adapter-fingerprints.test.js` |

## Acceptance Criteria

1. A fresh `momentum init` on a Python/Next.js/rust project writes correct
   inferred `specs/preferences.md` — no npm/GitHub assumptions in the file
2. `/start-project` authors `specs/preferences.md` alongside charter/roadmap
   in one batch, shown in the approval draft
3. `/complete-phase` on a `publish_target: none` project does NOT mention
   `npm publish` in the gate text; on a `git_forge: gitlab` project does NOT
   run `gh release create`
4. `/complete-phase` walks `branch_flow` in order (e.g. `[uat, staging, main]`
   -> three hops, approval at each protected branch)
5. `end_state: feature-branch-only` -> agent pushes the feature branch and
   STOPS; never merges anything itself
6. `pre-push` hook blocks pushes to branches in `protected_branches` from
   the cache; allows pushes to branches not in the list
7. Existing founded project upgrading to v0.33.0 gets an inferred
   `specs/preferences.md`; `/validate` reports preferences-exists as
   informational, not failure
8. `MOMENTUM_SKIP_HOOKS=1` remains the only way to bypass the approval gate;
   no preference toggle disables it
9. BUG-024 closed: global recipe templates contain zero forge-specific commands
10. Self-repo: `specs/preferences.md` exists, `/validate` green, suite green
