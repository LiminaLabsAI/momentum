# Project Rules: <Project Name>

> Codex configuration for this momentum-managed project.
> Full condensed rules are installed at `.agent/rules/project.md`.

## Navigation

| Question | File |
|----------|------|
| Current state / what phase? | `specs/status.md` |
| What's in the backlog? | `specs/backlog/backlog.md` |
| Phase tasks/progress? | `specs/phases/phase-N-*/tasks.md` |
| Why was X chosen? | `specs/decisions/NNNN-*.md` |
| Roadmap / timeline? | `specs/planning/roadmap.md` |
| How to contribute? | `docs/developer-guide.md` |

> **First file to read: ALWAYS `specs/status.md`.**

## Momentum Recipes — Lookup Pattern

Codex does not auto-register per-project slash commands. Instead, momentum
ships its phase + orchestration **recipes** as Markdown files at
`.codex/commands/<name>.md`. When the user invokes a recipe by name —
`/<name>`, `momentum <name>`, or "run <name>" in natural language — locate
the matching file and follow its instructions verbatim.

The full recipe set (installed at `.codex/commands/`):

| Recipe | File | What it does |
|---|---|---|
| brainstorm-idea | `.codex/commands/brainstorm-idea.md` | Explore an idea before scaffolding anything |
| brainstorm-phase | `.codex/commands/brainstorm-phase.md` | Plan the next implementation phase (gate-protected) |
| start-project | `.codex/commands/start-project.md` | Scaffold a new spec-driven project |
| start-phase | `.codex/commands/start-phase.md` | Begin a planned phase (autonomous execution contract) |
| complete-phase | `.codex/commands/complete-phase.md` | Verify, retro, release a finished phase |
| sync-docs | `.codex/commands/sync-docs.md` | Propagate history entries to other spec docs |
| track | `.codex/commands/track.md` | Track a backlog item (bug / feature / tech debt / enhancement) |
| review | `.codex/commands/review.md` | Review and groom the backlog between phases |
| log | `.codex/commands/log.md` | Append a manual narrative entry to the active phase history |
| migrate | `.codex/commands/migrate.md` | Onboard an existing project into momentum |
| validate | `.codex/commands/validate.md` | Check spec structure health |
| ecosystem | `.codex/commands/ecosystem.md` | Cross-repo ecosystem coordination |
| initiative | `.codex/commands/initiative.md` | Manage cross-repo initiatives |
| session | `.codex/commands/session.md` | Append a manual narrative entry to today's ecosystem session log |
| systematic-debug | `.codex/commands/systematic-debug.md` | Systematically isolate, reproduce, and resolve task execution failures |
| scout | `.codex/commands/scout.md` | Read-only context fetch from one ecosystem member repo |
| dispatch | `.codex/commands/dispatch.md` | Parallel multi-repo fan-out + synthesis |
| handoff | `.codex/commands/handoff.md` | Cross-session control transfer with structured context block |
| continue | `.codex/commands/continue.md` | Pick up a pending handoff in this repo |
| review-code | `.codex/commands/review-code.md` | Multi-perspective code review (uses momentum-reviewer-* subagents) |

The recipes are platform-independent — they describe what to do, not how
Codex specifically should do it. When you read a recipe that mentions
"use the Task tool" (Claude Code terminology), translate to Codex's
equivalent: spawn the relevant momentum-reviewer-* subagent (see below),
or use natural-language parallel fan-out.

## Codex Subagents

Momentum ships three role-specific reviewer subagents discoverable at
`.codex/agents/`:

- `momentum-reviewer-security.toml` — OWASP/STRIDE-focused
- `momentum-reviewer-qa.toml` — test coverage + edge cases + regression risk
- `momentum-reviewer-architecture.toml` — rule compliance + pattern consistency

Each declares `sandbox_mode = "read-only"` so reviewers cannot modify the
codebase. The `review-code` recipe dispatches all three in a single turn so
Codex can fan them out in parallel (subject to `agents.max_threads`,
default 6).

To add a project-specific reviewer, drop another `*.toml` into
`.codex/agents/` with required keys `name`, `description`,
`developer_instructions`. Optionally set `sandbox_mode = "read-only"` if
the subagent shouldn't modify files.

## Codex Hooks

Codex hook wiring lives in `.codex/hooks.json`. Momentum installs reusable
shell scripts to `scripts/` and references them from this file:

| Event | Matcher | Script | Purpose |
|---|---|---|---|
| `PreToolUse` | `apply_patch\|Bash` | `scripts/brainstorm-gate.sh` | Blocks writes to `specs/` while a `/brainstorm-*` session is active (sentinel `.momentum/brainstorm-active`). Exits 2 to block. |
| `PostToolUse` | `apply_patch\|Bash` | `scripts/check-history-reminder.sh` | Prompts for `history.md` append when meaningful edits land during an active phase (Rule 8). |
| `SessionStart` | (none) | `scripts/sessionstart-handoff.sh` | Auto-greets with any pending handoff banner + ecosystem context. |

> Matcher uses `Bash` (not `shell`) because that's the canonical
> `tool_name` Codex emits for shell tool calls — see the [Codex hooks
> reference](https://developers.openai.com/codex/hooks).

### Trust review

Hooks are **enabled by default** in current Codex CLI (`hooks` is `stable`
in `codex features list`). The first time momentum's hooks run in a fresh
project, Codex prompts you to review and trust them via `/hooks`. Trust is
recorded per-hash, so any change to the hook command requires re-approval.

If hooks don't appear to fire:

1. Run `/hooks` inside Codex and confirm `brainstorm-gate.sh`,
   `check-history-reminder.sh`, and `sessionstart-handoff.sh` are listed
   and marked trusted.
2. Run `codex doctor` and confirm `hooks` shows as `stable: true`.
3. Only as a last resort, force-enable in `~/.codex/config.toml`:

   ```toml
   [features]
   hooks = true
   ```

The `brainstorm-gate.sh` script resolves the project root from
`CLAUDE_PROJECT_DIR` → `MOMENTUM_PROJECT_DIR` → `pwd`, so Codex's default
cwd-as-session-root behavior works without env-var configuration.

## Codex Skills

Momentum installs at least one skill in `.agents/skills/` (the convention
shared with Antigravity — Codex auto-discovers SKILL.md files at this
path):

- **`momentum-orient`** — Read `specs/status.md` before starting any work.
  Codifies Rule 1 (Orient First).

Add additional project-specific skills under
`.agents/skills/<name>/SKILL.md` following the SKILL.md frontmatter
convention. Invoke via the `/skills` picker or `$<skill-name>` mention.

## Always-On Rules

Read `.agent/rules/project.md` at the start of each session and follow it
as the durable project rule source. The most important operating rules:

1. Orient first by reading `specs/status.md`.
2. Update durable tracking files after meaningful work.
3. Add discovered bugs, tech debt, and enhancements to backlog immediately.
4. Check P0/P1 bugs before starting a new phase.
5. Stop at phase boundaries and ask before completion/release.
6. Use feature branches, atomic commits, and user approval before merges.
7. Plan before non-trivial implementation.
8. Append meaningful decisions/discoveries to active phase `history.md`.
9. Sync docs at phase completion, not mid-phase.
10. Treat architecture specs as stable during phase work.
11. Lock evaluators before optimization loops.
12. Verify with fresh evidence before marking work complete.

## Project Extensions

> Everything below this heading is preserved across `momentum upgrade`.
> Add project-specific navigation, rules, cross-repo references, etc. here.
> Anything above this heading is managed by momentum and may be replaced on upgrade.
