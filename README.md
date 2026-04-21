# momentum

> Spec-driven development for Claude Code. One install. Every project.

Momentum gives any project a structured workflow: phase planning, backlog tracking, history logging, doc sync, and git discipline — all driven by slash commands and agent rules that Claude Code reads automatically.

## Install

**Phase 1 (coming soon):**
```bash
npx momentum init
```

**Now (v0.2.0):** clone and run the install script:
```bash
git clone https://github.com/cerebrio/momentum
cd momentum
./install.sh /path/to/your/project
```

The default coding agent is `claude-code`. To specify explicitly:
```bash
./install.sh /path/to/your/project --coding-agent claude-code
```

## What You Get

After install, your project has:

| File | Purpose |
|------|---------|
| `.claude/commands/brainstorm-project.md` | Turn an idea into a full project scaffold |
| `.claude/commands/brainstorm-phase.md` | Plan the next phase before starting it |
| `.claude/commands/start-phase.md` | Begin a new phase (branch + tracking) |
| `.claude/commands/complete-phase.md` | Verify, release, and tag a phase |
| `.claude/commands/sync-docs.md` | Propagate phase history to specs |
| `.claude/commands/log.md` | Record a decision or discovery |
| `.claude/commands/track.md` | Add a bug, feature, or tech debt item |
| `.claude/commands/review.md` | Groom the backlog between phases |
| `scripts/check-history-reminder.sh` | Hook: reminds agent to log history |
| `.claude/settings.json` | Wires the hook into Claude Code |

## The Workflow

**New project:**
```
/brainstorm-project   →  idea dialogue → vision + roadmap + Phase 0 + full scaffold
/start-phase          →  create branch, wire tracking
... implement ...
/sync-docs            →  propagate decisions to specs
/complete-phase       →  verify, tag, release
```

**Each subsequent phase:**
```
/brainstorm-phase  →  plan.md with group execution pattern
/start-phase       →  branch + tracking
... implement in groups (sequential / parallel via subagents) ...
/sync-docs + /complete-phase
```

## The Group Execution Pattern

Every `plan.md` declares its execution order:

```
# Sequential:   Group 0 → Group 1 → Group 2
# Parallel:     (Groups 0 + 1 + 2 in parallel) → Group 3
# Mixed:        Group 0 → (Groups 1 + 2 in parallel) → Group 3
```

Groups run sequentially or in parallel. Tasks within a group run in parallel via subagents.

## CLAUDE.md Setup

After install, add to your `CLAUDE.md` (see `core/agent-rules/project.md` for the full rules):

```markdown
## Autonomous Behaviors (Always-On Rules)

### Rule 1: Always Orient First
Before ANY work, read `specs/status.md`.

### Rule 2: Auto-Update Tracking After Changes
After completing ANY meaningful work, update: tasks.md, status.md, changelog.

[... copy remaining rules from core/agent-rules/project.md ...]
```

## Contributing

This repo is itself a momentum project. See `specs/` for the current phase and backlog.

```bash
/brainstorm-phase   # plan the next enhancement
/start-phase        # begin work
```
