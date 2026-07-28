---
type: ADR
initiative: none
---

# ADR-0020: Scope-Grant Authorization

## Status

Accepted (Phase 32b — Epic Tier, Epic 0001 Autonomous Execution)

## Context

### What exists

`.momentum/merge-approved` is a **single-use sentinel**. A human creates it; the
`pre-push` hook consumes it to permit exactly one push to a protected branch.
One human decision buys one protected-branch write. ADR-0009 established that
this trust layer is invariant while the mechanisms around it (which branches are
protected, how far the agent goes, what the release command is) are project
config.

### What `release: per-feature` needs

An epic is several phases landing as one unit. Under
`release: per-feature`, all of them land at the end, parent-first, suite green
between each (Rule 6 Landing Order). That is **N protected-branch pushes from
one operator decision** — which the single-use sentinel cannot express. Today
the operator would be asked N times, which is precisely the interruption the
epic exists to remove.

### The honest problem

It would be comfortable to say a scope grant "merely re-granularizes" the trust
layer and changes nothing. That is not true, and this ADR is worth nothing if it
pretends otherwise.

**What a mistake or a compromise can do after this ADR that it could not
before:**

- **One approval now covers work the operator has not read.** With a per-merge
  sentinel, a human is present at each protected write; the diff for landing #3
  did not exist when landing #1 was approved. Under a grant, they approved a
  *plan*, not the code. If phases 2–4 drift from that plan, the grant still
  admits them.
- **The blast radius of a single stolen or mistaken "yes" grows by N.** One
  careless approval used to cost one merge. It can now cost an entire epic.
- **The window is time, not action.** A sentinel is spent the moment it is used.
  A grant persists until it expires, so a run that goes wrong at hour three is
  still holding authorization granted at hour zero.

Any mitigation has to be judged against those three, not against a reassuring
summary of them.

## Decision

**A scope grant is a scoped, expiring, revocable, audited authorization that
covers N landings for ONE named epic — offered alongside the single-use
sentinel, never replacing it.**

1. **Scope is a branch allowlist it cannot exceed.** The grant names the epic
   and the exact branches it may land. A push to any other branch falls through
   to the sentinel path as though no grant existed. This bounds the first
   hazard: the grant cannot authorize work outside the plan's own branches.

2. **Hard expiry, and it is short.** A grant carries an absolute expiry, not a
   sliding one. An expired grant is refused with a distinct reason and the
   operator re-approves. This bounds the third hazard — the authorization does
   not outlive the operator's attention by default.

3. **A landing budget.** The grant declares how many landings it may fund,
   defaulting to the number of phases in the epic. Consuming more is
   `exhausted`. This bounds the second hazard: the grant cannot fund landings
   the plan never described.

4. **Every consumption is audited and attributed** — actor, branch, timestamp,
   remaining budget — written before the push proceeds. The record is what makes
   an after-the-fact review possible at all, which is the compensating control
   for the human no longer being present at each write.

5. **Revocable at any time**, by deleting the grant file or
   `momentum run revoke-grant`. Revocation takes effect on the next verification
   — there is no cached decision.

6. **The invariant floor is untouched.** `main`, `master` and `staging` remain
   protected regardless of config (ADR-0009). A grant changes *who has already
   said yes and to what*, never *whether a yes is required*. A push with neither
   a valid grant nor a sentinel is refused exactly as it is today.

7. **Additive, never weaker.** `pre-push` tries the sentinel first and the grant
   second. A repo that never mints a grant behaves byte-identically to v0.42.0.

## Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| **Scoped expiring grant (chosen)** | Expresses the operator's actual intent — "I approved this plan" — once, at the moment they have most context; bounded on three axes; auditable | Genuinely larger blast radius per decision; the operator approves a plan, not the diffs |
| Keep the single-use sentinel; ask N times | No change to the trust layer at all | Defeats the epic. The operator asked for one gate; asking N times is the problem being solved |
| Auto-mint a sentinel per landing from a stored "yes" | Minimal code | The same power with none of the bounds — no scope, no expiry, no budget, no audit. Strictly worse while *looking* smaller |
| Grant with no expiry | Simplest to operate | Authorization outliving attention is the specific hazard most likely to bite; a run wrong at hour three still holds hour zero's yes |
| Require re-approval per protected branch, not per merge | Cheaper than per-merge | Still N prompts for an N-branch flow; arbitrary line |

## Consequences

**Easier.** One approval, given when the operator has maximum context — at plan
approval, having just read the whole design — covers the epic's landings. The
audit trail is richer than the sentinel's, because a sentinel records only that
*someone* approved *something*, while a grant records which epic, which branch,
which actor, and what remained.

**Harder / risks.**

- *The operator approves a plan, not the code.* This is the real cost and it is
  not fully mitigated. Partial compensation: `release: per-feature` requires
  `tdd: strict` (the coupled config rule from 32a), so every landing carries a
  red→green record; and `momentum run status` surfaces every autonomous decision
  without interrupting the run, so a drifting run can be caught mid-flight. Both
  are compensating controls, not equivalents.
- *A grant file is a credential.* It must be gitignored and never committed.
  Committing one would publish an authorization — a failure mode the sentinel
  does not have, since it is consumed immediately. Tested for.
- *Expiry tuning is a real operational parameter.* Too short and the epic stalls
  mid-run; too long and hazard three returns. Default chosen conservatively;
  extending is an operator decision, per-grant.

**Reversibility.** The grant path is additive: deleting `core/run/lib/grant.js`
and the `pre-push` branch returns momentum to sentinel-only behaviour with no
migration. That is the one genuinely reassuring property here — the door opens
only as far as a project chooses to walk through it, and closes cleanly.

## Related

ADR-0009 (the invariant this re-granularizes — and the reason the floor is
untouchable) · ADR-0019 (decision authority; the classifier decides what the
agent may do, this decides what it may land) · Epic 0001 D8 · Rule 6 Landing
Order (stacked lanes, suite green between)
