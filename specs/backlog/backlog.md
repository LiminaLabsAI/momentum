# Backlog

> **Last Updated**: 2026-04-21

---

## Priority Levels

| Level | Meaning |
|-------|---------|
| **P0** | Critical — blocks current phase |
| **P1** | High — address in current/next phase |
| **P2** | Medium — within 2 phases |
| **P3** | Low — nice to have |

**Status**: `open` | `in-progress` | `resolved` | `deferred` | `deprecated`

---

## Bugs

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| BUG-001 | install.sh: `realpath` blank line when target dir doesn't exist | P3 | resolved | phase-1 | Fixed in Phase 1: `mkdir -p "$TARGET"` now runs before `realpath` |

## Features

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| FEAT-001 | Tool-agnostic core/ + adapters/ restructure (DIP) | P1 | resolved | phase-1 | Delivered in Phase 1 (v0.2.0) |
| FEAT-002 | Adapter: Cursor (`.cursor/rules/`, `.cursorrules`) | P1 | deferred | phase-1 | Scope cut from Phase 1; superseded by FEAT-007 (P2, phase-2) |
| FEAT-003 | Adapter: Gemini CLI (`GEMINI.md`) | P1 | deferred | phase-1 | Scope cut from Phase 1; superseded by FEAT-008 (P2, phase-2) |
| FEAT-004 | Adapter: OpenCode | P1 | deferred | phase-1 | Scope cut from Phase 1; superseded by FEAT-009 (P2, phase-2) |
| FEAT-005 | Adapter: VS Code Copilot (`.github/copilot-instructions.md`) | P1 | deferred | phase-1 | Scope cut from Phase 1; superseded by FEAT-010 (P2, phase-2) |
| FEAT-006 | `npx momentum init` CLI (Claude Code only) | P1 | resolved | phase-2 | Delivered in Phase 2 (v0.3.0) as `@avinash-singh-io/momentum`; auto-detection deferred (no other adapters yet) |
| FEAT-007 | Adapter: Cursor (`.cursor/rules/`) | P2 | open | unscheduled | Rules-based, no slash commands — commands become prompt rules |
| FEAT-008 | Adapter: Gemini CLI (`GEMINI.md`) | P2 | open | unscheduled | Single-file convention; workflow prompts embedded as sections |
| FEAT-009 | Adapter: OpenCode | P2 | open | unscheduled | Convention TBD — research required before implementation |
| FEAT-010 | Adapter: VS Code Copilot (`.github/copilot-instructions.md`) | P2 | open | unscheduled | Instructions-only model; commands become inline prompt snippets |

## Tech Debt

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| TD-001 | `adapter.sh` bundled in npm package unnecessarily | P3 | resolved | phase-3 | Fixed via explicit `files` glob in package.json (root .npmignore doesn't filter files-listed dirs) |
| TD-002 | `--coding-agent` flag missing from npx CLI | P2 | resolved | phase-3 | Delivered in Phase 3 (v0.4.0) — `adapter.js` DIP pattern, adapter validation, dynamic loading |

## Enhancements

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| ENH-001 | `/migrate` command for existing projects | P2 | open | phase-4 | — |
| ENH-002 | `/validate` command to check spec structure health | P2 | open | phase-4 | — |
| ENH-003 | `momentum init` should scaffold full specs/ skeleton + CLAUDE.md template | P1 | resolved | phase-3 | Delivered in Phase 3 (v0.4.0) — `core/specs-templates/` tree, recursive `copyDir()` with skip-if-exists |
| ENH-004 | Success message after `momentum init` suggests commands that immediately fail | P1 | resolved | phase-3 | Fixed in Phase 3 — success message now shows `/brainstorm-idea`, `/start-project`, `/brainstorm-phase` |
| ENH-005 | `start-phase.md` missing explicit history.md creation step | P2 | resolved | phase-3 | Fixed in Phase 3 — note added to step 3 |
| ENH-006 | `brainstorm-project.md` missing Group Execution Pattern documentation | P2 | resolved | phase-3 | Fixed in Phase 3 — command renamed to `start-project.md`; Group Execution Pattern section added |
| ENH-007 | `/track` command should auto-decide one-liner vs detail file | P2 | resolved | phase-3 | Fixed in Phase 3 — explicit decision criteria table added to `track.md` |
| ENH-008 | Reconsider `--coding-agent` flag name — term may not be the right abstraction | P2 | deferred | unscheduled | [→](details/ENH-008.md) — shipped as `--coding-agent` in Phase 3; naming question still open |
| ENH-009 | Distribution strategy: npx vs native agent-ecosystem plugins vs both | P2 | open | unscheduled | [→](details/ENH-009.md) |
