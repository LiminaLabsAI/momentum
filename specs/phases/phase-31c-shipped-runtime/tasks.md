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

## Group 3 — Shell delegates to node *(∥ G2)* ✅
- [x] `core/runtime/discover.js` — the single shell-facing entry point; prints `<root>\t<member-id>`
- [x] Ships with the runtime as `.momentum/runtime/discover.js` (flat, stable path for shell callers)
- [x] `session-append.sh` delegates — **bash walker AND the python3 member resolution both removed**
- [x] `sessionstart-handoff.sh` delegates — its bash walker removed
- [x] **0 bash discovery implementations left** (was 2)
- [x] Fail-open preserved: no node / no runtime / no ecosystem → caller gets nothing and carries on
- [x] **Restored a permissiveness the delegation would have silently dropped** — the bash path resolved members by path alone, so non-git member dirs worked; `discover.js` now falls back to path matching after git resolution
- [x] **Cost measured, not estimated**: session-append 77ms/call (replaces a python3 spawn); SessionStart banner 92ms — inside its <100ms budget
- [x] 4 fingerprints re-baselined
- [x] Verify `npm test` green — **1155/1155**; commit G3

## Group 4 — Guard + parity *(needs G2 + G3)* ✅
- [x] **Production-call-path guard** — every fn using the `opts.ecosystemRoot || <discover>` fallback is exercised WITHOUT a root in a real sibling layout
- [x] **Enumerative** — the guard scans for the idiom itself, so a new entry point fails the build until covered; nobody has to remember
- [x] Third assertion: `COVERED` cannot rot — an entry that stops being an entry point fails
- [x] **The guard immediately found 2 entry points I did not know about** (`core/orchestration/events.js`) — they proved to be the *opposite* contract (`!opts.ecosystemRoot ||`, a guard clause requiring injection)
- [x] Scanner narrowed **by contract, not convenience** — negative lookbehind excludes the guard-clause form, with the distinction documented
- [x] 4 fingerprints: **zero drift** (G2/G3 already re-baselined)
- [x] `momentum okf check` — 326 files conformant
- [x] Verify `npm test` green — **1158/1158**; commit G4

## Group 5 — Verification & release prep *(last)* ✅
- [x] **Fresh-clone e2e** — clone a committed install, touch nothing, assert every runtime module is present AND loads (AC-6)
- [x] **BUG-030 e2e through the real CLI** — `momentum lanes land` refuses, naming backend + the api-contract edge, with no injected root (AC-1)
- [x] `upgrade` keeps the runtime byte-identical
- [x] Full suite **1161/1161** (baseline 1140); **swarm 236/236**; OKF 326 conformant; 4 fingerprints no drift
- [x] **Solo invariance measured**: no-ecosystem repo → silent commit, `session-append` exit 0 no output, empty banner, `lanes board` unchanged
- [x] **Live dogfood, not synthetic** (Phase 20 lesson): `findRoot` from this repo returned `null` pre-31c and now resolves the real `cerebrio-ecosystem`; `discover.js` → `<root>\tmomentum`; fleet orient via the vendored runtime; **40 real event fragments** captured today; all 12 vendored files byte-identical
- [x] Evidence captured in `evidence/verification.md`
- [x] Retrospective written
- [ ] `/sync-docs` → `/complete-phase` at the operator gate
