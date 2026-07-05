---
type: Plan
---

# Phase 21a — Lanes Walk — Implementation Plan

```
# Execution: G0 → G1 → (G2 ∥ G3 — run as two LIVE LANES) → G4 → G5
```

The G2 ∥ G3 parallelism is not an optimization — it IS deliverable D6: both
groups execute as separate lanes (own branch, own worktree, own agent
session) under the conventions G0/G1 establish. The phase dogfoods itself.

---

## Group 0 — ADR + self-repo conventions

**Sequential. Blocks everything.**
External dependencies: none.

- [ ] Author `specs/decisions/0001-concurrent-workstreams.md`:
  multi-active-phase model, branch↔phase binding, sequential-merge
  discipline, off-lane brainstorms/spikes, the three trial thresholds,
  relationship to the TD-008 closure (coordination layer only, no streams
  CLI).
- [ ] Self-repo `CLAUDE.md`: add **Rule 15 — Concurrent Workstreams** (lane
  binding, lane-scoped tracking, sequential landings, off-lane work);
  surgical edits to Rules 2/4/5/8 replacing "the active phase" with "the
  phase bound to your branch"; extend Rule 6 with the merge-order discipline
  (one lane lands at a time; suite green between landings;
  remaining lanes rebase; stacked lanes land parent-first).
- [ ] Self `specs/status.md`: convert Active Phase to multi-row table
  (Phase | Branch | Status | Progress); row 1 = this phase.
- [ ] Add impact-map topics: `concurrent-workstreams`, `lanes`,
  `merge-discipline`.

**Commit:** `docs(rules): ADR-0001 + Rule 15 concurrent workstreams (self-repo adoption)`

## Group 1 — Branch→phase resolution + tests

**Sequential.** Depends: G0 (rule text defines the binding contract).
External dependencies: none (node:test, zero-dep).

- [ ] `core/scripts/check-history-reminder.sh`: resolve the phase directory
  from the current branch name (`phase-*` branch → matching
  `specs/phases/<branch>/`); fallback = status.md Active Phase rows; unknown
  branch → ad-hoc sink wording (ENH-044 behavior preserved); detached HEAD →
  fallback path.
- [ ] Update orientation preambles in `core/commands/log.md`, `validate.md`,
  `sync-docs.md`, `start-phase.md`, `complete-phase.md`: "your phase is the
  one bound to your branch; status.md is the fallback and the cross-lane
  overview."
- [ ] Mirror script change into self-repo `scripts/check-history-reminder.sh`.
- [ ] New `tests/phase-resolution.test.js`: branch matches phase dir / branch
  with no phase dir / detached HEAD / non-phase branch (adhoc) / multi-row
  status.md fallback parse.

**Commit:** `feat(core): resolve active phase from current branch`

## Group 2 — Templates + fingerprint  **(LANE A)**

**Parallel with Group 3 — executed as a live lane: own branch
(`phase-21a-lanes-walk-g2` or worktree-local), own session.**
External dependencies: none.

- [ ] `core/specs-templates/specs/status.md`: multi-row Active Phase table.
- [ ] CLAUDE.md template (`core/`): Rule 15 + Rule 2/4/5/6/8 edits (same text
  as G0's self-repo version — self-repo IS the reference).
- [ ] `core/agent-rules/project.md`: condensed Rule 15 + lane-scoped
  language.
- [ ] Verify upgrade path: rules live above the `## Project Extensions`
  marker → `momentum upgrade` replaces them cleanly on existing installs.
- [ ] Re-baseline the Claude Code install fingerprint snapshot with
  explanatory meta (intentional drifts only).

**Commit:** `feat(templates): multi-lane spec conventions`

## Group 3 — Docs  **(LANE B)**

**Parallel with Group 2 — executed as a live lane: own branch, own session.**
External dependencies: Node ≥ 22.12 for the site build (nvm; repo default
node 20.15 will not build Astro).

- [ ] Site page "Working on multiple things at once": lanes concept; the
  plan graph; substrate by detection (plain `git worktree` default —
  zero-install; treehouse pools for warm caches; GitButler virtual branches
  as alternative); sequential-merge discipline; off-lane brainstorms/spikes;
  what's coming in Run/Fly.
- [ ] README: short "Parallel workstreams" section linking the site page.

**Commit:** `docs(site): working on multiple things at once`

## Group 4 — Trial evaluation

**Sequential.** Depends: G2 + G3 both landed.
External dependencies: none.

- [ ] Land Lane A and Lane B via the new Rule 6 discipline: one at a time,
  full suite between landings, second lane rebases before landing.
- [ ] Write `evidence/trial-report.md`: score the three thresholds
  (corruption / misorientation / merge overhead), attach session evidence
  (board-of-record: status.md rows over time, branch logs, any conflicts and
  their resolution cost).
- [ ] Any threshold breach → log `[DISCOVERY]`, STOP, decide with operator
  whether templates still ship in v0.23.0 (default: no).

**Commit:** `docs(phase): concurrency trial evidence + threshold evaluation`

## Group 5 — Verification + release

**Sequential.** Depends: G4 passed.
External dependencies: `gh` CLI authenticated; npm publish rights
(**both actions operator-approved before running**).

- [ ] Full suite green; per-adapter install smoke (claude-code / codex /
  antigravity).
- [ ] Retrospective; `/sync-docs`; version bump 0.22.3 → 0.23.0.
- [ ] Release per the project checklist: tag + push tag; `gh release create
  v0.23.0 --latest --verify-tag`; `npm publish --access public`; verify both
  surfaces live.

**Commit:** `chore(release): v0.23.0`
