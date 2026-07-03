# Phase 21b — Lanes Run (Registry, Board, Signals, Merge Queue)

> **Target release:** v0.24.0
> **Arc:** second sub-phase of the Parallel Lanes family (21a Walk ✓ → **21b
> Run** → 21c Fly) — `specs/planning/platform-parallel-lanes.md`.
> **Stacked lane:** branch `phase-21b-lanes-run` is based on
> `phase-21a-lanes-walk` (Rule 15 stacked-lane discipline — the parent's
> v0.23.0 release is parked on operator approval; this child rebases onto
> `main` once the parent lands).
> **Planned:** 2026-07-03 under the operator's standing session directive
> ("complete this phase family"); scope was operator-committed on
> 2026-07-02 (platform brainstorm: FEAT-026, FEAT-027, ENH-047 + the
> roadmap row) — this plan converts that committed scope into groups,
> refined by the 21a trial learnings.

## Goal

The 21a conventions get their **mechanism**: a lane registry with an
ambient board, cross-session signals, and a merge queue with graded
evidence gates — all plain files anchored at the shared git dir, no
daemon, zero new dependencies. `momentum lanes` answers "what's running?"
from any session; landing follows enforced order with Rule-14-graded
evidence.

## 21a trial learnings incorporated

1. **Explicit binding** — the registry stores lane→plan-node binding;
   sub-lane branches no longer depend on status.md table parsing.
2. **Substrate preflight** — `lanes open` checks the fresh-worktree traps
   the trial hit (committed exec bits/BUG-012 class; node version).
3. **Append-discipline works; shared-table contention goes away** — the
   board is computed from per-lane manifests, not a shared markdown table.

## Scope

### In

- **FEAT-026** — `core/lanes/` state layer: registry + per-lane manifests
  + inbox, anchored at `git rev-parse --git-common-dir` under
  `<common-dir>/momentum/lanes/` (untracked by construction, shared
  across all worktrees; mkdir-lock writes; human-readable JSON).
  `momentum lanes` CLI: `open`, `done`, `close`, board (default), `queue`,
  `signal`, `inbox`. Board always shows **queue pressure**
  (done-but-unlanded count + oldest wait). Substrate by detection: plain
  `git worktree` created by default; treehouse detected → hint; GitButler
  documented. No daemon; v1 lane-state format stays **internal**.
- **FEAT-027** — `momentum lanes land <id>`: landing turn (FIFO of `done`
  lanes), rebase-freshness check against the integration ref, and
  **Rule-14-graded evidence gates** (spike → none; quick-task → ad-hoc
  record present; phase → retrospective `## Verification Evidence`, the
  FEAT-019 pattern). Validate-first; `--execute` performs the local
  merge; protected-branch pushes remain gated by the Phase-19 hooks +
  operator approval.
- **ENH-047** — lanes declare intended touch paths at open
  (`--touches <glob,...>`); overlap between active lanes warns on the
  board and at open/land. Advisory, never blocking.
- **Dogfood**: ≥2 groups of this phase executed as lanes opened with the
  new CLI itself.
- Recipe `/lanes` (core/commands/lanes.md → ships to all three adapters
  via existing transforms); site page + README updates; ADR-0002.

### Out (non-goals)

- Wave computation from dependency annotations — **21c** (FEAT-028).
- Publishing the lane-state file format as a contract (post-dogfood
  decision at 21c close — the arc's one-way door).
- Any daemon, watcher, TUI, or dashboard; any treehouse/GitButler code.
- Automatic rebasing of remaining lanes (advisory signal only in v1).

## Deliverables & Verification (Rule 12)

| # | Deliverable | Verification |
|---|---|---|
| D1 | ADR-0002 (lane-state internals + graded gates) | File exists; linked from history; impact-map topics |
| D2 | `core/lanes/lib` state layer | `tests/lanes-state.test.js` green |
| D3 | `lanes open/done/close` + substrate + preflight | `tests/lanes-open-close.test.js` green |
| D4 | Board + queue + pressure | `tests/lanes-board.test.js` green |
| D5 | Signals + inbox | `tests/lanes-signals.test.js` green |
| D6 | `lanes land` graded gates + turn + freshness; overlap warnings | `tests/lanes-land.test.js` green |
| D7 | Recipe + docs + fingerprint re-baseline | Full suite green; site build green |
| D8 | Dogfood: ≥2 groups executed as CLI-opened lanes | Lane manifests + board output captured in `evidence/` |
| D9 | v0.24.0 release prep | Suite + smoke green; retrospective evidence; release runbook parked on operator approval |

## Acceptance Criteria

1. From any worktree of the repo, `momentum lanes` renders every active
   lane with branch, plan node, status, and queue pressure.
2. A lane opened with `--touches` overlapping another active lane warns
   at open and on the board; nothing blocks.
3. `lanes land` refuses out-of-turn, stale (non-rebased), or
   gate-failing landings with actionable messages; `--execute` lands a
   compliant lane with a merge commit.
4. Signals written from one session are readable (and ack-able) from the
   lane's own session; kill/pause/redirect/message/resume types round-trip.
5. All new tests green; full suite green; fingerprints re-baselined for
   intended drifts only; site build green.
6. ≥2 groups of this phase ran as lanes opened by the new CLI (evidence
   captured).
