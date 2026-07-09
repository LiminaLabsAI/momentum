---
type: History
status: planned
---

# Phase 30a — Team-Walk — History

### [DECISION] 2026-07-10 — Coordination plane is git-native, no server (D1)
Topics: architecture, git-native, no-daemon, eventual-consistency, relay
Affects-phases: phase-30a-team-walk, phase-30b-team-run, phase-30c-team-fly
Affects-specs: specs/phases/phase-30a-team-walk/overview.md#key-decisions
Detail: Operator chose "git-native core, optional relay later" over a purist
git-only-forever stance and over a hosted coordination service. Coordination
state publishes to the shared git remote (per-actor fragments + `refs/momentum/*`
CAS), synced by ordinary fetch/push; a real-time relay is deferred to Fly (30c)
and nothing depends on it. Mirrors momentum's existing "plain git default,
optional substrate by detection" stance (ADR-0001 lineage). Accepts eventual
consistency as the price of no-server.

---

### [DECISION] 2026-07-10 — Ship the full Team-mode family, next
Topics: roadmap, scope, family, walk-run-fly
Affects-phases: phase-30a-team-walk, phase-30b-team-run, phase-30c-team-fly
Affects-specs: specs/planning/platform-team-mode.md, specs/planning/roadmap.md, specs/status.md
Detail: Operator committed the whole three-phase arc (Walk → Run → Fly) up
front, running BEFORE Intelligence and Platform. Walk = multiplayer-correctness
(identity + transport + claims); Run = live board/presence + shared merge queue +
reviewer≠author; Fly = optional relay + ecosystem/multi-repo team mode. Family
numbered 30a/30b/30c per the 21a/b/c precedent; Intelligence renumbers 30→31,
Platform 31→32. Run/Fly committed scope recorded in platform-team-mode.md.

---

### [ARCH_CHANGE] 2026-07-10 — Identity + fragment transport + ref-CAS (the two-front conversion)
Topics: identity, transport, fragments, ref-cas, single-operator-assumptions
Affects-phases: phase-30a-team-walk
Affects-specs: specs/phases/phase-30a-team-walk/plan.md, specs/decisions/impact-map.md
Detail: Substrate map (agent-verified, file:line) confirmed momentum rests on two
single-operator assumptions — one filesystem (lane/board/signal state at
`<git-common-dir>/momentum/lanes`, never pushed — `core/lanes/lib/state.js:33`)
and no identity (zero `user.email`/`author` hits in `core/`; actors are random
UUIDs `bin/swarm.js:98` + branch names `core/lanes/lib/signals.js:122`). Walk
converts both: `core/identity/` durable actor from `git config`; bulk state →
per-actor append-only committed fragments + compile (the towncrier/reno pattern
`research-parallel-agent-landscape.md:55-58` flagged as researched-but-unbuilt);
atomic allocation → `refs/momentum/*` compare-and-swap. Transport split rationale:
fragments merge too late to *prevent* an allocation collision; CAS is pre-merge
and atomic (git's per-ref update is the compare-and-swap; the remote arbitrates).

---

### [SCOPE_CHANGE] 2026-07-10 — Fold ENH-057 (release race) + ENH-056 (self-merge) into Walk
Topics: enh-057, enh-056, claims, release-serialization
Affects-phases: phase-30a-team-walk
Affects-specs: specs/backlog/backlog.md
Detail: The release-at-runway race that permanently burned npm 0.28.0 (ENH-057)
is the *same* allocation-under-concurrency problem as the phase-number collision —
`momentum claim version` (ref-CAS) closes both. ENH-056 (self-merge guard) is the
same "exactly one winner" family and is folded into the claim/land path. Both
move from unscheduled to phase-30a.

---

### [DECISION] 2026-07-10 — ADR-0012 authored in Group 0
Topics: adr-0012, contracts
Affects-phases: phase-30a-team-walk
Affects-specs: specs/decisions/0012-git-native-multiplayer-coordination.md
Detail: The git-native multiplayer contract (identity source, fragment format,
ref-CAS, eventual-consistency boundary, relationship to the deferred Fly relay)
is authored as ADR-0012 in G0 before any consumer is built — extends ADR-0001's
lane model from N agent-sessions to N humans. Number pending final assignment at
`/start-phase` (highest existing ADR is 0011, Phase 29).

---

### [NOTE] 2026-07-10 — Brainstormed under concurrency; the collision was live
Topics: dogfood, concurrency, reflexivity
Affects-phases: phase-30a-team-walk
Affects-specs: none
Detail: This phase was brainstormed on `main` while a parallel lane held Phase 29
(Instruction Variation) — two sessions both reaching for "the next phase" is the
exact problem 30a solves, observed live. The family is identified by *name* with
numbers late-bound — the thesis applied to itself. Rule 15 honored: only this
lane's artifacts written; shared files (roadmap/status/changelog/backlog) touched
own-row/append-only; the Phase 29 lane's rows left untouched.

---
