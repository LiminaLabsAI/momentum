---
title: Getting started
description: Install momentum, scaffold a project, and run your first phase from end to end.
---

momentum is an open-source toolkit for AI-assisted coding. Install it once,
let your agent do the rest. This page walks you through installation,
scaffolding, and your first phase loop.

## Install

momentum ships as an npm package — `@avinash-singh-io/momentum`. The fastest path is `npx`:

```bash
npx @avinash-singh-io/momentum init
```

Or install globally:

```bash
npm install -g @avinash-singh-io/momentum
momentum init
```

Both work. `npx` is one-shot; `-g` keeps the `momentum` binary on `PATH` for repeat use (`momentum upgrade`, `momentum doctor`, etc.).

### Which agent are you using?

`momentum init` defaults to Claude Code. Pass `--agent` to scaffold for a different one:

```bash
npx @avinash-singh-io/momentum init                 # Claude Code (default)
npx @avinash-singh-io/momentum init --agent codex   # Codex
npx @avinash-singh-io/momentum init --agent antigravity  # Antigravity
```

Cursor and Gemini CLI adapters land in Phase 13.

## What gets scaffolded

After `init`, your project has:

```
my-project/
├── specs/             # status, phases, backlog, decisions, planning
├── .agent/            # agent-rules (the 13 autonomous rules)
├── .claude/           # commands + hooks + settings (Claude Code only)
├── CLAUDE.md          # primary agent instruction file
└── scripts/           # hook scripts that nudge tracking discipline
```

For Codex you get `AGENTS.md` + `.codex/`. For Antigravity, `AGENTS.md` only.
All variants share the same `specs/` and `.agent/` skeleton.

## Your first phase

Open your AI agent in the project directory. Then run the slash commands:

```
/start-project        # scaffold from a clear idea (one-time)
/brainstorm-phase     # plan your next phase
/start-phase          # begin implementation
/complete-phase       # verify, release, commit
```

Each command is interactive — the agent will ask you what to do and write
files only after you approve. There's a built-in **brainstorm gate** that
blocks any disk writes during planning until you say "approve".

## Troubleshooting

**Permission denied on hooks** — hook scripts under `scripts/` need to be
executable. Run `chmod +x scripts/*.sh` once after install.

**AppleDouble (`._*`) files** — common on external drives (HFS+). `momentum
init` skips them; they're already in `.gitignore`. If your build tooling
complains, configure it to ignore `._*` too.

**`momentum upgrade` overwrote my CLAUDE.md title** — known regression (see
[BUG-006](https://github.com/avinash-singh-io/momentum/blob/main/specs/backlog/backlog.md)).
Restore manually after upgrade until the fix lands.

**My agent is ignoring the rules** — the rules live in `.agent/rules/project.md`
(and a reference is in `CLAUDE.md` / `AGENTS.md`). If your agent doesn't load
the instruction file at session start, momentum can't help. Confirm the file
is in the directory the agent was launched from.

## Next

- [Concepts](/momentum/concepts/) — phases, backlog, history, ADRs, ecosystem
- [Skills](/momentum/skills/) — every slash command and what it does
- [Rules](/momentum/rules/) — the 13 autonomous agent rules
- [IDE support](/momentum/ide-support/) — per-agent setup details
