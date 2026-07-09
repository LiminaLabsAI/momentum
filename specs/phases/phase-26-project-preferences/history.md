---
type: History
---

# Phase 26 — History

| Type | Meaning |
|---|---|
| [DECISION] / [SCOPE_CHANGE] / [DISCOVERY] / [FEATURE] / [ARCH_CHANGE] / [EVALUATOR] / [NOTE] | per Rule 8 |

---

### [DECISION] 2026-07-09 — Phase 26 = Project Preferences; Intelligence slides to 27, Platform to 28
Topics: roadmap, numbering, preferences
Affects-phases: phase-26-project-preferences
Affects-specs: specs/planning/roadmap.md, specs/status.md
Detail: Operator chose Option A — preferences is the natural next thing (foundational, unblocks all non-npm/non-GitHub projects); Intelligence's self-healing gates would read preferences; Platform's /decide would author them. Preferences land first.

---

### [DECISION] 2026-07-09 — Trust layer principle is invariant; mechanisms are preferences
Topics: trust-layer, invariants, preferences, merge-gate
Affects-phases: phase-26-project-preferences
Affects-specs: specs/decisions/0009-trust-layer-invariant-mechanisms-preferences.md
Detail: The principle (human authorization required for protected-branch pushes) is non-configurable. The mechanism (which branches are protected, how far the agent goes before handing back, which commands run) IS configurable. "No human approval" stays an auditable escape hatch (MOMENTUM_SKIP_HOOKS=1), never a preference toggle — stripping the trust layer makes momentum a different product. ADR-0009 to be authored in G0.

---

### [DECISION] 2026-07-09 — Three git-only end-states; pull-request deferred to Platform
Topics: end-state, merge-flow, forge-api
Affects-phases: phase-26-project-preferences
Affects-specs: none
Detail: merge-after-yes, staging-promotion, feature-branch-only ship now (pure git, no forge API). pull-request end-state needs forge CLI integration (gh/glab) — that's a forge adapter, Platform-phase territory. Filed as FEAT-031.

---

### [DECISION] 2026-07-09 — Migration: upgrade writes inferred prefs for founded projects; gate stays charter+roadmap; preferences as validate WARNING
Topics: upgrade, migration, founded-gate, validate
Affects-phases: phase-26-project-preferences
Affects-specs: core/project-lifecycle.md, core/commands/validate.md
Detail: Existing founded projects get frictionless upgrade — momentum upgrade infers preferences from manifests + git remote and writes specs/preferences.md (marked "inferred — edit anytime"). Unfounded projects get nothing (they'll author at /start-project time). The founded predicate stays charter + roadmap only; preferences-exists is a /validate WARNING not failure. Recipes fall back to npm/GitHub defaults until preferences exist.

---

### [DECISION] 2026-07-09 — brainstorm-idea collects preferences conversationally; start-project authors them
Topics: brainstorm-idea, start-project, preferences-authoring
Affects-phases: phase-26-project-preferences
Affects-specs: core/commands/brainstorm-idea.md, core/commands/start-project.md
Detail: Preferences are part of the idea ("I'm building a Python API on GitLab"), not post-hoc config. /brainstorm-idea asks forge/language/framework as the idea crystallizes (suggests defaults if user unsure); carries settled preferences as context into /start-project; /start-project authors specs/preferences.md in its founding batch alongside charter/roadmap. One batch, one commit, one approval.

---

### [DECISION] 2026-07-09 — protected_branches derived from branch_flow; hook reads .momentum/preferences-cache.json
Topics: git-hooks, protected-branches, cache, branch-flow
Affects-phases: phase-26-project-preferences
Affects-specs: core/git-hooks/pre-push.sh, core/git-hooks/contract.js
Detail: branch_flow is a recipe-consumed preference (agent reads it for /complete-phase merge sequence). protected_branches is derived by the CLI from branch_flow and written to .momentum/preferences-cache.json (state, not content — gitignored). The pre-push hook reads the cache; falls back to ['main','master','staging'] if missing. Source of truth = specs/preferences.md (content); cache = derived build artifact.

---

### [SCOPE_CHANGE] 2026-07-09 — BUG-024 folded into Phase 26 G2 (Rule 14 escalation)
Topics: bug-024, forge-aware, release-gate, recipe-templates
Affects-phases: phase-26-project-preferences
Affects-specs: core/commands/start-phase.md, core/commands/complete-phase.md
Detail: BUG-024 (forge-specific `gh release create` leaking into global recipe templates) was originally filed for a standalone quick-task; a `fix/BUG-024` adhoc record stub was started. Escalated to a phase per Rule 14 — the preferences surface is the structural fix (git_forge field picks the right release command), and G2 already rewrites the same recipe templates. The premature adhoc stub was withdrawn; BUG-024's template edits ship as G2.1–G2.2. Backlog row re-slotted unscheduled → phase-26, status open → in-progress.

---

### [FEATURE] 2026-07-09 — G0: preferences core library + ADR-0009
Topics: preferences, trust-layer, okf, roadmap
Affects-phases: phase-26-project-preferences
Affects-specs: core/preferences.js, core/preferences-templates.js, core/lib/okf-types.js, specs/decisions/0009-trust-layer-invariant-mechanisms-preferences.md
Detail: G0 landed `core/preferences.js` (read/write/infer/derive/cache + founded predicate), `core/preferences-templates.js` (markdown renderer), ADR-0009 (trust layer invariant, mechanisms = preferences), the `Preferences` OKF type, and the renumber sweep (Intelligence → 27, Platform → 28; Phase 25 roadmap drift repaired to Complete v0.32.0). The static `core/specs-templates/specs/preferences.md` was deliberately deferred to G2 so init's copyDir does not drift the 4 adapter fingerprints mid-phase (re-baseline is G2.13). Fail-closed: readPreferences → null when the file is absent (recipes keep npm/GitHub behavior); missing/unknown values → default + stderr warning. 26 library tests; full suite 845 → 871 green.

---

### [FEATURE] 2026-07-09 — G1: init/upgrade write inferred preferences + hook reads cache
Topics: preferences, init, upgrade, git-hooks, protected-branches, cache
Affects-phases: phase-26-project-preferences
Affects-specs: bin/momentum.js, core/git-hooks/contract.js, core/git-hooks/run-check.js
Detail: G1 wired `installPreferences()` into init (always infers + writes when the file is absent; re-init leaves authored files alone) and upgrade (founded-only migration; existing files get their derived cache refreshed + drift reported on the inferable fields, never clobbered). The pre-push hook resolves `protected_branches` from `.momentum/preferences-cache.json` via a new pure `protectedBranchesFromCache()` helper in contract.js, falling back to `['main','master','staging']` when the cache is absent/unparseable — enforcement stays real with zero configuration. The cache is gitignored by the existing `.momentum/*` rule (G1.6 no-op). Self-repo `.githooks/contract.js` + `run-check.js` mirrors synced. 20 integration tests (init/upgrade/hook). The 4 adapter fingerprint tests were intentionally red until G2.13 re-baselined (init now writes `specs/preferences.md`).

---

### [FEATURE] 2026-07-09 — G2: preference-aware recipes + BUG-024 fix + fingerprints
Topics: bug-024, forge-aware, release-gate, recipe-templates, preferences, fingerprints
Affects-phases: phase-26-project-preferences
Affects-specs: core/commands/start-phase.md, core/commands/complete-phase.md, core/commands/brainstorm-phase.md, core/commands/brainstorm-idea.md, core/commands/start-project.md, core/commands/validate.md, core/instructions/navigation.md, core/specs-templates/specs/preferences.md
Detail: G2 rewrote the six recipe templates to read `specs/preferences.md` at execution time — `/start-phase` hard-stop branches on `end_state` + walks `branch_flow`; `/complete-phase` step 3 uses `test_command`/`build_command` and step 9-10 walks `branch_flow` hop-by-hop; `/brainstorm-phase` pulls verification defaults; `/brainstorm-idea` gathers forge/language/publish/branch-flow conversationally; `/start-project` authors `specs/preferences.md` in the founding batch + a Preferences Format section; `/validate` adds a 2c WARNING (founded ⟹ preferences exist) + drift check. **BUG-024 closed**: `gh release create` + `npm publish --access public` removed from the global templates — the gate stops at universal git primitives (`git tag -a` + `git push origin <tag>`); forge/registry commands live in `## Project Extensions` + preferences. Navigation table gains a preferences row (regenerated 4 adapter instruction surfaces). `start-project.md` trimmed to ≤12,000 chars (Antigravity workflow vendor limit). 4 adapter fingerprints re-baselined (claude-code/codex/antigravity via capture script + opencode via MOMENTUM_RESNAPSHOT_OPENCODE). 18 content-assertion + library tests. Full suite 871 → 909 green.

---
