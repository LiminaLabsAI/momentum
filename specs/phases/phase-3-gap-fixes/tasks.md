# Phase 3 — Gap Fixes: Tasks

> Execution order: Group 0 → (Groups 1 + 2 in parallel) → Group 3

---

## Group 0 — Spec Templates Tree

- [x] Create `core/specs-templates/CLAUDE.md` — generic rules template with `<Project Name>` placeholder
- [x] Create `core/specs-templates/README.md` — generic project README
- [x] Create `core/specs-templates/specs/README.md`
- [x] Create `core/specs-templates/specs/status.md` — Phase 0 not started, empty tables
- [x] Create `core/specs-templates/specs/backlog/backlog.md` — empty four-table backlog
- [x] Create `core/specs-templates/specs/backlog/details/.gitkeep`
- [x] Create `core/specs-templates/specs/changelog/.gitkeep`
- [x] Create `core/specs-templates/specs/decisions/README.md`
- [x] Create `core/specs-templates/specs/decisions/0000-template.md` — blank ADR template
- [x] Create `core/specs-templates/specs/decisions/impact-map.json` — `{"topics": {}}`
- [x] Create `core/specs-templates/specs/phases/README.md`
- [x] Create `core/specs-templates/specs/phases/index.json` — `{"phases": {}}`
- [x] Create `core/specs-templates/specs/planning/roadmap.md` — placeholder
- [x] Create `core/specs-templates/specs/vision/project-charter.md`
- [x] Create `core/specs-templates/specs/vision/principles.md`
- [x] Create `core/specs-templates/specs/vision/success-criteria.md`
- [x] Commit: `feat(core): add specs-templates tree for momentum init scaffold`

---

## Group 1 — CLI Updates (parallel with Group 2)

- [x] Make `copyDir()` recursive with `skipIfExists` option in `bin/momentum.js`
- [x] Add `--coding-agent` flag parsing to entry point
- [x] Add adapter validation (exit with error if adapter dir not found)
- [x] Add dynamic `adapter.js` loading via `require(adapterJs)`
- [x] Create `adapters/claude-code/adapter.js` with `runInstall()` function
- [x] Move Claude Code-specific install steps from `init()` into `adapter.js`
- [x] Add specs-templates copy to `init()` with skip-if-exists for user-data files
- [x] Update success message — remove misleading `/start-phase` option (ENH-004)
- [x] Update `--help` output to include `--coding-agent` flag
- [x] Create `.npmignore` to exclude `adapters/**/adapter.sh` (TD-001)
- [x] Commit: `feat(cli): add --coding-agent flag, recursive copyDir, specs-templates scaffold`

---

## Group 2 — Command Content Fixes (parallel with Group 1)

- [x] `core/commands/start-phase.md` — add explicit history.md creation note in step 3 (ENH-005)
- [x] `core/commands/brainstorm-project.md` — add `(see Group Execution Pattern below)` ref in step 7 (ENH-006)
- [x] `core/commands/brainstorm-project.md` — append full Group Execution Pattern section at bottom (ENH-006)
- [x] `core/commands/track.md` — replace vague "If complex" with explicit one-liner vs detail file criteria (ENH-007)
- [x] Commit: `docs(commands): fix start-phase, brainstorm-project, track command gaps`

---

## Group 3 — Verification

- [ ] Smoke test: `node bin/momentum.js init /tmp/test-momentum-init` — all spec files present
- [ ] Smoke test: run init twice — skip-if-exists works, no user-data files overwritten
- [ ] Smoke test: `--coding-agent claude-code` succeeds
- [ ] Smoke test: `--coding-agent cursor` fails with clear error message
- [ ] Verify: `npm pack --dry-run | grep adapter.sh` → no output
- [ ] Read-check: `start-phase.md` has history.md creation note
- [ ] Read-check: `brainstorm-project.md` has Group Execution Pattern section
- [ ] Read-check: `track.md` has decision criteria table
- [ ] Bump version to `0.4.0` in `package.json`
- [ ] Commit: `chore: verify Phase 3 gap fixes — all smoke tests passing`
