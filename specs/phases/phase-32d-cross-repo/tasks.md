---
type: Tasks
status: in-progress
epic: autonomous-execution
---
# phase-32d-cross-repo — Tasks
> Mirrors `plan.md`. `[x]` done · `[/]` in-progress · `[ ]` todo.
> Verify before claiming done (Rule 12).
> **TDD strict:** no task may be marked `[x]` without a recorded red→green.
## Group 0 — Repay the guard debt *(blocks)* ✅
- [x] Guard widened from `core/run/lib` to `core/swarm/` + `core/ecosystem/lib`
- [x] Re-run over 32a/32b's surface — **`core/run/` has ZERO orphans**; their claims are now earned
- [x] Legacy tail measured at **87** and held as a **ratchet** (may fall, never rise) rather than hidden behind a narrower scan
- [x] Probe scoped so it proves the detector red without tripping on the legacy tail
- [x] Verify: `node --test tests/run-reachability.test.js` → **5/5**; `npm test` → **1407/1407**

## Group 1 — Remove the dead wave runner ✅
- [x] **BUG-031 CLOSED** — `pollTurn` + `recordRepoComplete` removed; `conductor.js` 20,069 → 14,480 bytes
- [x] Precise inventory first: raw count suggested ~24 tests at risk; **only 10** touched the dead path, **6** exclusively
- [x] **A move, not a deletion** — the functions were only ever a test simulator, so they moved verbatim to `tests/_swarm-simulator.js` and consumers were repointed
- [x] **236/236 swarm tests green with ZERO deletions** — the removal took nothing real with it
- [x] `inbox` + `wave-ordering` retained as planned
- [x] Guard test flipped from "still deprecated" to **asserting the removal**, so the tombstone cannot rot back into live code
- [x] Ratchet finding recorded: the count did **not** fall — removing 2 orphans exposed 2 more, because dead code props up dead code
- [x] Verify: `node --test tests/swarm-*.test.js` → **236/236**; `npm test` → **1415/1415** (unchanged, so nothing was lost)

## Group 2 — Initiative tier + BUG-032 ✅
- [x] **BUG-032** — nudge reworded from imperative to observation ("a note, not a gate — the current task continues"); **silent under an active run grant**; expired/revoked grants do NOT suppress
- [x] Regression guard: no nudge line may open with an imperative verb, so the wording cannot drift back
- [x] Installed mirror asserted to EMIT identically (ADR-0018) — compared on output, not source, since the source legitimately quotes the old phrase in the comment explaining its removal
- [x] `momentum run start initiative <slug>` — members ordered via `computeWaveLayers`, the same engine as every other tier (ADR-0003, asserted); audible degradation outside an ecosystem
- [x] **Recovered an overwritten test file** — see history. Suite reconciles at 1407 + 8 = **1415**
- [x] Verify: `node --test tests/cross-repo-nudge.test.js` → **19/19**; `npm test` → **1415/1415**

## Group 3 — Close the epic ✅
- [x] Full suite **1415/1415**; swarm **236/236**; guard **5/5**; conformance **23/23**; epic e2e **8/8**; nudge **19/19**
- [x] `retrospective.md` + `## Verification Evidence` (Rule 12 Gate A)
- [x] **Epic 0001 retrospective** — `specs/epics/0001-autonomous-execution-retrospective.md`
- [x] Epic marked complete
- [ ] **Landing — awaiting operator approval** (Rule 6; `release: per-feature` means all four phases land together)
