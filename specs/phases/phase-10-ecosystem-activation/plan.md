---
type: Plan
---

# Phase 10 — Ecosystem Activation & Polish: Plan

## Execution Order

```
# Mixed: Group 0 → (Groups 1 + 2 + 3 in parallel) → Group 4 → Group 5
```

`Group 0` defines the state machine and reusable helpers every later group depends on. Groups 1–3 are independent implementation tracks sharing only Group 0's helpers. Group 4 wires the adapter coverage matrix and the cerebrio dogfood once 1–3 land. Group 5 is final verification.

---

## Group 0 — State machine + reusable helpers (Sequential)

**Sequential.** Blocks Groups 1–4.

External deps: none.

**Commit:** `feat(ecosystem): state machine + reusable pointer helpers`

### Tasks

- **`core/ecosystem/lib/state.js`** — new module:
  - `detectState(repoPath)` returns one of: `standalone`, `member`, `leader`, `leader-and-member`, `broken-manifest`, `broken-pointer`, `broken-orphan`. Inspects: ecosystem.json presence in repoPath; pointer block in CLAUDE.md/AGENTS.md; membership in any sibling ecosystem manifest; consistency between pointer and manifest.
  - `availableTransitions(state)` returns an array of `{command, description}` objects — the exact next-step commands a user can run, with teaching descriptions.
  - `MAX_PARENT_WALK` constant (default 5); honors `MOMENTUM_MAX_PARENT_WALK` env override. Move from existing `lib/index.js`.
- **`core/ecosystem/lib/pointer.js`** — extract from `bin/ecosystem.js`:
  - `injectPointer(primaryFile, rootPath, ecosystemName)` — idempotent insert of sentinel-fenced block.
  - `stripPointer(primaryFile)` — idempotent removal.
  - `findPrimaryInstructionFile(repoPath)` — adapter-aware (reads adapter metadata to find CLAUDE.md / AGENTS.md / etc.).
- **`tests/helpers/ecosystem-fixtures.js`** — shared test helpers:
  - `mkStandaloneRepo(tmpdir, agent)`, `mkEcosystemRoot(tmpdir, name)`, `mkMemberRepo(tmpdir, ecosystemPath, agent)`, `mkLeaderAndMember(tmpdir, name, agent)`.
  - `expectState(repoPath, expectedState)`.
- **Refactor `bin/ecosystem.js`** to use new `core/ecosystem/lib/pointer.js` and `state.js`; no behavior change. Existing Phase 9 tests must continue to pass.
- **Test**: `tests/state-machine.test.js` — every state and broken-state branch detected correctly across all three adapter types.

### Verification

`npm test` — Group 0 tests pass plus all existing 101 Phase 9 tests still green (regression check).

---

## Group 1 — Entry/exit commands (Parallel with Groups 2, 3)

**Parallel with Groups 2 and 3.** Depends only on Group 0.

External deps: none.

**Commit:** `feat(cli): top-level ecosystem entry/exit commands`

### Tasks

- **`bin/momentum.js`** — extend command dispatch:
  - `momentum init [target] --ecosystem <name> [--agent <agent>]` — runs existing `init` to scaffold target, then runs ecosystem-init in a sibling dir (default: `../<name>`), then runs join. Atomic: if any step fails, rolls back.
  - `momentum join <ecosystem-path>` — from inside the current repo, register it in the given ecosystem's manifest and inject pointer. Idempotent. Refuses if state is `leader` (use `ecosystem add` from inside the ecosystem for that).
  - `momentum leave` — from inside a member repo, remove from manifest and strip pointer. Idempotent. Refuses cleanly if state is not `member`.
  - `momentum doctor` — print current state via `detectState` and the teaching transition table from `availableTransitions`. Use formatted output (color-friendly, plain-text fallback).
- **Auto-detect in `momentum init`**:
  - After existing init logic completes, check if any sibling directory at depth 1 contains `ecosystem.json`.
  - If yes and `.momentum/skip-ecosystem-prompt` does NOT exist and `--no-ecosystem` was not passed: prompt once "Register as member of `<name>`? (y/N)". On `y`, run join. On `n` or empty, write `.momentum/skip-ecosystem-prompt` and continue.
  - If no sibling ecosystem found: no prompt, no change from today.
- **Hard invariant test**: `tests/single-project-unchanged.test.js` — `momentum init` in an isolated tmpdir (no sibling ecosystems) produces byte-identical output to v0.12.0's `init` for the file set (excluding timestamps).
- **Tests**:
  - `tests/init-ecosystem-flag.test.js` — `init --ecosystem` end-to-end, including rollback on simulated failure.
  - `tests/join-leave-roundtrip.test.js` — full join/leave/join/leave cycle preserves state cleanly; idempotent on repeats.
  - `tests/doctor.test.js` — every state, every transition table, snapshot output.
  - `tests/init-autodetect-prompt.test.js` — prompt fires when adjacent ecosystem exists; declining writes skip file; `--no-ecosystem` bypasses entirely; skip-file honored on next run.

### Verification

All Group 1 tests pass. Manual smoke: in a tmpdir, run all four new commands sequentially; observe outputs match expectations.

---

## Group 2 — Phase 9 follow-up fixes (Parallel with Groups 1, 3)

**Parallel with Groups 1 and 3.** Depends only on Group 0 (`MAX_PARENT_WALK` move).

External deps: `flock` (POSIX, ships with most systems; fallback to atomic-rename if unavailable).

**Commit:** `fix(ecosystem): session-log race, location-agnostic add, bounded-walk constant`

### Tasks

- **BUG-004 — session-log concurrent commit race**:
  - Update `core/ecosystem/scripts/session-append.sh` to acquire a file lock before appending. Prefer `flock -x` with timeout; fall back to atomic-rename via `mv` if `flock` not available on host.
  - Lock scope is per-session-file (one lock per `sessions/YYYY-MM-DD.md`).
  - Test: `tests/session-append-concurrency.test.js` — spawn 10 background processes calling `session-append.sh` with distinct payloads; assert all 10 lines present, no interleaving, file ends with newline.
- **ENH-021 — location-agnostic `momentum ecosystem add/remove/status`**:
  - `bin/ecosystem.js` — `cmdAdd`, `cmdRemove`, `cmdStatus` walk up via `findRoot()` if no ecosystem.json in CWD.
  - Add `--ecosystem <path>` flag as an explicit override (highest precedence).
  - Resolution order: explicit `--ecosystem <path>` → CWD ecosystem.json → walk-up to MAX_PARENT_WALK → error with remediation message.
  - Test: `tests/ecosystem-cli-location-agnostic.test.js` — invoke add/remove/status from a sibling, child, and unrelated directory; assert each path resolves correctly or errors usefully.
- **ENH-022 — `MAX_PARENT_WALK` configurable**:
  - Already moved to `core/ecosystem/lib/state.js` in Group 0; honor `MOMENTUM_MAX_PARENT_WALK` env override.
  - Update `core/ecosystem/scripts/session-append.sh` to read `MOMENTUM_MAX_PARENT_WALK` env var (default 5) for its own walk-up.
  - Document in `core/ecosystem/layout.md`: section "Discovery & limits" explains the constant, its default, and the env override.
  - Test: `tests/max-parent-walk-env.test.js` — assert walk respects env override in both JS and shell paths.

### Verification

All Group 2 tests pass; existing Phase 9 hook tests still pass.

---

## Group 3 — Product positioning & onboarding clarity (Parallel with Groups 1, 2)

**Parallel with Groups 1 and 2.** No code dependency on Groups 1/2 (doctor formatting copy lives in Group 1; this group writes user-facing docs around it).

External deps: none.

**Commit:** `docs: product positioning rewrite + onboarding decision tree`

### Tasks

- **`README.md` — full rewrite**:
  - Tagline: "Agent-agnostic, specs-driven development framework. Manage a single project or orchestrate a multi-project ecosystem from one agent session."
  - "What momentum does" — 2-3 sentences.
  - "Who it's for" — builders using AI coding agents who want their projects' state to outlive any single session.
  - "Which scale are you?" decision tree — one project → `momentum init`; multiple related projects → `momentum init --ecosystem <name>`.
  - Supported agents matrix — Claude Code / Codex / Antigravity shipped; Cursor / Gemini CLI planned (Phase 12).
  - Single-project quickstart (proves nothing changes for single-project users).
  - Ecosystem quickstart (the new commands in action).
  - Architecture one-pager: core/ + adapters/ overlay model, one paragraph + a tiny diagram.
  - Commands reference organized by purpose: planning, execution, tracking, ecosystem, maintenance.
- **`core/specs-templates/specs/architecture/ecosystem.md`** — add "When to use" decision tree at the top mirroring the README. Installed into every new momentum project.
- **`tests/readme-examples.test.js`** — extract every `bash` code block from README, run each in an isolated tmpdir, assert exit code 0 and expected side effects. Prevents README rot.
- **`docs/developer-guide.md`** — quick sweep for v0.4-era references (URLs, paths). Limited touch — broader cleanup remains TD-004.

### Verification

- README readability check: a fresh-eyes reader follows the decision tree, lands at a quickstart, runs the commands, has a working repo.
- `tests/readme-examples.test.js` passes.
- Architecture doc decision tree renders cleanly.

---

## Group 4 — Adapter coverage verification + cerebrio dogfood (Sequential)

**Sequential.** Depends on Groups 1, 2, 3.

External deps: each adapter's runtime (Claude Code / Codex / Antigravity CLI presence). Tests gracefully skip if a runtime is unavailable, but warn.

**Commit:** `test+infra: adapter smoke matrix + capability audit + cerebrio-ecosystem`

### Tasks

- **Per-adapter smoke tests** — one file per adapter, same scenario, different adapter flag:
  - `tests/adapter-smoke-claude-code.test.js`
  - `tests/adapter-smoke-codex.test.js`
  - `tests/adapter-smoke-antigravity.test.js`
  - Each runs end-to-end: `init --agent X` → `init --ecosystem name --agent X` → `join` → `ecosystem add/remove/status` → slash-command file presence checks (`/ecosystem`, `/initiative`, `/session`) → `leave` → `doctor` → cleanup.
  - Adapter setup helpers in `tests/helpers/adapter-env.js` to centralize agent-runtime detection.
- **Capability flag audit**:
  - For each adapter in `adapters/*/adapter.js`, list declared capabilities (Adapter Contract v3 metadata).
  - Document as `core/adapter-capabilities.md`: table with rows = adapters, columns = capabilities (subagent-spawning, hook-system, primary-instruction-file, slash-commands, etc.).
  - Flag any inconsistencies (a capability declared on one adapter but missing on another). File each inconsistency as a backlog ENH (do not fix in this phase unless trivial).
  - Test: `tests/adapter-capabilities-declared.test.js` — every shipped adapter declares the minimum capability surface that the Phase 10 commands assume.
- **cerebrio dogfood — bootstrap `cerebrio-ecosystem/`**:
  - Create `../cerebrio-ecosystem/` as a real git repo: `momentum init --ecosystem cerebrio`.
  - From each cerebrio member repo, run `momentum join ../cerebrio-ecosystem`: sapience, frontend, py, cli, open-guard, open-shield, bench (7 members).
  - Run `/initiative create memory-module`; populate the initiative with the 2026-06-05/06 work retroactively (per [NOTE] from Phase 9).
  - Document what worked and what didn't in a dogfood log under this phase's `history.md` as `[DISCOVERY]` entries.
  - Pointer-block updates to cerebrio member repos: each member's CLAUDE.md/AGENTS.md gets the one-line fenced pointer. These changes commit to each respective repo on a separate `chore/ecosystem-pointer` branch (Rule 9 cross-repo discipline). DO NOT bundle them into momentum's Phase 10 commits.

### Verification

- All three adapter smoke tests pass (skipped tests warn but don't fail CI).
- Capability matrix doc exists and is accurate against `adapters/*/adapter.js`.
- `cerebrio-ecosystem/ecosystem.json` validates against schema; lists all 7 members.
- `/track` from inside `cerebrio-ecosystem/` shows aggregated state across all members.
- `0001-memory-module` initiative present and renders correctly.

---

## Group 5 — Final verification (Sequential)

**Sequential.** Final group; runs after 0–4 complete.

External deps: none.

**Commit:** handled by `/complete-phase`.

### Tasks

- **Full `npm test`** — assert 0 failures, target ~130+ tests, no flakiness across 3 runs.
- **End-to-end manual smoke per adapter**:
  - Run the full Phase 10 entry/exit flow once on each of Claude Code, Codex, Antigravity, in a fresh tmpdir.
  - Capture command outputs for `/complete-phase` retrospective evidence.
- **`/complete-phase` evidence capture** — fresh `npm test` log, smoke outputs, doctor snapshot, README example test pass.
- **Update `specs/status.md`** — Phase 10 → complete; Phase 11 → next active.
- **Update `specs/planning/roadmap.md`** — mark v0.13.0 released; confirm Phase 11 slot.
- **Update `specs/phases/index.json`** — `phase-10-ecosystem-activation` → status `complete`.
- **Update `specs/changelog/2026-NN.md`** — Phase 10 release line + workstream summary.
- **`/sync-docs`** — propagate any history entries to specs; surface cross-repo `Affects-specs:` paths.
- **`npm publish --access public`** — per project rule, after explicit user approval.

### Verification

- All acceptance criteria from overview.md check off.
- Phase 9 invariant verified: single-project session (no ecosystem present) behavior unchanged.
- Test count 101 → 130+, all green.
- v0.13.0 released to npm.
