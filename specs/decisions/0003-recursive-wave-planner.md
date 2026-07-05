---
type: Decision
id: "0003"
title: "One recursive wave planner; annotations as data; lane-state stays internal"
status: accepted
date: 2026-07-03
---

# ADR-0003: One Recursive Wave Planner

## Status

`accepted` — 2026-07-03 (Phase 21c G0). Builds on ADR-0001/0002.

## Context

The plan graph is recursive (ecosystem ⊃ repos ⊃ phases ⊃ tasks) and the
platform direction demands ONE parallelism rule at every level:
independent siblings fan out, dependencies form waves, everything lands
sequentially at its integration point. Today wave computation exists
only at the top scale (swarm's `wave-ordering.js` over `ecosystem.json`
dependencies); phases and task groups declare dependencies as prose.
FEAT-028 absorbs the old Phase-23 "dependency-aware tasks" deliverable
and swarm's ordering into a single engine.

## Decision

1. **One engine**: `core/waves/lib/waves.js` — Kahn layering over nodes +
   `{from, to}` edges (`from` depends on `to`), lexicographically stable
   within a wave, cycle/self-dependency errors listing participants.
   Extracted from swarm's implementation with parametrizable error
   labels so existing behavior is reproduced to the byte.
2. **Swarm becomes a consumer**: `core/swarm/lib/wave-ordering.js` keeps
   its exact public surface (`computeWaves`, `computeFullEcosystemWaves`,
   `{index, repos}` shape, error strings) as a thin adapter over the
   engine. No swarm test or e2e scenario changes.
3. **Annotations are data in the files that already exist**:
   - task groups: `## Group N — title (deps: G0, G1)` heading suffix in
     `tasks.md` (groups whose boxes are all `[x]` count as satisfied and
     drop out of the graph);
   - phases: optional `"deps": ["phase-…"]` on `specs/phases/index.json`
     entries (deps on `complete` phases are satisfied).
   No new files, no YAML frontmatter, greppable by humans.
4. **`momentum waves` CLI** renders the computed waves at task scale
   (default: the phase bound to the current branch, per Rule 15) and
   phase scale, and suggests `momentum lanes open` commands for wave 1 —
   waves feed lanes; lanes land through the 21b queue. `--json` is
   marked unstable like the other lane surfaces.
5. **Lane-state file format stays INTERNAL** (the arc's one one-way
   door). Rationale: publication is irreversible and the operator is
   away; the dogfood window is one day old; nothing external consumes it
   yet. The decision point is handed back to the operator explicitly
   (status.md Next Actions) with the recommendation to publish only
   after multi-week dogfood stability.

## Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| **One engine, thin adapters (chosen)** | Single tested algorithm; swarm unchanged; scales down to tasks | Adapter indirection (one hop) |
| Per-scale planners | Each tuned to its file shapes | Three divergent topo-sorts to maintain — exactly what FEAT-028 exists to prevent |
| Frontmatter/JSON sidecars for deps | Richer schema | New files to keep in sync; heading suffix + index.json are already where humans look |
| Publish lane-state contract now | Early ecosystem play | One-way door on 1 day of dogfood, operator away — premature |

## Consequences

- Easier: phase- and task-level parallel planning become mechanical;
  `waves` → `lanes open` → `lanes land` is the full N-ideas pipeline;
  future scheduling features have one engine to extend.
- Harder/risks: heading-suffix parsing is convention-sensitive
  (mitigated: tolerant regex + tests); index.json gains a field readers
  must ignore gracefully (it already tolerates unknown fields).
