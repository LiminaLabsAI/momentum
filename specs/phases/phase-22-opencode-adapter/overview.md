---
type: Phase
status: complete
tags: [phase-22, reach, opencode, opencode-adapter, native-idiom, adapter-contract, commands, plugins, tool-execute-before, brainstorm-gate, session-created, agents, subagents, skills, opencode-skills, spawn, opencode-run, live-validation, capability-flips, fingerprint-snapshot, parity-matrix, roadmap-repair, v0-28-0]
---

# Phase 22 — Reach: opencode Adapter

> **Target release**: v0.28.0 (retargeted from v0.27.0 — the OKF phase landed first and took it)
> **Branch / lane**: `phase-22-opencode-adapter` (momentum lanes)
> **Planned**: 2026-07-05 (brainstormed under the Brainstorm Gate Contract)

## Goal

Ship momentum's fourth adapter — a full-parity, **native-idiom** adapter for
[opencode](https://opencode.ai) (`opencode-ai` on npm, 1.17.x at planning
time) — and validate it **live in-phase** against the real CLI, ending the
deferred-VAL pattern that left VAL-001/VAL-002 dangling for weeks.

opencode is the closest surface fit of any adapter yet: every capability
momentum has built maps to a first-class opencode feature, including — for
the first time on any adapter — a native, project-level skills surface.

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| Scope depth | Full parity (all surfaces incl. swarm) | Phase 16/18 precedent; no degraded parity cells |
| Validation | Live in-phase — opencode installs via `npm i -g opencode-ai` | Unlike codex (app-bundled) / agy (no CLI exists); capability booleans come from evidence, not aspiration |
| Roadmap | Phase 22 Reach re-scoped: opencode first; Cursor (FEAT-007) + Gemini CLI (FEAT-008) stay P1 backlog for a later Reach wave | Operator decision 2026-07-05 |
| Idiom mapping | recipes → `.opencode/commands/*.md`; gate/reminder/banner → one JS plugin; reviewers + swarm supervisor → `.opencode/agents/*.md`; skills → `.opencode/skills/`; primary instruction → `AGENTS.md` | Native idiom per the Phase 16 lesson — no force-ports |
| Config posture | Ship **no `opencode.json`** — every momentum surface auto-loads from `.opencode/` directories | Never touch user-owned config |
| Swarm spawn | `opencode run --dir <repo> --agent swarm-supervisor "<directive>"` | Documented non-interactive CLI; `--format json` gives machine-readable evidence |

## Surface Mapping (research-verified 2026-07-05)

| momentum capability | opencode surface | Declared |
|---|---|---|
| `hooks` | `.opencode/plugins/*.js` — `tool.execute.before` blocks by throwing; `tool.execute.after` | `true` |
| `slashCommands` | `.opencode/commands/*.md` (frontmatter, `$ARGUMENTS`, `!`shell / `@`file interpolation) | `true` |
| `subagents` | `.opencode/agents/*.md`, `mode: subagent`, per-agent `permission:` frontmatter | `true` |
| `parallelSubagents` | Task-tool parallel fan-out (docs) | live-validate in G5 |
| `sessionStartHook` | `session.created` plugin event | live-validate in G5 |
| `skills` | **native** `.opencode/skills/<name>/SKILL.md`; also discovers `.agents/skills/` (momentum's Codex/Antigravity path) | `true` pending live check — a momentum first |
| `browser` / `computerUse` | not provided (webfetch tool only) | `false` |

## Scope

### In scope

1. `adapters/opencode/adapter.js` — destinations, marker-aware `primaryInstruction`,
   full capability block + roadmap notes, `runInstall`/`runUpgrade`, `spawn()`.
2. `adapters/opencode/instructions/{header.md,vars.json,surfaces.md}` + generated
   `AGENTS.md` via `npm run generate-instructions` (Phase 23 contract), drift-guard green.
3. All ~20 core recipes as native `.opencode/commands/*.md`.
4. Momentum skills shipped natively to `.opencode/skills/`.
5. `.opencode/plugins/momentum.js` — brainstorm gate (`tool.execute.before`),
   history reminder (`tool.execute.after`), handoff banner (`session.created`).
6. Three read-only reviewer subagents + `swarm-supervisor` agent + spawn contract.
7. Tests: opencode install fingerprint, existing-adapter zero-regression,
   tarball-shape globs, capability-audit row, plugin unit tests, synthetic swarm e2e.
8. Live validation (7 checks) with evidence under this phase's `evidence/`.
9. Docs: capability matrix, parity matrix, README, site adapter mention.
10. Roadmap repair: Timeline gains the shipped Phase 23 Rules Unification row;
    Reach = opencode @ v0.28.0 (retargeted); Intelligence slides to v0.29.0+.

### Out of scope (non-goals)

- Cursor adapter (FEAT-007) and Gemini CLI adapter (FEAT-008) — stay P1 backlog.
- The ENH-009 distribution *decision* — this phase unblocks it ("≥1 additional
  adapter"); decided separately afterwards.
- Managing users' `opencode.json` (permissions, MCP, models) — documented, never written.
- `opencode serve` / `--attach` remote mode (roadmap note for swarm economics).
- Custom plugin-defined tools (e.g. a native `momentum_orient` tool) — roadmap note.

## Deliverables & Verification (Rule 12)

| # | Deliverable | Verification |
|---|---|---|
| D1 | Adapter skeleton + generated AGENTS.md | `npm test` (drift-guard + capability audit); `node bin/momentum.js init --agent opencode` smoke in tmp dir |
| D2 | 20 native commands + skills | shape tests; live `/command` discovery in TUI |
| D3 | Enforcement plugin | unit tests (gate blocks specs/ write while sentinel exists); live check |
| D4 | Reviewer + supervisor agents, spawn | spawn contract test; live `opencode run --dir --agent` |
| D5 | Zero regression on existing adapters | fingerprint tests byte-identical |
| D6 | Live validation evidence | 7 evidence files under `evidence/`; capability booleans finalized from them |
| D7 | Docs + roadmap repair | linkinator-clean docs build; roadmap row audit |
| D8 | v0.28.0 release prep | full suite green; version bump; retrospective with Verification Evidence section |

## Acceptance Criteria

1. `momentum init --agent opencode` scaffolds a working project: `AGENTS.md` +
   populated `.opencode/{commands,plugins,agents,skills}`; full suite green.
2. Existing three adapters byte-identical — fingerprint regression tests unchanged.
3. Live evidence captured for all 7 checks: command discovery; plugin gate blocks
   a `specs/` write during `brainstorm-active`; history reminder fires; `session.created`
   banner; reviewer subagent invocation; `opencode run --dir --agent` spawn;
   multi-adapter skills coexistence (`.agents/skills/` + `.opencode/skills/`).
4. Capability matrix row filled from live evidence only.
5. `momentum upgrade` idempotent on an opencode project.
6. v0.28.0 released — gated on operator approval per Rule 6. (Retargeted from v0.27.0 — OKF landed first.)
