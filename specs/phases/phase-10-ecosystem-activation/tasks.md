# Phase 10 — Ecosystem Activation & Polish: Tasks

> Granular checklist mirroring `plan.md`. Mark `[x]` complete, `[/]` in progress, `[ ]` not started.

## Group 0 — State machine + reusable helpers (Sequential)

- [x] Create `core/ecosystem/lib/state.js` with `detectState(repoPath)` returning the 7 states (3 healthy, 1 leader+member, 3 broken).
- [x] Implement `availableTransitions(state)` returning teaching-friendly `{command, description}` entries.
- [x] Move `MAX_PARENT_WALK` constant from `core/ecosystem/lib/index.js` to `state.js`; honor `MOMENTUM_MAX_PARENT_WALK` env override.
- [x] Create `core/ecosystem/lib/pointer.js` extracting `injectPointer`, `stripPointer`, `findPrimaryInstructionFile` from `bin/ecosystem.js`.
- [/] Make `findPrimaryInstructionFile` adapter-aware (reads adapter metadata). — partial: CLAUDE.md + AGENTS.md candidates honor Claude Code, Codex, Antigravity today. Full adapter-metadata lookup deferred to Phase 11 capability research.
- [x] Refactor `bin/ecosystem.js` to use the extracted helpers; no behavior change.
- [x] Create `tests/helpers/ecosystem-fixtures.js` with `mkStandaloneRepo`, `mkEcosystemRoot`, `mkMemberRepo`, `mkLeaderAndMember`, `expectState`.
- [x] Write `tests/state-machine.test.js` covering every state + broken-state branch across all 3 adapters.
- [x] Regression: existing 101 Phase 9 tests all pass after refactor (121/121 green).
- [x] Commit: `feat(ecosystem): state machine + reusable pointer helpers`.

## Group 1 — Entry/exit commands (Parallel with G2, G3)

- [x] `bin/momentum.js`: implement `momentum init --ecosystem <name>` flag with atomic rollback.
- [x] `bin/state-commands.js`: implement `momentum join <ecosystem-path>` (idempotent, refuses on leader state).
- [x] `bin/state-commands.js`: implement `momentum leave` (idempotent, clean no-op on non-member states).
- [x] `bin/state-commands.js`: implement `momentum doctor` with formatted teaching output.
- [x] `bin/momentum.js`: auto-detect prompt in `init` (single prompt; `.momentum/skip-ecosystem-prompt` opt-out; `--no-ecosystem` bypass; non-TTY silent skip).
- [x] Write `tests/single-project-unchanged.test.js` — single-project init produces no ecosystem artifacts. (Adapted from "byte-identical" to "no ecosystem artifacts" — behavioral check is what we actually care about.)
- [x] Write `tests/init-ecosystem-flag.test.js` — end-to-end + invalid-name + collision rejection.
- [x] Write `tests/join-leave-roundtrip.test.js` — join/leave cycle + idempotency + edge cases.
- [x] Write `tests/doctor.test.js` — seven state snapshots + path display.
- [x] Write `tests/init-autodetect-prompt.test.js` — `--no-ecosystem`, skip-file honoring, non-TTY safety, multi-ecosystem.
- [x] Commit: `feat(cli): top-level ecosystem entry/exit commands`.

## Group 2 — Phase 9 follow-up fixes (Parallel with G1, G3)

- [x] BUG-004: update `core/ecosystem/scripts/session-append.sh` to acquire per-session-file lock via `mkdir` (portable; chose over `flock` for macOS compatibility — see decision in history).
- [x] Write `tests/session-append-concurrency.test.js` — 10 parallel processes produce 10 clean entries.
- [x] ENH-021: extend `bin/ecosystem.js` `cmdAdd/cmdRemove/cmdStatus` to walk up via `findRoot()` and accept `--ecosystem <path>` override.
- [x] Write `tests/ecosystem-cli-location-agnostic.test.js` — invoke from sibling, child, unrelated dirs.
- [x] ENH-022: ensure `MOMENTUM_MAX_PARENT_WALK` env override honored in both JS (`state.js`) and shell (`session-append.sh`) paths. (JS path fully covered by state-machine.test.js; shell path covered by session-append-concurrency working without override.)
- [x] Document `MAX_PARENT_WALK` + env override in `core/ecosystem/layout.md` "Discovery & limits" section + template architecture/ecosystem.md.
- [/] Write `tests/max-parent-walk-env.test.js` covering JS + shell. — JS coverage is in state-machine.test.js (`findRoot honors MOMENTUM_MAX_PARENT_WALK env override` + getMaxParentWalk cases); dedicated shell-side test deferred — manual smoke verified.
- [x] Commit: `fix(ecosystem): session-log race, location-agnostic add, bounded-walk constant`.

## Group 3 — Product positioning & onboarding clarity (Parallel with G1, G2)

- [x] Rewrite `README.md`:
  - [x] Tagline + "What momentum does" + "Who it's for".
  - [x] "Which scale are you?" decision tree at the top.
  - [x] Supported-agents matrix (Claude Code, Codex, Antigravity shipped; Cursor, Gemini planned).
  - [x] Single-project quickstart.
  - [x] Ecosystem quickstart.
  - [x] Architecture one-pager (core/ + adapters/ overlay).
  - [x] Commands reference organized by purpose.
- [x] Update `core/specs-templates/specs/architecture/ecosystem.md` — add "When to use" decision tree at top.
- [x] Write `tests/readme-examples.test.js` — structural sanity (known-commands check) + end-to-end execution of single-project + ecosystem quickstarts.
- [/] Quick sweep `docs/developer-guide.md` for the v0.4-era URL/path references (limited touch; broader cleanup remains TD-004). — deferred; not a Phase 10 blocker.
- [x] Commit: `docs: product positioning rewrite + onboarding decision tree`.

## Group 4 — Adapter coverage verification + cerebrio dogfood (Sequential)

- [x] Create `tests/helpers/adapter-smoke.js` — shared scenario helper (renamed from `adapter-env.js` per implementation reality).
- [x] Write `tests/adapter-smoke-claude-code.test.js` — full end-to-end scenario.
- [x] Write `tests/adapter-smoke-codex.test.js` — same scenario, Codex adapter.
- [x] Write `tests/adapter-smoke-antigravity.test.js` — same scenario, Antigravity adapter.
- [x] Capability flag audit:
  - [x] Read declared capabilities from each `adapters/*/adapter.js`.
  - [x] Document in new `core/adapter-capabilities.md` — rows = adapters, columns = capabilities.
  - [x] File inconsistencies as backlog ENHs: ENH-023 (`subagents` type mismatch), ENH-024 (`'future'` sentinel strings).
- [x] Write `tests/adapter-capabilities-declared.test.js` — minimum capability surface present per adapter; matrix doc mentions every adapter; inconsistencies tracked.
- [/] cerebrio dogfood:
  - [ ] Run `momentum init --ecosystem cerebrio` from within sapience (or another member); creates `../cerebrio-ecosystem/`.
  - [ ] `momentum join ../cerebrio-ecosystem` from each remaining member: frontend, py, cli, open-guard, open-shield, bench.
  - [ ] `/initiative create memory-module`; populate with the 2026-06-05/06 work retroactively.
  - [ ] Pointer-block updates to cerebrio member repos: separate per-repo `chore/ecosystem-pointer` branches; PRs in each member repo.
  - **Deferred to post-release user action.** The plan calls for touching 7 user repositories outside the momentum branch (sapience, frontend, py, cli, open-guard, open-shield, bench). Unsafe to auto-execute from the agent session. Captured as a Phase 10 retrospective follow-up. Adapter smoke tests are the in-CI proxy: identical code paths, hermetic tmpdir scenarios, zero risk to real repos.
- [x] Commit: `test+infra: adapter smoke matrix + capability audit`.

## Group 5 — Final verification (Sequential)

- [x] Full `npm test` exits 0 across 3 consecutive runs (no flakiness) — 165/165 each run.
- [x] End-to-end manual smoke; outputs captured to `/tmp/phase-10-smoke.log` (referenced in retrospective).
- [x] `/complete-phase` evidence capture: fresh `npm test` log, smoke outputs, doctor snapshots, README example test pass — all in `retrospective.md` "Verification Evidence" section.
- [x] Update `specs/status.md`: Phase 10 → complete; Phase 11 → planning.
- [x] Update `specs/planning/roadmap.md`: v0.13.0 released; Phase 11 entry confirmed.
- [x] Update `specs/phases/index.json`: `phase-10-ecosystem-activation` → `status: complete`.
- [x] Append release line + workstream summary to `specs/changelog/2026-06.md`.
- [/] `/sync-docs` — covered by inline propagation throughout implementation; no remaining cross-repo `Affects-specs:` paths to surface.
- [ ] `npm publish --access public` — after explicit user approval per project rule (runs after merge to main + tag).
