---
type: Plan
status: planned
---

# Phase 30b — Team-Run — Implementation Plan

```
Execution order:
  Sequential:  Group 0 → (Group 1 ∥ Group 2) → (Group 3 ∥ Group 4) → Group 5
```

- **Group 0** blocks everything (contracts + shared libs + ADR-0013).
- **Groups 1 and 2** — presence/board vs shared queue — are independent, parallel.
- **Groups 3 and 4** — review gate vs backlog fragments — are independent, parallel.
- **Group 5** is verification (sequential, last).

**Prereq:** Phase 30a (Walk) landed on `main` (identity + fragments + ref-CAS +
`team sync`). Verification default: `npm test` (config; no build).

---

## Group 0 — Contracts & shared libs *(Sequential — blocks all)*

**External deps:** none (git only; builds on Walk's `core/team/lib`).
**Commit:** `feat(team): presence + shared-queue + review contracts (ADR-0013)`

- [ ] **ADR-0013 — Team presence, shared landing & review.** Records: heartbeat-on-invocation presence (no daemon); the shared merge queue as a synced (fragment/ref-backed) extension of the Rule-6 Landing Order; the attributed approvals ledger + reviewer≠author gate and its **client-side-honest** posture (server-side enforcement stays a forge-adapter concern; ADR-0009 invariant holds).
- [ ] **Presence lib** (`core/team/lib/presence.js`) — `heartbeat(actor, ctx)` writes/refreshes a presence fragment `{actor, branch, lane, last_seen, activity}`; `liveness(fragment, now)` → `active|idle|offline` by config thresholds. Reuses Walk's fragment format.
- [ ] **Approvals-ledger lib** (`core/team/lib/approvals.js`) — attributed approval fragments `{change, approver, ts, verdict}`; `satisfied(change, {threshold, author})` requires ≥`threshold` approvals by actors ≠ `author`.
- [ ] **Config keys** — `presence_idle_seconds`, `presence_offline_seconds`, `review_min_approvals` (default 1), `review_self_approval` (default false) in `specs/config.md` + `core/config.js`.

## Group 1 — Presence + board *(∥ Group 2)*

**External deps:** none.
**Commit:** `feat(team): presence heartbeat + cross-machine board`

- [ ] **Heartbeat-on-invocation** — a small hook at CLI entry refreshes the presence fragment on any `momentum` command (cheap, best-effort, never blocks).
- [ ] **`momentum team` board renderer** — compiles Walk's shared lane fragments + presence overlay into a cross-machine board (actors, their lanes, liveness, queue pressure). `momentum team sync && momentum team`.
- [ ] **`lanes board` reflects synced state** — after `sync`, the existing board shows lanes authored on other clones (no longer local-only).
- [ ] Tests (injected clock): heartbeat refresh; liveness thresholds; board shows a second actor post-sync.

## Group 2 — Shared merge queue *(∥ Group 1)*

**External deps:** a reachable git remote (tests use a **bare-remote fixture**).
**Commit:** `feat(team): one shared merge queue across contributors`

- [ ] **Synced queue** — the lane merge queue state moves to a fragment/ref-backed synced form so `lanes land` reads a **team-wide** FIFO turn (not per-clone). `claim`-style turn acquisition via `refs/momentum/queue/*` CAS where a single winner is required.
- [ ] **Team-wide freshness** — rebase-freshness (integration ref is an ancestor of the lane branch) evaluated against the synced runway; a stale lane is deflected to rebase.
- [ ] **Queue pressure aggregates all actors** — the board's queue-pressure footer counts every contributor's queued lanes.
- [ ] Tests (bare-remote, two clones): both `land` the same turn → one wins, other waits/rebases; freshness enforced across clones.

## Group 3 — Reviewer≠author gate *(∥ Group 4)*

**External deps:** none.
**Commit:** `feat(team): reviewer≠author approvals ledger + land/pre-push gate`

- [ ] **`momentum team approve <change>`** — records an attributed approval fragment.
- [ ] **Gate** — `lanes land` + the `pre-push` protected-branch gate consult the ledger: require ≥`review_min_approvals` by actors ≠ the change author; self-approval alone fails when `review_self_approval=false`.
- [ ] **Migrate the sentinel** — `.momentum/merge-approved` self-approval → the attributed multi-actor ledger; the pre-push hook records *who* approved (closes the "no reviewer≠author" gap).
- [ ] Tests: author self-approval rejected; second-actor approval accepted; threshold honored; `review_self_approval=true` restores solo behavior (single-operator compatibility).

## Group 4 — backlog.md → fragments *(∥ Group 3)*

**External deps:** none.
**Commit:** `feat(team): backlog fragments + claim-allocated IDs`

- [ ] **Backlog fragments** — per-actor append-only backlog item fragments + `compile('backlog')` renders `backlog.md` between managed markers.
- [ ] **IDs via CAS** — new BUG/FEAT/TD/ENH IDs allocated with `momentum claim id` (Walk) so two people never file the same ID.
- [ ] Tests: concurrent filing + merge → zero conflict; compiled backlog attributed + ordered; ID claim races resolve to distinct IDs.

## Group 5 — Verification *(Sequential — last)*

**External deps:** none (fixture builds its own bare remote).
**Commit:** `test(team): two-clone board + shared-queue + review e2e`

- [ ] **Two-clone bare-remote e2e** (`tests/team-run.e2e.test.js`): (a) presence visible cross-machine; (b) shared-queue turn enforced across clones; (c) reviewer≠author gate blocks self-approval, passes peer approval; (d) concurrent backlog filing zero-conflict.
- [ ] Full suite green (`npm test`); record counts in retrospective `## Verification Evidence` (Rule 12).
- [ ] Smoke: `momentum team`, `momentum team approve`, `lanes land` on the fixture.
- [ ] Re-baseline adapter fingerprints for intended rules/recipe drift.
