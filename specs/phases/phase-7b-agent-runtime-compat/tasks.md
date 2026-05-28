# Phase 7b — Agent Runtime Compatibility: Tasks

## Group 0 — Adapter Audit + Contract

- [x] Create phase tracking baseline
- [x] Create `adapter-audit.md` with capability matrix and file classification
- [x] Update README Adapter Authors section for Adapter Contract v3
- [x] Add FEAT-015/016/017 tracking to backlog
- [ ] Group 0 verification
- [ ] Group 0 commit: `docs(phase-7b): adapter runtime compatibility contract`

## Group 1 — CLI Adapter Plumbing

- [x] Dynamic available-agent discovery
- [x] Adapter metadata fields for primary instruction, config files, capabilities
- [x] Generic root instruction install/upgrade
- [x] Preserve Claude behavior
- [x] Group 1 verification
- [ ] Group 1 commit: `feat(cli): adapter contract v3 metadata and dynamic agents`

## Group 2 — Codex Adapter

- [x] Add `adapters/codex/adapter.js`
- [x] Add Codex `AGENTS.md`
- [x] Add `.codex/hooks.json`
- [x] Add Codex command recipes
- [x] Verify Codex init/upgrade manually or by tests
- [ ] Group 2 commit: `feat(adapter/codex): install AGENTS.md hooks and command recipes`

## Group 3 — Tests + Packaging

- [x] Codex install/upgrade tests
- [x] Claude regression assertions
- [x] Tarball-shape test
- [x] `prepublishOnly` script
- [x] `npm test`
- [ ] Group 3 commit: `test(adapter): codex install upgrade and tarball shape`

## Group 4 — Tracking + Release Prep

- [x] Version → `0.9.0`
- [x] Update status, roadmap, backlog, changelog
- [x] Update phase tasks/history final state
- [x] Final `npm test`
- [x] Group 4 commit: `chore(release): prepare v0.9.0 agent runtime compatibility`
- [x] STOP — user approved merge/tag/publish; v0.9.0 released
