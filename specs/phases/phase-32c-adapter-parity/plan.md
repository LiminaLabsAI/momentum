---
type: Plan
status: in-progress
epic: autonomous-execution
---

# phase-32c-adapter-parity — Plan

```
# Execution:  G0 → G1 → G2 → G3
```

> **Derived, not brainstormed.**
> The group breakdown is the one thing the epic CANNOT know — it depends on
> code that exists now and did not when the epic was written. Everything
> above the groups is derived; the groups themselves are authored here.

Depends on: phase-32a-governor. Those must be complete before this starts.

Run policy: release: per-feature · push: per-phase · tdd: strict

---

## Group 0 — Backend selection + conformance suite *(sequential, blocks all)*

The suite comes FIRST, before either backend is finished. It is the definition
of parity, and a conformance suite written after the implementations would be
shaped by them — which is how "parity" quietly becomes "whatever both happen to
do".

1. `core/run/lib/backend.js` — resolve `interceptor | reinvoker | null` from the
   adapter's `governorBackend` capability; a `null` backend is an explicit,
   documented degradation, never a silent no-op.
2. `tests/run-backend-conformance.test.js` — the assertions BOTH backends must
   satisfy, parameterized over the backend under test. No carve-outs.

**Commit:** `test(run): governor backend conformance suite + selection`

---

## Group 1 — The re-invoker *(sequential)*

1. `core/run/lib/reinvoke.js` — on an observed turn end, consult `governor.decide`
   and, on `continue`, launch a fresh agent invocation pointed at the manifest.
2. **Idempotent by cursor** — the same guard the interceptor uses. A doubled
   platform event must start the next unit once.
3. **Fail open** — every error path allows the stop (`CONTRACT.md`).
4. Headless invocation contract: the command is resolved per adapter and is
   *declared*, not guessed; an adapter with no headless entry point degrades to
   printing the resume command rather than pretending to continue.

**Commit:** `feat(run): re-invoker backend`

---

## Group 2 — Adapter wiring *(sequential)*

1. Codex — `notify` on `agent-turn-complete` in the shipped `config.toml`.
2. opencode — a `session.idle` plugin.
3. Flip `governorBackend` to `'reinvoker'` on both.
4. **Capability-gated script installation** (deferred from 32a): stop shipping
   `run-governor.sh` to adapters that cannot use it. 32a noted the installed tree
   was advertising a capability the adapter did not have.
5. Re-baseline 4 fingerprints; document degradation in `core/adapter-capabilities.md`.

**Commit:** `feat(run): Codex + opencode re-invoker wiring`

---

## Group 3 — Verification *(sequential)*

1. Conformance suite green for **both** backends.
2. Orphan guard **before** the retrospective (the 32a/32b lesson).
3. Invariance + swarm 236/236.
4. Retrospective + `## Verification Evidence`.

**Commit:** `test(run): adapter parity verification`
