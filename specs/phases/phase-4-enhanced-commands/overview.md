# Phase 4 — Enhanced Commands: Overview

> **Goal**: Give momentum projects an upgrade path when new versions ship, a health-check command for spec integrity, and a one-time migration tool for projects with a manual momentum-like structure.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Upgrade conflict strategy | Backup + overwrite (`.bak`) | Non-destructive; no interactive prompts; user can diff manually |
| Upgrade target detection | CWD (optional path arg) | Convention-over-config; matches `init` behavior |
| Upgrade file discovery | Walk same source dirs as `init` | No separate manifest needed; stays in sync with install automatically |
| Validate default mode | Index-first (fast) | Scales to large projects; catches 90% of issues without reading every file |
| Validate deep mode | `--deep` flag | Full scan on demand; reads every phase file and cross-references backlog IDs |
| `/migrate` scope | Limited — onboard manual/outdated structure | One-time use; not a general migration framework |
| ENH-008, ENH-009 | Deferred | Flag naming and distribution strategy explicitly out of scope for Phase 4 |

## Scope

### In

| ID | Item |
|----|------|
| — | `momentum upgrade` CLI command — upgrade all momentum-owned files in existing project |
| ENH-001 | `/migrate` slash command — onboard existing manual momentum-like structure into momentum |
| ENH-002 | `/validate` slash command — structural + content health check with `--deep` flag |

### Out

- ENH-008 (flag naming `--coding-agent`) — deferred, still open
- ENH-009 (distribution strategy) — deferred, still open
- New adapters (Cursor, Gemini, OpenCode, Copilot) — unscheduled
- Automated version notifications — out of scope; upgrade is manual/on-demand
- General migration framework — `/migrate` is limited to momentum-like manual structures only

## Deliverables + Verification

| Deliverable | Verification |
|-------------|-------------|
| `momentum upgrade` subcommand wired in CLI | `node bin/momentum.js upgrade --help` |
| Upgrade backs up modified files | Modify a command file; run upgrade; confirm `.bak` created and file overwritten |
| Upgrade copies new files added in latest version | Remove a command file; run upgrade; confirm file reappears |
| `runUpgrade()` in `adapters/claude-code/adapter.js` | `cat adapters/claude-code/adapter.js` — `runUpgrade` present |
| `/validate` command file ships | `cat core/commands/validate.md` |
| `/migrate` command file ships | `cat core/commands/migrate.md` |
| Both commands registered in adapter settings | `cat adapters/claude-code/settings.json \| grep -E "validate\|migrate"` |
| Validate default mode completes fast | Run `/validate` on project with 5+ phases; no full file scan |
| Validate `--deep` catches orphaned dirs | Run on project with orphaned phase directory; flagged in report |

## Acceptance Criteria

1. `npx @avinash-singh-io/momentum upgrade` (or `momentum upgrade ./path`) upgrades all momentum-owned files
2. Modified files are backed up as `<file>.bak` before overwrite — original never lost
3. New files added in latest momentum version appear in the project after upgrade
4. `/validate` (default) checks `status.md`, `backlog.md`, `index.json`, active phase files — reports pass/fail per check
5. `/validate --deep` additionally walks all phase directories, cross-references backlog IDs, flags orphaned directories
6. `/migrate` detects missing momentum structure, fills gaps without overwriting existing files, reconciles `index.json`
7. Both `/migrate` and `/validate` are registered in `.claude/commands/` after a fresh `momentum init`

## Release

v0.5.0 — Enhanced Commands
