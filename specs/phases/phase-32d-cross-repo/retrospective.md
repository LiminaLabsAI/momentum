---
type: Retrospective
status: complete
epic: autonomous-execution
---

# Phase 32d — Cross-Repo — Retrospective

Fourth and final phase of **Epic 0001 — Autonomous Execution**. Target v0.43.0.

## What shipped

| Group | Delivered |
|---|---|
| G0 | Orphan guard widened; 32a/32b verification debt repaid; legacy ratchet installed |
| G1 | **BUG-031 closed** — the dead wave runner removed, as a move rather than a deletion |
| G2 | **BUG-032 closed** — the nudge that halted ecosystem sessions; plus the initiative tier |
| G3 | This retrospective and the epic's |

Both bugs this epic filed on day one are now closed, and the fourth tier of D1's
one-runner-per-scale exists.

## What went well

**Inventory before demolition.** G1's estimate from the previous session was "36
references, ~24 tests at risk". Counting which tests actually *touched* the dead
path gave 10, of which 6 were exclusive. That five-minute count is what turned a
scary removal into a safe one, and it happened only because the session before
had ended by measuring rather than guessing.

**Reframing the removal as a move.** `pollTurn` and `recordRepoComplete` were
never production code — they were a test simulator that happened to live in
`core/`. Moving them to `tests/_swarm-simulator.js` kept every test that verifies
*live* behaviour (planning, wave ordering, spawn-directive shape) while deleting
the pretence that a conductor advanced waves. **236/236 swarm tests green, zero
deletions.**

**Fixing BUG-032 by changing words.** The hook always exited 0. The defect was
the sentence — *"before going further"* — because an agent obeys wording, not
exit codes. The fix is three lines of message plus a grant check, and it closes
the complaint that opened this entire epic.

**The arithmetic check earned its place immediately.** Added last session after
I destroyed 11 tests, it confirmed this session's removal lost nothing: 1415
before, 1415 after.

## What didn't

**The orphan ratchet did not fall.** Removing two orphans exposed two more,
because the dead runner was the only production reference keeping other conductor
internals reachable. Recorded rather than adjusted to look like progress. The
useful reading: an 87-item tail is not 87 independent problems but a smaller set
of live roots with debris attached, and it will plateau before it falls.

**G1's plan gate was not literally achievable.** "Suite green *without* test
edits" was the stated bar; the removal required repointing seven files. Read by
intent the bar was met — nothing real was lost — but the gate as written was
wrong, and pretending otherwise would have been the easy lie.

## What was learned

1. **Measure the blast radius before deciding the shape of a change.** The same
   removal looked like a 24-test demolition and turned out to be a 6-test
   retirement plus an import change. Nothing about the code changed between those
   two readings — only how carefully it had been counted.

2. **Ask where code belongs, not just whether it should exist.** "Delete
   `pollTurn`" and "move `pollTurn` to tests" produce very different diffs and
   very different risk. The second is correct because the function was always a
   test fixture; the first would have cost real coverage to prove a point.

3. **Dead code props up dead code.** Reachability is transitive, so removing a
   root exposes its dependents rather than shrinking the count. A flat number
   after a real deletion is progress, not failure.

4. **Wording is behaviour when the reader is an agent.** BUG-032 sat behind a
   correct exit code and a correct architectural decision (ADR-0017 put the teeth
   on the git axis deliberately). None of that mattered, because the message read
   as an instruction. The regression guard is therefore on the *language* — no
   nudge line may open with an imperative verb.

## Deferred

| Item | To |
|---|---|
| The 87-item legacy orphan tail | Unscheduled — ratcheted so it cannot grow |
| Live multi-repo dogfood of the initiative tier against the cerebrio fleet | Operator-driven VAL item |
| Live vendor-CLI dogfood of `codex exec` / `opencode run` | VAL item; driver loop is unit-proven with an injected spawner |

## Verification Evidence

Captured 2026-07-28 on branch `epic-0001-autonomous-execution`.

```
$ npm test
ℹ tests 1415   ℹ pass 1415   ℹ fail 0
```

Baseline at 32c close was **1406**. Net-new: **9** — low because this phase was
predominantly *removal and repair*, which is the honest shape of a closing phase.

```
$ node --test tests/swarm-*.test.js            → 236/236   (zero deletions after the removal)
$ node --test tests/run-reachability.test.js   →   5/5     (core/run at zero; tail ratcheted at 87)
$ node --test tests/run-backend-conformance.test.js → 23/23
$ node --test tests/epic-e2e.test.js           →   8/8
$ node --test tests/cross-repo-nudge.test.js   →  19/19    (11 restored + 8 new)
```

### BUG-031 — the removal

```
core/swarm/conductor.js   20,069 → 14,480 bytes
exports: pollTurn ✗  recordRepoComplete ✗   (tombstone comment retained)
tests/_swarm-simulator.js — the functions, verbatim, where they always belonged
```

### BUG-032 — before and after

```
BEFORE:  → Run /brainstorm-initiative to open one before going further.
         (an imperative; the agent halts, whatever the exit code says)

AFTER:   Cross-repo work belongs to an initiative (ADR-0016).
         /brainstorm-initiative opens one. This is a note, not a gate —
         the current task continues.

         ...and suppressed entirely while an active run grant covers the members.
```

## Acceptance criteria

| # | Criterion | Status |
|---|---|---|
| 1 | Initiative-tier run resolves its first ready member | ✅ via `computeWaveLayers`, same engine as every tier |
| 2 | `pollTurn` / `recordRepoComplete` gone, swarm green without them | ✅ 236/236, zero deletions |
| 3 | Nudge silent under a covering grant; wording is observational | ✅ plus an imperative-verb regression guard |
| 4 | Guard covers `core/run/` + swarm + ecosystem, reporting the true state | ✅ `core/run` at zero; tail at 87, ratcheted |
| 5 | Solo behaviour byte-unchanged; full suite green | ✅ |
