---
type: Tasks
---

# Phase 28 — Tasks

## Group 0 — Contract + migration core + BUG-027
- [ ] G0.1 ADR-0010 — instruction file = projection of specs/; Project Extensions retired as authoring surface
- [ ] G0.2 `specs/project-rules.md` OKF doc type registered (conformance + templates)
- [ ] G0.3 `migrateProjectExtensions()` — parse region → drop config-covered → append prose to project-rules.md (idempotent) → replace with pointer; dry-run aware
- [ ] G0.4 BUG-027 — trailing `|` on the sync-config row in `adapters/{opencode,codex}/instructions/{surfaces,AGENTS}.md`
- [ ] G0.5 Tests: migration preserves/drops/points/idempotent; BUG-027 rows well-formed
- [ ] G0.6 Verify: `npm test` green

## Group 1 — upgrade syncs all installed agents (cause #1)
- [ ] G1.1 `upgrade` (no `--agent`) iterates `installed.json.agents`, refreshes each; `--agent X` still targets one
- [ ] G1.2 Preserve per-agent orphan cleanup (ADR-0007) + ecosystem-root guard (BUG-016)
- [ ] G1.3 Test: 2-agent project → one `upgrade` refreshes both; stale second agent gets current rules
- [ ] G1.4 Verify: `npm test` green

## Group 2 — ecosystem pointer into all instruction files (cause #2)
- [ ] G2.1 `pointer.js` `ensurePointerInjected` injects/refreshes into EVERY present instruction file
- [ ] G2.2 Wire multi-file injection into init/upgrade/ecosystem-add; preserve BUG-022 re-injection
- [ ] G2.3 Test: member repo with CLAUDE.md + AGENTS.md → pointer in both; idempotent
- [ ] G2.4 Verify: `npm test` green

## Group 3 — templates + recipes
- [ ] G3.1 Instruction templates: `## Project Extensions` → managed pointer block (identical across adapters)
- [ ] G3.2 install/upgrade run `migrateProjectExtensions` on existing files
- [ ] G3.3 `/start-project` authors `specs/project-rules.md` at founding
- [ ] G3.4 `/complete-phase` release fully config-driven (drop residual per-project prose)
- [ ] G3.5 `/validate` invariant: founded ⟹ `project-rules.md` exists
- [ ] G3.6 Regenerate adapter surfaces; re-baseline drifted fingerprints
- [ ] G3.7 Verify: `npm test` green; fresh multi-adapter install identical managed rules + pointers

## Group 4 — Self-repo dogfood + release
- [ ] G4.1 Dogfood: migrate momentum's CLAUDE.md + AGENTS.md Project-Extensions prose → `project-rules.md`; sync both agents
- [ ] G4.2 Assert `CLAUDE.md` ≡ `AGENTS.md` (managed + both pointers, modulo intended per-adapter subs) — self-repo guard test
- [ ] G4.3 Flip stale backlog statuses: BUG-024/025/026, ENH-061 → resolved
- [ ] G4.4 Docs; retrospective with `## Verification Evidence` (Rule 12)
- [ ] G4.5 Version bump v0.35.0; `/sync-docs` → `/complete-phase` (release at operator gate)
- [ ] G4.6 Verify: full `npm test` green; `project-rules.md` holds migrated content; consistency guard passes
