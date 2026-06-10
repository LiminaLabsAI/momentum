# Project Rules: <Project Name>

> Antigravity configuration for this momentum-managed project.
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

## Project layout under `.agents/`

Momentum installs Antigravity-discoverable assets under the `.agents/`
directory at the project root (this matches the documented `agy` CLI
plugin layout). The four overlay surfaces:

| Path | Purpose |
|---|---|
| `.agents/commands/` | Slash-command recipes (e.g. `brainstorm-phase.md`, `start-phase.md`, `review-code.md`). When the user types `/brainstorm-phase`, read the matching file and follow it. |
| `.agents/hooks.json` | Pre/post tool event hooks — PostToolUse history reminder + (where supported) SessionStart handoff banner. |
| `.agents/agents/` | Subagent definitions. Momentum ships three reviewers (`momentum-reviewer-security`, `momentum-reviewer-qa`, `momentum-reviewer-architecture`) used by `/review-code`. |
| `.agents/skills/` | Skill packages (`SKILL.md` + supporting files). Momentum ships `momentum-orient` — the orient-first contract codified as a discoverable skill. |

## Antigravity Slash Command Recipes

Antigravity slash command recipes are installed in `.agents/commands/`.
When the user requests a command such as `/brainstorm-phase`,
`/start-phase`, `/sync-docs`, or `/complete-phase`, read the matching
Markdown file from `.agents/commands/` and execute its instructions.

`agy` ships rich built-in slash commands (`/tasks`, `/skills`,
`/artifacts`, etc.). The momentum-shipped recipes complement those by
naming higher-level workflows that the agent reads and follows.

## Antigravity Native Artifacts Integration

When in planning mode or executing a phase, keep Antigravity's native artifacts in sync with momentum's spec files:
- **Durable Checklist**: Map `specs/phases/phase-N-*/tasks.md` directly into your native `task.md` artifact. Update both simultaneously as work proceeds.
- **Implementation Alignment**: Ensure that the `implementation_plan.md` artifact mirrors the scope and groups declared in `specs/phases/phase-N-*/plan.md`.
- **Walkthrough Evidence**: Append the verification evidence gathered for `/complete-phase` into your native `walkthrough.md` artifact.

## Antigravity Native Subagents Integration

Leverage Antigravity's native subagent capability to scale execution:
- **Parallel Feature Groups**: Spawn specialized subagents to implement separate parallel implementation plan groups.
- **Deep Codebase Research**: Delegate deep, multi-file codebase research or web search tasks to a background research subagent while continuing active implementation.
- **Code Review**: When asked to "review", "code review", or "review the diff", read `.agents/commands/review-code.md` and follow it — it spawns the three momentum reviewer subagents (`momentum-reviewer-security`, `momentum-reviewer-qa`, `momentum-reviewer-architecture`) from `.agents/agents/` in parallel.

## Momentum Skills

Momentum installs at least one project-level skill in `.agents/skills/`:

- **`momentum-orient`** — Always read `specs/status.md` first when starting work in this project. Codifies Rule 1 (Orient First).

Add additional project-specific skills under `.agents/skills/<name>/SKILL.md` following the SKILL.md frontmatter convention.

## Hooks

Antigravity hook wiring lives in `.agents/hooks.json`. Momentum installs reusable shell scripts to `scripts/` and references them from this file:

| Event | Script | Purpose |
|---|---|---|
| `PostToolUse` (matcher `Edit\|Write`) | `scripts/check-history-reminder.sh` | Prompts for a `history.md` append when meaningful edits land during an active phase (Rule 8). |
| `SessionStart` (no matcher) | `scripts/sessionstart-handoff.sh` | When `agy`'s SessionStart event fires, auto-greets with any pending handoff banner + ecosystem context. If the runtime doesn't surface SessionStart yet, the same hint lives in this `AGENTS.md` primary-instruction text below. |

> **Handoff pickup fallback** — if there's a `.momentum/inbox/handoff-NNN.md` file present at session start, read it and acknowledge the inbound transfer before continuing.

## Always-On Rules

Read `.agent/rules/project.md` at the start of each session and follow it as the durable project rule source. The most important operating rules are:

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
