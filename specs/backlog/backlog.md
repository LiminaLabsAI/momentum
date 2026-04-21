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
| TD-001 | `adapter.sh` bundled in npm package unnecessarily | P3 | open | phase-3 | bash file only used by install.sh; Node.js CLI reimplements its logic; dead weight in npm package |
| TD-002 | `--coding-agent` flag missing from npx CLI | P2 | open | phase-3 | [→](details/TD-002.md) |

## Enhancements

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| ENH-001 | `/migrate` command for existing projects | P2 | open | phase-4 | — |
| ENH-002 | `/validate` command to check spec structure health | P2 | open | phase-4 | — |
| ENH-003 | `momentum init` should scaffold full specs/ skeleton + CLAUDE.md template | P1 | open | phase-3 | [→](details/ENH-003.md) |
| ENH-004 | Success message after `momentum init` suggests commands that immediately fail | P1 | open | phase-3 | /brainstorm-phase and /start-phase both read specs/status.md as first step — which doesn't exist post-init. Message is misleading until ENH-003 is fixed. |
| ENH-005 | `start-phase.md` missing explicit history.md creation step | P2 | open | phase-3 | Bootstrap plan step 4 says to create specs/phases/phase-N/history.md; our start-phase.md omits this — relies on /brainstorm-phase having done it. |
| ENH-006 | `brainstorm-project.md` missing Group Execution Pattern documentation | P2 | open | phase-3 | [→](details/ENH-006.md) |
| ENH-007 | `/track` command should auto-decide one-liner vs detail file | P2 | open | phase-3 | When tracking a new backlog item, agent should assess complexity — simple/well-understood issues stay as one-liners; anything requiring design, multiple steps, or cross-cutting impact gets a `details/{ID}.md` auto-created. |
