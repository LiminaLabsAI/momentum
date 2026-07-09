---
type: Tasks
---

# Phase 26 — Tasks

## Group 0 — ADR + preferences core library
- [x] G0.1 Author ADR-0009 (trust layer invariant, mechanisms = preferences)
- [x] G0.2 Renumber sweep: Intelligence -> 27, Platform -> 28 (status.md, roadmap.md, phases/README.md)
- [x] G0.3 Create `core/preferences.js` — readPreferences (parse markdown, fail closed)
- [x] G0.4 Create `core/preferences.js` — writePreferences (markdown table writer)
- [x] G0.5 Create `core/preferences.js` — inferPreferences (manifest + git remote detection)
- [x] G0.6 Create `core/preferences.js` — deriveProtectedBranches + cache read/write
- [x] G0.7 Create `core/preferences-templates.js` — default preferences.md template
- [x] G0.8 Tests: `tests/preferences-library.test.js` (reader/writer/inference/derive/cache)
- [x] G0.9 Commit G0

## Group 1 — init + upgrade + hook cache
- [x] G1.1 `momentum init` writes inferred `specs/preferences.md` after skeleton
- [x] G1.2 `momentum upgrade` writes inferred prefs for founded projects only
- [x] G1.3 `momentum upgrade` re-infers on manifest drift (reports changed fields)
- [x] G1.4 `momentum init`/`upgrade` writes `.momentum/preferences-cache.json`
- [x] G1.5 `pre-push` hook reads cache for protected_branches (falls back to defaults)
- [x] G1.6 `.gitignore` refresh includes `preferences-cache.json` (no-op: `.momentum/*` already covers it)
- [x] G1.7 Tests: `tests/preferences-init.test.js`
- [x] G1.8 Tests: `tests/preferences-upgrade.test.js`
- [x] G1.9 Tests: `tests/git-hooks-preferences.test.js`
- [x] G1.10 Commit G1

## Group 2 — recipe templates + BUG-024 fix
- [x] G2.1 BUG-024: drop `gh release create` from `/start-phase` hard-stop
- [x] G2.2 BUG-024: drop `gh release create` from `/complete-phase` step 9 + step 10
- [x] G2.3 `/start-phase` rewrite: gate text reads end_state + branch_flow + release_flow
- [x] G2.4 `/complete-phase` rewrite: step 3 reads test_command + build_command
- [x] G2.5 `/complete-phase` rewrite: step 9-10 walks branch_flow in order
- [x] G2.6 `/brainstorm-phase` rewrite: verification defaults from preferences
- [x] G2.7 `/brainstorm-idea` rewrite: preferences discovery questions (suggest if unsure)
- [x] G2.8 `/start-project` rewrite: authors specs/preferences.md in founding batch
- [x] G2.9 `/start-project` rewrite: approval draft shows preferences table
- [x] G2.10 `/validate` rewrite: founded → preferences warning + drift check
- [x] G2.11 `core/specs-templates/specs/preferences.md` template
- [x] G2.12 `core/instructions/rules-body.md` navigation table + regenerate 4 adapter surfaces
- [x] G2.13 Re-baseline 4 adapter fingerprints
- [x] G2.14 Tests: `tests/recipe-preferences.test.js`
- [x] G2.15 Tests: `tests/start-project-preferences.test.js`
- [x] G2.16 Tests: `tests/validate-preferences.test.js`
- [x] G2.17 Tests: `tests/template-no-forge-leak.test.js`
- [x] G2.18 Commit G2

## Group 3 — self-repo dogfood + docs + release
- [x] G3.1 Run `momentum upgrade .` on self-repo -> writes preferences.md
- [x] G3.2 Review self-repo preferences (project extensions still own actual commands)
- [x] G3.3 `/validate` on self-repo -> green
- [x] G3.4 Site: getting-started walkthrough + preferences docs
- [x] G3.5 README: preferences in quick-start + features
- [x] G3.6 `momentum okf check` + `momentum okf index` (preferences.md in bundle)
- [x] G3.7 Full suite: `npm test` green
- [x] G3.8 Site build: `npm run build` green
- [x] G3.9 Version bump 0.32.0 -> 0.33.0
- [x] G3.10 Update status.md, phases/README.md, roadmap.md (renumber Intelligence->27, Platform->28)
- [x] G3.11 Retrospective + verification evidence
- [x] G3.12 Commit G3
- [ ] G3.13 Stop at release gate — ask user for merge + tag approval

## Group 4 — post-review fixes (security/QA/arch)
- [x] G4.1 Rename preferences → config (file, type, cache, identifiers) across code/templates/tests/adapters/docs
- [x] G4.2 Critical: hook UNIONs sources; never weaker than invariant floor (silently-downgradable bypass closed)
- [x] G4.3 I1: hook reads protected_branches from specs/config.md source of truth (no stale-cache gap)
- [x] G4.4 I3: writeConfigCache DERIVES protected_branches from branch_flow (extras unioned)
- [x] G4.5 I2: byte-identity parity guard for .githooks/* vs core/git-hooks/*
- [x] G4.6 I4: installConfig leaves empty/unparseable config.md untouched (warns)
- [x] G4.7 Minor: inferLanguage priority test, unknown-enum coverage, dead-ternary removed, inferFramework python/rust reachable, codeberg→gitea, unknown-key stderr warning
- [x] G4.8 Re-baseline 4 adapter fingerprints; full suite 918 green; OKF 256 conformant; site build green
- [x] G4.9 Commit G4

## Group 5 — ENH-062 proactive config-drift sync (built in-phase)
- [x] G5.1 core/config.js: diffConfig + mergeConfigDrift + valuesEqual
- [x] G5.2 bin/momentum.js: `momentum config sync` subcommand (interactive, approval-gated, --dry-run)
- [x] G5.3 upgrade drift warning → points at `momentum config sync`
- [x] G5.4 core/commands/sync-config.md recipe template
- [x] G5.5 recipe-table rows in instruction surfaces (surfaces.md) + help text + site concepts note
- [x] G5.6 Tests: 4 library (diff/merge/valuesEqual) + 5 CLI (apply/skip/migrate/dry-run/no-specs)
- [x] G5.7 Re-baseline fingerprints; full suite 927 green; OKF 256; site build green
- [x] G5.8 Commit G5
