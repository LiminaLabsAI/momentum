---
type: Plan
---

# Phase 16 Rework — Implementation Plan

# Sequential:  Group 0 → (Groups 1 + 2 + 3 in parallel) → Group 4 → Group 5 → Group 6

External dependencies:

- Real `codex` CLI for live verification (Group 4); VAL-001 if unavailable
- Real `agy` CLI for live verification + path-decision smoke (Group 4); VAL-002 if unavailable
- macOS or Linux for shell hook tests

Per-group acceptance gate: `npm test` green AND Claude Code regression intact.

---

## Group 0 — Contracts + Matrix + Claude Code Regression Lock

**Sequential.** Blocks Groups 1, 2, 3.

External: none.

Commit: `feat(adapter-contract): destinations.workflows + parity matrix + Claude Code regression lock`

- [ ] G0.1 Add `destinations.workflows`, `destinations.skills`, `destinations.agents` to all three `adapters/*/adapter.js`. Claude Code declares all three with paths but ships no overlay content (uniform contract, declared-not-used pattern).
- [ ] G0.2 Write `tests/claude-code-regression.test.js` — runs `momentum init --agent claude-code` into a tmp dir; computes a fingerprint of the file tree + SHA256 of critical files (CLAUDE.md, scripts/check-history-reminder.sh, .claude/settings.json, every .claude/commands/*.md, every .agent/rules/*.md, scripts/brainstorm-gate.sh); asserts byte-for-byte match with a committed `tests/fixtures/v0.18.0-claude-code-fingerprint.json`. Initial fingerprint captured from current `main` install.
- [ ] G0.3 Refresh `core/adapter-capabilities.md` against post-research vendor docs. Note Codex `features.hooks` default decision (researched in G0.8).
- [ ] G0.4 Create `core/adapter-parity-matrix.md` — per-feature × per-adapter shipping status grid covering: recipes (commands/workflows/AGENTS-sections), personas (skills), parallel workers (subagents), hooks (PreToolUse/PostToolUse/SessionStart), AGENTS.md install, brainstorm-gate, history-reminder, session-greeting, /review-code, momentum-orient, ecosystem commands.
- [ ] G0.5 Stub `tests/adapter-parity-matrix.test.js` — every (feature, adapter) cell declares a status; every adapter is represented as a column.
- [ ] G0.6 Add `fakeToolEvent` helper to `tests/_helpers.js` with platform-specific payload shapes (Claude `tool_input.file_path`, Codex `tool_input.input` apply_patch, Antigravity `tool_input` with run_command/view_file). Pin CLAUDE_PROJECT_DIR + MOMENTUM_PROJECT_DIR to simulated project root.
- [ ] G0.7 Extend `tests/adapter-capabilities-declared.test.js` for the three new destinations keys.
- [ ] G0.8 Re-confirm Codex `features.hooks` default by reading the current Codex config-reference page; document the answer in `core/adapter-capabilities.md` and in the parity matrix footnote.

Verification: D1 + D8 + D9 tests pass; full `npm test` ≥288 + 4 new (parity matrix, capabilities-declared extension, regression test, fakeToolEvent).

---

## Group 1 — Codex Native (Parallel with Groups 2, 3)

External: none (depends only on G0 contracts).

Commit: `feat(codex): native hooks + TOML subagents + AGENTS.md recipes`

- [ ] G1.1 Update `adapters/codex/hooks.json` matchers to `apply_patch|shell`; PreToolUse + PostToolUse + SessionStart all wired.
- [ ] G1.2 Update `adapters/codex/adapter.js` to declare `destinations.skills` → `['.agents', 'skills']` (shared convention with Antigravity, NOT `.codex/skills/`).
- [ ] G1.3 Author 3 TOML subagents at `adapters/codex/agents/momentum-reviewer-{security,qa,architecture}.toml` with required schema (`name`, `description`, `developer_instructions`) + `sandbox_mode = "read-only"`.
- [ ] G1.4 Author `adapters/codex/skills/momentum-orient/SKILL.md` — the orient-discipline persona (codifies Rule 1).
- [ ] G1.5 Rewrite `adapters/codex/instructions/AGENTS.md`:
  - Navigation block (current state, backlog, etc.)
  - Codex Hooks event table (PreToolUse / PostToolUse / SessionStart with matchers)
  - Momentum Subagents in Codex section (the 3 reviewer TOMLs + dispatch pattern)
  - **`## Recipes` block** — for each phase + orchestration command (brainstorm-idea, brainstorm-phase, start-project, start-phase, sync-docs, complete-phase, log, track, review, validate, migrate, ecosystem, initiative, session, systematic-debug, scout, dispatch, handoff, continue, review-code) embed a `### Recipe: <name>` subsection whose body is the SAME recipe content as `core/commands/<name>.md`. The agent finds the section when the user invokes the recipe by name.
  - Always-On Rules (preserve)
  - `## Project Extensions` marker (preserve for upgrade safety)
- [ ] G1.6 Write `tests/adapter-codex-recipes.test.js` — assert AGENTS.md contains a `### Recipe:` section for each of the 19 recipes; assert each recipe section body is non-trivial (>50 chars).
- [ ] G1.7 Write `tests/adapter-subagents-codex.test.js` — assert all 3 TOMLs install with required keys AND `sandbox_mode = "read-only"`.
- [ ] G1.8 Write `tests/adapter-hook-execution-codex.test.js` — fake apply_patch tool event; assert PreToolUse hook fires brainstorm-gate.sh with the right exit codes for sentinel-present and sentinel-absent scenarios. Use the G0.6 fakeToolEvent helper.
- [ ] G1.9 Extend `tests/adapter-smoke-codex.test.js` for `.codex/agents/`, `.agents/skills/momentum-orient/`, and AGENTS.md `## Recipes` block install.

Verification: D2 + D3 + D4 pass. **D9 (Claude Code regression) green.** Full `npm test` ≥288 + group-additive new tests.

---

## Group 2 — Antigravity Native (Parallel with Groups 1, 3)

External: none (depends only on G0 contracts).

Commit: `feat(antigravity): workflows + skills + hooks (native idiom)`

- [ ] G2.1 Update `adapters/antigravity/adapter.js`:
  - Remove `destinations.commands` entirely (Antigravity has no commands/ concept)
  - Add `destinations.workflows` → `['.agent', 'workflows']` (singular — confirmed in G0.8 or smoke-test gated in G4)
  - Add `destinations.skills` → `['.agents', 'skills']`
  - Add `destinations.agents` → `['.agents', 'agents']` (declared but unused — uniform contract)
  - `configFiles` entry for `hooks.json` → `.agents/hooks.json`
- [ ] G2.2 Author workflows at `adapters/antigravity/workflows/<name>.md` for: brainstorm-phase, start-phase, sync-docs, complete-phase, review-code, dispatch, handoff, continue. Each: YAML frontmatter `--- description: ... ---` + numbered/headed step sections. ≤12,000 chars each; use `// run workflow: <name>` composition if needed.
- [ ] G2.3 Author 3 reviewer SKILL directories at `adapters/antigravity/skills/momentum-reviewer-{security,qa,architecture}/SKILL.md` with YAML frontmatter (`name`, `description`) + persona body (matching the Codex TOML reviewer instructions in spirit, formatted as Antigravity skill body).
- [ ] G2.4 Author `adapters/antigravity/skills/momentum-orient/SKILL.md` (orient discipline persona).
- [ ] G2.5 Author `adapters/antigravity/hooks.json` with matchers:
  - PreToolUse: `run_command|view_file|.*write.*` → `bash scripts/brainstorm-gate.sh`
  - PostToolUse: `apply_patch|run_command` → `bash scripts/check-history-reminder.sh`
  - SessionStart: no matcher → `bash scripts/sessionstart-handoff.sh`
- [ ] G2.6 Rewrite `adapters/antigravity/instructions/AGENTS.md`:
  - Navigation block
  - `.agents/` layout table (workflows / skills / hooks)
  - Workflows section (how the agent reads `.agent/workflows/<name>.md` when user types `/<name>`)
  - Skills section (when each shipped skill activates)
  - Hooks event table
  - Always-On Rules
  - `## Project Extensions` marker
- [ ] G2.7 Write `tests/adapter-workflows-antigravity.test.js` — assert all 8 workflow files install; each has valid YAML frontmatter with `description`; each ≤12,000 chars.
- [ ] G2.8 Write `tests/adapter-skills-antigravity.test.js` — assert reviewer skills + orient skill install as directories with SKILL.md; frontmatter has `name` + `description`.
- [ ] G2.9 Write `tests/adapter-hook-execution-antigravity.test.js` — fake run_command / view_file events; assert hooks fire correctly.
- [ ] G2.10 Update `tests/adapter-smoke-antigravity.test.js` for new install paths (`.agent/workflows/`, `.agents/skills/`, `.agents/hooks.json`); assert NO `.antigravity/` paths exist after init.

Verification: D5 + D6 + D7 pass. **D9 (Claude Code regression) green.**

---

## Group 3 — Shared brainstorm-gate generalization (Parallel with Groups 1, 2)

External: none.

Commit: `feat(core): brainstorm-gate.sh handles Claude + Codex payloads`

- [ ] G3.1 Move `adapters/claude-code/scripts/brainstorm-gate.sh` → `core/scripts/brainstorm-gate.sh` via `git mv`. This is the ONE Claude Code adapter file touched in the rework — same post-install relative path (`scripts/brainstorm-gate.sh`) preserves byte-equivalent Claude Code behavior.
- [ ] G3.2 Generalize payload parser in the moved script:
  - Try `tool_input.file_path` (Claude Code shape) — current behavior
  - Fall back to scanning `tool_input.input` for `*** Update File: <path>` and `*** Add File: <path>` lines (Codex apply_patch shape)
  - Fall back to `tool_input.command` extraction for sh-write-like cases (Codex shell tool)
- [ ] G3.3 Generalize project-root resolution: `MOMENTUM_PROJECT_DIR` → `CLAUDE_PROJECT_DIR` → `pwd`.
- [ ] G3.4 Update `bin/momentum.js` `init()` to copy entire `core/scripts/` tree recursively (so brainstorm-gate.sh ships to both Claude Code and Codex installs). Preserves current Claude Code install (`scripts/brainstorm-gate.sh` ends up in the same target dir).
- [ ] G3.5 Update `tests/brainstorm-gate.test.js` HOOK path to `core/scripts/`; add new test cases for Codex apply_patch payload shape (write to specs/ with sentinel → exit 2; write outside specs/ → exit 0; non-Write tool → exit 0).
- [ ] G3.6 Update `tests/tarball.test.js` required-paths: `core/scripts/brainstorm-gate.sh` (NOT `adapters/claude-code/scripts/brainstorm-gate.sh`).
- [ ] G3.7 Update `core/commands/brainstorm-{idea,phase}.md` + `start-project.md` doc references for the new path.
- [ ] G3.8 Update `tests/claude-code-regression.test.js` fingerprint to accommodate the move: the brainstorm-gate.sh content lives at the same post-install path (`scripts/brainstorm-gate.sh`); only the source-tree path changes. Regression test passes byte-for-byte for the installed file.

Verification: D9 (Claude Code regression) green throughout. brainstorm-gate fires correctly on Claude Code AND Codex payload shapes via tests/brainstorm-gate.test.js.

---

## Group 4 — Live Smoke + Path Decision Gate (Sequential after 1+2+3)

External: `codex` CLI + `agy` CLI for live verification.

Commit: `test(adapters): live smoke + Antigravity .agent/.agents path lock`

- [ ] G4.1 Check `codex` CLI availability. If present: install momentum to tmp dir, exercise PreToolUse via attempted write to specs/ with sentinel; observe whether `features.hooks` opt-in is required; capture transcript to `evidence/codex-live.txt`. If absent: file VAL-001 backlog item with explicit features.hooks guidance for the user to enable.
- [ ] G4.2 Check `agy` CLI availability. If present: install momentum, run `agy`, list available slash commands, confirm whether workflows are read from `.agent/workflows/` (singular) or `.agents/workflows/` (plural). LOCK the path. Capture to `evidence/antigravity-live.txt`. If absent: file VAL-002 with both paths shipped via dual-copy.
- [ ] G4.3 Install evidence (always runs, even when CLIs absent): `momentum init --agent codex` and `--agent antigravity` into tmp dirs; capture file tree + key file contents to `evidence/{codex,antigravity}-install.txt`.
- [ ] G4.4 Log any discoveries as `[DISCOVERY]` history entries; fix trivial issues in-phase; file backlog for non-trivial.

Verification: paths locked OR VAL filed; install evidence captured for both adapters.

---

## Group 5 — Capability Flips + Matrix Close-Out (Sequential)

External: none.

Commit: `chore(adapters): capability matrix close-out`

- [ ] G5.1 If G4.1 Codex evidence confirms parallel fan-out: flip `parallelSubagents: true`; drop roadmap entry.
- [ ] G5.2 If G4.1 Codex evidence confirms skills discovery from `.agents/skills/`: flip `skills: true` for Codex; drop roadmap entry.
- [ ] G5.3 If G4.2 Antigravity evidence confirms SessionStart event fires: flip `sessionStartHook: true`; drop roadmap entry.
- [ ] G5.4 Re-run `tests/adapter-capabilities-declared.test.js` + `tests/adapter-parity-matrix.test.js` with post-flip values.
- [ ] G5.5 Full regression: `npm test` ≥288 + new group tests; zero regressions.

Verification: matrix tests green; full suite green.

---

## Group 6 — Retrospective + Docs Sync (Sequential)

External: none.

Commit: `docs(phase-16-rework): retrospective + sync-docs`

- [ ] G6.1 Author `retrospective.md` with Rule 12 Verification Evidence section: install transcripts, full test pass output, capability-flip rationale (or VAL gate notes).
- [ ] G6.2 Doc sync (already mostly done in-flight; final pass):
  - `specs/status.md` — current phase reflects rework branch
  - `specs/phases/README.md` — Phase 16 Rework row replaces (or augments) the prior Phase 16 row
  - `specs/phases/index.json` — phase entry topics
  - `specs/changelog/2026-06.md` — rework summary
  - `core/adapter-capabilities.md` — post-flip values
  - `core/adapter-parity-matrix.md` — post-flip cells
  - `specs/planning/roadmap.md` — keep Phase 16 renumber (Reach → 17, Intelligence → 18, Platform → 19)
- [ ] G6.3 Prompt user for `/complete-phase` + merge/release approval (the hard stop per autonomous-execution contract).

Verification: full suite green; retrospective complete; docs synced.

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Claude Code regression slips through pass-count check | Low | New `tests/claude-code-regression.test.js` snapshots install fingerprint — explicit byte-level check |
| `core/scripts/brainstorm-gate.sh` move breaks Claude Code install | Low | Same post-install path; tests/brainstorm-gate.test.js runs all 13 Claude scenarios after the move |
| Antigravity `.agent/` vs `.agents/` path wrong | Medium | Group 4 live smoke locks it; absent live smoke, ship dual-copy and document VAL-002 |
| Codex `features.hooks` opt-in not documented | Medium | G0.8 confirms current default; AGENTS.md surfaces enable-instruction if required; VAL-001 captures live verification |
| Recipe text in Codex AGENTS.md grows too large | Low | 32 KiB AGENTS.md limit; 19 recipes × ~100 lines ≈ 6 KiB — well under |
| Hook scripts break in CI but pass locally | Low | Group 3 tests exercise the hooks via `bash` direct invocation (not via real Claude Code / Codex / agy runtime); platform-correct payload shapes embedded in test fixtures |
