---
type: Task List
---

# Phase 6 — Adapter Overlay & Verification: Tasks

> Status legend: `[ ]` not started · `[/]` in progress · `[x]` complete

## Group 0 — Adapter Contract v2

- [x] 0a — `bin/momentum.js install` walks adapter overlay dirs (`agent-rules/`, `commands/`, `scripts/`)
- [x] 0b — Conflict detection: duplicate filenames in `core/<dir>/` and `adapters/<agent>/<dir>/` exit non-zero before any writes
- [x] 0c — `bin/momentum.js upgrade` applies the overlay walk; per-file marker logic unchanged
- [x] 0d — Adapter convention documented in `adapters/claude-code/adapter.js` + `adapter.sh` headers
- [x] 0e — Root `README.md` adapter-author section updated

## Group 1 — Verification Rigor in core/

- [x] 1a — Rule 12 "Verify before claim" (full) in `core/specs-templates/CLAUDE.md`
- [x] 1b — Rule 12 (condensed) in `core/agent-rules/project.md`
- [x] 1c — `core/commands/complete-phase.md` evidence-capture step + refuse-to-advance gate
- [x] 1d — ENH-014: Rule 9 cross-repo safeguard in `core/agent-rules/project.md`
- [x] 1e — `core/commands/sync-docs.md` flags `Affects-specs: ../` cross-repo entries
- [x] 1f — Rule 9 cross-repo safeguard in `core/specs-templates/CLAUDE.md`

## Group 2 — Claude Code Overlay: /review-code

- [x] 2a — `adapters/claude-code/commands/review-code.md` — role-based subagents (security, QA, architecture)
- [x] 2b — Command header documents Claude-Code-specificity

## Group 3 — Tests for momentum CLI

- [x] 3a — `tests/` dir at repo root; `node --test` runner wired
- [x] 3b — `tests/install.test.js`
- [x] 3c — `tests/upgrade.test.js`
- [x] 3d — `tests/marker.test.js`
- [x] 3e — `tests/overlay.test.js`
- [x] 3f — `npm test` script in `package.json`

## Group 4 — Wiring + Dogfood

- [x] 4a — Run `momentum upgrade` on this repo; verify Rule 12, `/review-code`, extensions preserved
- [x] 4b — Fresh `momentum init --agent claude-code` smoke test
- [x] 4c — Conflict-detection smoke test
- [x] 4d — Fix bugs uncovered by 4a–4c (none — clean run; minor manual cleanups: title restore, agent-rules de-dupe, stale brainstorm-project.md removed)

## Group 5 — Release Prep

- [x] 5a — Bump `package.json` to `0.7.0`
- [x] 5b — Update `specs/changelog/2026-05.md`
- [x] 5c — Update `specs/status.md`
- [x] 5d — Update `specs/planning/roadmap.md`
- [x] 5e — Run `/sync-docs` (impact-map.json enriched with Phase 6 topics; all other specs already in sync)
- [x] 5f — Run `/complete-phase` (verification evidence captured to retrospective.md; 24/24 tests pass; fresh-init + conflict + dogfood smokes all green)
- [ ] 5g — `npm publish --access public` *(awaiting user approval per project rule — `npm publish` is a "shared system" action)*
