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
| FEAT-001 | Tool-agnostic core/ + adapters/ restructure (DIP) | P1 | open | phase-1 | — |
| FEAT-002 | Adapter: Cursor (`.cursor/rules/`, `.cursorrules`) | P1 | open | phase-1 | — |
| FEAT-003 | Adapter: Gemini CLI (`GEMINI.md`) | P1 | open | phase-1 | — |
| FEAT-004 | Adapter: OpenCode | P1 | open | phase-1 | — |
| FEAT-005 | Adapter: VS Code Copilot (`.github/copilot-instructions.md`) | P1 | open | phase-1 | — |
| FEAT-006 | `npx momentum init` CLI with tool auto-detection | P1 | open | phase-2 | — |
| FEAT-007 | Adapter: Cursor (`.cursor/rules/`) | P2 | open | phase-2 | Rules-based, no slash commands — commands become prompt rules |
| FEAT-008 | Adapter: Gemini CLI (`GEMINI.md`) | P2 | open | phase-2 | Single-file convention; workflow prompts embedded as sections |
| FEAT-009 | Adapter: OpenCode | P2 | open | phase-2 | Convention TBD — research required before implementation |
| FEAT-010 | Adapter: VS Code Copilot (`.github/copilot-instructions.md`) | P2 | open | phase-2 | Instructions-only model; commands become inline prompt snippets |

## Tech Debt

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| _(none yet)_ | | | | | |

## Enhancements

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| ENH-001 | `/migrate` command for existing projects | P2 | open | phase-2 | — |
| ENH-002 | `/validate` command to check spec structure health | P2 | open | phase-2 | — |
