# Phase 22c Tasks — Opencode Polish & Multi-Adapter Support

## Group 0 — ADR + Schema Migration

- [x] Create ADR-0007: `specs/decisions/0007-multi-adapter-installed-state.md`
- [x] Modify `loadInstalledState()` in `bin/momentum.js` — legacy detection + migration to agents map
- [x] Modify `saveInstalledState()` in `bin/momentum.js` — write agents map + top-level version
- [x] Create `tests/installed-state-migration.test.js`
  - [x] Test: legacy format loads and migrates
  - [x] Test: new format loads without migration
  - [x] Test: migration is idempotent (run twice = same result)
  - [x] Test: backward compat — top-level version = max agent version
- [x] Run migration tests: `node --test tests/installed-state-migration.test.js`

## Group 1 — Per-Agent Upgrade Logic

- [x] Modify `upgrade()` in `bin/momentum.js` — per-agent diff + scoped orphan cleanup
  - [x] Load installedState (agents map)
  - [x] Get adapter for requested agent → compute newFileSet from destinations
  - [x] oldFileSet = agents[agent].files || []
  - [x] Remove ONLY files in removed that are in the upgraded agent's prior manifest
  - [x] Update agents[agent] = { version, files: newFileSet }
  - [x] Update top-level version = max of all agent versions
  - [x] Save installedState
- [x] Modify `init()` in `bin/momentum.js` — add agent to agents map (no lock flip)
- [x] Modify `doctor()` in `bin/state-commands.js` — use new agents map format
- [x] Create `tests/upgrade-multi-adapter.test.js`
  - [x] Test: init claude-code → upgrade opencode → .claude/ preserved
  - [x] Test: init opencode → upgrade claude-code → .opencode/ preserved
  - [x] Test: legacy installed.json + upgrade → migrates + works
  - [x] Test: orphan cleanup scoped to agent (other agent files untouched)
  - [x] Test: lock file tracks all agents with correct versions
- [x] Run upgrade tests: `node --test tests/upgrade-multi-adapter.test.js`
- [x] Run full suite: `npm test`

## Group 2 — Additive Enhancements

### A1: Opencode Skills
- [x] Create `.opencode/skills/momentum-track/SKILL.md`
- [x] Create `.opencode/skills/momentum-lanes/SKILL.md`
- [x] Create `.opencode/skills/momentum-validate/SKILL.md`

### A2: Plugin Ecosystem Session Log
- [x] Verified: ENH-058 already covers ecosystem session log — `tool.execute.after` for bash delegates to `check-history-reminder.sh` (lines 131-146 of `adapters/opencode/plugins/momentum.js`), which feeds the ecosystem session log via `session-append.sh`. No second call needed.

### A3: Run-Mode Docs
- [x] Modify `adapters/opencode/instructions/surfaces.md` (source of truth) — plugin run-mode caveat
- [x] `npm run generate-instructions` — regenerated `adapters/opencode/instructions/AGENTS.md`

### Tests
- [x] Re-snapshot opencode fingerprint fixture (3 new skills detected → green)
- [x] Run plugin tests: `npm test` (819/819 green)

## Group 3 — Integration Verification

- [x] Create `scripts/verify-multi-adapter.sh` (manual verification script)
- [x] Execute manual verification:
  - [x] `momentum init /tmp/test --agent claude-code` → .claude/ exists
  - [x] `momentum upgrade /tmp/test --agent opencode` → .opencode/ added, .claude/ preserved
  - [x] `cat /tmp/test/.momentum/installed.json` → both agents in map
  - [x] `momentum upgrade /tmp/test --agent claude-code` → .claude/ refreshed, .opencode/ preserved
- [x] Run full test suite: `npm test` (819 green)
- [x] Update `specs/status.md` — phase progress
- [x] Update `specs/phases/README.md` — phase status

## Group 4 — Live Swarm Validation

- [x] Run live swarm validation (opencode CLI available)
- [x] Record evidence in `specs/adhoc/val-opencode-swarm-live/record.md`