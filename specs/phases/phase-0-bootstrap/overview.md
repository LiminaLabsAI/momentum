---
type: Phase
status: complete
tags: [install, template, distribution, commands, hook, agent-rules, spec-structure]
---

# Phase 0: Bootstrap

> **Status**: Complete (2026-04-21)
> **Version**: v0.1.0
> **Depends On**: Nothing — this is the foundation

## Goal

Ship the installable momentum toolkit: all slash commands, agent rules template, hook script, settings.json, install.sh, and the momentum project's own spec structure — demonstrating that momentum works by using itself.

## Scope

### In Scope
- All 8 slash command template files (generic, no project-specific content)
- `install.sh` that copies template into any target project
- `README.md` with install instructions and workflow overview
- `scripts/check-history-reminder.sh` hook
- `.claude/settings.json` hook config
- `.agent/rules/project.md` generic template
- Momentum's own full spec structure (specs/, CLAUDE.md, phases, backlog, etc.)

### Out of Scope
- npm packaging (Phase 1)
- `/migrate` command (Phase 2)
- CI/CD for the momentum repo itself (Phase 1)

## Acceptance Criteria

- [x] `./install.sh /tmp/test-project` completes without errors
- [x] All 8 commands are present in target and contain no project-specific content
- [x] `check-history-reminder.sh` is executable after install
- [x] Momentum's own `specs/status.md` reflects current state
- [x] README accurately describes install flow and commands
