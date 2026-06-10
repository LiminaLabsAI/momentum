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

- [ ] G3.1 Write `tests/adapter-hook-execution-codex.test.js` — fake Write event, assert brainstorm-gate blocks
- [ ] G3.2 Write `tests/adapter-hook-execution-antigravity.test.js` — fake Write event, assert history reminder fires
- [ ] G3.3 Extend Claude-Code execution test to same rigor (close symmetry gap)
- [ ] G3.4 `npm test` — confirm zero regressions vs 288-test v0.18.0 baseline

## Group 4 — Live Dogfood + Evidence Capture

- [ ] G4.1 Codex dogfood: init + `/brainstorm-phase` + `/start-phase` + `/sync-docs` + `/complete-phase` on `/tmp/momentum-codex-smoke`; capture to `evidence/codex-dogfood.txt`
- [ ] G4.2 Antigravity dogfood: same flow on `/tmp/momentum-antigravity-smoke` via `agy`; capture to `evidence/agy-dogfood.txt`
- [ ] G4.3 Codex 3-target parallel dispatch smoke; capture to `evidence/codex-parallel-dispatch.txt`
- [ ] G4.4 Log any discoveries as `[DISCOVERY]` history entries; decide fix-in-phase vs file-to-backlog

## Group 5 — Capability Flips, Matrix Close-Out, Verification

- [ ] G5.1 If G4.3 succeeds: flip Codex `parallelSubagents: true`; drop roadmap entry
- [ ] G5.2 If G4 confirms Codex skills work: flip `skills: true`; drop roadmap entry
- [ ] G5.3 Re-run capability + parity matrix tests; both pass post-flip
- [ ] G5.4 Full regression: `npm test` green
- [ ] G5.5 Author `retrospective.md` with G4 evidence in "Verification Evidence" section (Rule 12)
- [ ] G5.6 `/sync-docs` — propagate history entries to specs/status.md, roadmap.md, capability matrix, parity matrix
- [ ] G5.7 Prompt user for `/complete-phase`
