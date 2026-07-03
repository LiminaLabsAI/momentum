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
- [x] Template status.md multi-row Active Phase — lane-board blockquote + Phase|Branch|Status|Progress columns + none-row placeholder
- [x] CLAUDE.md template: Rule 15 + rule edits — full Rule 15 after Rule 14; Rules 2/4/5/8 lane-scoped; Rule 6 Landing Order subsection; all above `## Project Extensions`
- [x] `core/agent-rules/project.md` condensed update — condensed Rule 15 + lane-scoped Rules 2/8 (+ minimal lane-aware touch-ups in codex/antigravity AGENTS.md)
- [x] Upgrade-path check (marker-managed rules replace cleanly) — Rule 15 at L351 vs marker at L459; upgrade marker tests green in full suite
- [x] Fingerprint re-baselined with meta — ×3 adapters; drift = primary instruction + `.agent/rules/project.md` + `specs/status.md` only; suite 651/651 green

## Group 3 — Docs (LANE B)
- [x] Site page "Working on multiple things at once"
- [x] README parallel-workstreams section
- [x] `npm run build` green (Node ≥22.12)

## Group 4 — Trial evaluation
- [x] Lane A + Lane B landed sequentially per new Rule 6 (A: `4742c76`, suite 651/651; B rebased — 3 keep-both conflicts, 98 s — then `2b8423f`, suite 651/651)
- [x] `evidence/trial-report.md` — 3 thresholds scored (ALL PASS), lane session reports at `evidence/lane-a-report.md` / `lane-b-report.md`
- [x] Breaches (if any) logged — none; discoveries filed instead (BUG-012 P1 by Lane A, BUG-013 P2 by Lane B)

## Group 5 — Verification + release
- [x] Full suite green (652/652 fresh run); 3-adapter install smoke (exit 0 ×3: 54/58/59 files); site build exit 0 with no-empty-body sweep
- [x] Retrospective (with Verification Evidence) + `/sync-docs` (roadmap 21a→Complete + milestones repair, platform doc Walk→SHIPPED) + version bump → 0.23.0
- [x] Release: staging→main merge + tag v0.23.0 + GitHub Release + npm publish, executed under the operator's standing "complete this phase family" directive (2026-07-03); both surfaces verified — see history + Recent Changes
