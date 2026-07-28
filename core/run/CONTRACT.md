# Governor Contract

> **Status:** v1 — Phase 32a (Epic 0001 Autonomous Execution).
> **Audience:** anyone implementing a governor backend. Phase 32c implements the
> re-invoker backend against *this file*, not against 32a's code.

## The invariant

There is exactly one:

> **The next unit starts.**

Not "the agent is blocked from stopping." That phrasing is an artifact of one
platform's hook surface and does not survive contact with the others (see
[Backends](#backends)). A backend satisfies this contract if, whenever the
governor's decision function returns `continue`, the next unit of work begins —
by whatever mechanism the host platform affords.

## The decision function

`core/run/lib/governor.js` exports `decide(state) → Decision`, a **pure
function**. It performs no I/O; the caller supplies the state and acts on the
result. This is what makes the governor testable without a live agent.

```
decide({ manifest, killSwitch, now }) → { action, reason, next? }
```

`action ∈ { 'allow-stop', 'continue' }`.

Branches are evaluated **in this order**, and the order is load-bearing:

| # | Condition | Action | Why it ranks here |
|---|---|---|---|
| 1 | No manifest, or `status !== 'running'` | `allow-stop` | The common case must be free. A repo with no run behaves exactly as it did before this phase existed. |
| 1b | **`status === 'complete'`** | `allow-stop` (reason `complete`) | A finished run is a **success**, and must be distinguishable from an abandoned one. See below — this branch did not exist until BUG-036, and its absence meant the governor could not report success at all. |
| 2 | **Kill switch present** | `allow-stop` | Checked before every other branch because the agent is the thing that may be misbehaving. A kill switch that a runaway can reason past is not a kill switch. |
| 3 | Budget exhausted (turns / tokens / wall-clock) | `allow-stop` | Bounded blast radius on a loop nobody is watching. |
| 4 | Strike limit hit on the current unit | `allow-stop` | Repeated failure on one task is not progress; retrying forever burns budget to produce noise. |
| 5 | Hard gate reached | `allow-stop` | The one question the operator actually has to answer. |
| 6 | Parked work exceeds threshold | `allow-stop` | Limping to a 60%-built feature is worse than stopping cleanly and reporting. |
| 7 | Otherwise | **`continue`** | The whole feature. |

Branches 1b–6 all carry a `reason` that renders to the operator. `continue`
carries `next` — the cursor for the unit to start.

### How a run ends well (BUG-036, Phase 33)

`status: complete` existed in the schema from 32a, and `manifest.setStatus`
always accepted it — but **no command could reach it**. `run stop` writes
`stopped`; nothing wrote `complete`. A declared state with no production path.

The cost was not cosmetic. A finished run stayed `running`, so branch 7 answered
`continue` every turn with no work left, and the run terminated only by
exhausting its budget as `budget-turns`. **Every success was indistinguishable
from a runaway**, and the single question an operator actually has — did it
finish, or did it give up? — was the one the governor could not answer.

`momentum run complete [--summary S]` reaches the state. Two ranking decisions
carry the design:

- **`complete` outranks the budget rail.** A run that finishes on its last
  allotted turn is a success, not an overrun.
- **The kill switch still outranks `complete`.** A runaway must not be able to
  mark itself finished and take the last word.

The invariant is unchanged — *the next unit starts* — because when the plan is
finished there **is** no next unit. A governor that cannot recognise that is not
honouring the invariant; it is ignoring its terminating condition.

## Backends

Two, because the four supported adapters split cleanly in half:

| Backend | Adapters | Mechanism | Cost |
|---|---|---|---|
| **interceptor** | Claude Code, Antigravity | Platform fires a `Stop` event that a hook can **block**. On `continue`, block the stop and inject `next`. | Cheap — same session, context retained. |
| **re-invoker** | Codex, opencode | Platform only **observes** the turn ending — Codex `notify`/`agent-turn-complete`, opencode `session.idle`, both fire-and-forget. On `continue`, launch a fresh agent invocation pointed at the manifest. | Cold start per unit; context rebuilt from `run.json`. |

Neither is a degraded form of the other. The re-invoker is the
external-driver architecture — the loop lives in a process rather than in the
agent's good intentions — and is therefore *structurally* incapable of becoming
dead code the way `pollTurn` did (BUG-031).

### What a backend must provide

1. `supports()` → boolean. Whether this backend can run on the current host.
2. `onTurnEnd(decision)` → void. Called with `decide()`'s result. Must honour
   `continue` by starting `decision.next`, and must not obstruct `allow-stop`.
3. **Idempotence.** `onTurnEnd` may fire more than once for one logical turn
   (platforms differ, and retries happen). Starting the same unit twice must be
   a no-op — the manifest cursor is the guard, not the backend's memory.
4. **Fail-open.** Any internal error must degrade to `allow-stop`. A broken
   governor must never trap a session.

### What a backend must NOT do

- Interpret the manifest. Only `decide()` decides; a backend that adds its own
  conditions creates a second, untested decision path.
- Write to `run.json` outside `core/run/lib/manifest.js`.
- Assume it is the only backend — a host may support both.

## Context re-injection

On `continue`, the backend injects the manifest cursor **and the pre-authorized
action list**.

This is not an optimization. It is the actual defect the phase exists to fix:
the Autonomous Execution Contract in `core/commands/start-phase.md` is correct
prose that scrolls out of context by group four, after which the agent starts
asking permission for things it was already granted. Re-injection makes the
contract a thing that is *re-established every turn* rather than a thing that
must be *remembered*.

## Invariance

A repo with no `.momentum/run.json` must behave **byte-identically** to
v0.42.0. Branch 1 of `decide()` is what guarantees this, and the guarantee is
asserted directly in the phase's e2e suite — not assumed.

## Anti-requirements

Explicitly **not** in this contract, so no backend invents them:

- Progress reporting or telemetry. `momentum run status` reads the manifest.
- Scheduling or prioritization. `core/waves` owns ordering at every scale.
- Any notion of tiers. The governor advances *a cursor*; what a unit means
  (group, phase, epic, initiative) is the caller's concern. This is what lets
  one runner serve four tiers (ADR-0003's principle applied to execution).
