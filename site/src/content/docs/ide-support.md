---
title: IDE support
description: How to install momentum in Claude Code, Codex, Antigravity, Cursor, and Gemini CLI.
---

momentum is **agent-agnostic**. The same commands, rules, and workflow ship to
every adapter; what changes is where the instruction file lives, how hooks
attach, and which slash-command surface the IDE exposes.

| Agent | Status | Primary instruction file | Hook surface |
| --- | --- | --- | --- |
| [Claude Code](#claude-code) | Shipped | `CLAUDE.md` | `.claude/settings.json` (PreToolUse, PostToolUse, SessionStart) |
| [Codex](#codex) | Shipped | `AGENTS.md` | `.codex/hooks.json` |
| [Antigravity](#antigravity) | Shipped | `AGENTS.md` | none today |
| [Cursor](#cursor) | Planned (Phase 13) | `.cursor/rules/` | TBD |
| [Gemini CLI](#gemini-cli) | Planned (Phase 13) | `GEMINI.md` | TBD |

## Claude Code

The default adapter — `--agent claude-code` is implicit.

```bash
npx @avinash-singh-io/momentum init
```

You get:

- `CLAUDE.md` at the project root (primary instruction file)
- `.agent/rules/project.md` (the 13 rules)
- `.claude/commands/*.md` (15+ slash commands)
- `.claude/settings.json` (PreToolUse + PostToolUse + SessionStart hooks)
- `scripts/check-history-reminder.sh`, `brainstorm-gate.sh`,
  `sessionstart-handoff.sh`

Hooks are the strongest signal: the brainstorm-gate hook physically blocks
disk writes during `/brainstorm-phase` until you say "approve", and the
SessionStart hook auto-greets pending handoffs.

## Codex

```bash
npx @avinash-singh-io/momentum init --agent codex
```

You get:

- `AGENTS.md` (Codex's primary instruction file)
- `.agent/rules/project.md`
- `.codex/commands/*.md` (recipes — Codex doesn't natively support slash
  commands the same way, so these are prompt fragments the agent runs
  when you type the trigger)
- `.codex/hooks.json` (Codex hook config)

## Antigravity

```bash
npx @avinash-singh-io/momentum init --agent antigravity
```

You get:

- `AGENTS.md` (shared with Codex)
- `.agent/rules/project.md`

Antigravity has no hook surface today. Brainstorm-gate discipline relies on
markdown contract — the agent still respects the convention, but the
PreToolUse hook isn't there to physically enforce it.

## Cursor

Planned for Phase 13. Cursor uses `.cursor/rules/*.mdc` files and doesn't
support slash commands the same way as Claude Code. Commands will ship as
rules-based prompt fragments.

Track progress: [FEAT-007 in backlog](https://github.com/avinash-singh-io/momentum/blob/main/specs/backlog/backlog.md).

## Gemini CLI

Planned for Phase 13. Gemini CLI uses `GEMINI.md` as the primary instruction
file (single-file convention). Workflow prompts will embed as sections.

Track progress: [FEAT-008 in backlog](https://github.com/avinash-singh-io/momentum/blob/main/specs/backlog/backlog.md).

## Picking an adapter

If you have a choice today, **Claude Code** gives you the strongest
discipline because hooks physically enforce the brainstorm gate and surface
handoffs at session start. **Codex** is the close second — `AGENTS.md`
auto-loads and `.codex/hooks.json` enforces the same discipline. **Antigravity**
works fine but relies on agent compliance with the markdown contract rather
than hook enforcement.
