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

## Group 1 — Remove the dead wave runner
- [ ] **NOT STARTED — blast radius measured, see history.** 36 references across 7 swarm test files (~24 tests). The e2e harnesses drive completion entirely through the in-process simulator and also regenerate Phase 17/18 evidence files
- [ ] The plan's gate ("suite green without test edits") is **not achievable** as written — recorded rather than quietly relaxed
- [ ] 32a's deprecation notices remain, asserted by test, so the dead code keeps its warning label

## Group 2 — Initiative tier + BUG-032 ✅
- [x] **BUG-032** — nudge reworded from imperative to observation ("a note, not a gate — the current task continues"); **silent under an active run grant**; expired/revoked grants do NOT suppress
- [x] Regression guard: no nudge line may open with an imperative verb, so the wording cannot drift back
- [x] Installed mirror asserted to EMIT identically (ADR-0018) — compared on output, not source, since the source legitimately quotes the old phrase in the comment explaining its removal
- [x] `momentum run start initiative <slug>` — members ordered via `computeWaveLayers`, the same engine as every other tier (ADR-0003, asserted); audible degradation outside an ecosystem
- [x] **Recovered an overwritten test file** — see history. Suite reconciles at 1407 + 8 = **1415**
- [x] Verify: `node --test tests/cross-repo-nudge.test.js` → **19/19**; `npm test` → **1415/1415**

## Group 3 — Close the epic
- [ ] Retrospective + `## Verification Evidence`
- [ ] Epic 0001 retrospective + `momentum epic close`
