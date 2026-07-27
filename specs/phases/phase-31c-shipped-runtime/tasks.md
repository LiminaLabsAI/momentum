---
type: Tasks
status: in-progress
---

# Phase 31c — Shipped Runtime — Tasks

> Mirrors `plan.md`. `[x]` done · `[/]` in-progress · `[ ]` todo. Verify before
> claiming done (Rule 12). Execution: G0 → G1 → (G2 ∥ G3) → G4 → G5.
> Closes TD-012 + TD-013 + BUG-030. Target v0.42.0.
> Lane `phase-31c-shipped-runtime`.

## Group 0 — Contracts, unified discovery, BUG-030 *(blocks)* ✅
- [x] Author **ADR-0018** — Shipped Runtime & Unified Discovery (R1–R8)
- [x] **BUG-030 filed** with the live reproduction; states plainly that v0.41.0 shipped ENH-068 non-functional
- [x] One `findRoot`: up-walk → **sibling scan** → registration fallback, `MOMENTUM_MAX_PARENT_WALK`-bounded, memoisation kept
- [x] All **7** call sites migrated; both CLIs' redundant local fallbacks removed
- [x] `events.js`'s `resolveEcosystemRootFrom` reduced to a thin delegation (asserted: no `readdirSync` left in it)
- [x] **BUG-030 regression test drives the PRODUCTION call path** (`landingCheck(dir)`, no injected root) — demonstrated failing against the pre-31c implementation
- [x] **Self-cleaning allowlist test** — fails if an 8th discovery implementation appears, AND fails if an allowlist entry goes stale
- [x] Updated a pre-existing test that had **codified the bug as intended behaviour** (its comment explained that findRoot deliberately did not sibling-scan)
- [x] Verify `npm test` green — **1149/1149** (+9 from 1140); commit G0

## Group 1 — Vendored runtime *(needs G0)* ✅
- [x] `core/runtime/closure.js` — closure **computed** from the entry points' real require graph, not hand-listed
- [x] Test asserts the closure is **transitively complete** — add a require to any runtime module and it fails until declared
- [x] Test asserts the closure has **no external dependencies** (vendoring only works because momentum is zero-dependency)
- [x] `init` + `upgrade` install to `<target>/.momentum/runtime/`, preserving `core/`-relative subpaths
- [x] **Byte-identity test** — every vendored file equals its core original (AC-3); `upgrade` restores it after corruption
- [x] `.gitignore` negation in the template + this repo, following `!.momentum/team/`
- [x] **Depth-1 assertion across all 4 adapters** — what licenses R2's literal `../.momentum/runtime/…`, incl. asserting the path resolves from both `scripts/` and `.githooks/`
- [x] Vendored modules **load in place** — proves the tree shape survived the copy
- [x] Git-trackability asserted via `git add --dry-run` (**not** `check-ignore -v`, which reports matched negations and exits 0 — a misleading instrument here)
- [x] **Measured closure is 12 files / 96 kB, not the 9 / 65 kB estimated at brainstorm** — corrected in ADR-0018 + overview rather than contorting code to fit the guess
- [x] `scripts/orient.js` install kept **transitional** — G1 is deliberately additive; its consumers are rewired in G2/G3, then it goes
- [x] 4 fingerprints re-baselined (drift = `.gitignore` only)
- [x] Verify `npm test` green — **1158/1158** (+18 from 1140); commit G1

## Group 2 — Rewire the JS helpers *(∥ G3)* ✅
- [x] `eco-event.js` requires `events`/`identity`/`index` from the runtime; **0 sibling scans left** (277 → 178 lines)
- [x] `orient.js` delegates lane reading to `core/lanes/lib/state`; **0 registry parsing left** (BUG-029's home is gone)
- [x] v0.41.1's worktree-anchor logic **moved into `state.js`** as `anchorFromRepoDir` — git-free, so orient keeps its contract, and both callers share one implementation
- [x] `cross-repo.js` delegates to the real `detect.js`; the mirror deleted (176 → 136 lines)
- [x] **Deleted 3 obsolete fences (R7)**: fragment parity, detect parity, and the "stays dependency-free" assertion — the last of which asserted the very constraint that *caused* BUG-029
- [x] **Gate held**: the only test edits were (a) removing fences for deleted code, (b) repointing one assertion at the function's new owner. No expectation about *behaviour* changed
- [x] `recordEvent` gained an `opts.env` passthrough — a test seam the mirror had and core lacked; `identity.resolveActor` already accepted it. Production unchanged
- [x] `record()` keeps a documented **shape shim** (`fragment.file` → `file`) so entry-point callers are unaffected
- [x] Resolution made **depth-independent** (bounded upward walk) — the file runs from both `core/ecosystem/lib/` and `.githooks/`
- [x] Allowlist **self-cleaned**: `eco-event.js` no longer matches, so its entry had to be removed or the test fails
- [x] 4 fingerprints re-baselined (drift = exactly the 3 rewired files)
- [x] Verify `npm test` green — **1155/1155** (net −3: fences deleted with the code they guarded); commit G2

## Group 3 — Shell delegates to node *(∥ G2)*
- [ ] Node discovery entry point in the runtime — prints resolved root (+ member id) for a start dir
- [ ] `session-append.sh` uses it; `find_ecosystem_root()` + python3 member resolution removed
- [ ] `sessionstart-handoff.sh` uses it; its `find_ecosystem_root()` removed
- [ ] **Fail-open preserved and asserted** — no node / no runtime / corrupt manifest all degrade silently
- [ ] **Cost measured, not estimated** (it replaces a python3 spawn, so the baseline is not zero)
- [ ] Verify `npm test` green; commit G3

## Group 4 — Guard + parity *(needs G2 + G3)*
- [ ] **Production-call-path guard** — every exported fn with an optional root asserted to work WITHOUT one in a real sibling layout
- [ ] Guard is enumerative, not a fixed list, so a new entry point is covered automatically
- [ ] 4 fingerprints re-baselined (`--check` first: drift = runtime dir + rewired hooks + shell)
- [ ] `momentum okf check` conformant
- [ ] Verify `npm test` green; commit G4

## Group 5 — Verification & release prep *(last)*
- [ ] **Fresh-clone e2e** — hooks work with NO `upgrade` run (AC-6, the criterion R4 exists for)
- [ ] **BUG-030 e2e** — `lanes land` gate applies in a real sibling layout with no injected root (AC-1)
- [ ] Full suite green; **236 swarm tests green**; solo/no-ecosystem byte-unchanged
- [ ] Self-repo dogfood against real activity (Phase 20 lesson — synthetic-only does not count)
- [ ] Capture evidence under `evidence/`
- [ ] `/sync-docs` → retrospective → `/complete-phase` at the operator gate
