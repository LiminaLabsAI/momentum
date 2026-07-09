---
type: Phase
status: planned
tags: [team, multiplayer, presence, board, merge-queue, review, landing, backlog-fragments]
---

# Phase 30b — Team-Run (Shared Board + Landing + Review)

## Goal

Give a distributed team **live-ish shared visibility** and a **trusted, shared
integration order**. Walk (30a) made coordination state syncable and
collision-free; Run makes it **observable** (who is doing what, across laptops)
and **governed** (one merge queue across all contributors, with peer review —
reviewer≠author). This is the family's layers **L3 (board/presence)** and
**L4 (shared landing + review)**.

**Depends on Phase 30a (Walk):** consumes its actor identity (`core/identity/`),
committed fragment transport + compile (`core/team/lib/fragments.js`),
`refs/momentum/*` ref-CAS (`core/team/lib/refcas.js`), and `momentum team sync`.

## Why

Walk gets two clones to a consistent, conflict-free shared state — but a team
still can't *see* each other (the board renders local state; presence doesn't
exist) or *land in one order* (the merge queue is per-clone), and the trust gate
still only knows self-approval (Walk kept the `.momentum/merge-approved`
self-approval as-is). The substrate map named all three:

- **`lanes board`** reads local `<git-common-dir>/momentum/lanes` — on N clones
  it shows only *your* lanes (`core/lanes/lib/state.js:33`).
- **`lanes land`** enforces a FIFO turn + rebase-freshness against a *local*
  registry (`core/lanes/lib/land.js:10-12`) — two people's runways don't see
  each other, so "one lane at a time" isn't a team-wide guarantee.
- **The merge gate is self-approval only** — `.momentum/merge-approved` is a
  local sentinel the author's own agent creates; there is no reviewer≠author,
  no "who approved" (`core/git-hooks/run-check.js:124-142`).

Run converts each to its team form using Walk's primitives.

## Resolved open questions (from `platform-team-mode.md`)

- **Q1 — presence without a daemon:** **heartbeat-on-invocation.** Any `momentum`
  command refreshes a short-TTL presence fragment (`{actor, branch, lane,
  last_seen, activity}`); liveness (`active`/`idle`/`offline`) is derived from
  `last_seen` age against config thresholds. No background process — consistent
  with the no-daemon identity.
- **Q2 — reviewer≠author enforcement:** an **attributed approvals ledger**
  (fragments) + a gate that requires ≥1 approval by an actor **≠** the change
  author (threshold configurable). Honest about its client-side limit: true
  server-side enforcement stays an optional forge-adapter concern.

## Key decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Presence = heartbeat-on-invocation** (short-TTL fragment refreshed on any `momentum` call) | No daemon; liveness from `last_seen`; degrades to "stale" gracefully |
| 2 | **`momentum team` board renders the compiled shared state + presence overlay** | Reuses Walk's fragment compile; cross-machine after `sync` |
| 3 | **One shared merge queue across contributors** — `lanes land` reads the *synced* queue (fragment/ref-backed) so FIFO turn + rebase-freshness are team-wide | Landing order becomes a shared runway, not per-clone |
| 4 | **Reviewer≠author gate** via an attributed approvals ledger; the land/pre-push gate requires ≥1 approval by an actor ≠ author (threshold config) | The trust gate finally distinguishes self-approval from peer review |
| 5 | **`backlog.md` → per-actor fragments** (the Walk out-of-scope candidate); IDs via `momentum claim id` | Teams file items concurrently — same hotspot Walk fixed for status/changelog |
| 6 | **ADR-0013** — team presence, shared landing, and review model | Records the client-side-honest trust posture and the shared-runway contract |

## Scope

### In
- **Presence** — heartbeat-on-invocation refreshes a presence fragment; liveness thresholds in `specs/config.md`.
- **`momentum team` board** — cross-machine board (compiled shared lanes + presence overlay); `lanes board` reflects synced state.
- **Shared merge queue** — `lanes land` reads the synced queue; team-wide FIFO turn + rebase-freshness across clones; queue pressure aggregates all actors.
- **Reviewer≠author** — approvals ledger (attributed fragments); land/pre-push gate requires peer approval (configurable threshold); `.momentum/merge-approved` self-approval → multi-actor ledger.
- **`backlog.md` → fragments** — per-actor append-only + compile; `momentum claim id` for new IDs.
- **ADR-0013**; docs (site team section, developer-guide `momentum team`).

### Out (non-goals)
- Real-time push / notifications — that is Fly's optional relay; Run's board is pull/`sync`-based.
- Ecosystem / multi-repo team mode (**Fly 30c**).
- Server-side branch protection — stays an optional forge-adapter concern (ADR-0009 trust invariant holds; the ledger is client-side and says so).
- Presence beyond lanes (e.g. per-file cursors) — out of frame; git-merge is the model.

## Deliverables & verification

Default verification (`specs/config.md`): `test_command = npm test`; `build_command = none`.

| # | Deliverable | Verification |
|---|-------------|--------------|
| D1 | Presence (heartbeat + liveness) | Unit with injected clock: heartbeat refreshes fragment; board shows `active`/`idle`/`offline` by `last_seen` threshold |
| D2 | `momentum team` cross-machine board | **Two-clone fixture**: after `sync`, each actor sees the other's active lanes + presence |
| D3 | Shared merge queue (team-wide FIFO + freshness) | Two clones both `lanes land` a queued lane → exactly one lands; the other is deflected to wait/rebase (turn enforced across clones) |
| D4 | Reviewer≠author gate | Author's own approval does **not** satisfy the gate; a second actor's approval does; threshold configurable |
| D5 | `backlog.md` fragments | Two actors file items concurrently + merge → zero conflict; compiled backlog attributed; IDs claimed via CAS (no dup) |

## Acceptance criteria

1. On the two-clone bare-remote fixture, both actors see each other's active
   lanes **and** presence after `sync`.
2. The shared merge queue enforces one **team-wide** landing order with
   rebase-freshness — two contributors cannot both land the same turn.
3. A change **cannot land on self-approval alone** — the gate requires an
   approval by an actor ≠ the author (configurable threshold), recorded and
   attributed in the ledger.
4. Concurrent backlog filing produces zero git conflict; IDs never collide
   (claimed via Walk's CAS).
5. Full suite green; the two-clone fixture is committed evidence.
