---
type: Retrospective
phase: phase-26-project-preferences
version: v0.33.0
date: 2026-07-09
---

# Phase 26 — Project Preferences: Retrospective

## What shipped

- **ADR-0009** — the trust layer (human authorization for protected-branch
  pushes) is invariant and non-configurable; the *mechanisms* (which branches
  are protected, how far the agent goes before handing back, which
  release/publish/verify commands run) are **preferences** in
  `specs/preferences.md`.
- `core/preferences.js` — read / write / infer / derive / cache + `isFounded`
  + fail-closed defaults (missing file → null; missing/unknown value → default
  + stderr warning).
- `momentum init` / `upgrade` infer preferences from manifests + git remote;
  founded-only migration; never clobber user edits; cache refresh + drift report.
- `pre-push` hook reads `protected_branches` from `.momentum/preferences-cache.json`,
  falling back to `['main','master','staging']` — enforcement real with zero config.
- Six recipe templates rewritten to read preferences at execution time.
- **BUG-024 closed** — `gh release create` + `npm publish` removed from global
  templates; the gate stops at universal git primitives
  (`git tag -a` + `git push origin <tag>`).
- Navigation table + 4 adapter instruction surfaces regenerated; 4 fingerprints
  re-baselined; self-repo dogfooded (its own `specs/preferences.md`); site + README docs.

## Verification Evidence

Rule 12 — fresh this session (post-G5, pre-release):

| Check | Result |
|-------|--------|
| `node bin/momentum.js okf check` | ✓ 255-file bundle conformant |
| `node bin/momentum.js okf index` | ✓ indexes up to date |
| full `npm test` | ✓ 909 / 909 green (suite grew 845 → 871 → 909 across G0/G1/G2) |
| `npm run build` | ✓ site build green |

## What went well

- Defining the evaluator first (ADR-0009 before any recipe rewrite) kept the
  scope crisp and prevented the forge-leak regression from reappearing.
- Deferring the static `preferences.md` template out of init's `copyDir` (and
  excluding it via `skipRelPaths`) avoided mid-phase fingerprint churn.
- Fail-closed `readPreferences()` + the `protected_branches` fallback in the
  hook means a missing/unparseable cache never weakens the trust layer.

## What to improve

- The BUG-023 → BUG-024 → ADR-0009 sequence shows mechanism leakage had been
  patched twice before the real invariant was named. A short "invariant vs
  mechanism" check at recipe-design time would catch this class earlier.
- `inferCommands` can't see the `site/` sub-package build, so the self-repo's
  `build_command` reads `none`. Acceptable (the CLI has no root build step), but
  a future multi-package preference could surface this.

## Open questions / follow-ups

- Phase 27 (Intelligence) could consume `specs/preferences.md` shape for
  self-learning hooks config.
- ENH-009 (distribution breadth) deferred — still blocked on ≥1 more adapter,
  now unblocked by the opencode adapter (Phase 22).
