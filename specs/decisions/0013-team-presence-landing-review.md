---
type: ADR
---

# ADR-0013: Team Presence, Shared Landing & Review

## Status

Accepted (Phase 30b — Team-Run)

## Context

Walk (ADR-0012) made momentum's coordination state syncable and collision-free
across machines. But a team still can't *see* each other (the board renders
local state; presence doesn't exist), can't *land in one order* (the merge queue
is per-clone — `core/lanes/lib/land.js`), and the trust gate still only knows
self-approval (`.momentum/merge-approved` is a local sentinel the author's own
agent creates). Run adds the L3/L4 layers on Walk's primitives.

## Decision

1. **Presence = heartbeat-on-invocation** (`core/team/lib/presence.js`). Any
   `momentum` command refreshes a short-TTL presence fragment; liveness
   (active/idle/offline) is derived from `last_seen` age against config
   thresholds. No daemon — consistent with the no-daemon identity. Fly's optional
   relay later makes this real-time without changing the model.

2. **One shared merge queue** (`core/team/lib/queue.js`). The landing runway is a
   single-holder `refs/momentum/queue/<runway>-holder` ref-CAS lock — exactly one
   contributor holds the turn at a time, ACROSS machines, via Walk's
   first-push-wins primitive. This extends Rule 6 Landing Order from one operator
   to N humans; the remote arbitrates the turn.

3. **Reviewer≠author** (`core/team/lib/approvals.js`). An attributed approvals
   ledger (fragments); a change is satisfied by >= `review_min_approvals` by
   actors DIFFERENT from the author. **Client-side honest**: ADR-0009's trust
   invariant is unchanged, and true server-side enforcement stays an optional
   forge-adapter concern — the ledger records intent and gates the local land,
   it does not pretend to be unbypassable. `review_self_approval=true` restores
   single-operator behavior (N=1 compatibility).

4. **`backlog.md` joins the fragment-compiled views** — teams file items
   concurrently (the same hotspot Walk fixed for status/changelog); IDs are
   allocated via `momentum claim id`.

## Consequences

- **Positive.** The team sees each other (presence), lands in one trusted order
  (shared queue), and cannot land on self-approval alone (reviewer≠author) —
  all git-native, no daemon, no server. Single-operator behavior is preserved
  via `review_self_approval`/`allowSelf`.
- **Negative / accepted.** Presence is eventually consistent (heartbeat-on-use,
  not push) until Fly's optional relay. The review gate is client-side —
  honestly labeled, not a server-side guarantee.

## Relates

Extends ADR-0012 (Walk primitives); relates ADR-0001/0002/0003 (lanes/landing),
ADR-0009 (trust invariant). Fly (ADR-0014) adds the optional relay + ecosystem
team mode on top.
