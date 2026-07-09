---
type: Tasks
status: complete
---

# Phase 30b — Team-Run — Tasks

> **RELEASED v0.37.0 (2026-07-10).** Core mechanisms built + tested; integration
> wiring deferred to **ENH-064** (additive, non-blocking). `[x]` done · `[~]`
> partial · `[ ]` deferred→ENH-064.

## Group 0 — Contracts & shared libs ✅
- [x] Author **ADR-0013**
- [x] `core/team/lib/presence.js` — `heartbeat` + `liveness`
- [x] `core/team/lib/approvals.js` — attributed ledger + `satisfied`
- [ ] Config keys (`presence_idle_seconds`/`review_min_approvals`…) in `config.md` — libs use param defaults → **ENH-064**

## Group 1 — Presence + board ✅ (mostly)
- [~] Heartbeat lib + `momentum team heartbeat` (auto-refresh-on-every-command not wired → **ENH-064**)
- [x] `momentum team presence` renderer (liveness overlay)
- [ ] Legacy `lanes board` reflects synced state → **ENH-064**
- [x] Tests (liveness thresholds via injected clock)

## Group 2 — Shared merge queue ✅ (turn) / ⏸ (land integration)
- [x] `core/team/lib/queue.js` — one shared landing turn via `refs/momentum/queue/*` CAS; `momentum team turn`
- [ ] Wire team-wide freshness + turn into `lanes land` → **ENH-064**
- [ ] Queue-pressure aggregation across actors → **ENH-064**
- [x] Tests (two-clone single-holder turn)

## Group 3 — Reviewer≠author ✅ (ledger) / ⏸ (gate wiring)
- [x] `momentum team approve` + `check` (attributed ledger; self≠peer; threshold; allowSelf)
- [ ] Wire the gate into `lanes land` + `pre-push` → **ENH-064**
- [ ] Migrate `.momentum/merge-approved` → attributed multi-actor ledger → **ENH-064**
- [x] Tests (self-vs-peer, threshold-2, CLI exit codes)

## Group 4 — backlog.md → fragments ⏸ DEFERRED → ENH-064
- [ ] Per-actor backlog fragments + `compile('backlog')`
- [x] New IDs via `momentum claim id` (primitive exists)
- [ ] Concurrent-filing tests → **ENH-064**

## Group 5 — Verification ✅
- [x] `tests/team-run.test.js` — 7 incl. two-clone e2e (shared turn + review gate)
- [x] Full suite green (1002/1002)
- [ ] Adapter fingerprint re-baseline → **ENH-064**
- [x] Committed (`8261b6d`)
