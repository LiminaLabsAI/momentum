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

| Recipe | opencode | Claude Code | Codex | Antigravity |
|---|---|---|---|---|
| `/brainstorm-idea` | shipped¹⁷ | shipped¹ | shipped² | shipped³ |
| `/brainstorm-phase` | shipped¹⁷ | shipped¹ | shipped² | shipped³ |
| `/start-project` | shipped¹⁷ | shipped¹ | shipped² | shipped³ |
| `/start-phase` | shipped¹⁷ | shipped¹ | shipped² | shipped³ |
| `/complete-phase` | shipped¹⁷ | shipped¹ | shipped² | shipped³ |
| `/sync-docs` | shipped¹⁷ | shipped¹ | shipped² | shipped³ |
| `/track` | shipped¹⁷ | shipped¹ | shipped² | shipped³ |
| `/review` | shipped¹⁷ | shipped¹ | shipped² | shipped³ |
| `/log` | shipped¹⁷ | shipped¹ | shipped² | shipped³ |
| `/migrate` | shipped¹⁷ | shipped¹ | shipped² | shipped³ |
| `/validate` | shipped¹⁷ | shipped¹ | shipped² | shipped³ |
| `/ecosystem` | shipped¹⁷ | shipped¹ | shipped² | shipped³ |
| `/initiative` | shipped¹⁷ | shipped¹ | shipped² | shipped³ |
| `/session` | shipped¹⁷ | shipped¹ | shipped² | shipped³ |
| `/systematic-debug` | shipped¹⁷ | shipped¹ | shipped² | shipped³ |
| `/scout` | shipped¹⁷ | shipped¹ | shipped² | shipped³ |
| `/dispatch` | shipped¹⁷ | shipped¹ | shipped-degraded⁴ | shipped³ |
| `/handoff` | shipped¹⁷ | shipped¹ | shipped² | shipped³ |
| `/continue` | shipped¹⁷ | shipped¹ | shipped² | shipped³ |
| `/review-code` | shipped¹⁷ | shipped¹ | shipped² | shipped³ |
| `/swarm` (Phase 17 + 17.5) | shipped¹⁷ | shipped¹ | shipped¹⁴ | shipped¹⁴ |
| `/hotfix` (Phase 19) | shipped¹⁷ | shipped¹ | shipped² | shipped³ |

### Personas (skills)

| Skill | opencode | Claude Code | Codex | Antigravity |
|---|---|---|---|---|
| `momentum-orient` | shipped¹⁷ | not-applicable⁵ | shipped⁶ | shipped⁷ |
| `momentum-reviewer-security` | shipped-as-subagent¹⁸ | not-applicable⁵ | shipped-as-subagent⁸ | shipped⁷ |
| `momentum-reviewer-qa` | shipped-as-subagent¹⁸ | not-applicable⁵ | shipped-as-subagent⁸ | shipped⁷ |
| `momentum-reviewer-architecture` | shipped-as-subagent¹⁸ | not-applicable⁵ | shipped-as-subagent⁸ | shipped⁷ |

### Hooks

| Hook | opencode | Claude Code | Codex | Antigravity |
|---|---|---|---|---|
| `PreToolUse` (brainstorm-gate) | shipped¹⁹ | shipped⁹ | shipped¹⁰ | shipped¹¹ |
| `PostToolUse` (history reminder) | shipped¹⁹ | shipped⁹ | shipped¹⁰ | shipped¹¹ |
| `SessionStart` (handoff banner) | shipped¹⁹ | shipped⁹ | shipped¹⁰ | shipped-as-preinvocation¹¹ |

### Git-lifecycle hooks (Phase 19 — agent-agnostic)

| Hook | opencode | Claude Code | Codex | Antigravity |
|---|---|---|---|---|
| `commit-msg` (Conventional Commits) | shipped¹⁵ | shipped¹⁵ | shipped¹⁵ | shipped¹⁵ |
| `pre-push` (merge gate + verify-evidence) | shipped¹⁵ | shipped¹⁵ | shipped¹⁵ | shipped¹⁵ |

### Overlay surfaces

| Surface | opencode | Claude Code | Codex | Antigravity |
|---|---|---|---|---|
| Primary instruction file (CLAUDE.md / AGENTS.md) | shipped | shipped | shipped | shipped |
| `commands` overlay | shipped¹⁷ | shipped | shipped | shipped-as-workflows¹² |
| `agent-rules` overlay | not-applicable¹⁶ | not-applicable¹⁶ | not-applicable¹⁶ | not-applicable¹⁶ |
| `scripts` overlay (hooks) | shipped | shipped | shipped | shipped |
| `engines` overlay | shipped | shipped | shipped | shipped |
| `workflows` overlay (Phase 16) | not-applicable⁵ | not-applicable⁵ | not-applicable⁵ | shipped¹³ |
| `skills` overlay (Phase 16) | shipped¹⁷ | not-applicable⁵ | shipped⁶ | shipped⁷ |
| `agents` overlay (Phase 16) | shipped¹⁸ | not-applicable⁵ | shipped⁸ | not-applicable⁵ |

### Ecosystem features

| Feature | opencode | Claude Code | Codex | Antigravity |
|---|---|---|---|---|
| `momentum init/upgrade` install | shipped | shipped | shipped | shipped |
| Ecosystem manifest awareness (`ecosystem.json`) | shipped | shipped | shipped | shipped |
| SessionStart ecosystem banner | shipped¹⁹ | shipped⁹ | shipped¹⁰ | shipped-as-preinvocation¹¹ |
| Auto session log (PostToolUse) | shipped¹⁹ | shipped⁹ | shipped¹⁰ | shipped¹¹ |
| Managed `CLAUDE.md` / `AGENTS.md` on `ecosystem init` | shipped | shipped | shipped | shipped |

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

11. **Antigravity hooks (Phase 22b, verified live)** — vendor named-group `.agents/hooks.json` over the real five events; every hook delegates through `scripts/antigravity-hook-adapter.sh` (ADR-0006), which translates camelCase payloads and emits decision JSON. PreToolUse/PostToolUse fire-verified against agy 1.0.16 (captured payloads under `specs/phases/phase-22b-antigravity-2-adoption/evidence/hook-captures/`). SessionStart does not exist — the handoff/ecosystem banner ships as a PreInvocation `ephemeralMessage` injection at `invocationNum 0` (hence `shipped-as-preinvocation`); AGENTS.md text keeps the fallback hint.

12. **Antigravity `commands` overlay as workflows** — the cross-adapter `core/commands/*.md` content ships to `.agent/workflows/` on Antigravity (recipes become workflows). The destination is shared with the `workflows` overlay key; conflict detection prevents duplicates.

13. **Antigravity `workflows` overlay (Phase 22b, path locked)** — adapter-specific workflows ship to `.agents/workflows/` (canonical root, ADR-0006). Live probe verified slash registration including planted path-matrix markers; agy accepts four root spellings and `.agents/` is the vendor-canonical one. Evidence: `specs/phases/phase-22b-antigravity-2-adoption/evidence/fact-sheet.md` §1/§3.

14. **`/swarm` (Phase 17 v0.20.0 + Phase 17.5 v0.20.2 + Phase 18 v0.20.4)** — Phase 18 v0.20.4 brings full Codex + Antigravity parity to the swarm primitive. Implementation: a platform-agnostic `adapter.spawn(directive)` contract added in Phase 18 G0; Codex dispatch + supervisor TOML + MCP cwd shim documented in G1; Antigravity workflow + supervisor skill + AGENTS.md section in G2; multi-adapter synthetic e2e + Codex/Antigravity install fingerprints in G3. **Capability flips deferred** based on G4 live evidence: Codex `parallelSubagents` stays `false` (gated on `codex features list` showing `enable_fanout: stable: true` — currently `under development`); Antigravity `sessionStartHook` stays `false` (Phase 22b: the event does not exist — see footnote 11; VAL-002 RESOLVED with vendor-runtime evidence). Phase 22b also rewrote the Antigravity spawn onto the real CLI surface: detached `agy --new-project --dangerously-skip-permissions --print-timeout <bound> -p <boot prompt>` from `repoPath` with a per-repo supervisor log (live smoke: BOOT-OK — `specs/phases/phase-22b-antigravity-2-adoption/evidence/spawn-smoke.md`). Codex VAL-001 evidence unchanged at `specs/phases/phase-18-swarm-parity/evidence/val-001-codex.txt`.

15. **Git-lifecycle hooks (Phase 19, FEAT-018/019)** — vendor-neutral, *agent-agnostic* git hooks installed identically for all three adapters: `bin/momentum.js::installGitHooks()` copies `core/git-hooks/*` to the target's `.githooks/` and runs `git config core.hooksPath .githooks` (warn-not-clobber if husky / a custom hooks path exists). `commit-msg` validates Conventional Commits; `pre-push` blocks direct pushes to protected branches without the single-use `.momentum/merge-approved` sentinel and blocks release-tag pushes lacking a non-empty `## Verification Evidence` (Rule 12). Escape hatch: `MOMENTUM_SKIP_HOOKS=1`. These are git hooks, not agent tool-event hooks — the mechanism is identical regardless of agent; the per-column cells exist only for matrix uniformity. Forge-neutral by design (no GitHub/GitLab API); see `core/lifecycle-contract.md`.

16. **`agent-rules` overlay retired (Phase 23 / ADR-0004)** — the condensed `.agent/rules/project.md` file is no longer shipped by any adapter: no agent auto-loaded it, and the full detailed rules (Red Flags + anti-rationalization + Rule 13) now ride each adapter's auto-loaded primary instruction file, generated from the single canonical source at `core/instructions/rules-body.md`. `momentum upgrade` migrates existing installs (pristine → removed; customized → kept + deprecation warning). The `destinations['agent-rules']` contract key stays reserved for future per-adapter rule overlays.

17. **opencode recipes + skills (Phase 22, LIVE-validated)** — recipes install at `.opencode/commands/<name>.md` where each file registers natively as `/<name>` ([opencode commands docs](https://opencode.ai/docs/commands/)); `runInstall` prepends `description` frontmatter for the command picker. Live evidence (G5): `opencode run "/validate"` executed the recipe end-to-end. Momentum skills install at `.opencode/skills/<name>/SKILL.md`; live evidence: the skill tool loaded `momentum-orient` in a real session, and a same-named duplicate on the `.agents/skills/` path (Codex/Antigravity convention) coexisted without error — the `skills` capability boolean is `true`, a momentum first. Full transcript: `specs/phases/phase-22-opencode-adapter/evidence/val-opencode-live.txt`.

18. **opencode agents (Phase 22)** — reviewers + swarm supervisor at `.opencode/agents/<name>.md` (markdown agents, [opencode agents docs](https://opencode.ai/docs/agents/)). The three reviewers declare `mode: subagent` + `permission: edit: deny` (+ read-only bash allowlist) — true sandbox-level read-only, not just prompt-level. Spawn contract: `opencode run --dir <repoPath> --agent swarm-supervisor` (`--dir` pins cwd natively; no MCP shim needed, unlike Codex footnote 14).

19. **opencode momentum plugin (Phase 22 + banner fix, LIVE-validated)** — one self-contained JS plugin at `.opencode/plugins/momentum.js` ([opencode plugins docs](https://opencode.ai/docs/plugins/)) wires the three enforcement hooks; reads the same `.momentum/` sentinels as the other adapters' shell hooks. Live evidence (G5 `val-opencode-live.txt` + `specs/adhoc/fix-opencode-sessionstart-banner/record.md`): the gate blocked a real specs/ edit during `brainstorm-active`; the history reminder stamped after a real write (callID correlation — `tool.execute.after` carries no args); the handoff banner fired in a live served session after being rewired onto the generic `event` bus (a named "session.created" hook key never fires on 1.17.x). Run-mode exclusion by design: the event handler's presence hangs `opencode run` (1.17.13, upstream issue candidate) and a session-start banner is meaningless non-interactively. Remaining degraded cells: ecosystem SessionStart context banner + auto session log not yet wired through the plugin (ENH-058; use `/session` or the `momentum` CLI).

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
