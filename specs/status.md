# Project Status

> **Last Updated**: 2026-06-12
> **Current Phase**: _none active — Phase 17 shipped as v0.20.0_
> **Latest Release**: v0.20.0 — Swarm: Single-Session Multi-Project Feature Delivery (Claude Code)
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
| 12 | Public Site | Complete | v0.15.0 (2026-06-08) |
| 13 | Site Polish & Content Depth | Complete | v0.16.0 (2026-06-08) |
| 14 | Site Refinement & Positioning Pivot | Complete | v0.17.0 (2026-06-08) |
| 15 | Ecosystem Agent Discoverability | Complete | v0.18.0 (2026-06-08) |
| 16 | Codex & Antigravity Adapter Rework (Native-Idiom) | Complete | v0.19.0 (2026-06-11) |
| 17 | Swarm — Single-Session Multi-Project Feature Delivery (Claude Code) | Complete | v0.20.0 (2026-06-12) |

## Active Phase

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| _(none — Phase 17 shipped 2026-06-12 as v0.20.0; GitHub Release + npm both live)_ | | | |

> Phase 8 (Parallel Worktree Orchestration) was implemented on the
> `phase-8-parallel-worktrees` branch but has not been merged or
> released. Treat its status as "completed on branch, awaiting release
> decision" until that's resolved as a separate workstream.

## Upcoming Phases

| Phase | Name | Status | Key Deliverables |
|-------|------|--------|-----------------|
| 17.5 | Swarm Portability | Not Started (target v0.20.1) | `/swarm focus`, `/swarm join`, `/swarm absorb` commands; lease enforcement; signal protocol; multi-conductor coordination. Schema hooks already in v0.20.0. |
| 18 | Swarm Parity (Codex + Antigravity) | Not Started (target v0.20.2) | Codex `swarm-supervisor.toml` + MCP cwd shim; Antigravity Agent Manager workflow + skills. `core/swarm/` is platform-agnostic; this phase wires the two adapters. |
| 19 | Reach | Not Started (target v0.21.0) | Adapter: Cursor (FEAT-007); Adapter: Gemini CLI (FEAT-008); ENH-009 distribution decision |
| 20 | Intelligence | Not Started (target v0.22.0) | Self-learning hooks; retrospective-driven rule evolution; self-healing; context-window-aware task sizing |
| 21 | Platform | Not Started (target v1.0) | MCP server; `/specify`; `/decide` (ADR creation); skill authoring; dependency-aware tasks; bidirectional spec sync; ecosystem Tier 2 |

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

1. **Cerebrio bootstrap** — v0.20.0 is now live on npm. User installs the released momentum and runs `momentum init --ecosystem cerebrio` on real cerebrio projects (sapience / frontend / py / cli / open-guard / open-shield / bench). Phase 17 validation used synthetic fixtures only — this is the live dogfood.
2. **Phase 17.5 — Swarm Portability** (target v0.20.1). Schema hooks already shipped in v0.20.0; needs `/swarm focus|join|absorb` commands + lease enforcement + signal protocol + multi-conductor coordination.
3. **VAL-001** — live `codex` CLI dogfood from Phase 16 Rework. Gates capability flips on `parallelSubagents` + `skills`. Run the 6 verification questions from the backlog entry.
4. **VAL-002** — live `agy` CLI dogfood from Phase 16 Rework. Locks `.agent/workflows/` (singular) vs `.agents/workflows/` (plural) path; gates `sessionStartHook` flip; runs the 6 verification questions from the backlog entry.
5. Resolve Phase 8 (Parallel Worktree Orchestration) merge/release decision as a parallel workstream — implementation exists on `phase-8-parallel-worktrees` branch but was never released.
6. When Hardening & Activation becomes the right next thing, brainstorm from `specs/planning/unscheduled-hardening-activation.md`.
7. (Optional housekeeping) Rename `phase-16-adapter-parity` branch on origin to `phase-16-research-record` to make the relationship to the merged rework branch explicit.

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
- **2026-06-08**: Phase 12 complete — v0.15.0 released. Public GitHub Pages site at <https://trymomentum.github.io/> — landing page + 8 docs pages built with Astro Starlight. Full identity pass: Velocity Arc logo (single-fill SVG, light/dark via `currentColor`), Indigo + Slate palette, Inter Variable font (self-hosted via `@fontsource-variable/inter`), CSS/SVG illustrated hero, 1200×630 OG card generated at build via `sharp`. Cross-repo deploy from `avinash-singh-io/momentum` (source) → `trymomentum/trymomentum.github.io` (deploy target) via GH Actions + fine-grained PAT. Lighthouse landing: Performance 98 / Accessibility 96 / Best Practices 100 / SEO 100. Linkinator: 0/24 broken links. CLI regression: 246/246 still pass (metadata-only npm bump — no CLI behavior change). Roadmap renumber landed: Site = 12 / Reach → 13 / Intelligence → 14 / Platform → 15. BUG-006 filed for `momentum upgrade` regressing CLAUDE.md project title.
- **2026-06-08**: Phase 13 complete — v0.16.0 released. Site polish + content depth pass on top of v0.15.0. Positioning shift to "Spec-driven development for agentic AI." Landing wholesale rewrite (7 sections + hero, was 4 + hero): NEW PhaseFlow animated SVG hero diagram, Topology single-vs-ecosystem comparison, OrchestrationShowcase featuring scout/dispatch/handoff/continue, RulesCallout, SkillsPreview with code-block previews. NEW `/orchestration/` page (1,716 words) with full scout/dispatch/handoff/continue documentation + 5 Mermaid sequence diagrams. Ecosystem page rewritten (1,289 words) with multi-repo topology SVG + 5-step worked example. Concepts/Skills/Rules deepened (1,597 / 1,102 / 2,157 words). End-to-end "Your first phase" tutorial on getting-started. Mermaid plugin (`rehype-mermaid` + Playwright/Chromium) wired into Starlight; inline-svg strategy keeps zero client JS for diagrams. Sidebar restructured with "Multi-repo coordination" group. CLI regression: 246/246 still pass (metadata-only npm bump).
- **2026-06-12**: Phase 17 Swarm complete on branch `phase-17-swarm` (target v0.20.0). Conductor + supervisor architecture (files-as-channels, no daemon) with per-repo cwd-pinned supervisors; wave ordering from `ecosystem.json` dependencies; 4 indexing strategies layered (board cache + git SHA invalidation + incremental log + supervisor isolation) deliver 95% token-cost saving — e2e scenario evidence reports conductor-turn cost <1.2KB on all three synthetic ecosystems (target was <5KB). Two shipped modes (`autopilot` + `checkpoint`). Five intervention patterns (plan approval, wave checkpoint, inbox, /tell, /broadcast). Inbox protocol with mkdir-locked write+resolve+INDEX materializer. Pre-merge preview (`git merge --no-commit --no-ff` with always-abort). Portability schema hooks (sessions[] + per-repo leases + signals/ + tokens/) baked in for Phase 17.5. Three synthetic ecosystem scenarios (3-repo linear / 4-repo branched / 5-repo wide) green with evidence captured at `evidence/scenario-*.txt`. Claude Code zero-regression: fingerprint snapshot caught all 4 intentional drifts (3 docs in G0 + 1 new overlay in G1) and was re-snapshotted with meta. Codex + Antigravity parity deferred to **Phase 18 (v0.20.2)** — `core/swarm/` is platform-agnostic; only adapter wiring remains. Roadmap renumbered: Phase 17.5 = Swarm Portability (v0.20.1), Phase 18 = Swarm Parity (v0.20.2), Phase 19 = Reach (was 17 → v0.21.0), Phase 20 = Intelligence (v0.22.0), Phase 21 = Platform (v1.0). Suite: **462/462** (326 v0.19.0 baseline + 136 new); zero pre-existing regressions across all 5 group commits.
- **2026-06-11**: Phase 16 Rework complete — v0.19.0 released. Codex & Antigravity native-idiom adapters. Replaces the previous force-port attempt (`phase-16-adapter-parity` retained as research record). Conceptual unlock: recipes / personas / parallel workers are three distinct categories; each platform surfaces them differently. Codex: `apply_patch|shell` hook matchers; 3 TOML reviewer subagents with `sandbox_mode=read-only`; momentum-orient skill; AGENTS.md "Recipes Lookup Pattern" + 20-row recipe table; `features.hooks` opt-in documented. Antigravity: 5 overlay workflows + 15 core commands shipping as workflows at `.agent/workflows/` (native `/<name>` slash command registration); 4 skills at `.agents/skills/`; hooks.json with `run_command|view_file|.*write.*|apply_patch` matchers. Antigravity capability flips: `slashCommands false→true`, `skills false→true`. Shared: `brainstorm-gate.sh` promoted to `core/scripts/` and generalized for all three platforms' payload shapes; adapter contract destinations gain `workflows` + `skills` + `agents` keys. Claude Code zero-regression: new `tests/claude-code-regression.test.js` SHA256 install fingerprint (45 files) runs every group commit; install behavior preserved. Side-effect fix: v0.18.0 latent bug where `sessionstart-handoff.sh` was referenced in `.claude/settings.json` but never installed — now ships via the recursive `core/scripts/` copy. Live `codex` + `agy` CLIs unavailable in dev env; live-runtime verification deferred as VAL-001 + VAL-002. Capability flips gated on VAL evidence stay false: Codex `parallelSubagents` + `skills`, Antigravity `sessionStartHook`. Roadmap renumbered: Reach → 17 (v0.20.0); Intelligence → 18 (v0.21.0); Platform → 19 (v1.0). Suite: 326/326 (288 v0.18.0 baseline → +38 new).
