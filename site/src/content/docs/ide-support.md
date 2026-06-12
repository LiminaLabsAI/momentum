---
title: IDE support
description: How momentum installs in Claude Code, Codex, Antigravity today — and what's coming for Cursor and Gemini CLI in Phase 14.
---

momentum is **agent-agnostic**. The same commands, rules, and workflow ship
to every adapter; what changes is where the instruction file lives, how
hooks attach, and which slash-command surface the IDE exposes.

| Agent | Status | Primary instruction file | Hook surface | Slash commands |
| --- | --- | --- | --- | --- |
| [Claude Code](#claude-code) | Available | `CLAUDE.md` | `.claude/settings.json` — PreToolUse, PostToolUse, SessionStart | Native `.claude/commands/*.md` |
| [Codex](#codex) | Testing pending | `AGENTS.md` | `.codex/hooks.json` (PreToolUse / PostToolUse / SessionStart, `apply_patch|shell`) | AGENTS.md recipes lookup + `.codex/commands/` fragments |
| [Antigravity](#antigravity) | Testing pending | `AGENTS.md` | `.agents/hooks.json` (`run_command|view_file|.*write.*|apply_patch`) | `.agent/workflows/*.md` auto-registered as slash commands |
| [Cursor](#cursor) | Planned (Phase 19 — Reach) | `.cursor/rules/` | TBD | Rules-based prompt fragments |
| [Gemini CLI](#gemini-cli) | Planned (Phase 19 — Reach) | `GEMINI.md` | TBD | Embedded sections |

> **Status legend.** *Available* = installed adapter + live-runtime verified. *Testing pending* = adapter ships and unit-tests pass, but full live-runtime smoke against the actual CLI is still being validated (tracked as VAL-001 for Codex and VAL-002 for Antigravity). *Planned* = adapter not yet built.

## Claude Code

Default adapter — `--agent claude-code` is implicit. The richest hook
surface today.

```bash
npx @avinash-singh-io/momentum init
```

### What you get

- **`CLAUDE.md`** at the project root — Claude Code reads this automatically
  at session start.
- **`.agent/rules/project.md`** — the 13 autonomous rules (referenced from
  `CLAUDE.md`).
- **`.claude/commands/*.md`** — all 15+ slash commands available natively.
- **`.claude/settings.json`** — hook wiring for the three hook surfaces.
- **`scripts/check-history-reminder.sh`** — PostToolUse hook; reminds
  about Rule 8 after edits to significant files.
- **`scripts/brainstorm-gate.sh`** — PreToolUse hook; blocks Write/Edit
  on `specs/` paths during `/brainstorm-phase`.
- **`scripts/sessionstart-handoff.sh`** — SessionStart hook; auto-greets
  pending handoffs in `.momentum/inbox/`.

### Hook compatibility

| Hook | What it does | When it fires |
|---|---|---|
| **PreToolUse** (`brainstorm-gate.sh`) | Blocks `Write`/`Edit`/`MultiEdit` calls targeting `specs/` paths when `.momentum/brainstorm-active` exists | Before every tool call during a brainstorm session |
| **PostToolUse** (`check-history-reminder.sh`) | Reminds the agent to log a history entry when significant files (status, backlog, phase tasks, decisions, architecture) are edited; opportunistically appends to ecosystem session log | After every Write/Edit/Bash call |
| **SessionStart** (`sessionstart-handoff.sh`) | Scans `.momentum/inbox/` for pending handoffs, banners + `[y/skip]` prompt | At each new session start |

Hooks are the strongest discipline-enforcement layer: brainstorm-gate
physically prevents premature disk writes, the history reminder closes the
"I'll log it later" failure mode, SessionStart eliminates the "did anyone
hand work off to me?" check.

### When to pick Claude Code

When you want the strongest discipline. The hooks make Rules 7 (brainstorm
gate), 8 (history), and the handoff pickup all enforced rather than
contractual.

## Codex

```bash
npx @avinash-singh-io/momentum init --agent codex
```

### What you get

- **`AGENTS.md`** — Codex's primary instruction file (analogous to CLAUDE.md).
- **`.agent/rules/project.md`** — the 13 rules.
- **`.codex/commands/*.md`** — commands as prompt-fragment recipes (Codex
  doesn't natively support slash commands the way Claude Code does; the
  recipes are prompt fragments the agent runs when you type the trigger).
- **`.codex/hooks.json`** — Codex hook config wiring the same three hook
  scripts as Claude Code.

### Hook compatibility

Same three hook scripts as Claude Code — wired via `.codex/hooks.json`
instead of `.claude/settings.json`. The discipline layer is the same; the
configuration shape is per-adapter.

### When to pick Codex

When you're already using Codex and want momentum's discipline without
switching IDEs. Hook coverage matches Claude Code.

## Antigravity

```bash
npx @avinash-singh-io/momentum init --agent antigravity
```

### What you get

- **`AGENTS.md`** — shared format with Codex.
- **`.agent/rules/project.md`** — the 13 rules.

### Hook compatibility

Antigravity has **no hook surface** today. The brainstorm-gate discipline
relies on the markdown contract — the agent still respects the rule, but
there's no PreToolUse hook to physically enforce it. Similarly, no
SessionStart greet for handoffs (use `/continue` explicitly).

The contract still works — the brainstorm gate is documented in
`/brainstorm-phase`'s body, and a well-behaved agent honors it. But the
**safety net** is gone. If you accidentally tell the agent "just write the
draft to disk so I can see it" mid-brainstorm, nothing physically stops it
on Antigravity.

### When to pick Antigravity

When you're already on Antigravity and want momentum's structure even
without the hook enforcement layer. The discipline is still there; just
trust-based.

## Cursor

**Planned for Phase 19 — Reach.** Cursor uses `.cursor/rules/*.mdc` files and
doesn't support slash commands the way Claude Code does. Commands will ship
as rules-based prompt fragments — typing the command name will trigger the
relevant rule.

Hook surface: TBD as part of Phase 14 design. Cursor's editor hooks are
different from Claude Code's session hooks; the brainstorm-gate equivalent
may need a different enforcement strategy (e.g., a file-watcher rule that
warns if the sentinel exists).

Track progress: [FEAT-007 in backlog](https://github.com/avinash-singh-io/momentum/blob/main/specs/backlog/backlog.md).

## Gemini CLI

**Planned for Phase 19 — Reach.** Gemini CLI uses `GEMINI.md` as the primary
instruction file (single-file convention). Workflow prompts will embed as
sections within `GEMINI.md` rather than as separate command files.

Hook surface: TBD. Gemini CLI's plugin model may support before/after-tool
hooks similar to Claude Code; if it does, the same three hook scripts will
attach with minimal porting.

Track progress: [FEAT-008 in backlog](https://github.com/avinash-singh-io/momentum/blob/main/specs/backlog/backlog.md).

## Picking an adapter

If you have a choice today, **Claude Code** gives you the strongest
discipline because hooks physically enforce the brainstorm gate and surface
handoffs at session start. **Codex** is the close second — `AGENTS.md`
auto-loads and `.codex/hooks.json` enforces the same discipline.
**Antigravity** works fine but relies on agent compliance with the markdown
contract rather than hook enforcement.

If you're already on Cursor or Gemini CLI, momentum will support both in
Phase 14 — for now, you can wait, or use `--agent claude-code` to scaffold
the structure and adapt it manually (the `specs/` skeleton is agent-agnostic;
only `.claude/` and `CLAUDE.md` are Claude-specific).

## Multi-adapter projects

If your team uses **multiple agents** (some on Claude Code, some on Codex),
run `momentum init --agent claude-code` first, then `momentum upgrade
--agent codex` to layer the Codex adapter overlay on top. Both
`CLAUDE.md` and `AGENTS.md` will exist; both will reference the same
`specs/` and `.agent/`.

The adapter contract guarantees the overlays don't conflict — installing
both is additive. Each agent reads its own primary instruction file at
session start; they share the per-project state.

## Upgrading

```bash
momentum upgrade
```

The upgrade is **marker-aware**: anything under `## Project Extensions` in
`CLAUDE.md` / `AGENTS.md` is preserved across the upgrade. Default commands
and rules update from the published template; project-specific content
stays.

Known regression: see [BUG-006](https://github.com/avinash-singh-io/momentum/blob/main/specs/backlog/backlog.md)
for an upgrade-related title-line issue. Fix is on the backlog.

## Diagnosing IDE setup

```bash
momentum doctor
```

Walks the local layout: does the project look like a momentum-installed
project? Are the rules referenced from the instruction file? Are the
adapter files where they should be? Is the project an ecosystem member
(if `ecosystem.json` is detectable in a sibling dir)?

Reports detected issues plus suggested fixes. Run `doctor` first whenever
something feels off; it catches the common "the instruction file isn't
loading" class of problems.
