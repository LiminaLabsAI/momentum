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

## Momentum Commands in Codex

Momentum command recipes are installed in `.codex/commands/`. When the user names a command such as `/brainstorm-phase`, `/start-phase`, `/sync-docs`, or `/complete-phase`, read the matching Markdown file from `.codex/commands/` and follow it.

Codex-specific features should be added under `.codex/` or `adapters/codex/` in momentum itself. Do not copy Claude Code-specific behavior such as `.claude/settings.json` or Claude Task-tool assumptions into core.

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

## Codex Hooks

Codex hook wiring lives in `.codex/hooks.json`. Momentum installs reusable shell scripts to `scripts/` and lets this adapter decide which hook events invoke them.

## Project Extensions

> Everything below this heading is preserved across `momentum upgrade`.
> Add project-specific navigation, rules, cross-repo references, etc. here.
> Anything above this heading is managed by momentum and may be replaced on upgrade.
