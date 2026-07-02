# Platform Direction — Parallel Lanes (adopted 2026-07-02)

> **Status:** direction adopted in an operator brainstorm session (SIEVE →
> FORGE, 2026-07-02). Pre-phase planning stub — the ADR gets authored when the
> first phase of this arc starts (`/brainstorm-phase`). Roadmap placement
> (Lanes vs Phase 21 Reach) is an open operator decision — see status.md Next
> Actions. Supporting evidence: `research-parallel-agent-landscape.md`.

## The reframe (adopted)

**momentum is the coordination & trust plane for parallel agent development.**
When one human runs N agent lanes, execution stops being the constraint — the
constraint becomes the two things that stay serial: **the human's attention**
(plan, decide, review, approve) and **the integration point** (`main`).
momentum's job is to maximize the throughput and safety of those two, not to
run agents. Success metric: **time from idea to *trusted merge***, not number
of parallel sessions.

Product one-liner: *momentum gives one person the coordination fabric of a
team.* Real-team semantics mapped onto one setup:

| Real team | momentum equivalent |
|---|---|
| Each developer has their own machine | **Lane** = worktree + branch (workspace isolation, delegated substrate) |
| Each developer has an assignment | Lane is **bound to a plan node** (phase or task) in the specs |
| Standup / "what's everyone doing?" | **Board** (computed, ambient — visible from any session) |
| Code review before merge | **Gates** (graded evidence, Rule-12 lineage) |
| Tech lead sequences integration | **Waves** + **Queue** (dependency order; sequential landings) |

## The model — one recursive plan graph

```
ecosystem ⊃ repos ⊃ phases ⊃ tasks
```

Parallelism is legal at **any node whose children are independent**;
multiplicities compose freely (N tasks in a phase, N phases in a repo, across
N repos). One rule at every level: *independent siblings fan out; dependencies
form waves; everything lands sequentially at its integration point.* The wave
planner is **one algorithm applied recursively** — it absorbs the Phase 23
"dependency-aware tasks" deliverable (intra-phase parallelism) and swarm's
cross-repo `ecosystem.json` wave ordering into a single engine.

## Decisions (2026-07-02)

1. **Own (build in-house):** spec-layer lane model (ENH-046), lane registry +
   ambient board + signals (FEAT-026), merge queue with graded gates
   (FEAT-027), recursive wave planner (FEAT-028), plan-time touch-path overlap
   warnings (ENH-047).
2. **Delegate by detection, never dependency:** plain `git worktree` is the
   zero-install default substrate; treehouse (worktree pools) detected →
   speed lights up; GitButler documented as an alternative substrate. Install
   remains `momentum init`, nothing else — extra tools are accelerators,
   never prerequisites (same progressive-enhancement pattern as adapter
   capability flags).
3. **Don't build:** worktree/pool management, session-orchestration UIs, a
   visual dashboard (v1). Layer commoditized (see research doc); Conway
   constraint (one maintainer) makes it rot-prone.
4. **WIP unbounded by design.** No lane cap, no architectural ceiling. The
   board must always surface **queue pressure** (done-but-unlanded lane count
   + wait time) so the human sees themselves becoming the bottleneck before
   trust erodes. Back-pressure is a signal, never a gate.
5. **Visibility = central state, ambient access.** State lives once per repo
   in plain untracked files anchored at the shared git dir
   (`git rev-parse --git-common-dir` resolves it from any worktree):
   registry, per-lane manifests, inbox/signals, queue. Any session renders
   the board (`momentum lanes` / asking the agent); any session acts on any
   lane by writing signal files (swarm's proven inbox protocol, re-anchored
   single-repo). No daemon. A dedicated "control tower" session is a usage
   pattern that falls out free, not a build.
6. **The one one-way door: the lane-state file format.** v1 keeps it
   internal; publish it as a small contract only after dogfood
   stabilization — at which point layer-3 UIs (Conductor/Vibe-Kanban-class)
   can render momentum lanes: they own pixels, momentum owns the paper.
7. **Conventions must be followed by mechanism.** Momentum's own history is
   the precedent: Rule 6 as advisory prose → 0% compliance (16 stale
   branches) until Phase 19 shipped hooks. ENH-046's conventions are step 1,
   never the end state.

## Capability arc (each step ships standalone value)

| Step | Item(s) | Delivers |
|---|---|---|
| **Walk** | ENH-046 | Multi-lane spec conventions, branch-scoped rules, sequential-merge discipline — two sessions stop fighting |
| **Run** | FEAT-026 + FEAT-027 (+ ENH-047) | Lane registry, ambient board, signals, merge queue with graded gates — the "team of one" experience exists |
| **Fly** | FEAT-028 | Recursive wave planner across tasks/phases/repos — N ideas → N planned lanes → governed parallel execution → sequenced landings |

## Adoption arc

momentum has never been launched; distribution is the known root gap. This
direction is the launch narrative: **"the coordination & trust layer for
parallel agent development — one command, no daemon, your agents, your IDE."**
Wedge: solo builders + small teams on IDE agents (Gastown/Beads positions
heavyweight, 20–30-agent infra; momentum takes the other segment).
Structural retention: every phase/ADR/history entry deepens the project's
spec record — switching away means abandoning accumulated project memory.
Ecosystem play: the published lane-state contract makes momentum the standard
paper other surfaces render.

## Parked (with written triggers)

- **momentum-native execution/orchestration engine.** Revisit ONLY if
  (a) substrate churn repeatedly breaks delegation, or (b) the coordination
  plane is proven and users explicitly ask for an engine under it. Until a
  trigger fires, engine work steals from the layer only momentum can own.

## Dead (decided, with reasons)

- Resurrecting the streams CLI (TD-008 closure stands — worktree management
  is commoditized).
- Visual dashboard v1 (crowded funded market; contract play covers it).
- Bundling/wrapping treehouse or any substrate tool (install-feasibility +
  tool-neutrality).

## Open questions

1. **Roadmap placement** — Lanes arc vs Phase 21 Reach (Cursor/Gemini
   adapters): operator decision pending.
2. Lane-state file format design (one-way door — design slowly, during Run).
3. Ecosystem-mode interaction: lanes inside a member repo vs swarm-level
   coordination — brainstorm at phase start (the closure record flagged the
   same question for streams).
4. Queue mechanics detail: rebase-the-rest automation vs advisory; stacked
   (dependent) lanes support — FEAT-027 brainstorm scope.
