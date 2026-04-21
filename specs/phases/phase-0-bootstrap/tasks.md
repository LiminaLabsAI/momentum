# Phase 0 Tasks

> **Status**: In Progress | **Progress**: 0/4 groups

## Group 0 — Project Structure

- [ ] Create all directories (docs, specs/*, template/*, .claude/, .agent/)
- [ ] Initialize `specs/phases/index.json`
- [ ] Initialize `specs/decisions/impact-map.json`
- [ ] Commit: `chore: initialize momentum directory structure`

## Group 1 — Template Files

- [ ] Write `template/.claude/commands/brainstorm-project.md`
- [ ] Write `template/.claude/commands/brainstorm-phase.md`
- [ ] Write `template/.claude/commands/start-phase.md`
- [ ] Write `template/.claude/commands/complete-phase.md`
- [ ] Write `template/.claude/commands/sync-docs.md`
- [ ] Write `template/.claude/commands/log.md`
- [ ] Write `template/.claude/commands/track.md`
- [ ] Write `template/.claude/commands/review.md`
- [ ] Write `template/.claude/settings.json`
- [ ] Write `template/scripts/check-history-reminder.sh` (chmod +x)
- [ ] Write `template/.agent/rules/project.md`
- [ ] Commit: `feat(template): all 8 commands, hook, settings, agent rules`

## Group 2 — Momentum Project Infrastructure

- [ ] Write `CLAUDE.md`
- [ ] Write `.agent/rules/project.md`
- [ ] Copy commands to `.claude/commands/` (mirror template)
- [ ] Write all `specs/` files (status, vision, planning, backlog, decisions, phases, changelog)
- [ ] Commit: `feat(specs): momentum project spec structure — Phase 0`

## Group 3 — Install Script and README

- [ ] Write `install.sh` (chmod +x)
- [ ] Write `README.md`
- [ ] Test: `./install.sh /tmp/test-momentum` — verify all files land correctly
- [ ] Commit: `feat: install.sh + README — momentum v0.1.0 ready`
