---
type: Tasks
status: in-progress
epic: autonomous-execution
---
# phase-32c-adapter-parity — Tasks

> **All groups complete.** Baseline 1383 → **1406/1406**.
> Mirrors `plan.md`. `[x]` done · `[/]` in-progress · `[ ]` todo.
> Verify before claiming done (Rule 12).
> **TDD strict:** no task may be marked `[x]` without a recorded red→green.
## Group 0 — Backend selection + conformance suite *(blocks)* ✅
- [x] `core/run/lib/backend.js` — resolve backend from the `governorBackend` capability; `null` is documented degradation, an unknown name **fails loud** rather than passing as "some backend"
- [x] `tests/run-backend-conformance.test.js` — the assertions BOTH backends must satisfy, **written before either was finished** (red in 13 places on first run)
- [x] It immediately caught that **32a's interceptor never implemented the contract 32a wrote** — no `supports()`/`onTurnEnd()`. A contract only one implementation satisfies is a description
- [x] Verify: `npm test`

## Group 1 — The re-invoker ✅
- [x] `core/run/lib/reinvoke.js` — observe turn end → `governor.decide` → relaunch on `continue`
- [x] **`drive()` — the external driver loop.** One-shot respawn would have shipped broken: opencode skips its event handler in run-mode, so the spawned session has nothing observing ITS turn end and the run stops after one unit in silence
- [x] **Idempotent by cursor** — a doubled platform event starts the next unit once
- [x] **Fail open** — every error path allows the stop
- [x] An agent that does not move the cursor is **struck**, not re-run forever
- [x] Headless invocation **declared per adapter, not guessed**; no entry point ⇒ prints the resume command
- [x] Verify: `node --test tests/run-backend-conformance.test.js` → **23/23**

## Group 2 — Adapter wiring ✅
- [x] `governorBackend: 'reinvoker'` on Codex and opencode — **all four adapters now autonomous**
- [x] **Capability-gated script install** — `run-governor.sh` no longer ships to adapters that cannot invoke it (deferred here from 32a); gated on **install AND upgrade**, the second caught by the idempotence test
- [x] Re-baseline fingerprints; degradation documented
- [ ] ~~Codex `notify` / opencode `session.idle` auto-wiring~~ → **not installable.** Codex's `notify` lives in user-owned `~/.codex/config.toml`; opencode's handler cannot be registered in run-mode. The **driver loop** is the answer to both, and it needs no vendor-side trigger after the first invocation
- [x] Verify: `npm test`

## Group 3 — Verification ✅
- [x] Conformance suite green for **both** backends, no carve-outs — **23/23**
- [x] **Orphan guard run BEFORE the retrospective — and found to be BROKEN.** Its regex missed single-line `module.exports`, so `backend.js`/`lock.js`/`grant.js`/`amend.js` were invisible for two phases. Repaired; 12 orphans found and resolved
- [x] Invariance (fresh repo untouched) + swarm **236/236**
- [x] Capability gate verified in both directions and across upgrade
- [x] `retrospective.md` + `## Verification Evidence` (Rule 12 Gate A)
- [x] Verify: `npm test` → **1406/1406** (baseline 1383, **23 net-new**)
- [ ] ~~net-new ≥ 40~~ → **MISSED: 23.** Recorded as missed rather than reworded — most of G3 was repair, which produces little new test surface while being the phase's most valuable work
