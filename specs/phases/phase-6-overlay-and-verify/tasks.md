# Phase 6 — Adapter Overlay & Verification: Tasks

> Status legend: `[ ]` not started · `[/]` in progress · `[x]` complete

## Group 0 — Adapter Contract v2

- [x] 0a — `bin/momentum.js install` walks adapter overlay dirs (`agent-rules/`, `commands/`, `scripts/`)
- [x] 0b — Conflict detection: duplicate filenames in `core/<dir>/` and `adapters/<agent>/<dir>/` exit non-zero before any writes
- [x] 0c — `bin/momentum.js upgrade` applies the overlay walk; per-file marker logic unchanged
- [x] 0d — Adapter convention documented in `adapters/claude-code/adapter.js` + `adapter.sh` headers
- [x] 0e — Root `README.md` adapter-author section updated

## Group 1 — Verification Rigor in core/

- [ ] 1a — Rule 12 "Verify before claim" (full) in `core/specs-templates/CLAUDE.md`
- [ ] 1b — Rule 12 (condensed) in `core/agent-rules/project.md`
- [ ] 1c — `core/commands/complete-phase.md` evidence-capture step + refuse-to-advance gate
- [ ] 1d — ENH-014: Rule 9 cross-repo safeguard in `core/agent-rules/project.md`
- [ ] 1e — `core/commands/sync-docs.md` flags `Affects-specs: ../` cross-repo entries
- [ ] 1f — Rule 9 cross-repo safeguard in `core/specs-templates/CLAUDE.md`

## Group 2 — Claude Code Overlay: /review-code

- [ ] 2a — `adapters/claude-code/commands/review-code.md` — role-based subagents (security, QA, architecture)
- [ ] 2b — Command header documents Claude-Code-specificity

## Group 3 — Tests for momentum CLI

- [ ] 3a — `tests/` dir at repo root; `node --test` runner wired
- [ ] 3b — `tests/install.test.js`
- [ ] 3c — `tests/upgrade.test.js`
- [ ] 3d — `tests/marker.test.js`
- [ ] 3e — `tests/overlay.test.js`
- [ ] 3f — `npm test` script in `package.json`

## Group 4 — Wiring + Dogfood

- [ ] 4a — Run `momentum upgrade` on this repo; verify Rule 12, `/review-code`, extensions preserved
- [ ] 4b — Fresh `momentum init --agent claude-code` smoke test
- [ ] 4c — Conflict-detection smoke test
- [ ] 4d — Fix bugs uncovered by 4a–4c

## Group 5 — Release Prep

- [ ] 5a — Bump `package.json` to `0.7.0`
- [ ] 5b — Update `specs/changelog/2026-05.md`
- [ ] 5c — Update `specs/status.md`
- [ ] 5d — Update `specs/planning/roadmap.md`
- [ ] 5e — Run `/sync-docs`
- [ ] 5f — Run `/complete-phase` (dogfood the new evidence rigor)
- [ ] 5g — `npm publish --access public` (with user approval)
