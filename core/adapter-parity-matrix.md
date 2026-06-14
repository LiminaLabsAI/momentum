# Adapter Parity Matrix (Phase 16 Rework)

> Feature × adapter shipping status. Complement to
> `core/adapter-capabilities.md` (which tracks PRIMITIVES like
> `hooks: true`).
>
> This matrix answers: "is feature X actually shipped on adapter Y via
> which native idiom, and if degraded, how?" Audited by
> `tests/adapter-parity-matrix.test.js` — every cell must declare a
> status. Silent gaps were the failure mode this audit prevents.
>
> Introduced in Phase 16 Rework (2026-06-11) — replaces the per-adapter
> capability-only view with a per-feature native-idiom view.

## Status legend

| Status | Meaning |
|---|---|
| `shipped` | Feature wired via the platform-native idiom and verified |
| `shipped-degraded` | Wired but runs in documented degraded mode. Cell's footnote explains |
| `not-applicable` | Platform's runtime model doesn't surface this feature, by design |

If you add a feature OR a new adapter, every (feature, adapter) cell
must declare a status. The audit test fails on blank cells.

## Conceptual categories

Three categories drive the matrix (introduced Phase 16 Rework — see
overview.md):

| Category | What it is | Mental model |
|---|---|---|
| **Recipe** | Step-by-step instructions agent FOLLOWS | "Follow this procedure" |
| **Persona / Skill** | Identity / capability agent LOADS to BECOME | "BE a security reviewer" |
| **Parallel worker / Subagent** | Spawned sibling that works in parallel | "Go do this concurrently" |

## Matrix

### Recipes (phase + orchestration commands)

| Recipe | Claude Code | Codex | Antigravity |
|---|---|---|---|
| `/brainstorm-idea` | shipped¹ | shipped² | shipped³ |
| `/brainstorm-phase` | shipped¹ | shipped² | shipped³ |
| `/start-project` | shipped¹ | shipped² | shipped³ |
| `/start-phase` | shipped¹ | shipped² | shipped³ |
| `/complete-phase` | shipped¹ | shipped² | shipped³ |
| `/sync-docs` | shipped¹ | shipped² | shipped³ |
| `/track` | shipped¹ | shipped² | shipped³ |
| `/review` | shipped¹ | shipped² | shipped³ |
| `/log` | shipped¹ | shipped² | shipped³ |
| `/migrate` | shipped¹ | shipped² | shipped³ |
| `/validate` | shipped¹ | shipped² | shipped³ |
| `/ecosystem` | shipped¹ | shipped² | shipped³ |
| `/initiative` | shipped¹ | shipped² | shipped³ |
| `/session` | shipped¹ | shipped² | shipped³ |
| `/systematic-debug` | shipped¹ | shipped² | shipped³ |
| `/scout` | shipped¹ | shipped² | shipped³ |
| `/dispatch` | shipped¹ | shipped-degraded⁴ | shipped³ |
| `/handoff` | shipped¹ | shipped² | shipped³ |
| `/continue` | shipped¹ | shipped² | shipped³ |
| `/review-code` | shipped¹ | shipped² | shipped³ |
| `/swarm` (Phase 17) | shipped¹ | not-applicable¹⁴ | not-applicable¹⁴ |

### Personas (skills)

| Skill | Claude Code | Codex | Antigravity |
|---|---|---|---|
| `momentum-orient` | not-applicable⁵ | shipped⁶ | shipped⁷ |
| `momentum-reviewer-security` | not-applicable⁵ | shipped-as-subagent⁸ | shipped⁷ |
| `momentum-reviewer-qa` | not-applicable⁵ | shipped-as-subagent⁸ | shipped⁷ |
| `momentum-reviewer-architecture` | not-applicable⁵ | shipped-as-subagent⁸ | shipped⁷ |

### Hooks

| Hook | Claude Code | Codex | Antigravity |
|---|---|---|---|
| `PreToolUse` (brainstorm-gate) | shipped⁹ | shipped¹⁰ | shipped-degraded¹¹ |
| `PostToolUse` (history reminder) | shipped⁹ | shipped¹⁰ | shipped-degraded¹¹ |
| `SessionStart` (handoff banner) | shipped⁹ | shipped¹⁰ | shipped-degraded¹¹ |

### Overlay surfaces

| Surface | Claude Code | Codex | Antigravity |
|---|---|---|---|
| Primary instruction file (CLAUDE.md / AGENTS.md) | shipped | shipped | shipped |
| `commands` overlay | shipped | shipped | shipped-as-workflows¹² |
| `agent-rules` overlay | shipped | shipped | shipped |
| `scripts` overlay (hooks) | shipped | shipped | shipped |
| `engines` overlay | shipped | shipped | shipped |
| `workflows` overlay (Phase 16) | not-applicable⁵ | not-applicable⁵ | shipped-gated¹³ |
| `skills` overlay (Phase 16) | not-applicable⁵ | shipped⁶ | shipped⁷ |
| `agents` overlay (Phase 16) | not-applicable⁵ | shipped⁸ | not-applicable⁵ |

### Ecosystem features

| Feature | Claude Code | Codex | Antigravity |
|---|---|---|---|
| `momentum init/upgrade` install | shipped | shipped | shipped |
| Ecosystem manifest awareness (`ecosystem.json`) | shipped | shipped | shipped |
| SessionStart ecosystem banner | shipped⁹ | shipped¹⁰ | shipped-degraded¹¹ |
| Auto session log (PostToolUse) | shipped⁹ | shipped¹⁰ | shipped-degraded¹¹ |
| Managed `CLAUDE.md` / `AGENTS.md` on `ecosystem init` | shipped | shipped | shipped |

## Footnotes

1. **Claude Code recipes** — installed as Markdown files at `.claude/commands/<name>.md`. User invokes `/<name>` and Claude Code loads the recipe content as the prompt. Native-idiom.

2. **Codex recipes** — currently installed as Markdown files at `.codex/commands/<name>.md` with a lookup table in `AGENTS.md` ("Recipes Lookup Pattern"). User invokes by name in natural language ("run brainstorm-phase" or "/brainstorm-phase") and the agent finds the matching file. ENH-036 (in-progress) converts each recipe into a native Codex skill at `.agents/skills/<name>/SKILL.md` so they become first-class auto-discovered skills instead of instruction-following text. Custom prompts at `~/.codex/prompts/` are user-scoped only and do not satisfy the repo-shared requirement.

3. **Antigravity recipes** — installed as workflow files at `.agent/workflows/<name>.md` (singular `.agent/` per official docs; gated by Group 4 live smoke — Google's own materials disagree). User types `/<name>` and `agy` auto-registers the workflow as a slash command. YAML frontmatter `--- description: ... ---` optional but recommended for auto-detection.

4. **Codex `/dispatch`** — recipe text instructs natural-language parallel fan-out across multiple subagents (`agents.max_threads = 6` default). Marked `shipped-degraded` until VAL-001 live evidence confirms real-runtime parallel fan-out vs sequential degradation. Capability flip in Group 5.1.

5. **`not-applicable` cells** — the platform's runtime model doesn't surface this overlay or feature. Examples: Claude Code has no per-project skill/agent/workflow file-discovery surface today; Antigravity uses skills (not separate agents/) for personas; Codex uses subagents (not workflows) for parallel work.

6. **Codex skills + momentum-orient** — Codex skills live at `.agents/skills/<name>/SKILL.md` (shared convention with Antigravity; NOT `.codex/skills/`). Momentum installs `momentum-orient` here (Rule-1 orient discipline persona). Marked `shipped` based on vendor doc compliance; live discovery confirmed by VAL-001 in Group 4.

7. **Antigravity skills + reviewers + orient** — installed at `.agents/skills/<name>/SKILL.md` as directories. Each contains SKILL.md with YAML frontmatter (`name`, `description`) + persona body. Loaded by `agy` when the matching skill name is invoked or auto-detected.

8. **Codex reviewer subagents** — installed at `.codex/agents/<name>.toml` (TOML schema with `name`, `description`, `developer_instructions`, `sandbox_mode = "read-only"`). Spawned by natural-language request in the `/review-code` recipe. Codex auto-discovers TOML files in `.codex/agents/` per vendor docs.

9. **Claude Code hooks** — wired via `.claude/settings.json` with matchers `Write|Edit|MultiEdit` for PreToolUse/PostToolUse and no matcher for SessionStart. Hook scripts in `scripts/`. Default-on for users with Claude Code installed.

10. **Codex hooks** — wired via `.codex/hooks.json` with matchers `apply_patch|Bash` for PreToolUse/PostToolUse and no matcher for SessionStart. Per Codex docs (https://developers.openai.com/codex/hooks) the canonical `tool_name` for shell commands is `Bash` — earlier `shell` matcher was a bug (BUG-007, fixed 2026-06-13). Hooks are **enabled by default** in current Codex CLI (`hooks` is `stable: true` in `codex features list`); the first run prompts users to trust each hook via `/hooks`. The legacy `[features] hooks = true` opt-in remains as a fallback.

11. **Antigravity hooks** — wired via `.agents/hooks.json` with matchers `run_command|view_file|.*write.*` for PreToolUse, `apply_patch|run_command` for PostToolUse. Marked `shipped-degraded` until VAL-002 confirms `agy` actually reads and dispatches the hooks (`agy` desktop-app vs CLI hook support is partially documented). The AGENTS.md text carries fallback instructions for handoff pickup and history reminder.

12. **Antigravity `commands` overlay as workflows** — the cross-adapter `core/commands/*.md` content ships to `.agent/workflows/` on Antigravity (recipes become workflows). The destination is shared with the `workflows` overlay key; conflict detection prevents duplicates.

13. **Antigravity `workflows` overlay (gated)** — adapter-specific workflows (`adapters/antigravity/workflows/*.md`) ship to `.agent/workflows/`. Marked `shipped-gated` pending Group 4 live smoke to confirm `.agent/` (singular) vs `.agents/` (plural) — Google's official docs page uses singular, codelab uses plural. If smoke fails, dual-copy and VAL-002 follow-up.

14. **`/swarm` (Phase 17 v0.20.0 + Phase 17.5 v0.20.2)** — Single-session multi-project feature delivery shipped Claude Code only. Phase 17.5 layered five additional portability subcommands (`claim` / `release` / `focus` / `join` / `absorb`) plus lease enforcement on the same conductor library at `core/swarm/` — still platform-agnostic; only adapter spawn wiring is platform-specific. Codex + Antigravity parity is **Phase 18** (target v0.20.3 after Phase 17.5 took v0.20.2): Codex requires an MCP cwd shim for the per-supervisor cwd pin; Antigravity requires an Agent Manager workflow + supervisor skill. The cells stay marked `not-applicable` for v0.20.0–v0.20.2 — they flip to `shipped` when Phase 18 lands.

## Read this if you are…

- **…asking "is feature X on adapter Y today?"** — find the row, read the cell. Footnote explains how it's shipped (or why not).
- **…adding a new feature** — add a row; declare every cell. The audit test fails otherwise.
- **…adding a new adapter** — add a column; declare every cell.
- **…upgrading a degraded cell to `shipped`** — confirm via live test, flip the cell, drop the footnote in the same PR. Also update `core/adapter-capabilities.md` if the underlying capability boolean changed.

## How the audit test parses this matrix

`tests/adapter-parity-matrix.test.js` reads this file and asserts:

1. Every row's cell count matches the column header count.
2. Every cell declares a known status: `shipped` / `shipped-degraded` / `not-applicable` / `shipped-as-<other-category>` / `shipped-gated`, optionally with a parenthetical detail and a footnote marker.
3. Cells with `shipped-degraded`, `not-applicable`, `shipped-gated`, or `shipped-as-<other>` reference a footnote.

Rows in non-table prose are ignored. Tables under any `###` heading
in this file are audited if their header includes at least one adapter
display name.
