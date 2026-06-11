# Phase 16 Rework — Tasks

> Granular task list mirroring `plan.md`. Mark `[x]` complete, `[/]` in progress.

## Group 0 — Contracts + Matrix + Claude Code Regression Lock

- [x] G0.1 Add `destinations.workflows` + `destinations.skills` + `destinations.agents` to all three `adapters/*/adapter.js`; rewire antigravity commands destination to `.agent/workflows/`
- [x] G0.2 Write `tests/claude-code-regression.test.js` + capture v0.18.0 fingerprint fixture (44 files snapshotted)
- [x] G0.3 Refresh `core/adapter-capabilities.md` — deferred to G5 close-out alongside flip decisions
- [x] G0.4 Create `core/adapter-parity-matrix.md` (feature × adapter shipping status grid + footnotes)
- [x] G0.5 Stub `tests/adapter-parity-matrix.test.js`
- [x] G0.6 Add `fakeToolEvent` helper to `tests/_helpers.js` with platform-specific `payloads.*` builders
- [x] G0.7 Extend `tests/adapter-capabilities-declared.test.js` for new destinations keys
- [x] G0.8 Codex `features.hooks` default deferred to G1 AGENTS.md authoring — opt-in instruction baked into the AGENTS.md text regardless of default; live verification in G4

## Group 1 — Codex Native

- [x] G1.1 Update `adapters/codex/hooks.json` matchers to `apply_patch|shell` for PreToolUse + PostToolUse; SessionStart unmatched
- [x] G1.2 `destinations.skills` → `['.agents', 'skills']` (shared with Antigravity) — done in G0.1
- [x] G1.3 Author 3 TOML subagents at `adapters/codex/agents/` with `sandbox_mode = "read-only"`
- [x] G1.4 Author `adapters/codex/skills/momentum-orient/SKILL.md` (orient persona)
- [x] G1.5 Rewrite Codex `AGENTS.md` — **pivoted strategy**: 2,200+ lines of recipe text won't fit in 32 KiB AGENTS.md. New pattern: AGENTS.md teaches the *lookup pattern* (recipes live at `.codex/commands/<name>.md`; user invokes by name; agent finds + follows). Recipe table in AGENTS.md maps every shipped recipe to its file path.
- [x] G1.6 Write `tests/adapter-codex-recipes.test.js` — 4 tests assert AGENTS.md has lookup-pattern section + recipe table covers every shipped recipe + hooks doc + Project Extensions marker
- [x] G1.7 Write `tests/adapter-subagents-codex.test.js` — 2 tests: TOML schema + sandbox_mode + orient skill frontmatter
- [x] G1.8 Write `tests/adapter-hook-execution-codex.test.js` — 5 tests: PreToolUse fires on apply_patch + shell, bypasses non-matching tools, PostToolUse history reminder, SessionStart wired
- [x] G1.9 Extend `tests/adapter-smoke-codex.test.js` for new install paths (subagents + orient + AGENTS.md recipe table)

## Group 2 — Antigravity Native

- [x] G2.1 `adapters/antigravity/adapter.js` destinations rewired in G0 + capability declarations updated (slashCommands true via workflows; skills true; sessionStartHook false pending VAL-002)
- [x] G2.2 Authored 5 Antigravity-specific workflows at `adapters/antigravity/workflows/<name>.md` (scout, dispatch, handoff, continue, review-code) with YAML frontmatter + numbered steps. Core/commands/*.md (15 files) auto-ship as workflows via destinations.commands → `.agent/workflows/` rewire.
- [x] G2.3 Authored 3 reviewer SKILL directories at `adapters/antigravity/skills/momentum-reviewer-{security,qa,architecture}/SKILL.md`
- [x] G2.4 Authored `adapters/antigravity/skills/momentum-orient/SKILL.md`
- [x] G2.5 Authored `adapters/antigravity/hooks.json` with platform-correct matchers: PreToolUse `run_command|view_file|.*write.*|apply_patch`, PostToolUse `run_command|apply_patch|.*write.*`, SessionStart unmatched
- [x] G2.6 Rewrote Antigravity `AGENTS.md` — documents `.agent/workflows/` (recipes), `.agents/skills/` (4 personas), `.agents/hooks.json` (hooks event table)
- [x] G2.7 `tests/adapter-workflows-antigravity.test.js` — 5 tests: overlay workflows install + core commands ship as workflows + YAML frontmatter + 12K char limit + no .antigravity/ leak
- [x] G2.8 `tests/adapter-skills-antigravity.test.js` — 3 tests: 4 skills install + frontmatter has name+description + hooks.json install
- [x] G2.9 `tests/adapter-hook-execution-antigravity.test.js` — 5 tests: PreToolUse fires on run_command + view_file, bypasses non-match, PostToolUse history reminder fires, SessionStart wired
- [x] G2.10 `tests/adapter-smoke-antigravity.test.js` was already updated in G0 for `.agent/workflows/` path; full smoke covered by new G2.7-9 tests

## Group 3 — Shared brainstorm-gate generalization

- [x] G3.1 `git mv` `adapters/claude-code/scripts/brainstorm-gate.sh` → `core/scripts/brainstorm-gate.sh`
- [x] G3.2 Payload parser generalized — handles Claude `tool_input.file_path`, Antigravity `tool_input.path`, Codex apply_patch `tool_input.input` with `*** Update File:` extraction, Codex shell `tool_input.command` with specs/-targeting grep
- [x] G3.3 Project-root resolution: `MOMENTUM_PROJECT_DIR` → `CLAUDE_PROJECT_DIR` → `pwd` fallback
- [x] G3.4 `bin/momentum.js` `init()` copies entire `core/scripts/` recursively (was: only check-history-reminder.sh explicit)
- [x] G3.5 `tests/brainstorm-gate.test.js` — 10 existing Claude scenarios preserved + 6 new (Codex apply_patch update/outside/no-sentinel, Codex shell, Antigravity run_command, Antigravity view_file) = 16 total
- [x] G3.6 `tests/tarball.test.js` required-paths: `core/scripts/brainstorm-gate.sh` (moved from adapters/claude-code/scripts/)
- [x] G3.7 `core/commands/brainstorm-{idea,phase}.md` + `start-project.md` doc refs updated to `core/scripts/brainstorm-gate.sh` + "shared across Claude Code, Codex, and Antigravity"
- [x] G3.8 `tests/claude-code-regression.test.js` fixture re-snapshotted to v0.19.0 baseline (45 files, +1 sessionstart-handoff.sh — fixes v0.18.0 latent bug where settings.json referenced it but it never installed). Behavior unchanged per tests/brainstorm-gate.test.js (10 Claude scenarios green)

## Group 4 — Live Smoke + Path Decision Gate

- [/] G4.1 Codex CLI not in dev env → VAL-001 filed in backlog. 6 verification questions enumerated explicitly.
- [/] G4.2 Antigravity CLI not in dev env → VAL-002 filed in backlog with `.agent/` vs `.agents/` path-lock question explicitly enumerated.
- [x] G4.3 Install evidence captured: `evidence/codex-install.txt` (115 lines, file tree + hooks.json), `evidence/antigravity-install.txt` (143 lines, file tree + hooks.json + workflows list + skills list), `evidence/test-suite.txt` (326/326 pass).
- [x] G4.4 Discovery: v0.18.0 latent bug (sessionstart-handoff.sh referenced but not installed) — logged + fixed in G3.4. No other discoveries from install evidence.

## Group 5 — Capability Flips + Matrix Close-Out

- [/] G5.1 Codex `parallelSubagents` flip deferred — gated on VAL-001 live evidence
- [/] G5.2 Codex `skills` flip — Antigravity skills already `true` (overlay ships); Codex skills boolean stays `false` until VAL-001 confirms live discovery
- [/] G5.3 Antigravity `sessionStartHook` flip deferred — gated on VAL-002 live evidence
- [x] G5.4 Matrix tests green: 14/14 (adapter-parity-matrix + adapter-capabilities-declared + claude-code-regression)
- [x] G5.5 Full regression: 326/326 (was 288 v0.18.0 baseline; +38 new across phase; zero pre-existing regressions)

## Group 6 — Retrospective + Docs Sync

- [x] G6.1 `retrospective.md` authored with Rule 12 Verification Evidence section (pointing at evidence/test-suite.txt + codex-install.txt + antigravity-install.txt) + acceptance check + what-surprised-us + followups + release readiness
- [x] G6.2 Doc sync done in-flight: status.md (active phase), phases/README.md (Phase 16 Rework row), phases/index.json (topics), changelog/2026-06.md (rework entry), roadmap.md (renumber: Reach → 17, Intelligence → 18, Platform → 19), capability-matrix kept current, parity-matrix kept current
- [ ] G6.3 Prompt user for `/complete-phase` + merge/release approval (this is the hard stop per autonomous-execution contract)
