# Phase 16 Rework — Tasks

> Granular task list mirroring `plan.md`. Mark `[x]` complete, `[/]` in progress.

## Group 0 — Contracts + Matrix + Claude Code Regression Lock

- [ ] G0.1 Add `destinations.workflows` + `destinations.skills` + `destinations.agents` to all three `adapters/*/adapter.js`
- [ ] G0.2 Write `tests/claude-code-regression.test.js` + capture v0.18.0 fingerprint fixture
- [ ] G0.3 Refresh `core/adapter-capabilities.md` against post-research vendor docs
- [ ] G0.4 Create `core/adapter-parity-matrix.md` (feature × adapter shipping status)
- [ ] G0.5 Stub `tests/adapter-parity-matrix.test.js`
- [ ] G0.6 Add `fakeToolEvent` helper to `tests/_helpers.js` with platform-specific payloads
- [ ] G0.7 Extend `tests/adapter-capabilities-declared.test.js` for new destinations keys
- [ ] G0.8 Re-confirm Codex `features.hooks` default; document in matrix

## Group 1 — Codex Native

- [ ] G1.1 Update `adapters/codex/hooks.json` matchers to `apply_patch|shell` for all three events
- [ ] G1.2 Update `adapters/codex/adapter.js` destinations: `skills` → `['.agents', 'skills']` (shared)
- [ ] G1.3 Author 3 TOML subagents at `adapters/codex/agents/` with `sandbox_mode = "read-only"`
- [ ] G1.4 Author `adapters/codex/skills/momentum-orient/SKILL.md` (orient persona)
- [ ] G1.5 Rewrite Codex `AGENTS.md` with `## Recipes` block embedding all 19 phase + orchestration recipes
- [ ] G1.6 Write `tests/adapter-codex-recipes.test.js` — every recipe section present + non-trivial
- [ ] G1.7 Write `tests/adapter-subagents-codex.test.js` — TOML schema + sandbox_mode assertions
- [ ] G1.8 Write `tests/adapter-hook-execution-codex.test.js` — apply_patch payload fires brainstorm-gate
- [ ] G1.9 Extend `tests/adapter-smoke-codex.test.js` for new install paths

## Group 2 — Antigravity Native

- [ ] G2.1 Rewire `adapters/antigravity/adapter.js` destinations (remove `commands`, add `workflows` + `skills` + `agents`)
- [ ] G2.2 Author 8 workflows at `adapters/antigravity/workflows/<name>.md` (brainstorm-phase, start-phase, sync-docs, complete-phase, review-code, dispatch, handoff, continue)
- [ ] G2.3 Author 3 reviewer SKILL directories at `adapters/antigravity/skills/momentum-reviewer-*/SKILL.md`
- [ ] G2.4 Author `adapters/antigravity/skills/momentum-orient/SKILL.md`
- [ ] G2.5 Author `adapters/antigravity/hooks.json` with `run_command|view_file|.*write.*` matchers
- [ ] G2.6 Rewrite Antigravity `AGENTS.md` documenting `.agent/workflows/`, `.agents/skills/`, `.agents/hooks.json`
- [ ] G2.7 Write `tests/adapter-workflows-antigravity.test.js` — frontmatter + char limit assertions
- [ ] G2.8 Write `tests/adapter-skills-antigravity.test.js` — SKILL.md directories + frontmatter
- [ ] G2.9 Write `tests/adapter-hook-execution-antigravity.test.js` — run_command payload fires hooks
- [ ] G2.10 Update `tests/adapter-smoke-antigravity.test.js` for new install paths; assert no `.antigravity/`

## Group 3 — Shared brainstorm-gate generalization

- [ ] G3.1 `git mv` `adapters/claude-code/scripts/brainstorm-gate.sh` → `core/scripts/brainstorm-gate.sh`
- [ ] G3.2 Generalize payload parser (Claude file_path + Codex apply_patch input + shell command)
- [ ] G3.3 Generalize project-root resolution (MOMENTUM_PROJECT_DIR → CLAUDE_PROJECT_DIR → pwd)
- [ ] G3.4 Update `bin/momentum.js` `init()` to copy `core/scripts/` recursively
- [ ] G3.5 Update `tests/brainstorm-gate.test.js` for new path + Codex apply_patch payload cases
- [ ] G3.6 Update `tests/tarball.test.js` for new brainstorm-gate.sh path
- [ ] G3.7 Update `core/commands/brainstorm-{idea,phase}.md` + `start-project.md` doc references
- [ ] G3.8 Update `tests/claude-code-regression.test.js` fixture to accommodate the source-path move (installed path unchanged)

## Group 4 — Live Smoke + Path Decision Gate

- [ ] G4.1 Codex CLI availability check; live PreToolUse smoke OR VAL-001 filed
- [ ] G4.2 Antigravity CLI availability check; live workflow path lock OR VAL-002 filed
- [ ] G4.3 Install evidence for both adapters into `evidence/`
- [ ] G4.4 Discoveries logged; trivial fixed in-phase, non-trivial filed to backlog

## Group 5 — Capability Flips + Matrix Close-Out

- [ ] G5.1 Conditional Codex `parallelSubagents` flip on G4.1 evidence
- [ ] G5.2 Conditional Codex `skills` flip on G4.1 evidence
- [ ] G5.3 Conditional Antigravity `sessionStartHook` flip on G4.2 evidence
- [ ] G5.4 Re-run matrix tests post-flip
- [ ] G5.5 Full regression `npm test`; zero pre-existing regressions

## Group 6 — Retrospective + Docs Sync

- [ ] G6.1 Author `retrospective.md` with Rule 12 Verification Evidence
- [ ] G6.2 Doc sync: status, README, index, changelog, capability matrix, parity matrix, roadmap
- [ ] G6.3 Prompt user for `/complete-phase` + merge/release approval
