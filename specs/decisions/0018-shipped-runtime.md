---
type: ADR
---

# ADR-0018: Shipped Runtime & Unified Discovery

## Status

Accepted (Phase 31c — Shipped Runtime)

## Context

### Three defects, one shape

The 31a/31b arc produced three bugs with an identical signature: **the test
exercised a path production does not take.**

| Bug | The gap |
|---|---|
| **BUG-028** | the test piped `tool_name:'Bash'` directly into the hook script, bypassing the matcher that could never deliver it |
| **BUG-029** | `orient.js` re-implemented lane-registry reading with nothing pinning it to the authority |
| **BUG-030** | tests injected `ecosystemRoot`; production must *discover* it, and `findRoot` cannot |

Phase 31b shipped a matcher-reachability test **specifically to close BUG-028's
class**. The class then reproduced twice within hours. That is the central fact
this ADR responds to: a parity fence *detects* drift after someone writes a
duplicate, and a retrospective note prevents nothing at all.

### The duplication's premise was never measured

Three hook-side helpers — `core/git-hooks/eco-event.js` (31a),
`core/ecosystem/lib/orient.js` (31b G1), `core/ecosystem/lib/cross-repo.js`
(31b G2) — are hand-written, dependency-free mirrors of core logic. The stated
justification, repeated in each file's header, is that an installed project
receives no copy of `core/`, so anything a hook needs must travel with the hook.

That constraint is real. The conclusion drawn from it was not checked:

| | |
|---|---|
| Require closure for hooks to use core directly | **9 files, 65 kB** |
| Hand-maintained duplicates today | 3 files, 27 kB |
| Package unpacked size | 1.4 MB |

65 kB is **4.6%** of what momentum already ships, and every file in the closure
is already free of external dependencies (momentum is a zero-dependency
package), so each copies verbatim. The duplication was never justified by cost —
only by nobody having priced the alternative. TD-012 filed it as a pattern to
manage; the correct response is to delete it.

### Discovery: seven implementations, three algorithms

TD-013 was filed as "five implementations, two algorithms". The audit found
seven across three — and the broken one is the exported API:

| Algorithm | Where | Correct? |
|---|---|---|
| **Up-only walk** | `core/ecosystem/lib/index.js` → `findRoot` — *the exported API* | ✗ misses sibling roots |
| **Sibling scan** | `events.js`, `git-hooks/eco-event.js`, `session-append.sh`, `sessionstart-handoff.sh`, `cross-repo-gate.sh` | ✓ |
| **Registration lookup** | `state.findRegistration` — CLI fallback in `bin/ecosystem.js`, `bin/swarm.js` | ✓ |

`core/ecosystem/layout.md` documents the ecosystem root as a **sibling** of its
members, which is what `ecosystem init` + `ecosystem add ../repo` produce. So
every ad-hoc copy encodes the documented layout and the sanctioned API
contradicts it.

`momentum ecosystem …` and `momentum swarm …` escape the bug because they fall
back to registration lookup. **`core/ecosystem/lib/landing.js` has no
fallback** — so in the standard layout `findRoot` returns `null`,
`landingCheck()` returns `applicable: false`, and `momentum lanes land` silently
skips the entire cross-repo gate.

That is **BUG-030**: v0.41.0 shipped **ENH-068, its headline deliverable,
non-functional.** Reproduced live:

```
findRoot(frontend)      = null
landingCheck (no root)  = applicable: false
landingCheck (explicit) = applicable: true      ← what every 31b test did
```

## Decision

### R1 — Vendor the closure verbatim; hooks require real core modules

`init` and `upgrade` copy the 9-file closure into the target repo. The three
hand-written helpers stop re-implementing core and require it instead.

A test asserts every vendored file is **byte-identical** to its core original.
This is categorically different from a parity fence: there is no second
implementation that could diverge, only a copy that must match. Drift becomes
impossible rather than merely detectable.

### R2 — One literal relative path, not a resolver

The runtime lives at `.momentum/runtime/`, required as the literal
`../.momentum/runtime/…`.

This works because `scripts/` and `.githooks/` both sit exactly **one level
below repo root**, so the same relative path resolves from either. Chosen
deliberately over a resolver function: `cross-repo.js` currently carries a
five-entry candidate list to locate `orient.js` because the install layout
differs from the repo layout, and that species of ad-hoc lookup is exactly what
accumulated into the mess being undone here.

The cost is a genuine constraint — a future adapter installing hooks at a
different depth would break the path — so a test asserts all four adapters
install at depth 1. **A constraint plus an assertion, over flexibility plus a
lookup.**

### R3 — One `findRoot`

`core/ecosystem/lib/index.js` exports a single resolver:

1. up-walk for `ecosystem.json` (bounded by `MOMENTUM_MAX_PARENT_WALK`)
2. sibling scan at each level
3. registration-lookup fallback

All seven call sites use it. `events.js`'s `resolveEcosystemRootFrom` (added in
31b as a local workaround) is retired, and the CLIs' local fallbacks become
redundant. BUG-030 is fixed **as a consequence** of the unification rather than
as a separate patch — the bug and the debt have one cause, and fixing them
separately would mean shipping a workaround we then rewrite.

### R4 — The runtime is committed, not gitignored

Vendoring 65 kB into a user repo means upgrade diffs. Gitignoring it and
regenerating on `upgrade` avoids that, at the price of a worse failure: a fresh
clone would have hooks that silently no-op until someone happened to run
`upgrade`.

That is the same silent-failure mode this entire arc keeps producing — a dead
matcher, a garbage lane count, a skipped gate. `.githooks/` is already committed
for exactly this reason, and `!.momentum/team/` is the existing precedent for
negating a `.momentum/` ignore rule.

### R5 — Shell delegates to node for discovery

`session-append.sh` and `sessionstart-handoff.sh` call a node entry point in the
runtime rather than reimplementing the walk in bash. One algorithm, one language.

Not a new runtime cost: `session-append.sh` already spawns `python3` for member
resolution and `sessionstart-handoff.sh` already spawns `node` for the fleet
line. Each retains its fail-open path — a hook must never break a commit or a
session start.

### R6 — An enumerative production-call-path guard

For every exported function accepting an optional injectable root, a test
asserts it works **without** one, in a real sibling layout.

BUG-030 existed because every test took the injection shortcut. The guard is
enumerative rather than a hand-maintained list, so a new entry point is covered
the moment it is added — the same reasoning that made BUG-028's fix a
matcher-reachability check across all adapters rather than a single assertion.

### R7 — Delete the parity fences this makes redundant

The `cross-repo.js` ↔ `detect.js` and orient ↔ `lanes/lib/state` fences guarded
duplicates that will no longer exist. Retaining them would imply the duplicates
do. Fences are removed with the code they guarded.

### R8 — BUG-030 is fixed inside this phase

No separate v0.41.2. The fix *is* R3. Accepted cost, stated plainly: the
cross-repo landing gate stays non-functional on npm until v0.42.0. Mitigating
facts — ENH-068 has never worked, so nothing regresses; and the failure is
fail-open (`lanes land` skips the check rather than blocking a landing wrongly).

## Consequences

**Positive**

- One implementation of discovery; one implementation of every piece of core
  logic a hook needs. The class of bug that produced BUG-029 and BUG-030 cannot
  recur because the conditions for it are gone.
- BUG-030 fixed, so ENH-068 works for the first time.
- Fresh clones have working hooks with no `upgrade` step.
- New hook helpers can require core freely, so the next feature does not pay the
  duplication tax that produced three defects.

**Negative / accepted**

- **65 kB vendored** into every installed project, visible in upgrade diffs (R4).
- **The depth-1 constraint** on adapter install layouts (R2), asserted rather
  than enforced by design.
- **A node spawn** in the shell discovery path where bash previously sufficed —
  measured in G3, not assumed.
- **The landing gate stays broken on npm** until v0.42.0 (R8).
- The closure could grow silently; mitigated by a manifest that a test
  recomputes, so adding a dependency fails the build until declared.

## References

- TD-012 — shipped-runtime duplication (this ADR's R1 closes it)
- TD-013 — divergent root resolvers (R3 closes it; the count was seven, not five)
- BUG-029 — the duplication's first user-visible cost
- BUG-030 — the landing gate that never fired (R3 fixes it)
- BUG-028 / BUG-007 — the same test-bypasses-production shape, one tier down
- ADR-0016 / ADR-0017 — the constraints under which the duplication was written
- `core/ecosystem/layout.md` — documents the sibling layout `findRoot` contradicted
