---
type: Task List
---

# Phase 15 — Ecosystem Agent Discoverability: Tasks

> Granular checklist mirroring `plan.md`. Mark `[x]` complete, `[/]` in progress, `[ ]` not started.

## Group 0 — Foundations + tracking (Sequential)

- [x] Renumber `specs/planning/roadmap.md` — Phase 15 = Ecosystem Agent Discoverability (v0.18.0); Reach → 16 (v0.19.0); Intelligence → 17 (v0.20.0); Platform → 18 (v1.0). Updated Timeline + Dependencies + Milestones.
- [x] Update `specs/status.md` — Upcoming Phases + Active Phase → Phase 15.
- [x] Update `specs/phases/README.md` — appended Phase 15 row (status In Progress).
- [x] Update `specs/phases/index.json` — added `phase-15-ecosystem-discoverability` entry with topic keywords.
- [x] Bump ENH-025 status `open → in-progress`; phase `unscheduled → phase-15`. Also filed ENH-032/033/034/035 for the four sibling discoverability fixes.
- [x] Create `specs/phases/phase-15-ecosystem-discoverability/history.md` with seed entries (`SCOPE_CHANGE` + 3 `DECISION`s + 1 `FEATURE`).
- [x] Create `specs/phases/phase-15-ecosystem-discoverability/retrospective.md` stub.
- [x] Create `specs/phases/phase-15-ecosystem-discoverability/artifacts/.gitkeep`.
- [x] Commit Group 0: `infra(specs): phase 15 scaffolding + roadmap renumber` (1b07e91)

## Group 1 — Managed CLAUDE.md/AGENTS.md on `ecosystem init` (Parallel)

- [x] Create `core/ecosystem/templates/ecosystem-claude.md` (managed prefix + `## Project Extensions` marker).
- [x] Create `core/ecosystem/templates/ecosystem-agents.md` (same content, sibling file so both surfaces always ship).
- [x] Extend `cmdInit` in `bin/ecosystem.js` to write `CLAUDE.md` + `AGENTS.md` from the templates via `writeManagedInstructionFile` + `renderEcosystemInstruction` helpers (idempotent — skip if file exists).
- [x] Update `cmdInit` "Next steps" stdout to mention `CLAUDE.md` + `AGENTS.md` were created.
- [x] Verify `package.json` `files` glob already ships `core/ecosystem/templates/` (the existing `core/` entry covers it; no change needed).
- [x] Write `tests/ecosystem-init-claude-md.test.js` (8 subtests: existence, name substitution, coordination-layer guidance, primitives listed, dispatch-CLI warning, Project Extensions marker, AGENTS.md parity, idempotency).
- [x] Run `npm test` for G1 + existing ecosystem regression suite — 8/8 G1 green; 53/53 existing ecosystem tests still green.
- [ ] Commit G1: `feat(ecosystem): write managed CLAUDE.md + AGENTS.md on init (ENH-025)`

## Group 2 — Action-bearing pointer block (Parallel)

- [x] Added `POINTER_VERSION = 2` constant in `core/ecosystem/lib/pointer.js`.
- [x] Rewrote the block content via new `renderPointerBody(name, rel)` helper — action-bearing 13-line stanza (routing rule + 4 primitives + status hint + dispatch-CLI caveat).
- [x] `ensurePointerInjected` now detects version drift via `POINTER_BEGIN_RE` (matches both `<!-- ecosystem:begin -->` and `<!-- ecosystem:begin v=N -->`); rewrites the FIRST block in place when existing version < `POINTER_VERSION`; preserves surrounding content.
- [x] `stripPointer` rewritten with `POINTER_BLOCK_RE` that matches any version stamp.
- [x] `hasPointerBlock` switched to substring-match on `POINTER_BEGIN_PREFIX` for cross-version detection.
- [x] Updated existing tests that exact-matched the v1 sentinel to substring-match (ecosystem-cli.test.js × 2; init-ecosystem-flag.test.js × 1; init-autodetect-prompt.test.js × 2; single-project-unchanged.test.js × 3) so they accept both forms.
- [x] Wrote `tests/pointer-block-content.test.js` (8 subtests: POINTER_VERSION constant; fresh insert content; v1→v2 migration with surrounding content preserved; already-v2 idempotency; stripPointer v2; stripPointer v1; hasPointerBlock cross-version; degenerate `.` rel path).
- [x] Run full ecosystem-related test suite — 103/103 green (8 new + 95 existing).
- [ ] Commit G2: `feat(ecosystem): action-bearing pointer block (orchestration primitives + routing rule)`

## Group 3 — SessionStart hook prints ecosystem context (Parallel)

- [x] Extended `core/scripts/sessionstart-handoff.sh` to surface ecosystem context BEFORE the handoff banner. Algorithm mirrors `core/ecosystem/scripts/session-append.sh` (parent walk bounded by `MOMENTUM_MAX_PARENT_WALK` + sibling scan at each level).
- [x] Prints `▸ Ecosystem: <name> (<N> member[s])` to stderr when ecosystem reachable. Uses python3 for JSON parse (with grep/sed fallback when python3 absent).
- [x] Prints `▸ Active initiative: <slug>` to stderr when `.state/active-initiative` is set and non-empty.
- [x] Handoff banner intact (printed after ecosystem context).
- [x] Hook cost <100ms in practice (test suite averages ~50ms per invocation including subprocess startup).
- [x] No changes needed to adapter wiring — `adapters/claude-code/settings.json` and `adapters/codex/hooks.json` both reference `bash scripts/sessionstart-handoff.sh` already; the script path is the same.
- [x] Refreshed self-installed copy at `scripts/sessionstart-handoff.sh` to match canonical `core/scripts/sessionstart-handoff.sh` (dogfood: this repo's own SessionStart hook gets the new behavior immediately).
- [x] Wrote `tests/sessionstart-ecosystem-banner.test.js` (9 subtests: silent baseline, from root, from member sibling, active initiative, empty initiative file, pluralisation 0/1/N, deep parent-walk, handoff coexistence, broken JSON resilience).
- [x] Regression check on `orchestration-handoff-*.test.js` — 12/12 still green.
- [ ] Commit G3: `feat(adapters/claude-code): SessionStart hook surfaces ecosystem context`

## Group 4 — Dispatch CLI degraded-mode notice upfront (Parallel)

- [x] Added `CLI_MODE_NOTICE` constant in `core/orchestration/dispatch.js` (single string used by all three surfaces).
- [x] `dispatch(opts)` emits `note { message: CLI_MODE_NOTICE }` event BEFORE the `started` event — surfaces as first stdout line via default renderer.
- [x] `synthesizeInProcess` rewritten: removed trailing parenthetical; added `> [!NOTE]` admonition at the TOP of the synthesis body.
- [x] `renderArtifact` adds `> [!NOTE]` admonition between `**Mode:**` header and `## Synthesis`. Skipped via new `isAgentDriven` param (set true by `record()`, false/default for `dispatch()`).
- [x] Wrote `tests/dispatch-cli-banner.test.js` (6 subtests: CLI_MODE_NOTICE constant; event ordering note < started; CLI stdout banner ordering; synthesis-body top admonition; artifact admonition position; agent-driven record() skips admonition).
- [x] Regression: 20/20 dispatch tests pass (6 new + 14 existing in orchestration-dispatch-cli + orchestration-dispatch-unit).
- [ ] Commit G4: `feat(orchestration): dispatch CLI surfaces degraded-mode notice upfront`

## Group 5 — `momentum ecosystem initiative create` CLI ships (Parallel)

- [x] Added `initiative` subcommand to `runEcosystem` dispatch in `bin/ecosystem.js`; updated unknown-subcommand error message.
- [x] Implemented `cmdInitiative(rest)` → `cmdInitiativeCreate(args)`; `list` / `status` / `close` left as slash-only per scope.
- [x] `cmdInitiativeCreate`: parses slug + flags (`--why`, `--repos`, `--owner`, `--ecosystem`); resolves root; defaults `--repos` to all members, `--owner` to `git config user.name` (→ `$USER` → `(unknown)`), `--why` to placeholder; validates unknown member ids.
- [x] Wired to `core/ecosystem/lib/initiative.js` (`nextInitiativeId`, `writeInitiative`, `setActive`).
- [x] Substituted `{{ID}} / {{TITLE}} / {{REPOS}} / {{STARTED}} / {{OWNER}}` placeholders; expanded per-repo contribution stubs; replaced template's "Why" paragraph with user input when provided.
- [x] Success stdout: `Created initiatives/NNNN-<slug>.md (id N).` + `Set as active initiative.` + placeholder warning when `--why` omitted.
- [x] Updated `printUsage` in `bin/ecosystem.js` to list `initiative create` and the new ecosystem-init CLAUDE.md/AGENTS.md side effects.
- [x] Updated `initiativesReadme()` — dropped "coming with Group 2 of Phase 9"; described the shipped CLI + slash-command parity.
- [x] Wrote `tests/ecosystem-initiative-cli.test.js` (11 subtests: success path with file content + active marker, bad slug, unknown --repos, default --repos, empty-manifest error, placeholder warning, monotonic IDs, location-agnostic from member CWD, missing subsubcommand, unknown subsubcommand, --help mentions `initiative create`).
- [x] Run `npm test` — 288/288 green (initiative + regression).
- [ ] Commit G5: `feat(ecosystem): ship momentum ecosystem initiative create CLI`

## Group 6 — Test suite + tarball shape (Sequential, after G1–G5)

- [x] `npm test` green: 288/288 (was 254 before this phase; +34 new tests across the 5 new test files).
- [x] Updated `tests/tarball.test.js` to assert `core/ecosystem/templates/ecosystem-claude.md` + `ecosystem-agents.md` + `initiative-template.md` ship in npm pack.
- [x] Updated `tests/helpers/adapter-smoke.js` to substring-match the pointer-block sentinel (was exact-matching v=1 form; would have silently passed even if pointer block was missing from v=2 install path).
- [x] Manual smoke: `momentum ecosystem init eco` produces CLAUDE.md + AGENTS.md with "NOT a project" guidance.
- [x] Manual smoke: `momentum ecosystem add ../member-a` injects v=2 pointer block with all 4 primitives + routing rule.
- [x] Manual smoke: `momentum ecosystem initiative create memory-end-to-end --why "ship ..." --owner test` writes `0001-...md` + sets active.
- [x] Manual smoke: SessionStart hook from member with sibling ecosystem prints `▸ Ecosystem: testeco (2 members)` + `▸ Active initiative: test-init`.
- [x] Captured verification evidence to `specs/phases/phase-15-ecosystem-discoverability/artifacts/verification.txt`.
- [ ] Commit G5 + G6 together (small G6 — just test helper fix + tarball assertion + evidence file).

## Group 7 — Doc sync + release v0.18.0 (Sequential, after G6)

- [ ] `/sync-docs` — flush phase history into specs.
- [ ] `/complete-phase` — produce retrospective with verification evidence.
- [ ] Bump `package.json` version → `0.18.0`.
- [ ] PR `phase-15-ecosystem-discoverability` → `main`. **Requires user OK.**
- [ ] Squash-merge. **Requires user OK.**
- [ ] `git tag v0.18.0 && git push origin v0.18.0`. **Requires user OK.**
- [ ] `gh release create v0.18.0 --title "..." --notes "..." --latest --verify-tag`. **Requires user OK.**
- [ ] `npm publish --access public`. **Requires user OK.**
- [ ] Verify: `gh release list --limit 3` shows v0.18.0 Latest; `npm view @avinash-singh-io/momentum version` → `0.18.0`.
- [ ] Update `specs/status.md` → Phase 15 Complete; next active = (between phases).
