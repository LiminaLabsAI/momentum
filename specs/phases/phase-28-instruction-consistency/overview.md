---
type: Phase
status: not-started
tags: [instructions, consistency, projection, project-rules, upgrade, ecosystem-pointer, config]
---

# Phase 28 — Instruction Consistency

## Goal

Make every agent instruction file (`CLAUDE.md`, `AGENTS.md`, …) a **pure
projection of `specs/`** — carrying no hand-authored content — so they cannot
diverge across adapters. Project knowledge is single-sourced: **structured**
facts in `specs/config.md` (read by recipes), **prose** rules in a new shared
`specs/project-rules.md` (pointed to by every instruction file), **ecosystem**
context in the injected pointer block (now in every file). Consistency becomes
*structural*, not maintained.

Completes the trajectory: Phase 23 single-sourced the *rules*, Phase 26 moved
*config* out of core, this moves the last hand-authored surface
(`## Project Extensions`) into `specs/` too. Closes BUG-027; ships ADR-0010.

## Why (the divergence investigation)

Comparing the self-repo's CLAUDE.md (535 lines) and AGENTS.md (619) surfaced
four distinct causes — only two are bugs:

1. **Staleness (cause #1).** `momentum upgrade` refreshes ONE agent at a time
   (`upgrade()` writes only `state.agents[agent]`); it never iterates all
   installed agents. Claude-code got the Phase-25 "Not founded" paragraph + the
   Phase-26 config nav row; opencode's AGENTS.md never did → it fell behind.
2. **Ecosystem pointer gap (cause #2).** `core/ecosystem/lib/pointer.js` injects
   the `<!-- ecosystem:begin -->` block into only ONE file (prefers CLAUDE.md);
   AGENTS.md never gets it → codex/opencode sessions are blind to the ecosystem.
3. **Project Extensions divergence (cause #3).** `## Project Extensions` is
   per-file user prose preserved on upgrade; CLAUDE.md grew a full release
   checklist + self-audits, AGENTS.md stayed a stub → permanent drift.
4. **Intentional per-adapter differences (NOT a bug).** `TodoWrite`→"task tool"
   substitution; AGENTS.md's recipe/skills/plugin/subagent/swarm surfaces. These
   SHOULD differ — generated per adapter, never hand-synced.

## Key decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **ADR-0010 principle:** the instruction file is a *projection* of `specs/`, never authored | Removes the drift surface at its root |
| 2 | Project prose → one shared `specs/project-rules.md`, referenced by a tiny **managed pointer** in every instruction file (pointer, NOT injection) | Zero duplication, zero drift; matches the Navigation-pointer pattern |
| 3 | `## Project Extensions` stops being an authoring surface — becomes the managed pointer only | One home for project content; nothing per-file to diverge |
| 4 | **`upgrade` syncs ALL installed agents** (`installed.json.agents`) | Fixes cause #1 |
| 5 | **`pointer.js` injects the ecosystem block into EVERY present instruction file** | Fixes cause #2 |
| 6 | **Migrate, never drop:** upgrade moves existing Project-Extensions prose into `project-rules.md`, dropping config-covered release commands | Safe one-time migration (Phase 24/25 pattern) |
| 7 | `/complete-phase` release runs **fully from `config.md`** (finish Phase 26) | Removes the redundant prose release checklist entirely |

## Scope

### In
- ADR-0010 + new OKF doc type for `specs/project-rules.md` (authored at founding; `upgrade` creates-if-missing)
- Managed **pointer block** in all instruction templates (same marked-block mechanism as the ecosystem pointer)
- `upgrade` iterates every installed agent (one run refreshes all)
- `pointer.js` injects/refreshes into all present primary-instruction files
- **Content-preserving migration** on upgrade: detect `## Project Extensions` prose → move to `project-rules.md` (drop config-covered release commands) → replace the section with the pointer
- BUG-027 (the 4 adapter table-row typos: sync-config row missing trailing `|`)
- `/complete-phase` release fully config-driven; `/validate` invariant (founded ⟹ `project-rules.md` exists)
- Flip stale backlog statuses (BUG-024/025/026, ENH-061 → resolved)
- Docs + adapter fingerprint re-baselines

### Out (non-goals)
- No change to the managed **rules content** itself (Phase 23 single-source stays) — this is about *surfacing*, not rewriting rules
- No new config keys beyond what release-execution needs
- No trust-layer change (ADR-0009 invariant holds)
- Intelligence-phase work stays in Phase 29

## Deliverables & verification

Default verification (`specs/config.md`): `test_command = npm test`; `build_command = none`.

| Deliverable | Verification |
|---|---|
| `project-rules.md` type + migration function | Unit tests: migrate preserves prose, drops config-redundant, injects pointer; idempotent |
| upgrade-all-agents (cause #1) | Test: a 2-agent project upgrades both in one run; neither drifts |
| pointer-all-files (cause #2) | Test: ecosystem pointer lands in CLAUDE.md AND AGENTS.md |
| BUG-027 | codex/opencode AGENTS.md rows well-formed; fingerprints re-baselined |
| Config-driven release | `/complete-phase` recipe carries no per-project release prose |
| Self-repo dogfood | `CLAUDE.md` vs `AGENTS.md` managed region **identical** modulo intended per-adapter substitutions; both carry both pointers; `project-rules.md` holds the migrated content |

## Acceptance criteria

1. A fresh multi-adapter project has byte-identical managed rules across all instruction files (only intended per-adapter substitutions differ).
2. The ecosystem pointer appears in **every** instruction file (member repos).
3. `## Project Extensions` is the managed pointer only; all prior prose lives in `specs/project-rules.md` — nothing lost.
4. `momentum upgrade` (no `--agent`) refreshes all installed agents in one run.
5. `/complete-phase` needs no per-project release prose — it runs from `config.md`.
6. Full suite green; the self-repo dogfood proves `CLAUDE.md` ≡ `AGENTS.md` (managed rules + both pointers).
