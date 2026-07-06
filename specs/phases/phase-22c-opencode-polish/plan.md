# Phase 22c Plan — Opencode Polish & Multi-Adapter Support

# Sequential: Group 0 → Group 1 → Group 2 → Group 3

## Group 0 — ADR + Schema Migration (Foundation)
**Sequential.** Blocks everything.
**External deps**: None.
**Commit**: `docs: ADR-0007 multi-adapter installed state schema`

### Tasks
- [ ] Create `specs/decisions/0007-multi-adapter-installed-state.md`
- [ ] Modify `bin/momentum.js`: `loadInstalledState()` — detect legacy format, migrate to `agents` map, save new format
- [ ] Modify `bin/momentum.js`: `saveInstalledState()` — write `agents` map + top-level `version`
- [ ] Create `tests/installed-state-migration.test.js` — legacy→new migration, idempotent load, backward compat
- [ ] Run migration tests: `node --test tests/installed-state-migration.test.js`

## Group 1 — Per-Agent Upgrade Logic (Core Fix)
**Sequential after Group 0.**
**External deps**: Group 0 complete.
**Commit**: `fix: per-agent upgrade logic for multi-adapter coexistence (BUG-020)`

### Tasks
- [ ] Modify `bin/momentum.js`: `upgrade()` — compute newFileSet per adapter.destinations, diff against `agents[agent].files`, scoped orphan cleanup, update only that agent's entry
- [ ] Modify `bin/momentum.js`: `init()` — add agent to `agents` map (don't flip single lock)
- [ ] Modify `bin/momentum.js`: `doctor()` / status commands — show all installed agents
- [ ] Create `tests/upgrade-multi-adapter.test.js` — scenarios: init A → upgrade B (A preserved), upgrade A again (idempotent), init B → upgrade A (B preserved), legacy migration + upgrade
- [ ] Run upgrade tests: `node --test tests/upgrade-multi-adapter.test.js`
- [ ] Run full suite: `npm test` (must pass)

## Group 2 — Additive Enhancements (Parallel, Safe)
**Parallel with each other, after Group 1 verification.**
**External deps**: Group 1 complete (opencode adapter already installed).
**Commit**: `feat(opencode): add project skills + ecosystem session log + run-mode docs`

### Tasks
- [ ] **A1a**: Create `adapters/opencode/skills/momentum-track/SKILL.md`
- [ ] **A1b**: Create `adapters/opencode/skills/momentum-lanes/SKILL.md`
- [ ] **A1c**: Create `adapters/opencode/skills/momentum-validate/SKILL.md`
- [ ] **A2**: Modify `adapters/opencode/plugins/momentum.js` — in `tool.execute.after` for bash, after `check-history-reminder.sh`, call `session-append.sh` with commit/PR event payload
- [ ] **A3**: Modify `adapters/opencode/instructions/AGENTS.md` — update capabilities table footnote + plugin section with run-mode caveat
- [ ] **A1 test**: Create `tests/opencode-skills.test.js` — skill discovery + frontmatter validation
- [ ] Run skills tests: `node --test tests/opencode-skills.test.js`
- [ ] Run plugin tests: `node --test tests/adapter-opencode-plugin.test.js`

## Group 3 — Integration Verification (Validation)
**Sequential after Group 2.**
**External deps**: All groups complete.
**Commit**: `test: multi-adapter integration verification`

### Tasks
- [ ] Manual integration test script: `scripts/verify-multi-adapter.sh`
  - init claude-code → verify .claude/ exists
  - upgrade opencode → verify .opencode/ added, .claude/ preserved, installed.json has both agents
  - upgrade claude-code again → verify .claude/ refreshed, .opencode/ preserved
  - cat installed.json → verify agents map structure
- [ ] Run manual verification
- [ ] Run full test suite: `npm test` (769+ tests green)
- [ ] Verify opencode skills: `opencode skill list` in test project (if opencode CLI available)
- [ ] Update `specs/status.md` — phase progress
- [ ] Update `specs/phases/README.md` — phase status

## Group 4 — Live Swarm Validation (Manual, Deferred)
**Operator-driven when opencode CLI + ecosystem available.**
**Commit**: (separate, when done) `docs: live opencode swarm validation evidence`

### Tasks
- [ ] When opencode CLI available: `momentum swarm start test --initiative test --repos repo1,repo2 --phase phase-x --spawn`
- [ ] Verify supervisors spawn via `opencode run --dir <repo> --agent swarm-supervisor`
- [ ] Run `/swarm status`, `/swarm verify`, `/swarm complete`
- [ ] Record evidence in `specs/adhoc/val-opencode-swarm-live/record.md`

---

## Reference Specs
- `specs/architecture/adapter-contract.md` — Adapter destinations, capabilities
- `core/adapter-capabilities.md` — Capability matrix (opencode column)
- `adapters/opencode/adapter.js` — Destinations, capabilities, spawn()
- `adapters/opencode/plugins/momentum.js` — Plugin hooks
- `adapters/opencode/instructions/AGENTS.md` — User-facing docs
- `bin/momentum.js` — init/upgrade/loadInstalledState/saveInstalledState