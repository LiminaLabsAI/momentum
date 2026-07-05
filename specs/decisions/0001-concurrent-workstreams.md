---
type: Decision
id: "0001"
title: "Concurrent workstreams in one repo — multi-active-phase conventions"
status: accepted
date: 2026-07-03
---

# ADR-0001: Concurrent Workstreams in One Repo (Multi-Active-Phase Conventions)

## Status

`accepted` — 2026-07-03 (Phase 21a G0). First real ADR in this repo.

Provenance: recurring operator pain (2026-07-02, near-verbatim repeat of the
2026-06-07 complaint that opened Phase 8) → SIEVE analysis (ENH-046) →
landscape research (`specs/planning/research-parallel-agent-landscape.md`) →
FORGE platform direction (`specs/planning/platform-parallel-lanes.md`) →
operator roadmap decision (Lanes before Reach) → `/brainstorm-phase` →
this ADR.

## Context

momentum serializes the **spec layer** to one workstream even though the git
layer parallelizes fine:

- `specs/status.md` models exactly **one** Active Phase.
- Rules 2/4/5/8 are written in the singular ("the active phase") — two
  concurrent sessions cannot both be right about which phase that is.
- Shared tracking files (`status.md`, `backlog.md`, `changelog/`) contend
  across concurrent branches.
- No convention says how N finished branches integrate into `main`.

The TD-008 closure (Phase 19) correctly killed the Phase-8 streams CLI:
git-state **isolation** is commoditized (native `claude --worktree`,
`git worktree`, GitButler; speed via treehouse pools). But isolation was only
half the pain. The spec layer stayed serialized, and two of the closure
record's explicit re-open triggers fired on 2026-07-02. Key insight from the
ENH-046 analysis: per-phase artifacts (`specs/phases/<N>/tasks.md`,
`history.md`, `evidence/`) are **already parallel-safe by construction** —
the serialization is narrative and convention, not mechanism.

External validation (arXiv 2603.21489): shared understanding through tracked
documents is the primary success factor for asynchronous agent collaboration
— exactly the layer momentum owns.

## Decision

Adopt a **multi-active-phase model** as conventions + templates (the *walk*
step of the Parallel Lanes arc). Four parts:

### 1. Lanes and phase binding (branch ↔ phase)

A **lane** is a concurrent workstream: a branch (usually in its own
worktree) bound to one plan node — in this phase, a phase directory. The
binding is the existing naming convention made load-bearing:

- Branch `phase-N-shortname` ↔ directory `specs/phases/phase-N-shortname/`.
- A session's phase is **the phase bound to its branch** — resolved from the
  branch name first; `status.md`'s Active Phase table is the fallback and
  the cross-lane overview, not the primary source.
- Non-phase branches (`fix/*`, `chore/*`, `feat/*` quick tasks) bind to the
  ad-hoc lane (`specs/adhoc/`, ENH-044 behavior). Detached HEAD falls back
  to `status.md`.
- `status.md` Active Phase becomes a **multi-row table**
  (Phase | Branch | Status | Progress) — the board of record until FEAT-026
  ships a computed board.

### 2. Lane-scoped tracking (Rule 15)

- Each lane writes ONLY its own phase artifacts (`tasks.md`, `history.md`,
  `evidence/`) — parallel-safe by construction, no coordination needed.
- Shared tracking files (`status.md`, `backlog.md`, `changelog/`) are
  **append/one-row-touch only** from a lane: add or edit your own row/line;
  never reformat, renumber, or rewrite other lanes' entries. Conflicts then
  stay trivially mergeable.
- Cross-lane edits (another phase's files, global restructures) are
  off-limits from inside a lane.

### 3. Sequential-merge discipline (Rule 6 extension)

`main` is the runway — lanes land **one at a time**:

1. One lane merges (with its approval gate per Rule 6).
2. Full suite runs green on the updated `main` before the next landing.
3. Remaining lanes rebase onto the updated `main` before they land.
4. Stacked (dependent) lanes land parent-first; a child rebases onto its
   parent until the parent lands, then onto `main`.

This is consensus practice across the 2026 parallel-agent landscape and the
piece worktrees alone never solve.

### 4. Off-lane work

Brainstorms and spikes are declared **off-lane**: zero tracking contention
by design. `/brainstorm-idea` writes no files at all (already true — now
load-bearing); spikes (`/hotfix --spike`) write only their own
`specs/adhoc/<id>/` record. Neither touches `status.md`'s Active Phase
table.

### Trial thresholds (written BEFORE the dogfood trial)

Phase 21a runs its own G2 ∥ G3 as two live lanes under these conventions.
The template release (D4) is gated on all three, scored in
`evidence/trial-report.md`:

1. **Zero tracking-file corruption** (no lost/garbled entries in shared
   tracking files after both lanes land).
2. **Zero session-misorientation events** (no session acts on the wrong
   phase's artifacts).
3. **Tracking-merge overhead < 15 min/week** (time spent resolving
   tracking-file conflicts).

Any breach ⇒ the phase ends with learnings recorded and **no** template
release in v0.23.0 (operator may override explicitly).

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **Conventions + branch→phase resolution (chosen)** | Smallest slice two sessions can actually follow; per-phase artifacts already parallel-safe; dogfoodable immediately; templates ship only after a live trial | Advisory until 21b adds mechanism (registry/board/queue); relies on naming discipline |
| Resurrect the streams CLI (Phase 8) | First-class mechanism day one | Re-litigates TD-008 for no reason: isolation is commoditized (native worktrees, treehouse, GitButler); 546 LOC of rot-prone substrate management momentum shouldn't own |
| Towncrier-style tracking-file fragments | Eliminates shared-file contention mechanically | Heavier authoring model for every change; premature — the trial may show append discipline suffices. Named as the threshold-gated mechanism candidate if contention breaches |
| Serialize harder (keep one active phase, forbid parallel work) | Zero new rules | Ignores the recurring, twice-triggered operator pain; agents already work in parallel — pretending otherwise causes the misorientation it fears |
| Full lane registry/board/signals now | Mechanism from day one (decision 7 of the platform direction says conventions must eventually be followed by mechanism) | Untested conventions baked into mechanism; 21b exists precisely to add mechanism after the trial refines the conventions |

## Consequences

**Easier:**

- Two (or N) sessions work concurrently in one repo without fighting over
  "the active phase" — each resolves its own from its branch.
- `status.md` becomes an honest board of all in-flight work instead of a
  fiction of one.
- Integration has a written order (sequential landings, suite green
  between), so N finished lanes don't race `main`.
- 21b's lane registry/board (FEAT-026/027) binds onto conventions already
  written lane-scoped — no rework.

**Harder / risks:**

- Conventions are advisory until 21b — momentum's own history (Rule 6 at 0%
  compliance pre-hooks) says prose alone drifts. Mitigation: dogfood-first
  trial, pre-written thresholds, 21b mechanism already scheduled.
- Rules text grows (Rule 15 + edits to 2/4/5/6/8) — upgrade diffs on
  downstream installs are bigger this release. Mitigation: additive Rule 15
  keeps edits surgical; all rules live above the `## Project Extensions`
  marker so `momentum upgrade` replaces them cleanly.
- Multi-row Active Phase changes what downstream tooling may parse from
  `status.md`. Known consumer: this phase adds the parser (branch→phase
  fallback) in the same release.

**Follow-on (out of scope here):** FEAT-026 (registry/board/signals),
FEAT-027 (merge queue + graded gates), ENH-047 (overlap warnings) in 21b;
FEAT-028 (recursive wave planner) in 21c.
