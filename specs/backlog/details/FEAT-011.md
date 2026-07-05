---
type: Backlog Detail
---

# FEAT-011: `momentum upgrade` Subcommand

## Problem

Currently `momentum init` is the only install path. Running it again on an existing project overwrites commands without backup and skips specs. There's no clean way to pick up new momentum releases.

## Proposed Behavior

| Mode | Commands | CLAUDE.md | Specs | Agent Rules |
|------|----------|-----------|-------|-------------|
| `momentum init` | Copy (skip if exists) | Copy (skip if exists) | Copy (skip if exists) | Copy (skip if exists) |
| `momentum upgrade` | Replace (`.bak` backup) | Replace managed section only (ENH-010) | Skip (project data) | Skip (project-specific) |

### `momentum upgrade` steps:

1. Detect installed version (check a `.momentum-version` marker or package.json)
2. Replace all `.claude/commands/*.md` with latest versions (backup as `.bak`)
3. Replace `scripts/check-history-reminder.sh` with latest
4. Replace managed section of CLAUDE.md (between markers, per ENH-010)
5. Report: "Upgraded N commands, updated CLAUDE.md managed section. Project extensions preserved."

## Dependencies

- ENH-010 (CLAUDE.md marker architecture) — needed for safe CLAUDE.md partial replacement

## Acceptance Criteria

- [ ] `momentum upgrade` replaces commands with `.bak` backups
- [ ] `momentum upgrade` preserves `## Project Extensions` in CLAUDE.md
- [ ] `momentum upgrade` never touches specs/ content
- [ ] `momentum upgrade` reports what changed
- [ ] `momentum init` on existing project skips all existing files (safe re-run)
