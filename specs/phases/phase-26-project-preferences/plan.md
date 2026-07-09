---
type: Plan
---

# Phase 26 — Project Preferences: Implementation Plan

# Mixed:  G0 -> (G1 || G2) -> G3

## Group 0 — ADR + preferences core library  (Sequential. Blocks everything.)

External dependencies: none.

### G0 tasks
1. Author ADR-0009: "The Trust Layer Is Invariant-By-Default, Mechanisms Are
   Preferences" — context (BUG-023/024, ENH-061), decision (principle =
   invariant; mechanism = preference; no-approval stays escape hatch),
   consequences, alternatives
2. Renumber sweep: Intelligence -> 27, Platform -> 28 in status.md, roadmap.md,
   phases/README.md
3. Create `core/preferences.js`:
   - `readPreferences(specsDir)` — parse `specs/preferences.md` markdown table
     into a Preferences object; fail closed (missing file -> null; unknown
     value -> default + warning to stderr)
   - `writePreferences(specsDir, prefs)` — write the markdown table from a
     Preferences object (used by init/upgrade/start-project)
   - `inferPreferences(targetDir)` — detect from `package.json` /
     `pyproject.toml` / `Cargo.toml` / `go.mod` / `*.csproj` + `git remote
     get-url origin`; return a Preferences object with inferred markers
   - `deriveProtectedBranches(branchFlow)` — return `branchFlow` as the
     protected list (everything in the promotion sequence)
   - `writePreferencesCache(gitCommonDir, prefs)` — write
     `.momentum/preferences-cache.json` for hook consumption
   - `readPreferencesCache(gitCommonDir)` — read cache; return null if missing
4. Create `core/preferences-templates.js` — the default `specs/preferences.md`
   template (markdown with the field table + `## Notes` section)
5. Tests: `tests/preferences-library.test.js` — reader (valid/empty/missing/
   unknown-value-fails-closed), writer (round-trip), inference (node/python/
   rust/go/none-manifest, github/gitlab/bare-ssh remote), derive, cache
   read/write

Commit: `feat: add preferences core library + ADR-0009 (Phase 26 G0)`

---

## Group 1 — init + upgrade + hook cache  (Parallel with G2.)

External dependencies: G0.

### G1 tasks
1. `momentum init`: after specs skeleton, call `inferPreferences(targetDir)`;
   write `specs/preferences.md` with inferred values marked
   "Inferred by momentum init — confirm at /start-project or edit anytime"
2. `momentum upgrade`: after existing steps, check founded predicate
   (charter + roadmap exist); if founded AND no `specs/preferences.md` exists,
   infer + write (same as init); if founded AND preferences exist but
   manifest changed since last inference, re-infer + report drift
3. `momentum init`/`upgrade`: after writing preferences, call
   `writePreferencesCache()` to write `.momentum/preferences-cache.json`
4. `pre-push` hook (`core/git-hooks/pre-push.sh`): before the hardcoded
   protected-branch check, try `readPreferencesCache()`; if cache exists,
   use its `protected_branches` list; if missing, fall back to
   `['main','master','staging']` (current behavior)
5. `.momentum/preferences-cache.json` added to `.gitignore` refresh rules
   (state, not content)
6. Tests: `tests/preferences-init.test.js` (init writes inferred prefs for
   node/python/rust/go/none), `tests/preferences-upgrade.test.js` (founded
   gets prefs, unfounded gets nothing, drift re-inference, idempotent),
   `tests/git-hooks-preferences.test.js` (hook reads cache, falls back,
   blocks custom protected list, allows non-protected)

Commit: `feat: init/upgrade write inferred preferences + hook reads cache (Phase 26 G1)`

---

## Group 2 — recipe templates + BUG-024 fix  (Parallel with G1.)

External dependencies: G0.

### G2 tasks
1. **BUG-024 fix**: drop `gh release create` from `core/commands/start-phase.md`
   hard-stop text and `core/commands/complete-phase.md` step 9 plan + step 10
   code block. Gate text becomes "merge + tag" (truly universal git); forge
   release + publish/deploy commands point to `## Project Extensions` +
   preferences
2. **`/start-phase` rewrite**: hard-stop text reads preferences:
   - `end_state: merge-after-yes` -> "Ready to merge `<branch>` -> `<branch_flow>`,
     tag `v<version>`. Approve?"
   - `end_state: staging-promotion` -> "Ready to merge `<branch>` -> staging.
     Tag + release after you promote to main. Approve?"
   - `end_state: feature-branch-only` -> "Feature branch pushed. Merge + tag +
     release are yours to do. Review the branch?"
   - Gate copy uses `publish_target` / `release_flow` for phrasing
3. **`/complete-phase` rewrite**: step 3 verification reads `test_command` +
   `build_command` from preferences (not hardcoded `npm test`); step 9-10
   walks `branch_flow` in order (approval at each protected branch); release
   command from preferences (but actual publish/deploy -> `## Project
   Extensions`)
4. **`/brainstorm-phase` rewrite**: verification-defaults section reads
   preferences for test/build commands instead of `npm test`
5. **`/brainstorm-idea` rewrite**: add a "preferences discovery" phase after
   the idea crystallizes — ask one question at a time: forge, language,
   framework; if user unsure, suggest based on idea context ("you mentioned a
   web app — Next.js + Vercel + GitHub?"); carry settled preferences as
   context into `/start-project`
6. **`/start-project` rewrite**: step 3 draft includes preferences table;
   step 6 writes `specs/preferences.md` alongside charter/roadmap; step 4
   approval shows preferences in the batch
7. **`/validate` rewrite**: after founded check (2b), add check 2c: if
   founded AND no `specs/preferences.md` -> WARNING (not failure):
   "preferences not set — recipes will use npm/GitHub defaults"; if
   preferences exist but `language` differs from manifest -> WARNING: drift
8. `core/specs-templates/specs/preferences.md` — template for init (inferred
   values filled, "confirm at /start-project" header)
9. `core/instructions/rules-body.md` — add preferences to the navigation table
   (one row); regenerate all 4 adapter instruction surfaces per ADR-0004
10. Re-baseline all 4 adapter fingerprints (claude-code/codex/antigravity/
    opencode) — recipe template changes drift every adapter
11. Tests: `tests/recipe-preferences.test.js` (start-phase/complete-phase/
    brainstorm-phase read prefs and emit correct commands),
    `tests/start-project-preferences.test.js` (start-project authors prefs),
    `tests/validate-preferences.test.js` (warning not failure, drift check),
    `tests/template-no-forge-leak.test.js` (no `gh release` / `npm publish`
    in global template text)

Commit: `feat: recipe templates read preferences + BUG-024 fix (Phase 26 G2)`

---

## Group 3 — self-repo dogfood + docs + release  (Sequential. After G1 + G2.)

External dependencies: G1, G2.

### G3 tasks
1. Run `momentum upgrade .` on the self-repo -> writes
   `specs/preferences.md` with inferred values (language: node, framework:
   none, publish_target: npm, git_forge: github, end_state: merge-after-yes,
   branch_flow: [staging, main], protected_branches: [staging, main])
2. Review the self-repo's preferences — confirm the `## Project Extensions`
   npm-publish + gh-release steps still own the actual commands (preferences
   say WHAT, extensions say HOW with approval)
3. Run `/validate` on the self-repo -> green (preferences exist, no drift)
4. Site: update getting-started walkthrough (preferences step in the
   founding flow); add a "Preferences" section to the concepts page or a
   standalone page
5. README: mention preferences in the quick-start + features
6. `momentum okf check` + `momentum okf index` — preferences.md has
   `type: Preferences` frontmatter, part of the OKF bundle
7. Full suite: `npm test` — all green
8. `npm run build` (site) — green
9. Version bump: `package.json` 0.32.0 -> 0.33.0
10. Update `specs/status.md`, `specs/phases/README.md`, `specs/planning/roadmap.md`
11. Retro: `specs/phases/phase-26-project-preferences/retrospective.md` with
    `## Verification Evidence`

Commit: `feat: self-repo preferences dogfood + docs + v0.33.0 (Phase 26 G3)`
