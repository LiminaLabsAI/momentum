# Phase 10 — Ecosystem Activation & Polish: Implementation History

> Append-only log. Do NOT edit existing entries.

## Entry Types

| Type | When to use |
|------|-------------|
| [DECISION] | ADR created, technology choice made |
| [SCOPE_CHANGE] | Phase deliverables added or removed |
| [DISCOVERY] | Bug, tech debt, or enhancement found |
| [FEATURE] | New planned feature |
| [ARCH_CHANGE] | Architectural pattern changed |
| [EVALUATOR] | Locked evaluator defined or evaluation set changed |
| [NOTE] | Anything else worth recording |

## Entries

### [DECISION] 2026-06-07 — Phase 10 scope locked: Ecosystem Activation & Polish
Topics: phase-10, ecosystem, scope, activation
Affects-phases: phase-10-ecosystem-activation
Affects-specs: specs/phases/phase-10-ecosystem-activation/overview.md
Detail: After a multi-turn review of Phase 9, user-confirmed scope for Phase 10 = make the ecosystem layer production-ready. Five workstreams: ecosystem entry/exit commands; Phase 9 follow-up fixes (BUG-004 / ENH-021 / ENH-022); product positioning & onboarding clarity (README rewrite); adapter coverage verification (smoke matrix + capability flag audit); cerebrio dogfood (bootstrap `cerebrio-ecosystem/`). Roadmap-planned items (systematic-debugging, SessionStart, persuasion-hardening, ENH-017) deferred to Unscheduled Future Work — no committed slot.

---

### [DECISION] 2026-06-07 — Single-project usage stays trivial
Topics: phase-10, single-project, invariant, hard-invariant
Affects-phases: phase-10-ecosystem-activation
Affects-specs: specs/phases/phase-10-ecosystem-activation/overview.md
Detail: User-confirmed hard invariant. `momentum init` (no flags) in a non-ecosystem dir behaves identically to v0.12.0 — no prompts, no extra files, no ecosystem references. The auto-detect prompt only fires when a sibling `ecosystem.json` exists, fires once only, and declining is permanent (records `.momentum/skip-ecosystem-prompt`). `--no-ecosystem` bypasses entirely. Validated via `tests/single-project-unchanged.test.js`.

---

### [DECISION] 2026-06-07 — Entry/exit commands at top-level CLI, not nested
Topics: phase-10, cli, ux, command-surface
Affects-phases: phase-10-ecosystem-activation
Affects-specs: specs/phases/phase-10-ecosystem-activation/overview.md, specs/phases/phase-10-ecosystem-activation/plan.md
Detail: User-confirmed: new commands `momentum init --ecosystem`, `momentum join`, `momentum leave`, `momentum doctor` ship at the top-level CLI — not nested under `momentum ecosystem`. Rationale: these are user actions ("I want to join an ecosystem"), not operator actions ("administer this ecosystem"). The existing `momentum ecosystem add/remove/init/status` subcommands remain as the operator toolkit. Discoverability win at the cost of a slightly larger top-level command surface; trade-off accepted.

---

### [DECISION] 2026-06-07 — README rewrite as product positioning
Topics: phase-10, docs, positioning, readme, onboarding
Affects-phases: phase-10-ecosystem-activation
Affects-specs: README.md, core/specs-templates/specs/architecture/ecosystem.md
Detail: User-confirmed: the README is treated as the canonical product story for Phase 10. Not a feature dump, not a v0.4-era single-project artifact. New structure: tagline → what momentum does → who it's for → "Which scale are you?" decision tree → supported-agents matrix → single-project quickstart → ecosystem quickstart → architecture one-pager → commands organized by purpose. A new user reading only the top of the README should pick the right mode without scrolling. Decision tree mirrored in `core/specs-templates/specs/architecture/ecosystem.md` for installed projects. Examples verified via `tests/readme-examples.test.js`.

---

### [DECISION] 2026-06-07 — Agent-agnostic is a tested claim
Topics: phase-10, adapters, testing, agent-agnostic, capabilities
Affects-phases: phase-10-ecosystem-activation
Affects-specs: specs/phases/phase-10-ecosystem-activation/plan.md, core/adapter-capabilities.md
Detail: User-confirmed: Phase 10 adds scripted smoke tests for every ecosystem CLI command + slash command on each shipped adapter (Claude Code, Codex, Antigravity). Additionally, audits Adapter Contract v3 declared capability flags and documents a per-adapter capability matrix in `core/adapter-capabilities.md`. This is the foundation Phase 11 orchestration will lean on (capability-driven routing). Inconsistencies in declared flags are flagged as backlog ENHs, not Phase 10 blockers.

---

### [DECISION] 2026-06-07 — Dynamic orchestration & context handover → Phase 11
Topics: phase-10, phase-11, orchestration, handover, scout, dispatch, deferral
Affects-phases: phase-10-ecosystem-activation, phase-11-orchestration-handover
Affects-specs: specs/planning/roadmap.md, specs/planning/phase-11-orchestration-handover.md
Detail: User-reframed during brainstorm: orchestration across repos is dynamic, not a fixed sequential-or-parallel shape. The right design = a small set of primitives the main agent composes per task: `scout` (read-only context fetch from one repo), `dispatch` (parallel fan-out to multiple repos), `handoff` (control transfer with context). Specs maintenance is non-negotiable across every primitive — orchestration must never bypass momentum's tracking. This needs Codex / Antigravity capability research before landing. Captured as new Phase 11 (target v0.14.0) with planning stub at `specs/planning/phase-11-orchestration-handover.md`.

---

### [DECISION] 2026-06-07 — Hardening & Activation moved to Unscheduled Future Work
Topics: phase-10, hardening, activation, roadmap, unscheduled
Affects-phases: phase-10-ecosystem-activation
Affects-specs: specs/planning/roadmap.md
Detail: Previously-planned Phase 10 (Hardening & Activation — full systematic-debugging skill, SessionStart auto-activation, persuasion-hardening Rules 1/3/4/5/7/9, ENH-017) loses its committed slot. Moves to "Unscheduled Future Work" section of `specs/planning/roadmap.md` — listed as a work item, pickable any time, but no version target. Rationale: Ecosystem Activation (this phase) and Dynamic Orchestration (Phase 11) are user-pulled priorities; Hardening can slot in whenever it's the right next thing.

---

### [DECISION] 2026-06-07 — cerebrio dogfood in-phase; pointer updates via per-repo PRs
Topics: phase-10, dogfood, cerebrio, multi-repo, rule-9
Affects-phases: phase-10-ecosystem-activation
Affects-specs: specs/phases/phase-10-ecosystem-activation/plan.md
Detail: User-confirmed: Workstream 5 produces the real `cerebrio-ecosystem/` git repo as part of Phase 10 — not a follow-up session. The bootstrap covers the cerebrio constellation (sapience, frontend, py, cli, open-guard, open-shield, bench — 7 members). Initiative `0001-memory-module` captures the 2026-06-05/06 work retroactively. Cross-repo discipline (Rule 9): pointer-block injections into each cerebrio member repo happen via separate `chore/ecosystem-pointer` branches and PRs in those repos. They are NOT bundled into momentum's Phase 10 commits. Dogfood discoveries logged as `[DISCOVERY]` entries in this history.md.

---

### [DISCOVERY] 2026-06-07 — BUG-004: session-log concurrent-commit race
Topics: phase-10, phase-9, bug, session-log, concurrency
Affects-phases: phase-10-ecosystem-activation
Affects-specs: specs/backlog/backlog.md
Detail: Surfaced during Phase 9 review. `core/ecosystem/scripts/session-append.sh` appends with plain `>>` and no lock. Two concurrent commits in two different member repos can interleave or lose lines. Phase 9 overview risk row mentioned "lockfile only on contended platforms" but no lockfile shipped. Tracked as BUG-004 (P1). Fix lands in Workstream 2 via `flock -x` per-session-file lock (atomic-rename fallback). Verified via 10-process concurrent stress test.

---

### [DISCOVERY] 2026-06-07 — ENH-021: `momentum ecosystem add` location-agnostic
Topics: phase-10, phase-9, enhancement, cli, ecosystem-add
Affects-phases: phase-10-ecosystem-activation
Affects-specs: specs/backlog/backlog.md
Detail: Surfaced during Phase 9 review. Today `momentum ecosystem add/remove/status` must be run from the ecosystem root. Awkward for users sitting in a member repo who want to register the current repo. Tracked as ENH-021 (P2). Fix lands in Workstream 2: walk up via `findRoot()` if no ecosystem.json in CWD; accept `--ecosystem <path>` explicit override. Applies symmetrically to all three subcommands.

---

### [DISCOVERY] 2026-06-07 — ENH-022: bounded-walk parent count is a magic number
Topics: phase-10, phase-9, enhancement, ecosystem, configurability
Affects-phases: phase-10-ecosystem-activation
Affects-specs: specs/backlog/backlog.md
Detail: Surfaced during Phase 9 review. `findRoot()` walks at most 5 parent directories looking for `ecosystem.json`. 5 is a magic number with no documentation or override. Tracked as ENH-022 (P3). Fix lands in Group 0 + Workstream 2: extract `MAX_PARENT_WALK` constant, honor `MOMENTUM_MAX_PARENT_WALK` env override in both JS and shell paths, document in `core/ecosystem/layout.md`.

---

### [NOTE] 2026-06-07 — Phase 10 supersedes previously-planned Phase 10
Topics: phase-10, roadmap, renumber
Affects-phases: phase-10-ecosystem-activation
Affects-specs: specs/status.md, specs/planning/roadmap.md, specs/phases/index.json
Detail: This Phase 10 (Ecosystem Activation & Polish) takes the v0.13.0 slot previously held by Hardening & Activation. Roadmap updated: Phase 11 (NEW) = Dynamic Orchestration & Context Handover → v0.14.0; Phase 12 = Reach → v0.15.0; Phase 13 = Intelligence → v0.16.0; Phase 14 = Platform → v1.0 (target unchanged). Hardening & Activation moves to Unscheduled Future Work.

---

### [FEATURE] 2026-06-07 — Group 2 landed: Phase 9 follow-up fixes (BUG-004 / ENH-021 / ENH-022)
Topics: phase-10, group-2, bug-004, enh-021, enh-022, concurrency, location-agnostic, lockdir
Affects-phases: phase-10-ecosystem-activation
Affects-specs: core/ecosystem/scripts/session-append.sh, bin/ecosystem.js, core/ecosystem/layout.md, core/specs-templates/specs/architecture/ecosystem.md, tests/session-append-concurrency.test.js, tests/ecosystem-cli-location-agnostic.test.js, tests/ecosystem-cli.test.js
Detail: Group 2 fixes landed. **BUG-004 (session-log concurrent-commit race):** `core/ecosystem/scripts/session-append.sh` now acquires a per-session-file lock via `mkdir` (atomic on POSIX, portable across macOS/Linux without depending on `flock`). Lock budget is ~5s; on timeout the event is dropped silently rather than risking file corruption. Verified by `tests/session-append-concurrency.test.js` spawning 10 parallel bash invocations against one session file: all 10 distinct lines land intact, header appears exactly once, file ends with newline, lock directory released. **ENH-021 (location-agnostic ecosystem add/remove/status):** new `resolveEcosystemRoot()` helper in `bin/ecosystem.js` resolves via (1) explicit `--ecosystem <path>` override → (2) `ecosystem.json` in CWD → (3) walk-up via `findRoot()` → (4) remediation error naming the subcommand. All three subcommands accept `--ecosystem <path>`. Verified by `tests/ecosystem-cli-location-agnostic.test.js` invoking from sibling, child, unrelated, and isolated directories. Existing Phase 9 test updated to match the improved (more teaching) error wording — behavior unchanged. **ENH-022 (docs):** `core/ecosystem/layout.md` gains a "Discovery & limits" section documenting `MOMENTUM_MAX_PARENT_WALK` env override + `--ecosystem` override + BUG-004 lock pattern. `core/specs-templates/specs/architecture/ecosystem.md` template updated to reflect the env-configurable depth (was hardcoded reference to `MAX_WALK_DEPTH=5`). Tests: 121 → 130, all green.

---

### [FEATURE] 2026-06-07 — Group 0 landed: state machine + reusable pointer helpers
Topics: phase-10, group-0, state-machine, pointer-helpers, max-parent-walk, env-override
Affects-phases: phase-10-ecosystem-activation
Affects-specs: core/ecosystem/lib/state.js, core/ecosystem/lib/pointer.js, core/ecosystem/lib/index.js, bin/ecosystem.js, core/ecosystem/scripts/session-append.sh, tests/helpers/ecosystem-fixtures.js, tests/state-machine.test.js
Detail: Group 0 (sequential, blocks G1/G2/G3) landed. `core/ecosystem/lib/state.js` exposes `detectState(repoPath)` returning one of seven states (standalone, member, leader, leader-and-member, broken-manifest, broken-pointer, broken-orphan), `findRegistration(repoPath)` walking up + scanning siblings to find membership in any reachable ecosystem, and `availableTransitions(state, context)` returning user-facing next-step commands with teaching descriptions for the doctor recipe. `core/ecosystem/lib/pointer.js` extracted the POINTER_BEGIN/END sentinels and `findPrimaryInstructionFile`/`hasPointerBlock`/`ensurePointerInjected`/`stripPointer` helpers from `bin/ecosystem.js` so `join`/`leave` can reuse them without duplication. `bin/ecosystem.js` refactored to import from pointer.js — no behavior change. ENH-022 partial fix: `MOMENTUM_MAX_PARENT_WALK` env override honored in both JS paths (lib/index.js `findRoot` via new `resolveMaxParentWalk()`; state.js via `getMaxParentWalk()`) and shell path (`session-append.sh` honors env var with non-numeric guard). `tests/helpers/ecosystem-fixtures.js` provides `mkStandaloneRepo`/`mkEcosystemRoot`/`mkMemberRepo`/`mkLeaderAndMember`/`corruptManifest`. `tests/state-machine.test.js` covers all 7 state branches + availableTransitions per state + env-override (20 new tests). 121/121 tests pass — Phase 9's 101 tests still green, 20 new tests added.

---
