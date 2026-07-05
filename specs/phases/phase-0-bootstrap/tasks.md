---
type: Task List
---

# Phase 0 Tasks

> **Status**: Complete | **Progress**: 4/4 groups

## Group 0 — Project Structure

- [x] Create all directories (docs, specs/*, template/*, .claude/, .agent/)
- [x] Initialize `specs/phases/index.json`
- [x] Initialize `specs/decisions/impact-map.json`
- [x] Commit: `chore: initialize momentum directory structure`

## Group 1 — Template Files

- [x] Write `template/.claude/commands/brainstorm-project.md`
- [x] Write `template/.claude/commands/brainstorm-phase.md`
- [x] Write `template/.claude/commands/start-phase.md`
- [x] Write `template/.claude/commands/complete-phase.md`
- [x] Write `template/.claude/commands/sync-docs.md`
- [x] Write `template/.claude/commands/log.md`
- [x] Write `template/.claude/commands/track.md`
- [x] Write `template/.claude/commands/review.md`
- [x] Write `template/.claude/settings.json`
- [x] Write `template/scripts/check-history-reminder.sh` (chmod +x)
- [x] Write `template/.agent/rules/project.md`
- [x] Commit: `feat(template): all 8 commands, hook, settings, agent rules`

## Group 2 — Momentum Project Infrastructure

- [x] Write `CLAUDE.md`
- [x] Write `.agent/rules/project.md`
- [x] Copy commands to `.claude/commands/` (mirror template)
- [x] Write all `specs/` files (status, vision, planning, backlog, decisions, phases, changelog)
- [x] Commit: `feat(specs): momentum project spec structure — Phase 0`

## Group 3 — Install Script and README

- [x] Write `install.sh` (chmod +x)
- [x] Write `README.md`
- [x] Test: `./install.sh /tmp/test-momentum` — verify all files land correctly ✓ (2026-04-21)
- [x] Commit: `feat: install.sh + README — momentum v0.1.0 ready`
