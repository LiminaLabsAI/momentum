---
title: Getting started
description: Install momentum, scaffold a project, and run your first phase end-to-end. About 15 minutes from zero to verified release.
---

momentum is an open-source state layer for agentic AI. Install it once,
let your agent do the rest. This page walks you through installation,
scaffolding, and a full first-phase walkthrough so you've seen the whole
loop before you trust it with real work. The tutorial below uses a
coding-flavored example because that's the most concrete path today, but
the same loop (`/brainstorm-phase` → `/start-phase` → `/complete-phase`)
applies to agents that manage infrastructure, run research, or handle
data pipelines.

By the end you'll have a project with `specs/`, your agent's primary
instruction file, the 13 autonomous rules in place, and a first phase
brainstormed, started, executed, and (optionally) released.

## Install

momentum ships as an npm package — `@avinash-singh-io/momentum`. The fastest
path is `npx`:

```bash
npx @avinash-singh-io/momentum init
```

Or install globally if you'll run it repeatedly:

```bash
npm install -g @avinash-singh-io/momentum
momentum init
```

Both work. `npx` is one-shot — no global install, just runs once. `-g`
keeps the `momentum` binary on `PATH` for repeat use
(`momentum upgrade`, `momentum doctor`, etc.). Pick whichever fits your flow.

### Which agent are you using?

`momentum init` defaults to **Claude Code**. Pass `--agent` to scaffold for
a different one:

```bash
npx @avinash-singh-io/momentum init                       # Claude Code (default)
npx @avinash-singh-io/momentum init --agent codex         # Codex
npx @avinash-singh-io/momentum init --agent antigravity   # Antigravity
```

Cursor and Gemini CLI adapters ship in Phase 14. See [IDE
support](/ide-support/) for which adapter is the right fit for your setup.

### Ecosystem mode (opt-in)

If you have multiple related repos and want them to coordinate, pass
`--ecosystem` to bootstrap an ecosystem alongside the first member:

```bash
npx @avinash-singh-io/momentum init --ecosystem my-eco
```

This creates `../my-eco/` as a sibling git repo + registers the current
project as its first member. See [Ecosystem mode](/ecosystem/) for the deep
dive. **Single-project usage is the default** — if you don't pass
`--ecosystem`, nothing about ecosystems appears anywhere.

## What gets scaffolded

After `init`, your project has:

```
my-project/
├── specs/                  # status, phases, backlog, decisions, planning
│   ├── status.md           # ← first file your agent reads (Rule 1)
│   ├── backlog/
│   ├── phases/
│   ├── decisions/
│   ├── planning/
│   └── changelog/
├── .agent/
│   └── rules/
│       └── project.md      # 13 autonomous agent rules
├── .claude/                # Claude Code adapter (varies by --agent flag)
│   ├── commands/           # 15+ slash commands
│   ├── settings.json       # PreToolUse / PostToolUse / SessionStart hooks
│   └── ...
├── CLAUDE.md               # primary agent instruction file (or AGENTS.md)
└── scripts/                # hook scripts (brainstorm-gate, history-reminder)
```

For **Codex**, you get `AGENTS.md` + `.codex/` (config + hooks). For
**Antigravity**, `AGENTS.md` only (no hook surface today). All variants
share the same `specs/` and `.agent/` skeleton.

## Your first phase — end-to-end

This is the loop. Run it once and you've seen everything momentum does.

### Step 1 — Open your agent

Open Claude Code, Codex, or Antigravity in the project directory you just
scaffolded. The agent should load `CLAUDE.md` (or `AGENTS.md`) automatically
at session start. That file pulls in the 13 rules from
`.agent/rules/project.md`.

To verify the agent is oriented: ask "what phase is this project on?" The
agent should read `specs/status.md` and answer — that's Rule 1 (Always
Orient First) firing.

### Step 2 — Brainstorm the phase

```
> /brainstorm-phase
```

The agent reads `specs/status.md`, scans the backlog for P0/P1 bugs, and
asks you scoping questions one at a time:

```
Reading specs/status.md... no active phase.
Checking backlog... no P0 blockers.

What's the goal of this phase?
> add memory persistence to the agent platform

What are the 2-3 deliverables that would mean "done"?
> ...
```

**Important — the brainstorm gate**: while `/brainstorm-phase` is running,
the PreToolUse hook **physically blocks** any Write/Edit on `specs/` paths.
The agent drafts in conversation only. Nothing gets committed to disk until
you explicitly say "approve."

This is the **visible safety** behind discipline: the agent can't
accidentally pre-commit to a half-finished plan even if it wanted to.

When the draft is ready, the agent shows you the full overview, plan,
tasks, and history skeleton. You say "approve" — the sentinel file gets
removed and the files land on disk in one batch + the brainstorm gets
committed.

### Step 3 — Start the phase

```
> /start-phase
```

Now the **autonomous execution contract** kicks in:

1. Branch created (`phase-N-shortname`).
2. Phase setup commits — status.md updated, index.json updated,
   phases/README.md updated, changelog entry appended.
3. Group 0 implementation — the agent reads its own `plan.md` and starts
   working through the groups.
4. After each group: verification runs, tasks get marked `[x]`, history
   entry appended, commit lands with the group's commit message, push to
   origin.
5. Groups 1, 2, 3, ... execute in order (parallel where the plan declares
   parallel).
6. After the final group: **STOP**. The only hard-stop in the contract is
   the merge + release gate.

Throughout, your agent narrates what it's doing. You can interrupt anytime
— the contract is "proceed silently unless interrupted," not "execute
without communication."

### Step 4 — Watch the discipline land

While `/start-phase` runs, observe:

- **`tasks.md`** updates per group — `[x]` for done, `[/]` for in-progress.
- **`history.md`** grows — `[DECISION]`, `[DISCOVERY]`, `[NOTE]` entries
  capturing the *why* of each meaningful change.
- **Git log** shows clean conventional commits with per-group messages.
- **`status.md`** reflects current phase and progress.

If the agent discovers a bug or tech debt during the phase (Rule 3), it
adds the item to `backlog.md` immediately and tells you. You don't need to
ask.

### Step 5 — Complete the phase

```
> /complete-phase
```

The agent runs verification: tests, lint, typecheck, smoke tests, whatever
the phase's acceptance criteria specify. It reads the actual output (Rule
12 — Verify Before Claim). Only if everything passes does it proceed:

- Writes `retrospective.md` with evidence + what worked / what didn't /
  deviations / discoveries.
- Updates `status.md` (Current Phase → between phases; Latest Release →
  vX.Y.Z).
- Bumps `package.json` version.
- Runs `/sync-docs` to propagate history into other specs.
- Opens a PR phase → main; asks for your merge approval.
- After merge: tags `vX.Y.Z` on main; asks for your `npm publish` approval.

You're in the loop for the merge and the publish; the rest happens
automatically.

## Troubleshooting

### Permission denied on hooks

Hook scripts under `scripts/` need to be executable. Run once after install:

```bash
chmod +x scripts/*.sh
```

### AppleDouble (`._*`) files appearing in output

Common on external drives (HFS+ / SMB). `momentum init` skips them when
scaffolding; they're already in the project's `.gitignore`. If your build
tooling complains about them, configure it to ignore `._*` too.

### `momentum upgrade` overwrote my CLAUDE.md title

Known regression — see [BUG-006](https://github.com/avinash-singh-io/momentum/blob/main/specs/backlog/backlog.md).
The title line and intro paragraph in `CLAUDE.md` sit inside the
upgrade-managed section and get replaced with the generic template's
`<Project Name>` placeholder. Workaround: restore manually after upgrade.

A fix is on the backlog — candidates: detect from `package.json`,
treat the title block as preserved, or add a `## Project Identity` section
the upgrade leaves untouched.

### My agent is ignoring the rules

The rules live in `.agent/rules/project.md`, referenced from `CLAUDE.md`
(or `AGENTS.md`). If your agent doesn't auto-load the instruction file at
session start, momentum can't help — confirm the file is in the directory
the agent was launched from and that it's being read.

For Claude Code, verify `.claude/settings.json` is present and the hooks
are wired. Without the hooks, the brainstorm-gate (Rule 7) loses its
physical enforcement layer (the markdown contract still applies, but the
safety net is gone).

### "Should I worry about the brainstorm-gate sentinel?"

No. `.momentum/brainstorm-active` is a temporary file created at the start
of `/brainstorm-phase` and removed when you approve the draft. If a
brainstorm session is interrupted, the sentinel may persist — running
`/brainstorm-phase` again is fine; the agent handles cleanup. Manually
deleting the sentinel without an approval recreates the failure mode.
Let the workflow remove it.

## Next

- [Concepts](/concepts/) — the five primitives (phases, backlog, history,
  ADRs, ecosystem) in depth.
- [Skills](/skills/) — every slash command, what it does, and an example.
- [Rules](/rules/) — the 13 autonomous agent rules with full text + red
  flags + counters.
- [IDE support](/ide-support/) — per-agent setup details and hook compatibility.
- [Ecosystem mode](/ecosystem/) — when and how to coordinate across projects.
- [Orchestration](/orchestration/) — scout / dispatch / handoff / continue
  for cross-project work.
