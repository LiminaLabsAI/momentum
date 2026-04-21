# Phase 0: Bootstrap — Implementation Plan

**Execution order**: Group 0 → Group 1 → Group 2 → Group 3

> All groups are sequential for this phase — each builds on the previous.

---

## Group 0 — Project Structure

**Sequential.**

### 0.1 Create directory structure
```bash
mkdir -p docs specs/backlog/details specs/changelog specs/decisions \
  specs/phases/phase-0-bootstrap specs/planning specs/vision scripts \
  template/.claude/commands template/.agent/rules template/scripts \
  .claude/commands .agent/rules
touch specs/backlog/details/.gitkeep
```

### 0.2 Initialize git tracking files
- `specs/phases/index.json`
- `specs/decisions/impact-map.json`

**Commit**: `chore: initialize momentum directory structure`

---

## Group 1 — Template Files

**Sequential. After Group 0.**

### 1.1 Write all 8 template command files
- `template/.claude/commands/brainstorm-project.md`
- `template/.claude/commands/brainstorm-phase.md`
- `template/.claude/commands/start-phase.md`
- `template/.claude/commands/complete-phase.md`
- `template/.claude/commands/sync-docs.md`
- `template/.claude/commands/log.md`
- `template/.claude/commands/track.md`
- `template/.claude/commands/review.md`

### 1.2 Write hook and settings
- `template/.claude/settings.json`
- `template/scripts/check-history-reminder.sh` (chmod +x)

### 1.3 Write agent rules template
- `template/.agent/rules/project.md`

**Commit**: `feat(template): all 8 commands, hook, settings, agent rules`

---

## Group 2 — Momentum Project Infrastructure

**Sequential. After Group 1.**

### 2.1 Write momentum's own CLAUDE.md and agent rules
- `CLAUDE.md`
- `.agent/rules/project.md`

### 2.2 Copy commands into momentum's own .claude/commands/
- Mirror template commands for use in developing momentum itself

### 2.3 Write all specs files
- `specs/status.md`, `specs/README.md`
- `specs/vision/project-charter.md`, `specs/vision/principles.md`, `specs/vision/success-criteria.md`
- `specs/planning/roadmap.md`
- `specs/backlog/backlog.md`
- `specs/decisions/0000-template.md`, `specs/decisions/README.md`
- `specs/phases/README.md`
- `specs/phases/phase-0-bootstrap/overview.md`, `plan.md`, `tasks.md`, `history.md`
- `specs/changelog/2026-04.md`

**Commit**: `feat(specs): momentum project spec structure — Phase 0`

---

## Group 3 — Install Script and README

**Sequential. After Group 2.**

### 3.1 Write install.sh
- Copy logic for commands, scripts, settings, agent rules
- Handle existing files gracefully (warn, don't overwrite)
- chmod +x

### 3.2 Write README.md
- Install instructions
- Command reference table
- Workflow overview
- Group execution pattern summary

**Commit**: `feat: install.sh + README — momentum v0.1.0 ready`
