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

### [NOTE] 2026-06-11 — Live dogfood (Group 4) gated on external CLI availability; VAL-001 and VAL-002 ship as backlog items if needed
Topics: phase-16, group-4, val-001, val-002, external-cli-deps
Affects-phases: phase-16-adapter-rework, post-v0.19.0
Affects-specs: specs/backlog/backlog.md
Detail: Group 4 requires `codex` and `agy` CLIs on the dev machine for full live verification (PreToolUse fires, parallel subagent fan-out works, workflow path is correct, SessionStart event surfaces). If unavailable, install-time evidence is captured anyway under `evidence/`, and live-runtime evidence becomes VAL-001 (Codex) + VAL-002 (Antigravity, includes the `.agent/` vs `.agents/` path lock). Group 5 capability flips are gated on Group 4 evidence — flips that miss evidence stay false until follow-up. Per the user direction to ship v0.19.0 without holding for live evidence, this graceful-degradation path is pre-approved.
