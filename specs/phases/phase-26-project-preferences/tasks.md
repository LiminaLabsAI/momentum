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
- [ ] G2.1 BUG-024: drop `gh release create` from `/start-phase` hard-stop
- [ ] G2.2 BUG-024: drop `gh release create` from `/complete-phase` step 9 + step 10
- [ ] G2.3 `/start-phase` rewrite: gate text reads end_state + branch_flow + release_flow
- [ ] G2.4 `/complete-phase` rewrite: step 3 reads test_command + build_command
- [ ] G2.5 `/complete-phase` rewrite: step 9-10 walks branch_flow in order
- [ ] G2.6 `/brainstorm-phase` rewrite: verification defaults from preferences
- [ ] G2.7 `/brainstorm-idea` rewrite: preferences discovery questions (suggest if unsure)
- [ ] G2.8 `/start-project` rewrite: authors specs/preferences.md in founding batch
- [ ] G2.9 `/start-project` rewrite: approval draft shows preferences table
- [ ] G2.10 `/validate` rewrite: founded -> preferences warning + drift check
- [ ] G2.11 `core/specs-templates/specs/preferences.md` template
- [ ] G2.12 `core/instructions/rules-body.md` navigation table + regenerate 4 adapter surfaces
- [ ] G2.13 Re-baseline 4 adapter fingerprints
- [ ] G2.14 Tests: `tests/recipe-preferences.test.js`
- [ ] G2.15 Tests: `tests/start-project-preferences.test.js`
- [ ] G2.16 Tests: `tests/validate-preferences.test.js`
- [ ] G2.17 Tests: `tests/template-no-forge-leak.test.js`
- [ ] G2.18 Commit G2

## Group 3 — self-repo dogfood + docs + release
- [ ] G3.1 Run `momentum upgrade .` on self-repo -> writes preferences.md
- [ ] G3.2 Review self-repo preferences (project extensions still own actual commands)
- [ ] G3.3 `/validate` on self-repo -> green
- [ ] G3.4 Site: getting-started walkthrough + preferences docs
- [ ] G3.5 README: preferences in quick-start + features
- [ ] G3.6 `momentum okf check` + `momentum okf index` (preferences.md in bundle)
- [ ] G3.7 Full suite: `npm test` green
- [ ] G3.8 Site build: `npm run build` green
- [ ] G3.9 Version bump 0.32.0 -> 0.33.0
- [ ] G3.10 Update status.md, phases/README.md, roadmap.md (renumber Intelligence->27, Platform->28)
- [ ] G3.11 Retrospective + verification evidence
- [ ] G3.12 Commit G3
- [ ] G3.13 Stop at release gate — ask user for merge + tag approval
