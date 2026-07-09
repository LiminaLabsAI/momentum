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
- [x] G3.1 Generator `EXTENSIONS_TAIL` → managed pointer block; regenerated all 4 templates (drift guard green)
- [x] G3.2 `upgrade` runs `migrateProjectExtensions` before the marker rewrite (marker-less/pre-marker files skipped — preserves BUG-008 backup path); scaffolds `project-rules.md` so the pointer always resolves
- [x] G3.3 `/start-project` authors `specs/project-rules.md` at founding (trimmed cache line to stay under Antigravity 12k)
- [x] G3.4 `/complete-phase` + `/start-phase` point release prose to `specs/project-rules.md` + config (fully config-driven)
- [x] G3.5 `/validate` invariant: founded ⟹ `project-rules.md` exists (WARNING)
- [x] G3.6 Regenerated templates + re-baselined all 4 fingerprints (CLAUDE.md/AGENTS.md pointer block)
- [x] G3.7 Verify: `npm test` **961/961**; e2e smoke — fresh install points; upgrade migrates authored prose → project-rules.md

## Group 4 — Self-repo dogfood + release
- [x] G4.1 Dogfood: `momentum upgrade .` migrated CLAUDE.md + AGENTS.md → `project-rules.md`, synced both agents; hand-consolidated the redundant migrated sections; healed AGENTS.md ecosystem pointer
- [x] G4.2 `instruction-consistency.test.js` — generated managed regions identical modulo the task-tool line; every file ends with the pointer, no boilerplate
- [x] G4.3 Flipped stale backlog statuses: BUG-024/025/026 + ENH-061 → resolved
- [x] G4.4 Retrospective with `## Verification Evidence` (Rule 12) — written
- [/] G4.5 Version bumped v0.35.0; merge/tag/release **pending operator approval** (Rule 6 hard stop)
- [x] G4.6 Verify: full `npm test` **963/963**; self-repo CLAUDE.md ≡ AGENTS.md (4 intended diff lines); both pointers present
