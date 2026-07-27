---
type: History
status: in-progress
epic: autonomous-execution
---

# phase-32d-cross-repo — History

### [FEATURE] 2026-07-27 — G0: the guard debt is repaid, and core/run is proven clean
Topics: orphan-guard, verification-debt, bug-031, ratchet
Affects-phases: phase-32a-governor, phase-32b-epic-tier, phase-32d-cross-repo
Affects-specs: tests/run-reachability.test.js
Detail: 32c found the orphan guard blind to single-line `module.exports`, so it
had been green over `backend.js`, `lock.js`, `grant.js` and `amend.js` for two
phases — and that green was cited as evidence in 32a's and 32b's retrospectives.
G0 repays that debt.

Widened from `core/run/lib` to `core/swarm/` and `core/ecosystem/lib` and re-run.
**Result: `core/run/` has ZERO orphans.** 32a's and 32b's claims are now earned
rather than asserted, which is the good outcome — but it was not knowable until
the guard could actually see the code.

The wider scan surfaced **87 legacy orphans** across swarm and ecosystem, exactly
the "long tail of legacy findings" 32a predicted when it scoped the guard
narrowly. Fixing 87 pre-existing exports is a different phase with a different
blast radius, so the honest instrument is a **ratchet**: `core/run/` is held at
zero, and the legacy tail is recorded at its measured baseline and may fall,
never rise. A new orphan anywhere fails the build; the existing tail is visible
rather than hidden behind a narrower scan.

---

### [DISCOVERY] 2026-07-27 — Removing the dead wave runner is far larger than the plan assumed
Topics: bug-031, swarm, removal, blast-radius, scope
Affects-phases: phase-32d-cross-repo
Affects-specs: core/swarm/conductor.js, tests/swarm-*.test.js
Detail: G1 planned to delete `pollTurn` and `recordRepoComplete` on the reasoning
that dead code has no dependents. Measured, it has **36 references across 7 swarm
test files**:

    swarm-wave-transition.test.js    8 tests, 11 refs
    swarm-start-claude-code.test.js 12 tests, 11 refs
    swarm-e2e-scenarios.test.js      4 tests,  5 refs
    swarm-e2e-multi-adapter.test.js  (harness)  4 refs
    swarm-complete / cancel / resume            5 refs

The e2e scenario harnesses drive swarm completion *entirely* through the
in-process simulator (`recordRepoComplete` + `pollTurn`) — which is the same fact
that let BUG-031 hide for a year, now working as an obstacle to its removal. Those
harnesses also regenerate the Phase 17/18 evidence files, so deleting them removes
the reproduction path for historical verification artifacts.

The plan's own gate said "swarm suite green **without** them — a removal that
needs test edits to pass is a removal that took something real with it." By that
gate this removal fails: it requires deleting or rewriting ~24 tests. That is not
a reason to skip it, but it is a reason not to attempt it at the tail of a long
session. Recorded here with the blast radius measured so the next session starts
from evidence rather than from the plan's optimistic estimate.

The deprecation notices from 32a remain in place and are asserted by test, so the
dead code cannot quietly lose its warning label in the meantime.
