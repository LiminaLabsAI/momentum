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

## Antigravity Slash Commands & Recipes

Antigravity slash command recipes are installed in `.antigravity/commands/`. When the user requests a command such as `/brainstorm-phase`, `/start-phase`, `/sync-docs`, or `/complete-phase`, read the matching Markdown file from `.antigravity/commands/` and execute its instructions.

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

## Antigravity Native Artifacts Integration

When in planning mode or executing a phase, keep Antigravity's native artifacts in sync with momentum's spec files:
- **Durable Checklist**: Map `specs/phases/phase-N-*/tasks.md` directly into your native `task.md` artifact. Update both simultaneously as work proceeds.
- **Implementation Alignment**: Ensure that the `implementation_plan.md` artifact mirrors the scope and groups declared in `specs/phases/phase-N-*/plan.md`.
- **Walkthrough Evidence**: Append the verification evidence gathered for `/complete-phase` into your native `walkthrough.md` artifact.

## Antigravity Native Subagents Integration

Leverage Antigravity's native `invoke_subagent` and `define_subagent` tools to scale execution:
- **Parallel Feature Groups**: Spawn specialized subagents to implement separate parallel implementation plan groups.
- **Deep Codebase Research**: Delegate deep, multi-file codebase research or web search tasks to the background `research` subagent while continuing active implementation.

## Project Extensions

> Everything below this heading is preserved across `momentum upgrade`.
> Add project-specific navigation, rules, cross-repo references, etc. here.
> Anything above this heading is managed by momentum and may be replaced on upgrade.
