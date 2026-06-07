# Project Status

> **Last Updated**: 2026-06-07
> **Current Phase**: (between phases — Phase 12 Reach planning pending)
> **Latest Release**: v0.14.0 — Dynamic Orchestration & Context Handover
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
| 6 | Adapter Overlay & Verification | Complete | v0.7.0 / v0.7.1 (2026-05-08) |
| 7a | Planning Contracts | Complete | v0.8.0 (2026-05-27) |
| 7b | Agent Runtime Compatibility | Complete | v0.9.0 (2026-05-28) |
| 7c | Autonomous Execution & TDD | Complete | v0.10.0 (2026-05-28) |
| 9 | Ecosystem (Tier 1) | Complete | v0.12.0 (2026-06-07) |
| 10 | Ecosystem Activation & Polish | Complete | v0.13.0 (2026-06-07) |
| 11 | Dynamic Orchestration & Context Handover | Complete | v0.14.0 (2026-06-07) |

## Active Phase

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| _(between phases)_ | Phase 11 released as v0.14.0 on 2026-06-07. Phase 12 (Reach) planning pending. | | |

> Phase 8 (Parallel Worktree Orchestration) was implemented on the
> `phase-8-parallel-worktrees` branch but has not been merged or
> released. Treat its status as "completed on branch, awaiting release
> decision" until that's resolved as a separate workstream.

## Upcoming Phases

| Phase | Name | Status | Key Deliverables |
|-------|------|--------|-----------------|
| 12 | Reach | Not Started (target v0.15.0) | Adapter: Cursor (FEAT-007); Adapter: Gemini CLI (FEAT-008); ENH-009 distribution decision; adapter contract refinements |
| 13 | Intelligence | Not Started (target v0.16.0) | Self-learning hooks; retrospective-driven rule evolution; self-healing; context-window-aware task sizing |
| 14 | Platform | Not Started (target v1.0) | MCP server; `/specify`; `/decide` (ADR creation); skill authoring; dependency-aware tasks; bidirectional spec sync; ecosystem Tier 2 |

## Unscheduled Future Work

| Name | Stub | Notes |
|------|------|-------|
| Hardening & Activation | `specs/planning/unscheduled-hardening-activation.md` | Originally Phase 10. Displaced 2026-06-07. Scope: full systematic-debugging skill; SessionStart auto-activation; persuasion-hardening Rules 1/3/4/5/7/9; ENH-017. Pickable any time. |
| Parallel Stream Development | `specs/planning/unscheduled-parallel-streams.md` | Enable parallel feature work on a single project via git worktrees. Existing implementation on `phase-8-parallel-worktrees` branch (unmerged; needs reconciliation with Phase 10 state machine before merge). |
| Context Economy | `specs/planning/future-context-economy.md` | Trigger-gated. Pulled off the shelf only when concrete size/behaviour thresholds fire. |

## Blockers

| ID | Description | Severity |
|----|-------------|----------|
| _(none)_ | | |

## Critical Items (P0)

| ID | Type | Description |
|----|------|-------------|
| _(none)_ | | |

## Next Actions

1. **`/brainstorm-phase` Phase 12 — Reach** (target v0.15.0). Cursor adapter (FEAT-007), Gemini CLI adapter (FEAT-008), ENH-009 distribution decision. The orchestration CLI floor (v0.14.0) is already universal — new adapters inherit `momentum scout/dispatch/handoff/continue` automatically. Slash command authoring is per-adapter overlay work.
2. **cerebrio dogfood (post-v0.13.0 user action — still pending).** Bootstrap `../cerebrio-ecosystem/` via `momentum init --ecosystem cerebrio`; join sapience / frontend / py / cli / open-guard / open-shield / bench. Pointer-block updates land via separate per-repo `chore/ecosystem-pointer` PRs.
3. Resolve Phase 8 (Parallel Worktree Orchestration) merge/release decision as a parallel workstream — implementation exists on `phase-8-parallel-worktrees` branch but was never released.
4. When Hardening & Activation becomes the right next thing, brainstorm from `specs/planning/unscheduled-hardening-activation.md`.
5. Live Codex parallel-subagent validation to flip `parallelSubagents: true` and remove the sequential-mode degradation note (per Phase 11 retrospective).

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
- **2026-05-28**: Phase 7b complete — v0.9.0 released. Adapter Contract v3; Codex adapter (`AGENTS.md`, `.codex/hooks.json`, `.codex/commands/`); dynamic available-agent discovery; Claude regression coverage; ENH-018 tarball-shape test; prepublish test gate.
- **2026-06-07**: Phase 10 complete — v0.13.0 released. Top-level entry/exit commands (`init --ecosystem`, `join`, `leave`, `doctor`); init auto-detect; BUG-004 / BUG-005 / ENH-021 / ENH-022 fixed; README rewrite as product positioning; per-adapter smoke matrix + capability audit. 165/165 tests pass (+64 from Phase 9). ENH-023/ENH-024 filed as follow-ups.
- **2026-06-07**: Phase 11 complete — v0.14.0 released. Three orchestration primitives (scout / dispatch / handoff) + continue, with three invocation doors (slash / NL inference / CLI) over one shared `core/orchestration/` library. SessionStart hook auto-greet for pending handoffs. Tracking contract: cheap layer auto, curated layer auto-if-meaningful, no new history entry types. Capability-driven routing with labeled degraded modes. ENH-023 + ENH-024 closed. Per-adapter smoke matrix extended to 9 combinations. 246/246 tests pass (+81 from Phase 10).
