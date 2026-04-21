# Phase 3 — Gap Fixes: Overview

> **Goal**: Close every usability gap found post-Phase 2. After this phase, `momentum init` produces a fully usable project in one command, the CLI has feature parity with `install.sh`, and command documentation is complete and consistent.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Spec templates location | `core/specs-templates/` | Mirrors existing `core/` structure; included in npm via `core/` glob |
| `copyDir()` recursion | Extend existing helper | Needed to copy nested `specs/` tree; minimal change |
| `--coding-agent` adapter pattern | Option A — `adapter.js` per adapter | Consistent with `adapter.sh` DIP pattern from Phase 1; establishes clean boundary for future adapters |
| TD-001 fix | `.npmignore` to exclude `**/adapter.sh` | Simpler than restructuring; `adapter.sh` stays for install.sh users |
| ENH-007 threshold | Explicit criteria in `track.md` | Agent needs clear rules, not just "if complex" |

## Scope

### In

| ID | Item |
|----|------|
| ENH-003 | `momentum init` scaffolds full `specs/` skeleton + `CLAUDE.md` template |
| ENH-004 | Fix misleading success message (depends on ENH-003) |
| ENH-005 | `start-phase.md` — add explicit `history.md` creation step |
| ENH-006 | `brainstorm-project.md` — add Group Execution Pattern section |
| ENH-007 | `/track` — auto-decide one-liner vs detail file with explicit criteria |
| TD-001 | Remove `adapter.sh` from npm package via `.npmignore` |
| TD-002 | Add `--coding-agent` flag to `bin/momentum.js` (Option A: `adapter.js` per adapter) |

### Out

- New adapters (Cursor, Gemini CLI, OpenCode, Copilot) — unscheduled
- `/migrate` and `/validate` commands — Phase 4
- Name change / rebranding — open question, deferred
- Native plugin distribution (Claude Code extension, Cursor rule-pack) — roadmap item

## Deliverables + Verification

| Deliverable | Verification |
|-------------|-------------|
| `core/specs-templates/` tree (all template files) | `ls -R core/specs-templates/` |
| `momentum init` copies full spec skeleton | Run init on empty dir; `find <target>/specs -type f` |
| `momentum init --coding-agent claude-code` works | Flag accepted; default unchanged |
| `adapter.sh` not in npm package | `npm pack --dry-run \| grep adapter.sh` → no output |
| `adapters/claude-code/adapter.js` ships | `cat adapters/claude-code/adapter.js` |
| `start-phase.md` has history.md creation step | Read file; confirm step present |
| `brainstorm-project.md` has Group Execution Pattern | Read file; confirm section present |
| `track.md` has auto-decide criteria | Read file; confirm decision table present |

## Acceptance Criteria

1. `npx @avinash-singh-io/momentum init ./test-proj` creates a fully navigable project — `specs/status.md`, `specs/backlog/backlog.md`, `CLAUDE.md`, etc. all present
2. Running `/brainstorm-phase` immediately after init does NOT fail (because `specs/status.md` now exists)
3. Success message no longer suggests `/start-phase` directly (only `/brainstorm-project` for new, `/brainstorm-phase` for existing)
4. `npm pack --dry-run` does not include `adapter.sh`
5. All command `.md` files read cleanly with no missing sections

## Release

v0.4.0 — Gap Fixes
