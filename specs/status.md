# Project Status

> **Last Updated**: 2026-05-27
> **Current Phase**: Phase 7a — Planning Contracts (`in progress`)
> **Latest Release**: v0.7.1 — BUG-002 hotfix (overlay files in tarball)
> **Health**: On Track

## Summary

Momentum is a spec-driven development toolkit for AI coding agents. It provides slash commands, agent rules, hooks, and templates that give any project a structured workflow: phase planning, backlog tracking, history logging, doc sync, and git discipline.

`momentum init` now scaffolds a fully navigable project in one command — specs skeleton, CLAUDE.md, agent rules, hooks, and all 11 commands. `momentum upgrade` keeps existing projects up to date with new releases.

## Completed Phases

| Phase | Name | Status | Released |
|-------|------|--------|---------|
| 0 | Bootstrap | Complete | v0.1.0 (2026-04-21) |
| 1 | Tool-Agnostic Architecture | Complete | v0.2.0 (2026-04-21) |
| 2 | npx CLI Distribution | Complete | v0.3.0 (2026-04-21) |
| 3 | Gap Fixes | Complete | v0.4.0 (2026-04-21) |
| 4 | Enhanced Commands | Complete | v0.5.0 (2026-04-21) |
| 5 | Rules & Upgrade Safety | Complete | v0.6.0 (2026-05-08) |
| 6 | Adapter Overlay & Verification | Complete | v0.7.0 (2026-05-08) |

## Active Phase

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 7a | Planning Contracts | In Progress | 0% (just started) |

## Upcoming Phases

| Phase | Name | Status | Key Deliverables |
|-------|------|--------|-----------------|
| 7b | Autonomous Execution & TDD | Not Started (target v0.9.0) | Subagent execution engine (Claude Code overlay) implementing the autonomy contract authored in 7a; TDD opt-in (Rule 13); retry budget per-task (3-strikes systematic-debugging primitive) |
| 7c | Parallel Worktree Orchestration | Not Started (target v0.10.0) | Multiple concurrent streams via git worktrees (feature + fix + enhancement, or N parallel modules); `momentum worktree-manager` command; branch-per-stream conventions; conflict avoidance; cross-stream status visibility |
| 8 | Hardening & Activation | Not Started (target v0.11.0) | systematic-debugging skill (full); SessionStart auto-activation (Claude Code); persuasion-hardening Rules 1/3/4/5/7/9 (evidence-permitting) |
| 9 | Reach | Not Started (target v0.12.0) | Adapter: Cursor (FEAT-007); Adapter: Gemini CLI (FEAT-008); ENH-009 distribution decision; adapter contract refinements |
| 10 | Intelligence | Not Started (target v0.13.0) | Self-learning hooks; retrospective-driven rule evolution; self-healing; context-window-aware task sizing |
| 11 | Platform | Not Started (target v1.0) | MCP server; `/specify`; `/decide` (ADR creation); skill authoring; dependency-aware tasks; bidirectional spec sync |

## Blockers

| ID | Description | Severity |
|----|-------------|----------|
| _(none)_ | | |

## Critical Items (P0)

| ID | Type | Description |
|----|------|-------------|
| _(none)_ | | |

## Next Actions

1. Execute Phase 7a Groups 0-4: contracts, brainstorm-command hardening, hook + sentinel, /start-phase autonomy contract, tests + dogfood
2. Group 5: stop for merge/release gate (v0.8.0)
3. After 7a ships: brainstorm Phase 7b (autonomous execution engine + TDD) — the spiritual successor to the abandoned `phase-7-subagent-engine` branch
4. ENH-017 (project-name preserved across upgrade) — defer to 7c or 8; surfaced in Phase 6 dogfood
5. ENH-018 (tarball-shape test) — folded into Phase 7a Group 4 test work where natural; else Phase 7b
6. ENH-009 (distribution strategy) — still blocked on having ≥1 more adapter; lands in Phase 9 (Reach)

## Key Decisions Made

- Template-based install (file copy via install.sh) chosen for Phase 0 — simpler, no build tooling required; `npx momentum init` CLI deferred to Phase 2
- DIP architecture: `core/` (tool-agnostic logic) + `adapters/` (tool-specific wiring) — Phase 1 delivers this before the npx CLI so the CLI gets tool auto-detection for free
- Zero-dependency Node.js CLI — no `commander`, no `chalk`; only built-ins (`fs`, `path`, `process`)
- Package name `@avinash-singh-io/momentum` — `momentum` (unscoped) was taken on npm
- Claude Code only in Phase 2 — auto-detection deferred until more adapters land
- `install.sh` kept unchanged — npx CLI is additive, two install paths coexist
- `adapter.js` per coding agent (Option A) — DIP boundary for future adapters; consistent with `adapter.sh` pattern from Phase 1
- `brainstorm-project` split into `brainstorm-idea` (exploration, no files) + `start-project` (scaffolding) — mirrors `brainstorm-phase` → `start-phase` pattern

## Recent Changes

- **2026-04-21**: Phase 0 complete — v0.1.0 released. install.sh smoke test passed. All 8 commands, hook, agent rules, README shipped.
- **2026-04-21**: Phase 2 complete — v0.3.0 released. `@avinash-singh-io/momentum` published to npm. Zero-dependency Node.js CLI ships `momentum init` command.
- **2026-04-21**: Phase 3 complete — v0.4.0 released. Full specs/ scaffold on init. `--coding-agent` flag. `adapter.js` DIP. Command fixes (ENH-003–007, TD-001–002). `brainstorm-idea` + `start-project` commands. README rewritten.
- **2026-05-08**: Phase 5 complete — v0.6.0 released. Rules 10/11, persuasion-hardening (Rules 2/6/8/10/11), `## Project Extensions` marker, marker-aware `momentum upgrade`, `--coding-agent` → `--agent` rename (breaking).
- **2026-05-08**: Phase 6 complete — v0.7.0 released. Adapter Contract v2 (per-agent commands/rules/scripts overlays, conflict = error); Rule 12 verify-before-claim; `/complete-phase` evidence rigor; `/review-code` (Claude Code, subagent-driven); ENH-014 cross-repo Rule 9 safeguards; `tests/` for momentum CLI (24 tests via node:test).
