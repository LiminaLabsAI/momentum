---
type: Phase
status: complete
tags: [phase-21a, lanes, concurrent-workstreams, multi-active-phase, lane-binding, branch-phase-resolution, rule-15, lane-scoped-rules, merge-discipline, sequential-landing, rebase-onto-main, stacked-lanes, off-lane, brainstorms, spikes, status-multi-row, active-phase-table, adr-0001, dogfood-in-phase, trial-thresholds, worktrees, treehouse, gitbutler, templates, agent-rules, fingerprint-snapshot, check-history-reminder, site-docs, enh-046, v0-23-0]
---

# Phase 21a — Lanes Walk (Concurrent Workstreams)

> **Target release:** v0.23.0
> **Arc:** first sub-phase of the Parallel Lanes family (21a Walk → 21b Run →
> 21c Fly) — see `specs/planning/platform-parallel-lanes.md`.
> **Brainstormed:** 2026-07-02/03 (operator session; SIEVE → landscape research
> → FORGE → `/brainstorm-phase`).

## Goal

momentum's spec layer, rules, and templates support **N concurrent
workstreams in one repo** — proven by running this phase itself as concurrent
lanes — released as v0.23.0.

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| Phase shape | **Dogfood-in-phase**: G2 ∥ G3 run as two live lanes; the trial gates the template release | Conventions never exercised in anger don't ship (Rule 12 culture) |
| Mechanism boundary | Conventions + **branch→phase resolution** only; registry/board/queue stay in 21b | Smallest scope where two sessions can actually follow the conventions |
| Rules approach | New **Rule 15 (Concurrent Workstreams)** + surgical edits to Rules 2/4/5/6/8 ("the active phase" → "the phase bound to your branch") | An additive rule keeps upgrade diffs reviewable |
| Phase binding | Branch name ↔ phase directory (`phase-21a-lanes-walk` ↔ `specs/phases/phase-21a-lanes-walk/`); fallback = status.md; unknown branch = ad-hoc sink (ENH-044) | The naming convention already exists; this makes it load-bearing |
| Trial thresholds (written BEFORE the trial) | (1) zero tracking-file corruption; (2) zero session-misorientation events; (3) tracking-merge overhead < 15 min/week | SIEVE threshold-first discipline; breach ⇒ phase ends with learnings and NO template release |
| Phase family | Everything from the 2026-07-02 platform session is covered by 21a/21b/21c planned together (operator call), per the 7a/7b/7c precedent | Full coverage without a monolithic unverifiable phase |

## Scope

### In

- **ADR-0001** — concurrent workstreams model (multi-active-phase, lane
  binding, merge discipline, trial thresholds). First real ADR in
  `specs/decisions/`.
- **Rule 15 + rule edits** — self-repo `CLAUDE.md`, condensed
  `core/agent-rules/project.md`, CLAUDE.md template (all three adapters
  inherit via core).
- **Multi-row Active Phase** table — self `specs/status.md` +
  `core/specs-templates/specs/status.md` (columns: phase, branch, status,
  progress).
- **Rule 6 merge extension** — sequential landings: one lane at a time, suite
  green between landings, remaining lanes rebase onto updated main; stacked
  guidance for dependent lanes.
- **Off-lane declaration** — brainstorms (`brainstorm-idea` writes no files)
  and spikes explicitly declared zero-tracking-contention.
- **Branch→phase resolution** — `core/scripts/check-history-reminder.sh` +
  recipes (`log`, `validate`, `sync-docs`, `start-phase`, `complete-phase`)
  resolve the phase from the current branch, fallback status.md.
- **Docs** — site page "Working on multiple things at once" (lanes concept;
  substrate by detection: plain git worktrees default, treehouse pools /
  GitButler optional; merge discipline) + README section.
- **Live trial + evidence** — G2 ∥ G3 executed as two lanes in two sessions;
  `evidence/trial-report.md` scored against the three thresholds.

### Out (non-goals)

- Lane registry / board / signals — **21b** (FEAT-026)
- Merge-queue mechanism / graded gates — **21b** (FEAT-027)
- Plan-time overlap warnings — **21b** (ENH-047)
- Recursive wave planner / dependency-annotated tasks — **21c** (FEAT-028)
- Towncrier-style tracking-file fragments — only if the trial shows
  contention (threshold-gated)
- Any treehouse / GitButler integration *code* — docs mention only

## Deliverables & Verification (Rule 12)

| # | Deliverable | Verification |
|---|---|---|
| D1 | ADR-0001 | File exists; linked from phase history; impact-map topics added |
| D2 | Self-repo rules + multi-row status.md | Exercised live by the G2∥G3 trial (D6) |
| D3 | Branch→phase resolution (script + 5 recipes) | `tests/phase-resolution.test.js` green (branch match / no match / detached HEAD / ad-hoc fallback) |
| D4 | Templates + agent rules | Full suite green; Claude Code install fingerprint re-baselined with meta for intentional drifts only |
| D5 | Site page + README | `npm run build` green on Node ≥22.12; page present in rendered dist |
| D6 | Concurrency trial | `evidence/trial-report.md` — all three thresholds met, with session logs |
| D7 | v0.23.0 release | Suite + smoke green; tag; `gh release create` shows Latest; `npm view` returns 0.23.0 (**both operator-approved**) |

## Acceptance Criteria

1. Two phases simultaneously active in this repo; each of two live sessions
   resolves its own phase from its branch — evidence captured.
2. All three trial thresholds met (report in `evidence/trial-report.md`).
3. Multi-row Active Phase shipped in self status.md + template; all rule
   surfaces carry lane-scoped language + Rule 15 + the Rule 6 extension.
4. Script + 5 recipes resolve branch→phase with fallback; new tests green;
   full suite green (644 baseline + new).
5. Site builds green; v0.23.0 released (tag + GitHub Release + npm), both
   release actions explicitly operator-approved.
