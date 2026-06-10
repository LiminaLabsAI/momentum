# Phase 16 — Tasks

> Granular task list mirroring `plan.md`. Mark `[x]` complete, `[/]` in progress.

## Group 0 — Contracts & Matrices

- [x] G0.1 Add `destinations.agents` + `destinations.skills` to all three `adapters/*/adapter.js`
- [x] G0.2 Refresh `core/adapter-capabilities.md` against current vendor docs
- [x] G0.3 Create `core/adapter-parity-matrix.md` — feature × adapter status grid
- [x] G0.4 Stub `tests/adapter-parity-matrix.test.js` — assert every cell has a declared status
- [x] G0.5 Add `fakeToolEvent` helper to `tests/_helpers.js`
- [x] G0.6 Extend `tests/adapter-capabilities-declared.test.js` for new destinations keys

## Group 1 — Codex Hardening

- [x] G1.1 Add PreToolUse block to `adapters/codex/hooks.json` (brainstorm-gate matcher)
- [x] G1.2 Author `adapters/codex/agents/momentum-reviewer-security.toml`
- [x] G1.3 Author `adapters/codex/agents/momentum-reviewer-qa.toml`
- [x] G1.4 Author `adapters/codex/agents/momentum-reviewer-architecture.toml`
- [x] G1.5 Wire `runInstall` / `runUpgrade` in `adapters/codex/adapter.js` to copy `agents/` → `.codex/agents/` (handled by generic `applyOverlay` walk over `destinations` — no adapter.js changes needed; brainstorm-gate.sh moved to `core/scripts/` for shared install)
- [x] G1.6 Author `adapters/codex/commands/review-code.md` (Codex-flavored, invokes 3 TOML subagents)
- [x] G1.7 Update Codex `AGENTS.md` "Codex Hooks" section to document full hook surface
- [x] G1.8 Extend `tests/adapter-smoke-codex.test.js` for `.codex/agents/*.toml` + `/review-code` install
- [x] G1.9 Write `tests/adapter-subagents-codex.test.js` — TOML parse + required field assertions

## Group 2 — Antigravity Realignment

- [x] G2.1 Rewire `adapters/antigravity/adapter.js` destinations: `.antigravity/` → `.agents/` (landed in G0; confirmed via tests)
- [x] G2.2 Author `adapters/antigravity/hooks.json` (PostToolUse history reminder + SessionStart fallback)
- [x] G2.3 Add `configFiles` entry + `runInstall` / `runUpgrade` for `hooks.json` → `.agents/hooks.json`
- [x] G2.4 Author `adapters/antigravity/agents/momentum-reviewer-*` mirrors of Codex set (TOML format with same required-fields shape)
- [x] G2.5 Author `adapters/antigravity/skills/momentum-orient/SKILL.md` (first shipped skill)
- [x] G2.6 Rewrite `adapters/antigravity/instructions/AGENTS.md` — drop `.antigravity/`; describe `.agents/`; surface skill + agents
- [x] G2.7 Update `tests/adapter-smoke-antigravity.test.js` — assert `.agents/` paths, hooks.json, no `.antigravity/` (paths updated in G0; full assertions covered by G2.8 + existing smoke)
- [x] G2.8 Write `tests/adapter-subagents-antigravity.test.js` — skills + agents overlay assertions; also flipped `skills: true` on Antigravity capability

## Group 3 — Hook Execution Smoke Harness

- [x] G3.1 Write `tests/adapter-hook-execution-codex.test.js` — fake Write event, assert brainstorm-gate blocks
- [x] G3.2 Write `tests/adapter-hook-execution-antigravity.test.js` — fake PostToolUse, assert history reminder fires
- [x] G3.3 Extend Claude-Code execution test to same rigor (new `tests/adapter-hook-execution-claude-code.test.js`; closes symmetry gap)
- [x] G3.4 `npm test` — 309/309 (was 300 post-G2; +9 new); zero regressions vs 288-test v0.18.0 baseline

## Group 4 — Live Dogfood + Evidence Capture

> Both `codex` and `agy` CLIs were unavailable in the Phase 16 dev environment.
> Per the plan's external-dependency clause, this group ships **partial** —
> installation-level evidence captured under `evidence/`; live-runtime evidence
> deferred as `VAL-001` (Codex) and `VAL-002` (Antigravity) in the backlog.

- [/] G4.1 Codex dogfood: install evidence captured at `evidence/codex-install.txt` (file tree + hooks.json + agents/ TOML headers). Live `/brainstorm-phase → /complete-phase` flow deferred → VAL-001.
- [/] G4.2 Antigravity dogfood: install evidence captured at `evidence/antigravity-install.txt` (file tree + hooks.json + SKILL.md). Live `agy` flow deferred → VAL-002.
- [ ] G4.3 Codex 3-target parallel dispatch smoke — deferred → VAL-001 (gates Group 5.1 capability flip).
- [x] G4.4 Discoveries logged as `[DISCOVERY]`; VAL-001 + VAL-002 filed in backlog under new "Validation" section.

## Group 5 — Capability Flips, Matrix Close-Out, Verification

- [/] G5.1 Codex `parallelSubagents` flip **deferred** — gated on VAL-001 live evidence. Capability stays `false`; matrix cell `shipped-degraded²` documents the gate.
- [/] G5.2 Codex `skills` flip **deferred** — gated on VAL-001 live evidence. Capability stays `false`; matrix cell `shipped-degraded⁴` documents the gate. (Antigravity `skills` already flipped to `true` in G2 on overlay ship.)
- [x] G5.3 Capability + parity matrix tests: both pass (`tests/adapter-capabilities-declared.test.js` + `tests/adapter-parity-matrix.test.js`)
- [x] G5.4 Full regression: `npm test` → **309/309** (was 288 v0.18.0 baseline; +21 new across the phase; zero pre-existing regressions)
- [x] G5.5 `retrospective.md` authored with Verification Evidence section pointing at `evidence/test-suite.txt` + `evidence/codex-install.txt` + `evidence/antigravity-install.txt`
- [x] G5.6 Doc sync: `specs/status.md`, `specs/phases/README.md`, `specs/phases/index.json`, `specs/changelog/2026-06.md`, `core/adapter-capabilities.md`, `core/adapter-parity-matrix.md`, `specs/planning/roadmap.md` all reflect Phase 16 Adapter Parity + roadmap renumber
- [ ] G5.7 Prompt user for `/complete-phase` + merge/release approval (this is the hard stop per autonomous-execution contract)
