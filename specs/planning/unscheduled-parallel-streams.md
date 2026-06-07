# Unscheduled — Parallel Stream Development (NO COMMITTED SLOT)

> Status: planned, no version target. Pickable any time. Existing implementation lives on the `phase-8-parallel-worktrees` branch (unmerged, awaiting release decision).

## The problem

Today, a single momentum-managed project can only have **one active branch at a time**. That means a developer can only drive **one feature at a time** with their AI agent — even when two features are completely independent and could run in parallel.

Concrete pain points:

1. **Can't parallelize independent features.** Feature A and Feature B touch different files and have no shared dependencies. Today they must run sequentially through one branch + one agent session each.
2. **Context-switching cost is high.** Stashing in-flight work to start a quick fix means losing the agent's working context for the original feature.
3. **No clean way to compare implementation alternatives.** "Try approach A and approach B in parallel" requires manually copying the repo or wrestling with worktrees by hand.
4. **Multiple agent sessions on the same repo collide.** Two Claude Code sessions open against the same git worktree fight over uncommitted state.

The orthogonal concern — multi-*repo* orchestration — is the Phase 9 / 10 / 11 track. This is about multi-*feature* development within a single repo.

## What this future work delivers

A **stream** = one isolated workspace (git worktree) + its own active phase / backlog / agent session. Multiple streams against the same project run in parallel without conflict.

Conceptually:

- `momentum stream create <name>` — spawn a new git worktree on a fresh branch, scaffold the agent session there, register it in `specs/planning/streams.md`.
- `momentum stream list` — see all active streams + their current phase + last activity.
- `momentum stream switch <name>` — `cd` helper into a stream's workspace.
- `momentum stream close <name>` — merge back (or discard) + remove the worktree.

Each stream has its own active phase, history.md, and tracking — they roll back into the main project's record when closed.

## Existing material

The `phase-8-parallel-worktrees` branch (unmerged) contains a first implementation:

- `bin/commands/worktree-manager.js` — 301 LOC CLI command
- `core/commands/worktree-manager.md` — slash command recipe
- `core/specs-templates/specs/planning/streams.md` — per-project stream tracking template
- `tests/worktree.test.js` — 226 LOC of integration tests
- Full phase artifacts (overview / plan / tasks / history / retrospective)

That branch was complete-on-branch but never released. When picking this work up:

- **Don't merge as-is.** The branch was authored before Phase 9 (ecosystem), Phase 10 (entry/exit commands), and the v0.13.0 README rewrite. Conflicts are likely; the worktree CLI surface also probably needs to integrate cleanly with the Phase 10 state machine (Standalone / Member / Leader detection).
- **Reuse the design intent.** The streams concept and the test suite are solid starting material.
- **Reconcile with ecosystem mode.** If a project is a member of an ecosystem, what does a stream look like? Probably: the stream is per-project (same worktree pattern), but the ecosystem layer sees one member regardless of which stream is active. Worth a brainstorm.

## When to pick it up

Plausible triggers (none of these are commitments):

- A user reports they're running two AI agent sessions against the same repo and fighting over branch state.
- A team adopting momentum has a workflow where one developer drives multiple parallel features and needs OS-level isolation.
- Phase 11 (Dynamic Orchestration & Context Handover) lands and the user wants to extend cross-repo orchestration with cross-stream-within-a-repo orchestration.
- A "compare approaches" workflow becomes a felt pain point.

## What's NOT in scope

- Multi-repo ecosystem orchestration — that's Phase 9 / 10 / 11.
- Long-lived feature branches managed inside one worktree — Git already does that.
- Cross-repo branching semantics (an initiative spans repos AND streams) — Phase 11 follow-up at most.
- Agent-aware merge conflict resolution — separate concern.

## What this stub is NOT

- A commitment to ship in any specific release.
- A statement that this work is low priority. It's the right work; it just isn't the next work.

## What this stub IS

- A reference point so the worktree implementation on the `phase-8-parallel-worktrees` branch doesn't get lost.
- A re-framing of the problem in product terms ("parallel feature development") rather than implementation terms ("git worktree management"), so when the brainstorm reopens it starts from outcomes.

## Notes from the originating conversation (2026-06-07)

User chose to displace the Phase 8 release decision indefinitely in favor of ecosystem work (Phase 9 → 10 → 11), but explicitly wanted the parallel-feature-development capability captured in the roadmap rather than forgotten:

> *"how can we work on multiple features at the same time without conflict and problems there are multiple problems right. Let's add it to the roadmap. I am in the half-baked branch."*
