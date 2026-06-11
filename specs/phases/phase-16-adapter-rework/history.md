# Phase 16 Rework History

> Append-only log of decisions, scope changes, and discoveries during the
> Phase 16 rework. See [Rule 8 in CLAUDE.md](../../../CLAUDE.md#rule-8-record-phase-history).

### [SCOPE_CHANGE] 2026-06-11 — Phase 16 rebuilt on `main`; previous `phase-16-adapter-parity` branch retained as research record
Topics: phase-16, rework, scope-change, force-port-vs-native-idiom, research-record
Affects-phases: phase-16-adapter-rework, phase-17-reach
Affects-specs: specs/planning/roadmap.md, specs/status.md
Detail: The previous Phase 16 implementation (`phase-16-adapter-parity` branch, 6 commits, pushed but unmerged) force-ported Claude Code's hook + commands model onto Codex and Antigravity. A 7-agent research workflow surfaced structural defects that would fail at runtime on a real install: Antigravity uses Workflows (`.agent/workflows/<name>.md`) as the native slash-command surface — the previous branch shipped `.antigravity/commands/` which `agy` ignores entirely. Antigravity reviewer subagents are SKILL.md directories with YAML frontmatter, not TOML (TOML is Codex-only). Codex custom slash commands are deprecated and user-only. Hook matchers in the previous branch use Claude tool names (`Write|Edit|MultiEdit`) — Codex uses `apply_patch`, Antigravity uses `run_command|view_file`. Decision: rebuild on `main` (clean v0.18.0 baseline). Previous branch stays at origin as the research record so the iterations and the reasoning are preserved. This rework branch is what ships as v0.19.0.

---

### [DECISION] 2026-06-11 — Recipe / Persona / Subagent are three distinct categories that drive adapter design
Topics: phase-16, conceptual-architecture, recipes-vs-personas, command-vs-skill-distinction
Affects-phases: phase-16-adapter-rework
Affects-specs: specs/phases/phase-16-adapter-rework/overview.md
Detail: The previous Phase 16 conflated three conceptually different things into one "slash command" surface: RECIPES (step-by-step instructions the agent FOLLOWS; user-invoked), PERSONAS / SKILLS (on-demand identity / expertise the agent LOADS to BECOME), and PARALLEL WORKERS / SUBAGENTS (spawned siblings that work concurrently). Phase commands like `/brainstorm-phase` are recipes — the agent follows them. Reviewers like `momentum-reviewer-security` are personas — the agent becomes one to review. They're not the same kind of thing and the platforms surface them differently. Mapping per-platform: Recipes — Claude Code commands at `.claude/commands/<name>.md`; Antigravity workflows at `.agent/workflows/<name>.md`; Codex `## Recipe: <name>` sections embedded in AGENTS.md (no native per-project slash-command surface). Personas — Claude inline (no plumbing today); Antigravity `.agents/skills/<name>/SKILL.md`; Codex `.agents/skills/<name>/SKILL.md` (shared convention). Parallel workers — Claude Task tool; Antigravity native subagent; Codex `.codex/agents/<name>.toml`. This distinction is baked into the rework plan.

---

### [DECISION] 2026-06-11 — Claude Code zero-regression is a top-level rework guard with explicit snapshot test
Topics: phase-16, claude-code-regression, zero-regression-guard, snapshot-fingerprint
Affects-phases: phase-16-adapter-rework
Affects-specs: tests/claude-code-regression.test.js (new in G0.2), tests/fixtures/v0.18.0-claude-code-fingerprint.json (new fixture)
Detail: Per user direction "existing things should work as it is" — Claude Code v0.18.0 behavior must be byte-equivalent after the rework. Enforcement is explicit beyond the pass-count gate: a new `tests/claude-code-regression.test.js` installs Claude Code via `momentum init --agent claude-code` into a tmp dir, computes a fingerprint (file tree + SHA256 of critical files: CLAUDE.md, scripts/check-history-reminder.sh, .claude/settings.json, every .claude/commands/*.md, every .agent/rules/*.md, scripts/brainstorm-gate.sh), and asserts byte-for-byte match with a committed v0.18.0 baseline fixture. Test runs on every group's verification. ONE allowed exception: the `core/scripts/brainstorm-gate.sh` source-tree promotion (was `adapters/claude-code/scripts/`, becomes `core/scripts/` so Codex shares it). The POST-INSTALL path is unchanged (`scripts/brainstorm-gate.sh` in the target project), so the fingerprint's installed-file hash is unchanged. The source-tree move is annotated in the regression test fixture.

---

### [ARCH_CHANGE] 2026-06-11 — Adapter contract destinations gain `workflows` + `skills` + `agents`
Topics: phase-16, adapter-contract, destinations, workflows, skills, agents
Affects-phases: phase-16-adapter-rework
Affects-specs: core/adapter-capabilities.md, adapters/claude-code/adapter.js, adapters/codex/adapter.js, adapters/antigravity/adapter.js
Detail: Phase 7b's Adapter Contract v3 declared `destinations` for `commands`, `agent-rules`, `scripts`, `engines`. Phase 16 Rework adds three more uniform keys: `workflows` (Antigravity native; declared-but-unused on Claude Code and Codex for contract uniformity), `skills` (Antigravity + Codex shared `.agents/skills/` convention; declared but unused on Claude Code), `agents` (Codex `.codex/agents/`; declared but unused on Claude Code and Antigravity where personas live as skills). Per Rule 10, this is an additive extension — no ADR required. All three shipped adapters declare all three new keys at Phase 16 Group 0.

---

### [DISCOVERY] 2026-06-11 — Antigravity `.agent/` vs `.agents/` path ambiguity gated to Group 4 live smoke
Topics: phase-16, antigravity, agent-singular-vs-plural, vendor-doc-inconsistency, val-002
Affects-phases: phase-16-adapter-rework
Affects-specs: adapters/antigravity/adapter.js, specs/backlog/backlog.md
Detail: Research surfaced that Google's own materials disagree on the workflow path. The official `antigravity.google/docs/rules-workflows` page (canonical, quoted by Mace Labs / Agentpedia / the harikrishna8121999 library README) uses `.agent/workflows/` (singular 'agent'). The Google codelab `Autonomous AI Developer Pipelines` uses `.agents/workflows/` (plural 'agents'). Skills consistently use `.agents/skills/` (plural). Decision: ship singular `.agent/workflows/` per the canonical docs page, and gate live verification to Group 4. If `agy` is unavailable in the dev env, ship dual-copy (both `.agent/workflows/` and `.agents/workflows/`) and file VAL-002 for live confirmation. The path-lock decision is reversible until VAL-002 closes.

---

### [DECISION] 2026-06-11 — Codex phase commands ship as AGENTS.md `## Recipe:` sections, NOT skills
Topics: phase-16, codex, agents-md, recipes, skills-vs-recipes
Affects-phases: phase-16-adapter-rework
Affects-specs: adapters/codex/instructions/AGENTS.md
Detail: Codex has no native per-project slash-command surface (custom slash commands are deprecated and user-only via `~/.codex/prompts/`). Skills exist (`.agents/skills/<name>/SKILL.md`) but are conceptually personas/capabilities, not step-by-step recipes. Force-mapping recipes onto skills would misframe the concept and require users to invoke recipes via `$<skill>` mention syntax — friction. Decision: embed each phase + orchestration recipe (brainstorm-idea, brainstorm-phase, start-project, start-phase, sync-docs, complete-phase, log, track, review, validate, migrate, ecosystem, initiative, session, systematic-debug, scout, dispatch, handoff, continue, review-code) as a `### Recipe: <name>` subsection inside Codex AGENTS.md. AGENTS.md is natively auto-loaded by Codex (no opt-in). User invokes a recipe by name in natural language ("run brainstorm-phase" or "/brainstorm-phase"); the agent finds the matching section and follows. 19 recipes × ~100 lines ≈ 6 KiB, well under the 32 KiB AGENTS.md limit. Skills surface stays available for genuine personas (`momentum-orient`).

---

### [FEATURE] 2026-06-11 — Group 2 complete — Antigravity workflows + skills + native-tool-name hooks
Topics: phase-16-rework, group-2, antigravity, workflows, skills, native-idiom, run-command-matcher, slashcommands-flip
Affects-phases: phase-16-adapter-rework
Affects-specs: adapters/antigravity/adapter.js, adapters/antigravity/workflows/*.md, adapters/antigravity/skills/*/SKILL.md, adapters/antigravity/hooks.json, adapters/antigravity/instructions/AGENTS.md, tests/adapter-workflows-antigravity.test.js, tests/adapter-skills-antigravity.test.js, tests/adapter-hook-execution-antigravity.test.js, tests/orchestration-capability-routing.test.js
Detail: Antigravity side of the rework landed using each platform's NATIVE idiom. (1) 5 overlay workflows at `adapters/antigravity/workflows/{scout,dispatch,handoff,continue,review-code}.md` with YAML frontmatter `--- description: ... ---` + numbered step sections (each under 12K chars per vendor limit). These auto-register as `/<name>` slash commands when `agy` reads `.agent/workflows/`. Core commands (`core/commands/*.md`) also ship to `.agent/workflows/` via destinations.commands rewire (15 more workflows). (2) 4 skill directories at `adapters/antigravity/skills/momentum-{orient,reviewer-security,reviewer-qa,reviewer-architecture}/SKILL.md` with YAML frontmatter (name + description). Reviewers are LOADED by the /review-code workflow via native parallel subagent fan-out. (3) `adapters/antigravity/hooks.json` with platform-correct matchers: PreToolUse `run_command|view_file|.*write.*|apply_patch`, PostToolUse `run_command|apply_patch|.*write.*`, SessionStart unmatched. (4) `adapters/antigravity/adapter.js` updated: `configFiles` entry for hooks.json → `.agents/hooks.json`; runInstall/runUpgrade install + idempotently upgrade with .bak backup. Capability flips: `slashCommands: false → true` (workflows ARE slash commands per official docs); `skills: false → true` (overlay ships 4 skills); `sessionStartHook` stays false pending VAL-002 (hook is wired but `agy` event support unconfirmed). (5) `AGENTS.md` fully rewritten: `.agent/` + `.agents/` layout table, workflows section explaining recipe-as-slash-command, skills section listing all 4 with their roles, native artifacts integration, hooks event table, SessionStart fallback hint, always-on rules, Project Extensions marker. (6) 13 new tests across 3 files; 1 capability-routing test updated for slashCommands flip. Suite: 320/320 (was 307 post-G1; +13). Claude Code regression: PASSES — install fingerprint unchanged.

---

### [DECISION] 2026-06-11 — Codex recipes ship as `.codex/commands/*.md` files referenced from AGENTS.md (NOT inlined)
Topics: phase-16-rework, group-1, codex, agents-md-strategy, recipe-lookup-pattern, file-size-pragmatism
Affects-phases: phase-16-adapter-rework
Affects-specs: adapters/codex/instructions/AGENTS.md
Detail: The Group 1 plan called for embedding every recipe as a `### Recipe: <name>` section inside Codex AGENTS.md. Counting actual recipe content (`core/commands/*.md` + adapter overlay): 19 recipes × ~100-200 lines each = ~2,200 lines (~80 KiB), far exceeding the documented 32 KiB AGENTS.md limit. Pivot: AGENTS.md teaches the lookup pattern instead — when user invokes `/<name>` or "run <name>" in natural language, agent reads `.codex/commands/<name>.md` and follows it. The recipe files already ship to `.codex/commands/` via the standard overlay (the existing `destinations.commands` route — left as `.codex/commands/` for this reason). AGENTS.md is now ~150 lines: navigation, recipes lookup pattern + complete file-path table, Codex hooks event table with `features.hooks` opt-in instruction, Codex subagents section (the 3 reviewer TOMLs), Codex skills section (`momentum-orient`), always-on rules, Project Extensions marker. Tradeoff acknowledged: not as "in your face" as inlined recipes — but the lookup table IS auto-loaded so the agent always sees the mapping. The 32 KiB AGENTS.md limit is hard, and the recipe-lookup pattern is the conceptually cleanest fit given the constraint.

---

### [FEATURE] 2026-06-11 — Group 1 complete — Codex native hooks + subagents + orient skill + AGENTS.md recipe pattern
Topics: phase-16-rework, group-1, codex, native-idiom, apply-patch-matcher, sandbox-read-only, recipe-lookup-pattern
Affects-phases: phase-16-adapter-rework
Affects-specs: adapters/codex/hooks.json, adapters/codex/agents/*.toml, adapters/codex/skills/momentum-orient/SKILL.md, adapters/codex/instructions/AGENTS.md, tests/adapter-codex-recipes.test.js, tests/adapter-subagents-codex.test.js, tests/adapter-hook-execution-codex.test.js, tests/adapter-smoke-codex.test.js
Detail: Codex side of the rework landed. (1) `adapters/codex/hooks.json` matchers rewritten from `Edit|Write` (Claude tool names — never fired on Codex) to `apply_patch|shell` (Codex's actual tool names). PreToolUse + PostToolUse both wired; SessionStart unmatched (fires every session). (2) 3 TOML reviewer subagents at `adapters/codex/agents/` with required schema (`name`, `description`, `developer_instructions`) PLUS new `sandbox_mode = "read-only"` so reviewers cannot modify the codebase. (3) `adapters/codex/skills/momentum-orient/SKILL.md` — the genuine-persona skill that codifies Rule 1 (orient first). Shipped to `.agents/skills/momentum-orient/SKILL.md` via the destinations.skills route. (4) Codex AGENTS.md fully rewritten: new "Momentum Recipes — Lookup Pattern" section with complete 20-row recipe table mapping each recipe to its `.codex/commands/<name>.md` path; Codex hooks event table with explicit `features.hooks` opt-in instruction; Subagents section; Skills section; Rules. (5) 11 new test assertions across 3 new test files: adapter-codex-recipes (4 tests — recipe table coverage + hooks doc + extensions marker), adapter-subagents-codex (2 tests — TOML schema + orient skill), adapter-hook-execution-codex (5 tests — apply_patch + shell fires, non-match bypasses, PostToolUse reminder, SessionStart wired). 1 new test in adapter-smoke-codex for install path coverage. Side fix: 2 existing tests (install + upgrade) updated for renamed AGENTS.md section. Suite: 307/307 (was 295 post-G0; +12 net). Claude Code regression: PASSES — install fingerprint byte-for-byte unchanged.

---

### [FEATURE] 2026-06-11 — Group 0 complete — contracts extended, parity matrix shipped, Claude Code regression locked
Topics: phase-16-rework, group-0, adapter-contract, parity-matrix, claude-code-regression, fingerprint
Affects-phases: phase-16-adapter-rework
Affects-specs: adapters/*/adapter.js, core/adapter-parity-matrix.md, tests/adapter-parity-matrix.test.js, tests/_helpers.js, tests/adapter-capabilities-declared.test.js, tests/claude-code-regression.test.js, tests/fixtures/v0.18.0-claude-code-fingerprint.json, tests/adapter-smoke-antigravity.test.js, tests/install.test.js, tests/upgrade.test.js
Detail: Group 0 landed. (1) Adapter contract destinations gain `workflows`, `skills`, `agents` keys uniformly across all three adapters. Claude Code declares unused paths for contract uniformity. Antigravity rewires `commands` destination from `.antigravity/commands/` → `.agent/workflows/` so the existing core/commands/*.md content auto-installs as workflows. (2) `tests/claude-code-regression.test.js` snapshots a 44-file SHA256 fingerprint of the v0.18.0 Claude Code install captured before any rework changes. Runs on every group's verification. Catches silent content drift the pass-count gate can't see. (3) `core/adapter-parity-matrix.md` ships as the per-feature × per-adapter shipping status grid covering recipes (20), personas (4), hooks (3), overlays (8), ecosystem features (5) with footnote-explained statuses. (4) `tests/adapter-parity-matrix.test.js` parses the matrix and asserts every cell has a declared status + footnote where degraded/cross-category. (5) `fakeToolEvent` helper added to `tests/_helpers.js` with `payloads.*` builders for Claude Code / Codex apply_patch / Codex shell / Antigravity run_command / Antigravity view_file payload shapes — pins CLAUDE_PROJECT_DIR + MOMENTUM_PROJECT_DIR to test root. (6) `tests/adapter-capabilities-declared.test.js` extended with REQUIRED_DESTINATION_KEYS check for the 7 destinations keys. Side fix: 3 antigravity tests (smoke / install / upgrade) updated for new `.agent/workflows/` paths to keep the suite green between groups. Suite: 295/295 (288 baseline + 7 new). Claude Code regression test PASSES — install fingerprint unchanged.
Topics: phase-16, group-4, val-001, val-002, external-cli-deps
Affects-phases: phase-16-adapter-rework, post-v0.19.0
Affects-specs: specs/backlog/backlog.md
Detail: Group 4 requires `codex` and `agy` CLIs on the dev machine for full live verification (PreToolUse fires, parallel subagent fan-out works, workflow path is correct, SessionStart event surfaces). If unavailable, install-time evidence is captured anyway under `evidence/`, and live-runtime evidence becomes VAL-001 (Codex) + VAL-002 (Antigravity, includes the `.agent/` vs `.agents/` path lock). Group 5 capability flips are gated on Group 4 evidence — flips that miss evidence stay false until follow-up. Per the user direction to ship v0.19.0 without holding for live evidence, this graceful-degradation path is pre-approved.
