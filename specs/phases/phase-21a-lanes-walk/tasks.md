# Phase 21a — Lanes Walk — Tasks

> Mirrors `plan.md`. Mark `[/]` in-progress, `[x]` done (only with fresh
> verification evidence per Rule 12).
> Execution: G0 → G1 → (G2 ∥ G3 as live lanes) → G4 → G5

## Group 0 — ADR + self-repo conventions
- [x] ADR-0001 `specs/decisions/0001-concurrent-workstreams.md`
- [x] Self CLAUDE.md: Rule 15 + Rule 2/4/5/8 edits + Rule 6 merge extension
- [x] Self status.md: multi-row Active Phase table
- [x] impact-map topics: concurrent-workstreams, lanes, merge-discipline (landed at brainstorm; verified present)

## Group 1 — Branch→phase resolution
- [x] `core/scripts/check-history-reminder.sh` branch→phase resolution + fallbacks
- [x] Recipes updated: log / validate / sync-docs / start-phase / complete-phase
- [x] Self-repo `scripts/check-history-reminder.sh` mirrored (+ 5 stale `.claude/commands/` copies self-healed from core)
- [x] `tests/phase-resolution.test.js` (7 tests: 5 planned cases + generic-fallback + mirror-integrity) green; fingerprints re-baselined ×3 adapters; suite 651/651

## Group 2 — Templates + fingerprint (LANE A)
- [ ] Template status.md multi-row Active Phase
- [ ] CLAUDE.md template: Rule 15 + rule edits
- [ ] `core/agent-rules/project.md` condensed update
- [ ] Upgrade-path check (marker-managed rules replace cleanly)
- [ ] Fingerprint re-baselined with meta

## Group 3 — Docs (LANE B)
- [ ] Site page "Working on multiple things at once"
- [ ] README parallel-workstreams section
- [ ] `npm run build` green (Node ≥22.12)

## Group 4 — Trial evaluation
- [ ] Lane A + Lane B landed sequentially per new Rule 6 (suite green between)
- [ ] `evidence/trial-report.md` — 3 thresholds scored, session evidence attached
- [ ] Breaches (if any) logged as [DISCOVERY] + operator decision recorded

## Group 5 — Verification + release
- [ ] Full suite green; 3-adapter install smoke
- [ ] Retrospective + `/sync-docs` + version bump → 0.23.0
- [ ] Release: tag + GitHub Release + npm publish (operator-approved) + both surfaces verified
