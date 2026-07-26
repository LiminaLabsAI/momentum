---
type: Plan
status: in-progress
tags: [runtime, packaging, discovery, hooks, bug-030]
---

# Phase 31c — Shipped Runtime — Plan

```
# Execution:  G0 → G1 → (G2 ∥ G3) → G4 → G5
```

Lane `phase-31c-shipped-runtime`. Target v0.42.0.
Baseline suite: **1140/1140** on `main` (v0.41.1).

> **Invariance gate.** Solo and no-ecosystem behaviour stays byte-unchanged and
> the **236 swarm tests** stay green. This phase changes *where code lives* and
> *how the root is found* — it must not change what any hook decides.

> **G1 before G2/G3:** the helpers can only require the runtime once the runtime
> is installed. G2 and G3 then proceed independently — one rewires JS, the other
> rewires shell.

## Reference Specs

- `specs/architecture/ecosystem.md` — stable reference (Rule 10); gaps logged as
  `[ARCH_CHANGE]`, reconciled at `/sync-docs`, never edited mid-phase.
- `specs/decisions/0016-*` / `0017-*` — the constraints that produced the
  duplication this phase removes.
- `core/ecosystem/layout.md` — documents the ecosystem as a **sibling** of its
  members, which is the fact `findRoot` has always contradicted.

---

## Group 0 — Contracts, unified discovery, BUG-030 *(Sequential — blocks all)*

**Sequential.** No external dependencies.
**Commit:** `docs(phase-31c): ADR-0018 shipped runtime + unified discovery`

1. **ADR-0018 — Shipped Runtime & Unified Discovery.** Records R1–R8: why the
   duplication is deleted rather than fenced (three defects of the same class);
   the measured closure that invalidates the original premise; the `../.momentum/
   runtime/` literal-path rule and the depth-1 constraint it takes on; and the
   three-algorithm discovery landscape with `findRoot` as the broken authority.

2. **File BUG-030** — `lanes land`'s ecosystem gate never applies in a sibling
   layout. Include the live reproduction, and state plainly that v0.41.0 shipped
   ENH-068 non-functional and every 31b test injected the root.

3. **One `findRoot`** in `core/ecosystem/lib/index.js`:
   up-walk → sibling scan → registration fallback, bounded by
   `MOMENTUM_MAX_PARENT_WALK`. Keep the memoisation, keyed correctly.

4. **Migrate all seven call sites** to it — including `landing.js` (which fixes
   BUG-030) and the two CLIs, whose now-redundant local fallbacks come out.

5. **Assert single-implementation**: a test that greps the tree for the retired
   discovery patterns and fails if any returns. This is what keeps the count at
   one after the phase ends.

**Verification:** `npm test` — a new test reproduces BUG-030 against the old
`findRoot` (demonstrated failing) and passes after; single-implementation
assertion green.

---

## Group 1 — Vendored runtime *(Sequential — needs G0)*

**Sequential.** Depends on G0. External: none.
**Commit:** `feat(runtime): vendor the core closure into installed projects`

1. **Declare the closure** as data, not by hand — a manifest listing the 9 files,
   derived from the require graph of the hook entry points. A test recomputes the
   closure and fails if the manifest is stale, so adding a dependency is a
   deliberate act rather than an accident.

2. **`init` + `upgrade` install** it to `<target>/.momentum/runtime/`, preserving
   the `core/`-relative subpaths so intra-closure requires resolve unchanged.

3. **Byte-identity test** — every vendored file equals its core original. This is
   the mechanism that replaces parity fences: there is no second implementation
   to diverge, only a copy that must match.

4. **`.gitignore` negation** so `.momentum/runtime/` commits (R4), following the
   existing `!.momentum/team/` precedent.

5. **Depth-1 assertion** — a test asserting every adapter installs hooks and
   scripts exactly one level below repo root, which is what licenses R2's
   literal `../.momentum/runtime/…` path.

**Verification:** `npm test` — closure-manifest freshness, byte-identity across
all 9, depth-1 across all 4 adapters, and a fresh `init` producing a populated
runtime.

---

## Group 2 — Rewire the JS helpers *(Parallel with Group 3)*

**Parallel with Group 3.** Depends on G1.
**Commit:** `refactor(runtime): hooks require core instead of re-implementing it`

1. **`eco-event.js`** — drop the inlined fragment-write and identity logic;
   require `core/team/lib/fragments` + `core/identity` + `core/ecosystem/lib/events`
   from the runtime. Keep the entry point thin: parse hook args, call core, print.

2. **`orient.js`** — drop the re-implemented lane-registry reading (BUG-029's
   home) and require `core/lanes/lib/state`. The worktree-anchor logic added in
   v0.41.1 moves into `state.js` if it is not already there, so both callers get
   it.

3. **`cross-repo.js`** — drop the `detect.js` mirror and require the real
   `core/ecosystem/lib/detect`.

4. **Remove the redundant parity fences (R7)** — the `cross-repo.js` ↔
   `detect.js` and orient ↔ `lanes/lib/state` fences guarded duplicates that no
   longer exist. Leaving them would imply the duplicates do.

5. **Keep every behaviour identical.** The pre-existing tests for the nudge,
   banner, orient output, and event write path are the regression net; none of
   their expectations should need editing. If one does, that is a behaviour
   change and it stops for a decision.

**Verification:** `npm test` — the existing 31a/31b suites pass **unedited**;
a test asserts the three helpers contain no re-implemented core logic.

---

## Group 3 — Shell delegates to node *(Parallel with Group 2)*

**Parallel with Group 2.** Depends on G1.
**Commit:** `refactor(runtime): shell discovery delegates to node`

1. **A tiny node discovery entry point** in the runtime that prints the resolved
   ecosystem root (and member id) for a given start directory — the single
   surface both shell scripts consume.

2. **`session-append.sh`** — replace `find_ecosystem_root()` and the python3
   member resolution with one call to it.

3. **`sessionstart-handoff.sh`** — replace its `find_ecosystem_root()` likewise;
   the fleet line already spawns node, so this consolidates rather than adds.

4. **Fail-open preserved and asserted**: no node, no runtime, or a corrupt
   manifest each degrade silently. A hook must never break a commit or a session
   start.

5. **Cost measured, not estimated** — the 31a/31b precedent. `session-append.sh`
   runs per commit; if delegation is materially slower than the python3 path it
   replaces, say so in the record.

**Verification:** `npm test` — both scripts resolve the root in a sibling layout;
both are silent outside an ecosystem; cost recorded.

---

## Group 4 — Guard + parity *(Sequential — needs G2 + G3)*

**Sequential.** Depends on Groups 2 and 3.
**Commit:** `test(runtime): production-call-path guard`

1. **The production-call-path guard (R6).** Enumerate every exported function
   taking an optional `ecosystemRoot` (or equivalent injectable root) and assert
   each works **without** it in a real sibling layout. BUG-030 existed because
   every test took the injection shortcut; this closes the class the way BUG-028's
   matcher-reachability test closed its own.

2. **Fingerprint re-baselines** — 4 adapters, `--check` first to prove the drift
   is exactly the intended surface (new runtime dir + rewired hooks + shell).

3. **`momentum okf check`** conformance.

**Verification:** `npm test` + `momentum okf check`.

---

## Group 5 — Verification & release prep *(Sequential — last)*

**Sequential.** Depends on all prior groups.
**Commit:** `test(runtime): fresh-clone + closure e2e`

1. **Fresh-clone e2e** — clone a repo that has the runtime committed, run hooks
   **without** `upgrade`, and assert they work (AC-6). This is the criterion R4
   exists for.
2. **BUG-030 e2e** — `lanes land` in a real sibling layout, no injected root,
   gate applies (AC-1).
3. **Full suite** + **236 swarm green** + solo byte-unchanged.
4. **Self-repo dogfood** — this repo is a live `cerebrio-ecosystem` member;
   synthetic-only evidence does not count (Phase 20 lesson).
5. **`/sync-docs`** → retrospective → `/complete-phase` at the operator gate.

**Verification:** `npm test` green; evidence under
`specs/phases/phase-31c-shipped-runtime/evidence/`.

---

## Risks

| Risk | Mitigation |
|---|---|
| Vendored bytes appear in user repos and show diffs on every upgrade | Accepted (R4). 65 kB, and a fresh clone with dead hooks is strictly worse. |
| The closure grows silently over time | The manifest is recomputed by a test — adding a dependency fails the build until it is declared. |
| R2's literal path breaks if an adapter installs hooks at another depth | Depth-1 assertion across all 4 adapters in G1. A future adapter that violates it fails the suite rather than silently mis-resolving. |
| `findRoot` semantics change breaks a caller | All 3 real callers were checked and all want sibling behaviour; the CLIs' local fallbacks become redundant, not contradicted. |
| Shell delegation slows the per-commit hook | Measured in G3, not assumed. It replaces a python3 spawn, so the baseline is not zero. |
| A "pure refactor" quietly changes behaviour | G2's gate is that the existing 31a/31b tests pass **unedited**. Any expectation that needs editing stops for a decision. |
