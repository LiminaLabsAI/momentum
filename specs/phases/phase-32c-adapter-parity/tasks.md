---
type: Tasks
status: in-progress
epic: autonomous-execution
---
# phase-32c-adapter-parity — Tasks
> Mirrors `plan.md`. `[x]` done · `[/]` in-progress · `[ ]` todo.
> Verify before claiming done (Rule 12).
> **TDD strict:** no task may be marked `[x]` without a recorded red→green.
## Group 0 — Backend selection + conformance suite *(blocks)*
- [ ] `core/run/lib/backend.js` — resolve backend from the `governorBackend` capability; `null` is documented degradation, never a silent no-op
- [ ] `tests/run-backend-conformance.test.js` — the assertions BOTH backends must satisfy, **written before either is finished**
- [ ] Verify: `npm test`

## Group 1 — The re-invoker
- [ ] `core/run/lib/reinvoke.js` — observe turn end → `governor.decide` → relaunch on `continue`
- [ ] **Idempotent by cursor** — a doubled platform event starts the next unit once
- [ ] **Fail open** — every error path allows the stop
- [ ] Headless invocation command **declared per adapter, not guessed**; no entry point ⇒ print the resume command rather than pretend
- [ ] Verify: `npm test`

## Group 2 — Adapter wiring
- [ ] Codex `notify` on `agent-turn-complete`
- [ ] opencode `session.idle` plugin
- [ ] `governorBackend: 'reinvoker'` on both
- [ ] **Capability-gated script install** — stop shipping `run-governor.sh` to adapters that cannot use it (deferred from 32a)
- [ ] Re-baseline 4 fingerprints; degradation documented in `core/adapter-capabilities.md`
- [ ] Verify: `npm test`

## Group 3 — Verification
- [ ] Conformance suite green for **both** backends, no carve-outs
- [ ] **Orphan guard — run BEFORE the retrospective**
- [ ] Invariance + swarm **236/236**
- [ ] `retrospective.md` + `## Verification Evidence`
- [ ] Verify: full suite green, net-new ≥ 40
