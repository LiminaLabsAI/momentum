---
type: Phase
status: in-progress
tags: [runtime, packaging, discovery, hooks, tech-debt, bug-030, td-012, td-013]
---

# Phase 31c — Shipped Runtime

## Goal

**Delete** the shipped-runtime duplication rather than manage it, collapse seven
root-discovery implementations to one, and repair the cross-repo landing gate
that has never fired outside its own tests.

Closes **TD-012**, **TD-013**, **BUG-030**. Target **v0.42.0**.

## Why

Three defects in the 31a/31b arc share one shape: **the test exercised a path
production does not take.**

| Bug | The gap |
|---|---|
| **BUG-028** | the test piped `tool_name:'Bash'` straight into the hook script, bypassing the matcher that could never deliver it |
| **BUG-029** | `orient.js` re-implemented lane-registry reading with no fence against the authority |
| **BUG-030** | tests injected `ecosystemRoot`; production has to *discover* it, and `findRoot` cannot |

In Phase 31b a test was written specifically to close BUG-028's class — and the
same class reproduced within the hour as BUG-029, then again as BUG-030. The
lesson is not "add more parity fences": a fence **detects** drift after someone
writes a duplicate. This phase removes the duplicates so there is nothing left
to fence.

### The premise behind the duplication was never checked

Three hook-side helpers (`eco-event.js`, `orient.js`, `cross-repo.js`) are
hand-written, dependency-free mirrors of core logic. The justification was that
an installed project receives no copy of `core/`, so shipping core would be too
heavy. Measured, that is false:

| | |
|---|---|
| Require closure to let hooks use core directly | **9 files, 65 kB** |
| Hand-maintained duplicates today | 3 files, 27 kB |
| Package unpacked size | 1.4 MB |

65 kB is **4.6%** of what already ships, and every file in the closure is
already free of external dependencies, so it copies verbatim. The duplication
was never justified by cost — only by nobody having priced the alternative.

### Discovery is worse than TD-013 recorded

TD-013 was filed as "five implementations, two algorithms". The real count is
**seven implementations across three algorithms** — and the broken one is the
official exported API:

| Algorithm | Where | Correct? |
|---|---|---|
| Up-only walk | `core/ecosystem/lib/index.js` → `findRoot` — **the exported API** | ✗ misses sibling roots |
| Sibling scan | `events.js`, `eco-event.js`, `session-append.sh`, `sessionstart-handoff.sh`, `cross-repo-gate.sh` | ✓ |
| Registration lookup | `state.findRegistration` — CLI fallback in `bin/ecosystem.js`, `bin/swarm.js` | ✓ |

`momentum ecosystem …` and `momentum swarm …` survive because they fall back to
registration lookup. **`core/ecosystem/lib/landing.js` has no fallback**, so in
the standard sibling layout — the one `ecosystem init` + `ecosystem add ../repo`
produces — `findRoot` returns `null`, `landingCheck` returns
`applicable: false`, and `lanes land` silently skips the whole ecosystem gate.

That is **BUG-030**: ENH-068, the headline of v0.41.0, shipped non-functional.
Verified live:

```
findRoot(frontend)      = null
landingCheck (no root)  = applicable: false
landingCheck (explicit) = applicable: true      ← what every 31b test did
```

So this phase is not tech-debt cleanup. It repairs a shipped feature.

## Key decisions

| # | Decision | Rationale |
|---|---|---|
| R1 | **Vendor the 9-file closure verbatim**; hooks require the real core modules | 65 kB against a 1.4 MB package. A byte-identity test makes drift *impossible* rather than merely visible — which is the difference between this and the parity-fence approach that failed three times. |
| R2 | Runtime lives at **`.momentum/runtime/`**, required as the literal **`../.momentum/runtime/…`** | `scripts/` and `.githooks/` both sit exactly one level below repo root, so the *same relative path* resolves from either. No resolver, no candidate list, no bootstrap — `cross-repo.js`'s 5-entry lookup is exactly the kind of thing that cannot recur. Guarded by a test asserting every adapter installs hooks at depth 1. |
| R3 | **One `findRoot`**: up-walk → sibling scan → registration fallback | Three algorithms exist and the exported one is wrong. Unifying fixes BUG-030 as a *consequence* rather than as a separate patch, which is the honest sequencing — the bug and the debt have one cause. |
| R4 | The runtime is **committed**, not gitignored | `.githooks/` is already committed, and a fresh clone must work before anyone runs `upgrade`. Gitignoring would make hooks silently no-op on clone — precisely the failure mode this arc keeps producing. |
| R5 | **Shell delegates to node** for discovery | One algorithm, one language. Not a new cost: `session-append.sh` already spawns python3 and `sessionstart-handoff.sh` already spawns node. Each keeps its fail-open path. |
| R6 | Ship a **production-call-path guard** | For every entry point accepting an optional `ecosystemRoot`, assert it works *without* one in a real sibling layout. A note in the retrospective would not have prevented BUG-030; a test will. |
| R7 | **Delete** the parity fences this makes redundant | Retaining tests that fence duplicates we removed would imply the duplicates still exist. Fences are removed with the code they guarded, not kept as decoration. |
| R8 | BUG-030 is fixed **inside 31c**, not hotfixed first | The fix *is* R3 — a separate patch would either duplicate the unification or ship a narrower workaround we then rewrite. Accepted cost: the gate stays broken on npm until v0.42.0. Operator decision 2026-07-27. |

## Scope

### In scope

**G0 — Contracts + BUG-030.** ADR-0018; one unified `findRoot`
(up-walk → sibling scan → registration fallback); migrate all seven call sites;
file BUG-030.

**G1 — Vendored runtime.** `init`/`upgrade` install the 9-file closure to
`.momentum/runtime/`; byte-identity test; `.gitignore` negation so it commits;
depth-1 assertion across adapters.

**G2 — Rewire the JS helpers.** `eco-event.js`, `orient.js`, `cross-repo.js`
require the real modules; delete the re-implemented logic; drop the parity
fences that guarded it (R7).

**G3 — Shell delegates.** `session-append.sh` + `sessionstart-handoff.sh` call
the node discovery helper; fail-open preserved.

**G4 — Guard + parity.** Production-call-path guard across every entry point;
single-implementation assertion; 4-adapter fingerprint re-baselines.

**G5 — Verification.** Fresh-clone test (hooks work with no `upgrade`), full
suite, swarm invariance, self-repo dogfood, retrospective.

### Out of scope

- Changing what the hooks *do* — this is a packaging and discovery phase, not a
  behaviour phase. Any behaviour change found necessary is logged and deferred.
- The `swarm` manifest transport, relay, or team plane
- Forge webhooks (still out, per ADR-0016/0017)

## Deliverables

| # | Deliverable | Verification |
|---|---|---|
| 1 | ADR-0018 + unified `findRoot` + 7 call sites migrated + BUG-030 filed | `npm test` |
| 2 | `.momentum/runtime/` installed by `init`/`upgrade`; byte-identity + depth-1 tests | `npm test` |
| 3 | Three helpers requiring core; duplicated logic deleted; redundant fences dropped | `npm test` |
| 4 | Shell discovery delegating to node, fail-open intact | `npm test` |
| 5 | Production-call-path guard + single-implementation assertion + fingerprints | `npm test` |
| 6 | Fresh-clone e2e + retrospective | `npm test` |

Verification defaults from `specs/config.md`: `test_command = npm test`;
`build_command = none`. No deviation.

## Acceptance criteria

1. **BUG-030 falsified directly**: `lanes land` applies the ecosystem gate in a
   real sibling layout with **no injected root**.
2. Exactly **one** root-discovery implementation — asserted by a test that
   fails if another appears.
3. Every vendored runtime file is **byte-identical** to its core original.
4. `eco-event.js`, `orient.js`, and `cross-repo.js` contain **no re-implemented
   core logic** — they require it.
5. Every entry point accepting an optional `ecosystemRoot` has a test that calls
   it **without** one.
6. A **fresh clone** has working hooks with no `upgrade` run.
7. Full suite green; **236 swarm tests green**; solo/no-ecosystem repos
   byte-unchanged.
