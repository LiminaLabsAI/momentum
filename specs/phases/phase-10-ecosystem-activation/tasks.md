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

- [ ] `bin/momentum.js`: implement `momentum init --ecosystem <name>` flag with atomic rollback.
- [ ] `bin/momentum.js`: implement `momentum join <ecosystem-path>` (idempotent, refuses on leader state).
- [ ] `bin/momentum.js`: implement `momentum leave` (idempotent, clean no-op on non-member states).
- [ ] `bin/momentum.js`: implement `momentum doctor` with formatted teaching output.
- [ ] `bin/momentum.js`: auto-detect prompt in `init` (single prompt; `.momentum/skip-ecosystem-prompt` opt-out; `--no-ecosystem` bypass).
- [ ] Write `tests/single-project-unchanged.test.js` — byte-identical output to v0.12.0 init in isolated tmpdir.
- [ ] Write `tests/init-ecosystem-flag.test.js` — end-to-end + rollback on simulated failure.
- [ ] Write `tests/join-leave-roundtrip.test.js` — join/leave cycle + idempotency.
- [ ] Write `tests/doctor.test.js` — every state snapshot.
- [ ] Write `tests/init-autodetect-prompt.test.js` — prompt logic, skip-file honored, `--no-ecosystem` bypass.
- [ ] Commit: `feat(cli): top-level ecosystem entry/exit commands`.

## Group 2 — Phase 9 follow-up fixes (Parallel with G1, G3)

- [ ] BUG-004: update `core/ecosystem/scripts/session-append.sh` to acquire per-session-file lock via `flock -x` (atomic-rename fallback if unavailable).
- [ ] Write `tests/session-append-concurrency.test.js` — 10 parallel processes produce 10 clean entries.
- [ ] ENH-021: extend `bin/ecosystem.js` `cmdAdd/cmdRemove/cmdStatus` to walk up via `findRoot()` and accept `--ecosystem <path>` override.
- [ ] Write `tests/ecosystem-cli-location-agnostic.test.js` — invoke from sibling, child, unrelated dirs.
- [ ] ENH-022: ensure `MOMENTUM_MAX_PARENT_WALK` env override honored in both JS (`state.js`) and shell (`session-append.sh`) paths.
- [ ] Document `MAX_PARENT_WALK` + env override in `core/ecosystem/layout.md` "Discovery & limits" section.
- [ ] Write `tests/max-parent-walk-env.test.js` covering JS + shell.
- [ ] Commit: `fix(ecosystem): session-log race, location-agnostic add, bounded-walk constant`.

## Group 3 — Product positioning & onboarding clarity (Parallel with G1, G2)

- [ ] Rewrite `README.md`:
  - [ ] Tagline + "What momentum does" + "Who it's for".
  - [ ] "Which scale are you?" decision tree at the top.
  - [ ] Supported-agents matrix (Claude Code, Codex, Antigravity shipped; Cursor, Gemini planned).
  - [ ] Single-project quickstart.
  - [ ] Ecosystem quickstart.
  - [ ] Architecture one-pager (core/ + adapters/ overlay).
  - [ ] Commands reference organized by purpose.
- [ ] Update `core/specs-templates/specs/architecture/ecosystem.md` — add "When to use" decision tree at top.
- [ ] Write `tests/readme-examples.test.js` — extract bash blocks; run in tmpdir; assert exit 0.
- [ ] Quick sweep `docs/developer-guide.md` for the v0.4-era URL/path references (limited touch; broader cleanup remains TD-004).
- [ ] Commit: `docs: product positioning rewrite + onboarding decision tree`.

## Group 4 — Adapter coverage verification + cerebrio dogfood (Sequential)

- [ ] Create `tests/helpers/adapter-env.js` — agent-runtime detection + tmpdir setup helpers.
- [ ] Write `tests/adapter-smoke-claude-code.test.js` — full end-to-end scenario.
- [ ] Write `tests/adapter-smoke-codex.test.js` — same scenario, Codex adapter.
- [ ] Write `tests/adapter-smoke-antigravity.test.js` — same scenario, Antigravity adapter.
- [ ] Capability flag audit:
  - [ ] Read declared capabilities from each `adapters/*/adapter.js`.
  - [ ] Document in new `core/adapter-capabilities.md` — rows = adapters, columns = capabilities.
  - [ ] File any inconsistencies as backlog ENHs (do not fix this phase).
- [ ] Write `tests/adapter-capabilities-declared.test.js` — minimum capability surface present per adapter.
- [ ] cerebrio dogfood:
  - [ ] Run `momentum init --ecosystem cerebrio` from within sapience (or another member); creates `../cerebrio-ecosystem/`.
  - [ ] `momentum join ../cerebrio-ecosystem` from each remaining member: frontend, py, cli, open-guard, open-shield, bench.
  - [ ] `/initiative create memory-module`; populate with the 2026-06-05/06 work retroactively.
  - [ ] Log discoveries from dogfooding in this phase's `history.md` as `[DISCOVERY]` entries.
  - [ ] Pointer-block updates to cerebrio member repos: separate per-repo `chore/ecosystem-pointer` branches; PRs in each member repo. NOT bundled into momentum commits.
- [ ] Commit: `test+infra: adapter smoke matrix + capability audit + cerebrio-ecosystem`.

## Group 5 — Final verification (Sequential)

- [ ] Full `npm test` exits 0 across 3 consecutive runs (no flakiness).
- [ ] End-to-end manual smoke on each adapter; capture command outputs.
- [ ] `/complete-phase` evidence capture: fresh `npm test` log, smoke outputs, doctor snapshots, README example test pass.
- [ ] Update `specs/status.md`: Phase 10 → complete; Phase 11 → planning.
- [ ] Update `specs/planning/roadmap.md`: v0.13.0 released; Phase 11 entry confirmed.
- [ ] Update `specs/phases/index.json`: `phase-10-ecosystem-activation` → `status: complete`.
- [ ] Append release line + workstream summary to `specs/changelog/2026-NN.md`.
- [ ] `/sync-docs` — propagate history entries; surface cross-repo `Affects-specs:` paths.
- [ ] `npm publish --access public` — after explicit user approval per project rule.
