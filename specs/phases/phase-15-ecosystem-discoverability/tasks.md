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

- [ ] Extend `core/scripts/sessionstart-handoff.sh` to also surface ecosystem context (walk-up + sibling-scan algorithm mirroring `session-append.sh`).
- [ ] Print `▸ Ecosystem: <name> (<N> members)` to stderr when ecosystem reachable.
- [ ] Print `▸ Active initiative: <slug>` to stderr when `.state/active-initiative` is set.
- [ ] Keep handoff banner intact (append-after-ecosystem in output ordering).
- [ ] Verify hook cost <100ms in shell time.
- [ ] No changes needed to `adapters/codex/hooks.json` (script path is the same).
- [ ] Write `tests/sessionstart-ecosystem-banner.test.js` (temp ecosystem; assert banner text + exit code).
- [ ] Run `npm test` for G3 changes — green.
- [ ] Commit G3: `feat(adapters/claude-code): SessionStart hook surfaces ecosystem context`

## Group 4 — Dispatch CLI degraded-mode notice upfront (Parallel)

- [ ] In `core/orchestration/dispatch.js` `dispatch(opts)`, emit a `note` event with `▸ MODE NOTICE:` prefix BEFORE the `started` event when running in-process.
- [ ] In `synthesizeInProcess`, replace trailing parenthetical with TOP-of-block admonition block.
- [ ] In `renderArtifact`, add `> [!NOTE]` admonition immediately below the `**Mode:**` line for in-process runs.
- [ ] Write `tests/dispatch-cli-banner.test.js` (mock scout; capture emitter events; assert ordering + prefix).
- [ ] Run `npm test` for G4 changes — green.
- [ ] Commit G4: `feat(orchestration): dispatch CLI surfaces degraded-mode notice upfront`

## Group 5 — `momentum ecosystem initiative create` CLI ships (Parallel)

- [ ] Add `initiative` subcommand to `runEcosystem` dispatch in `bin/ecosystem.js`.
- [ ] Implement `cmdInitiative(rest)` → `cmdInitiativeCreate(args)`.
- [ ] `cmdInitiativeCreate`: parse slug + flags (`--why`, `--repos`, `--owner`, `--ecosystem`); resolve root; defaults for missing flags.
- [ ] Wire to `core/ecosystem/lib/initiative.js` (`nextInitiativeId`, `writeInitiative`, `setActive`).
- [ ] Substitute frontmatter + Why into template (`core/ecosystem/templates/initiative-template.md`).
- [ ] Print success message with file path + active flag.
- [ ] Update `printUsage` in `bin/ecosystem.js` to list `initiative create`.
- [ ] Update `initiativesReadme()` text — drop "coming with Group 2 of Phase 9"; describe the shipped CLI.
- [ ] Write `tests/ecosystem-initiative-cli.test.js` (temp ecosystem; assert file content + active marker).
- [ ] Run `npm test` for G5 changes — green.
- [ ] Commit G5: `feat(ecosystem): ship momentum ecosystem initiative create CLI`

## Group 6 — Test suite + tarball shape (Sequential, after G1–G5)

- [ ] `npm test` green (all groups combined).
- [ ] Update `tests/tarball.test.js` to assert new `core/ecosystem/templates/ecosystem-claude.md` + `ecosystem-agents.md` ship in npm pack.
- [ ] Manual smoke: fresh `momentum ecosystem init` in `/tmp` produces CLAUDE.md + AGENTS.md with correct content.
- [ ] Manual smoke: `momentum ecosystem initiative create` writes file + sets active.
- [ ] Capture verification evidence to `specs/phases/phase-15-ecosystem-discoverability/artifacts/verification.txt`.
- [ ] Commit G6: `chore(tests): verify phase 15 — full suite + tarball shape green`

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
