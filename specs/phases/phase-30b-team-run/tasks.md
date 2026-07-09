---
type: Tasks
status: planned
---

# Phase 30b — Team-Run — Tasks

> Mirrors `plan.md`. `[x]` done, `[/]` in-progress. Verify before claiming done
> (Rule 12). Prereq: Phase 30a (Walk) landed. Execution: G0 → (G1 ∥ G2) →
> (G3 ∥ G4) → G5.

## Group 0 — Contracts & shared libs *(blocks all)*
- [ ] Author **ADR-0013** (heartbeat presence; shared merge queue; approvals ledger + reviewer≠author; client-side-honest trust posture)
- [ ] `core/team/lib/presence.js` — `heartbeat()` + `liveness()` on Walk's fragment format
- [ ] `core/team/lib/approvals.js` — attributed approval fragments + `satisfied({threshold, author})`
- [ ] Config keys — `presence_idle_seconds`, `presence_offline_seconds`, `review_min_approvals` (1), `review_self_approval` (false)
- [ ] Commit G0

## Group 1 — Presence + board *(∥ G2)*
- [ ] Heartbeat-on-invocation at CLI entry (best-effort, non-blocking)
- [ ] `momentum team` board renderer (compiled shared lanes + presence overlay + queue pressure)
- [ ] `lanes board` reflects synced state post-`sync`
- [ ] Tests (injected clock): refresh, liveness thresholds, second-actor visible
- [ ] Commit G1

## Group 2 — Shared merge queue *(∥ G1)*
- [ ] Move queue state to fragment/ref-backed synced form; `lanes land` reads team-wide FIFO turn
- [ ] Turn acquisition via `refs/momentum/queue/*` CAS (single winner)
- [ ] Team-wide rebase-freshness vs the synced runway; stale → deflect to rebase
- [ ] Queue pressure aggregates all actors
- [ ] Tests (bare-remote, two clones): same-turn race → one wins; freshness across clones
- [ ] Commit G2

## Group 3 — Reviewer≠author gate *(∥ G4)*
- [ ] `momentum team approve <change>` records attributed approval fragment
- [ ] `lanes land` + `pre-push` gate require ≥`review_min_approvals` by actors ≠ author
- [ ] Migrate `.momentum/merge-approved` self-approval → attributed multi-actor ledger (records who approved)
- [ ] Tests: self-approval rejected; peer approval accepted; threshold honored; `review_self_approval=true` restores solo behavior
- [ ] Commit G3

## Group 4 — backlog.md → fragments *(∥ G3)*
- [ ] Per-actor backlog item fragments + `compile('backlog')` between managed markers
- [ ] New IDs via `momentum claim id` (Walk CAS)
- [ ] Tests: concurrent filing zero-conflict; compiled backlog attributed + ordered; ID race → distinct IDs
- [ ] Commit G4

## Group 5 — Verification *(last)*
- [ ] `tests/team-run.e2e.test.js` — two-clone: presence, shared-queue turn, review gate, backlog fragments
- [ ] Full suite green (`npm test`); retrospective `## Verification Evidence`
- [ ] Smoke: `momentum team`, `momentum team approve`, `lanes land`
- [ ] Re-baseline adapter fingerprints (intended drift)
- [ ] Commit G5 + retrospective

## Phase-exit
- [ ] `/sync-docs` from history → specs
- [ ] `/complete-phase` (version reserved via `momentum claim version` — ENH-057)
