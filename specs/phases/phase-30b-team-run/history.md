---
type: History
status: planned
---

# Phase 30b — Team-Run — History

### [DECISION] 2026-07-10 — Presence is heartbeat-on-invocation (resolves Q1)
Topics: presence, no-daemon, liveness
Affects-phases: phase-30b-team-run, phase-30c-team-fly
Affects-specs: specs/phases/phase-30b-team-run/overview.md#key-decisions
Detail: Presence resolves without a daemon — any `momentum` command refreshes a
short-TTL presence fragment; `active/idle/offline` derives from `last_seen` age
against config thresholds. Chosen over a background watcher to preserve the
no-daemon identity. Fly's optional relay later makes this real-time for opt-in
teams without changing the underlying model.

### [DECISION] 2026-07-10 — Reviewer≠author via an attributed approvals ledger (resolves Q2)
Topics: review, trust, approvals, client-side
Affects-phases: phase-30b-team-run
Affects-specs: specs/decisions/0013-team-presence-landing-review.md, specs/config.md
Detail: The trust gate distinguishes self-approval from peer review via an
attributed approvals ledger (fragments); the land/pre-push gate requires
≥`review_min_approvals` by actors ≠ the author. Deliberately **client-side
honest** — true server-side enforcement stays an optional forge-adapter concern;
ADR-0009's trust invariant is unchanged. `review_self_approval=true` preserves
single-operator behavior (N=1 compatibility).

### [ARCH_CHANGE] 2026-07-10 — Shared merge queue across contributors (L4)
Topics: merge-queue, landing-order, ref-cas, freshness
Affects-phases: phase-30b-team-run
Affects-specs: specs/phases/phase-30b-team-run/plan.md
Detail: The lane merge queue (today local per-clone — `core/lanes/lib/land.js`)
moves to a fragment/ref-backed synced form so FIFO turn + rebase-freshness become
**team-wide**, not per-clone. Turn acquisition uses `refs/momentum/queue/*` CAS
(Walk's primitive) where a single winner is required. This is the Rule-6 Landing
Order made real across machines.

### [DECISION] 2026-07-10 — backlog.md joins status/changelog as fragment-compiled
Topics: backlog, fragments, claim-ids
Affects-phases: phase-30b-team-run
Affects-specs: specs/backlog/backlog.md
Detail: Walk deferred `backlog.md` fragmenting (larger surface, more ID
structure). Run does it — teams file items concurrently, the same hotspot Walk
fixed for status/changelog. New IDs allocated via `momentum claim id` (Walk CAS)
so two people never file the same BUG/FEAT/TD/ENH number.

### [DECISION] 2026-07-10 — ADR-0013 authored in Group 0
Topics: adr-0013, contracts
Affects-phases: phase-30b-team-run
Affects-specs: specs/decisions/0013-team-presence-landing-review.md
Detail: Presence + shared-queue + review model authored as ADR-0013 in G0 before
consumers. Extends ADR-0012 (Walk); relates ADR-0009 (trust invariant) and
ADR-0001/0003 (lanes/landing). Number pending final assignment at `/start-phase`.

---
