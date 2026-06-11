# Phase 16 Rework: Codex & Antigravity Native-Idiom Adapters

> **Target Version**: v0.19.0
> **Status**: Not Started
> **Goal**: Build native-idiomatic Codex and Antigravity adapters using each
> platform's actual extension model. Claude Code: ZERO REGRESSION — every
> existing v0.18.0 behavior intact, snapshot-verified.

## Why this phase replaces phase-16-adapter-parity

The previous `phase-16-adapter-parity` branch (6 commits, pushed but unmerged)
force-ported Claude Code's hook + commands model onto Codex and Antigravity.
A 7-agent research workflow surfaced structural defects that would fail at
runtime on a real install:

- Antigravity has Workflows (`.agent/workflows/<name>.md`) as the native
  slash-command surface — we shipped `.antigravity/commands/`, which `agy`
  ignores entirely.
- Antigravity reviewer subagents are SKILL.md directories with YAML
  frontmatter, not TOML files (TOML is Codex-only).
- Codex custom slash commands are deprecated and user-only — we can't ship
  per-project slash commands at all.
- Hook matchers use platform-specific tool names: Codex uses `apply_patch`,
  Antigravity uses `run_command|view_file`. Our Claude-Code-style
  `Write|Edit|MultiEdit` matcher would never fire.

This rework also fixes a deeper conceptual conflation: **recipes, personas,
and parallel workers are three different things.** The previous draft mapped
all three onto whatever each platform's most-prominent surface was. This
rework respects the distinction.

## The three categories that drive adapter design

| Category | What it is | Who triggers it | Mental model |
|---|---|---|---|
| **Command / Workflow** (RECIPE) | Step-by-step instructions the agent FOLLOWS in sequence | User invokes by name | "Hey agent, follow this procedure" |
| **Skill** (PERSONA / CAPABILITY) | On-demand identity / expertise the agent LOADS to BECOME | User or system invokes when relevant | "Hey agent, BE a security reviewer right now" |
| **Subagent** (PARALLEL WORKER) | A spawned sibling that does work concurrently and returns findings | Main agent dispatches | "Hey other agent, go do this in parallel" |

`/brainstorm-phase` is a recipe. `momentum-reviewer-security` is a persona.
Don't conflate them — the platforms surface them differently and trying to
shoehorn one into the other's surface fights the platform.

## Per-platform mapping that respects the distinction

| Concept | Claude Code | Antigravity | Codex |
|---|---|---|---|
| **Recipe** | `.claude/commands/<name>.md` → `/<name>` | `.agent/workflows/<name>.md` → `/<name>` | **AGENTS.md `## Recipe: <name>` section** (no native per-project slash-command surface; recipe lives in primary instructions; user invokes by name in natural language) |
| **Persona / Skill** | Skill text inside commands today (no plumbing) | `.agents/skills/<name>/SKILL.md` directory | `.agents/skills/<name>/SKILL.md` directory (shared convention) |
| **Parallel worker** | Task tool spawning | Native parallel subagent | `.codex/agents/<name>.toml` files (TOML schema with `name`, `description`, `developer_instructions`, `sandbox_mode = "read-only"`) |
| **Hook (PreToolUse / PostToolUse / SessionStart)** | `.claude/settings.json` matchers `Write\|Edit\|MultiEdit` | `.agents/hooks.json` matchers `run_command\|view_file\|.*write.*` | `.codex/hooks.json` matchers `apply_patch\|shell` |
| **Primary instructions file** | `CLAUDE.md` | `AGENTS.md` | `AGENTS.md` |

## Top-Level Guard: Claude Code Zero Regression

| Rule | Enforcement |
|---|---|
| Every v0.18.0 test passes on every group commit | `npm test` ≥288 passing throughout |
| No Claude Code adapter file modified except via additive overlay | `git log --stat adapters/claude-code/` shows only additions, not modifications, EXCEPT the one shared script promotion (G3.1) |
| `core/scripts/brainstorm-gate.sh` promotion preserves Claude Code behavior byte-for-byte (same post-install path, same exit codes for all Claude Code scenarios) | `tests/brainstorm-gate.test.js` (Claude scenarios) green throughout |
| New `tests/claude-code-regression.test.js` snapshots v0.18.0 install fingerprint | Asserts file tree + content hash of critical paths unchanged after `momentum init --agent claude-code` |

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Replace previous Phase 16 branch with this rework | Yes | Force-ported model has too many runtime defects; clean rebuild on `main` |
| Adapter contract destinations gain `workflows`, `skills`, `agents` | Yes (three new keys) | Each platform uses a different subset; uniform contract with declared-not-used pattern |
| Codex phase commands ship as AGENTS.md `## Recipe:` sections, NOT skills | Yes | Skills are personas, not recipes; AGENTS.md is natively loaded; works without `features.hooks` opt-in; respects Codex's deprecated-custom-slash-commands reality |
| Antigravity phase commands ship as workflows at `.agent/workflows/<name>.md` | Yes (path gated on Group 4 smoke) | Native slash-command surface; agy auto-registers filename as `/<name>` |
| Reviewer "personas" ship as skills (Antigravity) and TOML subagents (Codex) | Yes | Personas with parallel-fan-out need on Codex = TOML subagent; on Antigravity = skill loaded into the parallel subagent context |
| `/review-code` recipe orchestrates the personas | Yes | Recipe text on each platform invokes the persona dispatch in the platform-native way |
| `core/scripts/brainstorm-gate.sh` generalized for Claude + Codex payloads | Yes | One shared script; payload parser handles both `tool_input.file_path` (Claude) and `tool_input.input` apply_patch shape (Codex) |
| Hook matchers per-platform | Yes | Codex: `apply_patch\|shell`; Antigravity: `run_command\|view_file\|.*write.*`; Claude: unchanged |
| Smoke-test `.agent/` (singular) vs `.agents/` (plural) before locking Antigravity workflow path | Yes — gated test in Group 4 | Google's own docs disagree; ship after live verification or document VAL-002 |
| Codex skills at `.agents/skills/` shared with Antigravity, NOT `.codex/skills/` | Yes | Confirmed via vendor docs; `.codex/skills/` doesn't exist as a discovery path |
| Built-in Codex `/review` left untouched; momentum adds `momentum-review` skill or recipe | Yes | Don't conflict with built-in; momentum adds multi-perspective value as a complementary surface |
| AGENTS.md installed at repo root for Codex AND Antigravity | Yes | Both natively read it; Antigravity also reads GEMINI.md as override (we don't ship GEMINI.md) |
| Claude Code zero-regression snapshot test | Yes (new test) | Explicit fingerprint check beyond the pass-count guard |

## In Scope

1. **Adapter contract extension**: `destinations.workflows` + `destinations.skills` + `destinations.agents` declared uniformly by all three adapters.
2. **Codex native rework**:
   - `.codex/hooks.json` with `apply_patch|shell` matchers (PreToolUse, PostToolUse, SessionStart)
   - 3 TOML subagents at `.codex/agents/` with `sandbox_mode = "read-only"`
   - `.agents/skills/momentum-orient/SKILL.md` (orient discipline persona)
   - AGENTS.md rewrite with `## Recipes` block embedding all phase + orchestration commands as `### Recipe: <name>` sections
3. **Antigravity native rework**:
   - Workflows at `.agent/workflows/<name>.md` for: brainstorm-phase, start-phase, sync-docs, complete-phase, review-code, dispatch, handoff, continue (≤12,000 chars each; split via `// run workflow:` composition if needed)
   - 3 reviewer skills as directories at `.agents/skills/momentum-reviewer-{security,qa,architecture}/SKILL.md` with YAML frontmatter + persona body
   - `.agents/skills/momentum-orient/SKILL.md`
   - `.agents/hooks.json` with `run_command|view_file|.*write.*` matchers
   - AGENTS.md rewrite documenting workflows / skills / hooks layout
4. **Shared `core/scripts/brainstorm-gate.sh` generalization**: handles Claude + Codex payload shapes; project root from `MOMENTUM_PROJECT_DIR` → `CLAUDE_PROJECT_DIR` → `pwd`
5. **Adapter Parity Matrix** at `core/adapter-parity-matrix.md` + audit test
6. **Hook execution smoke harness** per-adapter with platform-correct payloads
7. **Claude Code regression snapshot test** at `tests/claude-code-regression.test.js`
8. **Live smoke + path-decision gate** in Group 4 (or VAL-001 / VAL-002 deferral)

## Out of Scope (Non-Goals)

- Cursor (FEAT-007), Gemini CLI (FEAT-008) — Phase 17 (Reach)
- ENH-009 distribution decision — Phase 17
- Antigravity Desktop App native artifact API (`task.md` / `implementation_plan.md` / `walkthrough.md` write integration) — file as ENH for Phase 17+
- Codex `browser` / `computerUse` capabilities — separate research
- Replacing or shadowing Codex's built-in `/review` — momentum adds complementary value
- Any Claude Code adapter behavior change beyond the shared brainstorm-gate.sh promotion (which preserves byte-equivalent behavior)
- `momentum recipe <name>` CLI fallback — not needed if AGENTS.md sections work; file as ENH if Group 4 surfaces user-friction

## Deliverables

| # | Deliverable | Verification |
|---|---|---|
| D1 | Adapter contract destinations: `workflows`, `skills`, `agents` declared uniformly | `node --test tests/adapter-capabilities-declared.test.js` |
| D2 | Codex hooks fire with `apply_patch` payload | `node --test tests/adapter-hook-execution-codex.test.js` |
| D3 | Codex TOML reviewer subagents install with `sandbox_mode = "read-only"` | `node --test tests/adapter-subagents-codex.test.js` |
| D4 | Codex AGENTS.md `## Recipes` section + recipe table embeds all phase commands | `node --test tests/adapter-codex-recipes.test.js` |
| D5 | Antigravity workflows install at `.agent/workflows/` (or `.agents/workflows/` per G4 gate) | `node --test tests/adapter-workflows-antigravity.test.js` |
| D6 | Antigravity reviewer skills install as SKILL.md directories at `.agents/skills/` | `node --test tests/adapter-skills-antigravity.test.js` |
| D7 | Antigravity hooks fire with `run_command\|view_file` payload | `node --test tests/adapter-hook-execution-antigravity.test.js` |
| D8 | Adapter Parity Matrix audit | `node --test tests/adapter-parity-matrix.test.js` |
| D9 | **Claude Code regression** — v0.18.0 install fingerprint unchanged | `node --test tests/claude-code-regression.test.js` |
| D10 | Live smoke evidence (or VAL-001 / VAL-002 filed) | `evidence/` + retrospective |
| D11 | Full regression: `npm test` | ≥288 baseline + new tests; zero pre-existing regressions |

## Acceptance Criteria

1. Every D1–D9 test passes.
2. `npm test` shows ≥288 passing throughout the phase — Claude Code regression test passes on every group commit, not just the final one.
3. No file under `adapters/claude-code/` modified except via additive overlay; the one promotion (brainstorm-gate.sh) preserves byte-equivalent behavior.
4. Parity matrix declares status for every (feature, adapter) cell.
5. `retrospective.md` contains Verification Evidence per Rule 12.
6. The Antigravity `.agent/` vs `.agents/` path question is RESOLVED (via Group 4 smoke or explicit VAL-002 deferral with both paths documented).
7. ENH-023 / ENH-024 roadmap footnotes resolved or re-justified.

## Reference Documents

Vendor sources verified during 7-agent research (2026-06-11):

- [Codex Hooks](https://developers.openai.com/codex/hooks)
- [Codex Subagents](https://developers.openai.com/codex/subagents)
- [Codex Agent Skills](https://developers.openai.com/codex/skills)
- [Codex AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md)
- [Codex Config Reference](https://developers.openai.com/codex/config-reference)
- [Codex Agent Approvals & Security](https://developers.openai.com/codex/agent-approvals-security)
- [Antigravity Rules & Workflows](https://antigravity.google/docs/rules-workflows)
- [Antigravity CLI Features](https://antigravity.google/docs/cli-features)
- [Antigravity CLI Plugins](https://antigravity.google/docs/cli-plugins)
- [Google Codelab — Autonomous AI Developer Pipelines](https://codelabs.developers.google.com/autonomous-ai-developer-pipelines-antigravity)
- [Eren Karatas — Skills/Workflows enterprise AI squads walkthrough](https://medium.com/@eren.karatas/google-antigravity-ide-skills-workflows-building-an-enterprise-grade-ai-squad-with-finite-state-184ade6f7fa7)
- [harikrishna8121999/antigravity-workflows library](https://github.com/harikrishna8121999/antigravity-workflows)
