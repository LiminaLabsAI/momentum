---
type: ADR
---

# ADR-0017: Layered Ecosystem Enforcement

## Status

Accepted (Phase 31b — Ecosystem Enforcement)

## Context

ADR-0016 moved momentum's ecosystem enforcement onto the **git axis** and gave
cross-repo work a lifecycle: an entry point (`/brainstorm-initiative`), a
git-native write path, and a completion gate. It deliberately shipped one gap,
recorded as D8:

> In Phase 31a the routing is convention; 31b makes it mechanical. […] Nothing
> mechanically detects that a session has touched a second member repo.

That gap is the largest remaining cause of the behavior observed across the five
multi-repo sessions reviewed on 2026-07-26. All five did cross-repo work. None
opened an initiative. One had the pointer telling it to do so in context and did
cross-repo work anyway. Prose loses to a long session — which is precisely why
single-repo momentum uses mechanism rather than advice.

Two further findings from those sessions remain open after 31a:

**Nothing orients across the fleet (ENH-067).** Rule 1 is per-repo and fires at
session start. Nothing performs the equivalent when a session reaches into a
sibling mid-flight. `momentum ecosystem status` reports git state, presence, and
the active initiative — not each member's active phase, open P0/P1 items, or
lanes. The concrete cost: a session rewrote a cost formatter in a member repo
**whose own backlog already tracked BUG-001 against that exact formatter**.

**Nothing orders cross-repo landings (ENH-068).** Rule 6's Landing Order is
enforced in-repo by `momentum lanes land`. Nothing does it across members. One
session opened five PRs across three repos with a genuine ordering dependency —
a backend wire-contract change had to land before the frontend rendered it — and
tracked that order in prose. Two production defects followed.

### The tension this ADR resolves

Detection has a requirement the write path did not: **it must fire before the
mistake.** A git hook fires after the commit. So the axis decision that was
correct for the write path (ADR-0016 D1 — git-native, because agent tool-hooks
are bypassed by lane worktrees, forge-API merges, and container-directory
launches) cannot by itself deliver prevention.

The three available resolutions:

1. **Git-native only** — correct and unbypassable, but it can only report after
   the work exists. Good audit trail, not prevention.
2. **Agent-hook only** — genuinely preventive, but bypassed by exactly the three
   behaviors cross-repo work exhibits constantly. It would re-create, one tier
   up, the gap 31a was built to escape.
3. **Both, with the roles split by what each is actually good at.**

## Decision

### E1 — Enforcement is layered across two axes

Neither axis is asked to do the other's job.

| Concern | Axis | Property |
|---|---|---|
| **Write path** — recording what happened | git (`post-commit`/`post-merge`/`pre-push`) | **Unconditional** — fires for any agent, any human, any script, any cwd |
| **Teeth** — refusing bad landings | git + CLI (`lanes land`) | **Enforced** — it refuses |
| **Nudge** — prompting before the mistake | agent hook (`PreToolUse`) | **Best-effort** — bypassable exactly where ADR-0016 documented |

ADR-0016 D1 already sanctioned this when it demoted agent hooks rather than
deleting them: *"they remain useful — they can prompt before a mistake, where a
git hook only fires after the commit — but they are no longer the mechanism
anything depends on."* This ADR takes that sentence at its word. The nudge is
allowed to be bypassable **because nothing depends on it**; the landing gate,
which does have teeth, sits on the axis that cannot be walked around.

### E2 — Detection is a query, not a new tracker

The obvious implementation of "has this session touched a second member" is a
per-session tracking mechanism. It is unnecessary. ADR-0016's write path already
records `{actor, ts, member}` for every commit, so the question is a **query**:

> This actor has events in ≥2 members within the window, and no **in-progress**
> initiative's `repos[]` / `contributions[]` covers them.

A parallel tracker would be a second source of truth to keep honest — the exact
failure mode this arc exists to close. Two consequences follow:

- The coverage query is **pure file reads** over the fragment stream and
  `initiatives/`, with **no git calls**. That is what makes it cheap enough to
  run from a `PreToolUse` hook on every edit.
- A **closed** initiative covers nothing. Coverage is a live-state question.

### E3/E4/E5 — Landing order

**E3 — `lanes land` becomes ecosystem-aware; momentum gains no cross-repo
orchestrator.** Each member still lands with its own command, which now
additionally consults the ecosystem edges. A true orchestrator would have to
drive merges in repos it does not own — crossing the ownership boundary ADR-0016
deliberately respected — and would add a fourth cross-repo concept against
ADR-0016 D4.

**E4 — Order derives from registered edges, not a declared sequence.** Edge
`{from: frontend, to: backend}` means frontend depends on backend, so backend
lands first. Deriving from the graph means the landing order cannot drift from
the dependency it represents, and 31a already made edge registration automatic
via `initiative start --edge`.

**E5 — "Landed" is a recorded `land` event, not an inferred state.** One new
event kind on the existing stream. Inferring from branch or merge state means
guessing about repos this machine may not have checked out — the same reason the
31a completion gate blocks on absent members rather than skipping them.

### E6 — Cross-repo doc sync travels via the handoff inbox

`/sync-docs` keeps its ownership rule verbatim: it never edits a `../` path.
What changes is **delivery**. Today a partitioned cross-repo entry is flagged in
chat — a message that dies with the session, which is why one reviewed session's
glossary propagation never happened *despite the rule working exactly as
designed*. Those entries now become structured handoffs in the target member's
`.momentum/inbox/`, the channel Phase 11 built for precisely this, surfaced at
the receiving session's SessionStart.

### E7 — The rules text is corrected in the same release as the mechanism

31a labelled its routing "convention, not enforcement" (D8). Shipping detection
without correcting that makes the rules wrong in the **opposite** direction, and
a rule that understates is only marginally better than one that overstates —
both teach agents to distrust the text.

The corrected statement is specific rather than blanket, and matches the table in
E1: the **nudge** is best-effort, the **landing gate** is enforced, the **write
path** is unconditional. Phase 31b additionally ships a test asserting the rules
text carries that distinction, so it cannot silently drift back.

BUG-009 — Rule 6 claiming "(Automatic)" over prose no mechanism backed, shipped
verbatim to every downstream install — is the precedent being mechanized against.

## Consequences

**Positive**

- Cross-repo drift is caught *before* the edit by the nudge and *unconditionally*
  by the commit banner, so neither a bypassed hook nor a non-agent commit is a
  hole.
- The nudge carries the target member's open P0/P1 items, making it actionable
  rather than merely correct — the difference between "this is cross-repo work"
  and "frontend has BUG-001 open on the formatter you're about to touch".
- Landing order is derived, so it cannot disagree with the dependency graph.
- No new substrate, no new cross-repo concept, no ownership-boundary crossing.

**Negative / accepted**

- **The nudge is bypassable.** By construction. It is not load-bearing, and the
  rules say so.
- **A `PreToolUse` hook runs on every edit.** Mitigated by a fast non-ecosystem
  exit and a git-call-free query, but non-zero on a hot path. Phase 31b measures
  it rather than estimating (the 31a precedent).
- **`--force-order` may become habitual.** Mitigated by recording a `land` event
  flagged `forced`, so overuse is visible in the event stream — the
  `MOMENTUM_SKIP_HOOKS` precedent rather than the invisible `--no-verify` one.
- **Edge quality now matters.** A wrong edge produces a wrong block. Hence the
  `landing_order: warn|off` escape for projects whose graphs are not yet trusted.

## References

- ADR-0016 — Ecosystem Lifecycle Spine (D1 axis, D4 no-new-concept, D8 the gap this closes)
- ADR-0009 — Trust layer invariant, mechanisms configurable
- ADR-0012 / 0015 — Fragments and the ecosystem team plane the query reads
- BUG-009 — Rule 6 overstating enforcement (the precedent E7 mechanizes against)
- BUG-007 / BUG-028 — Hook matchers that cannot deliver the tool the script branches on
- ENH-067, ENH-068 — The findings this ADR answers
