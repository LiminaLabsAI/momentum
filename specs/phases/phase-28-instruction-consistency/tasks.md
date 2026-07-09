---
type: Tasks
---

# Phase 28 — Tasks

## Group 0 — Contract + migration core + BUG-027
- [x] G0.1 ADR-0010 — instruction file = projection of specs/; Project Extensions retired as authoring surface
- [x] G0.2 `Project Rules` OKF type registered (`core/lib/okf-types.js` — `project-rules.md`)
- [x] G0.3 `core/lib/project-rules.js` — `migrateProjectExtensions()` (migrate-ALL-never-drop, idempotent, dry-run) + pointer/scaffold renders
- [x] G0.4 BUG-027 — trailing `|` added to the sync-config row in all 4 `adapters/{opencode,codex}/instructions/{surfaces,AGENTS}.md`
- [x] G0.5 Tests: `project-rules-migration.test.js` — extract/pointerize/migrate/idempotent + BUG-027 row guard
- [x] G0.6 Verify: `npm test` green — **956/956 (+5)**; codex+opencode fingerprints re-baselined (BUG-027)

## Group 1 — upgrade syncs all installed agents (cause #1)
- [x] G1.1 `upgrade` (no `--agent`) iterates `installed.json.agents` (dispatch-level loop), refreshes each; `--agent X` still targets one
- [x] G1.2 Per-agent orphan cleanup (ADR-0007) + ecosystem-root guard (BUG-016) preserved — `upgrade()` itself unchanged, called once per agent
- [x] G1.3 Test: `upgrade-all-agents.test.js` — 2-agent project, plain `upgrade` restores drifted AGENTS.md; `--agent X` leaves the other alone
- [x] G1.4 Verify: `npm test` green — **958/958 (+2)**

## Group 2 — ecosystem pointer into all instruction files (cause #2)
- [x] G2.1 `pointer.js`: `findAllInstructionFiles` + `ensurePointerInjectedAll` + `stripPointerAll` (returns only files that had one)
- [x] G2.2 `ecosystem add` injects into ALL files (the fix); `remove`/`leave` strip all; upgrade PRESERVES per-agent (BUG-022 + G1) — add-missing is add's job, keeping autostash safe
- [x] G2.3 Test: `pointer-all-files.test.js` — inject/strip both CLAUDE.md + AGENTS.md, idempotent
- [x] G2.4 Verify: `npm test` green — **961/961 (+3)**; autostash regression caught + fixed (preserve-only in upgrade is load-bearing)

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
