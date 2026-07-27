---
type: History
status: in-progress
epic: autonomous-execution
---

# phase-32c-adapter-parity — History

### [DISCOVERY] 2026-07-27 — The orphan guard had been green over code it could not see
Topics: guard, orphan-exports, bug-031, false-negative, verification-integrity
Affects-phases: phase-32a-governor, phase-32b-epic-tier, phase-32c-adapter-parity, phase-32d-cross-repo
Affects-specs: tests/run-reachability.test.js, core/run/lib/backend.js, bin/momentum.js
Detail: `exportsOf()` matched only `module.exports = {\n…\n};` — a MULTI-LINE
block. Every module ending `module.exports = { a, b };` on one line contributed
zero exports, so `backend.js`, `lock.js`, `grant.js` and `amend.js` were
invisible to the guard. It had been reporting green over them for two phases,
and that green was cited as evidence in both 32a's and 32b's retrospectives.

Worse, 32a's synthetic-orphan probe — added specifically to prove the guard goes
red — passed the entire time, because the probe file also used a multi-line
export. The probe proved the guard worked on the one shape it already handled.

Repaired, it found **12 orphans immediately**, including all of `backend.js`.
That meant the capability-gated script install THIS PHASE'S PLAN called for
existed as a function nothing called — BUG-031's shape, hiding inside the guard
built to catch BUG-031.

The correction to 32a's stated lesson: "prove the guard red" is not enough.
**Prove it red against every SHAPE it must handle.** A probe that exercises one
convenient instance measures the probe, not the guard.

Consequence for 32d: the guard must be re-run over 32a's and 32b's surface, and
those phases' "orphan guard clean" claims should be read as unearned until it is.

---

### [DISCOVERY] 2026-07-27 — One-shot respawn would have shipped a one-unit run
Topics: reinvoker, driver-loop, opencode, codex, silent-failure
Affects-phases: phase-32c-adapter-parity
Affects-specs: core/run/lib/reinvoke.js
Detail: The first re-invoker spawned a replacement agent and exited, on the
assumption that the new session's own turn-end would re-trigger the hook. It
would not have.

opencode registers its plugin event handler CONDITIONALLY — `opencode run` skips
it, because the handler's mere presence hangs run-mode on 1.17.x, a constraint an
earlier phase had already written into the adapter. So: session idles → handler
fires → spawns `opencode run` → that session has NO handler → nothing observes
its turn ending → the run stops after ONE unit, with no error anywhere. Codex has
the same shape for a different reason: `notify` is configured in the user's
`~/.codex/config.toml`, which momentum does not own and cannot install into, so
the re-trigger cannot be assumed to exist at all.

`drive()` takes "the loop lives in a process" literally — spawn, WAIT, ask the
governor again, repeat — so nothing downstream needs to re-trigger anything. That
is also what makes this backend structurally incapable of the `pollTurn` failure:
the loop is a while-loop with a process in it, not somebody's good intentions.

The constraint that saved this was already documented by a previous phase.
Reading it cost a minute; rediscovering it in production would have cost a silent
failure that produces no error to search for.

---

### [SCOPE_CHANGE] 2026-07-27 — Vendor hook auto-wiring dropped; the driver loop replaces it
Topics: codex, opencode, hook-wiring, scope, honesty
Affects-phases: phase-32c-adapter-parity
Affects-specs: specs/phases/phase-32c-adapter-parity/plan.md
Detail: The plan's G2 listed "Codex `notify` wiring (config.toml)" and "opencode
`session.idle` plugin wiring" as deliverables. Neither is installable, and
neither is needed.

Codex's `notify` lives in `~/.codex/config.toml` — user-owned global config
momentum does not write to, by the same principle that keeps it out of
`opencode.json`. opencode's `session.idle` handler cannot be registered in
run-mode without reproducing the documented hang. Shipping either would have
meant momentum writing into config it does not own, or installing a handler
known to break the mode the driver depends on.

The driver loop makes both unnecessary after the first invocation. Dropped
deliberately and recorded here rather than left as unticked boxes: `momentum run`
starts the driver directly, and the operator adding a one-line `notify` to their
own config is a convenience, not a requirement.
