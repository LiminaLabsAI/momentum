# Phase 7b — Agent Runtime Compatibility: Tasks

## Group 0 — Adapter Audit + Contract

- [x] Create phase tracking baseline
- [x] Create `adapter-audit.md` with capability matrix and file classification
- [x] Update README Adapter Authors section for Adapter Contract v3
- [x] Add FEAT-015/016/017 tracking to backlog
- [ ] Group 0 verification
- [ ] Group 0 commit: `docs(phase-7b): adapter runtime compatibility contract`

## Group 1 — CLI Adapter Plumbing

- [ ] Dynamic available-agent discovery
- [ ] Adapter metadata fields for primary instruction, config files, capabilities
- [ ] Generic root instruction install/upgrade
- [ ] Preserve Claude behavior
- [ ] Group 1 verification
- [ ] Group 1 commit: `feat(cli): adapter contract v3 metadata and dynamic agents`

## Group 2 — Codex Adapter

- [ ] Add `adapters/codex/adapter.js`
- [ ] Add Codex `AGENTS.md`
- [ ] Add `.codex/hooks.json`
- [ ] Add Codex command recipes
- [ ] Verify Codex init/upgrade manually or by tests
- [ ] Group 2 commit: `feat(adapter/codex): install AGENTS.md hooks and command recipes`

## Group 3 — Tests + Packaging

- [ ] Codex install/upgrade tests
- [ ] Claude regression assertions
- [ ] Tarball-shape test
- [ ] `prepublishOnly` script
- [ ] `npm test`
- [ ] Group 3 commit: `test(adapter): codex install upgrade and tarball shape`

## Group 4 — Tracking + Release Prep

- [ ] Version → `0.9.0`
- [ ] Update status, roadmap, backlog, changelog
- [ ] Update phase tasks/history final state
- [ ] Final `npm test`
- [ ] Group 4 commit: `chore(release): prepare v0.9.0 agent runtime compatibility`
- [ ] STOP — await user approval for merge/tag/publish
