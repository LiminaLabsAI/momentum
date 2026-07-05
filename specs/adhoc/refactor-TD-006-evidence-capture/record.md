---
type: Ad-hoc Record
---

# Ad-hoc Work Record: refactor-TD-006-evidence-capture

> **Type**: quick-task
> **Created**: 2026-07-03
> **Branch**: refactor/TD-006-evidence-capture (lane `refactor-TD-006-evidence-capture`, opened via `momentum lanes open`)
> **Backlog**: TD-006
> **Status**: shipped

## Current Behavior

Every `npm test` run rewrites the 6 committed swarm evidence files
(`specs/phases/phase-17-swarm/evidence/scenario-{a,b,c}-*.txt` and
`specs/phases/phase-17-5-swarm-portability/evidence/scenario-portability-*.txt`)
because `captureEvidence()` in `tests/swarm-e2e-scenarios.test.js` and
`tests/swarm-portability-e2e.test.js` writes unconditionally, and the captured
body embeds the run's random tmp-dir name (`Ecosystem: momentum-test-<rand>`)
plus fresh commit SHAs. The churn taxed the entire Lanes-family day (swept
noise into the 21a G0 commit, broke a lane rebase on dirty-worktree refusal)
and tried to sneak into the BUG-016 lane commit the same way.

## Expected Behavior

`npm test` is pure verification and leaves a clean tree. Evidence capture is
a deliberate act: `npm run capture-evidence` (sets `MOMENTUM_CAPTURE_EVIDENCE=1`
and runs the two swarm suites) is the only path that touches the committed
files — fix candidate (c) from the backlog, following the Phase 21c env-gated
sink precedent (`scripts/capture-three-ideas-demo.sh`).

## Unchanged Behavior

- All swarm e2e assertions are unchanged — the gate short-circuits only the
  file write; metrics, manifests, and boards are still fully exercised.
- The committed evidence files are byte-for-byte untouched by this change.
- `capture-evidence` output format is identical to what `npm test` used to
  write (same `captureEvidence()` body).
- Phase 18 G3 note: the multi-adapter evidence harness should reuse the same
  `MOMENTUM_CAPTURE_EVIDENCE` gate (recorded in the TD-006 backlog row).

## Verification Evidence

```
$ node --test --test-concurrency=1 tests/swarm-e2e-scenarios.test.js tests/swarm-portability-e2e.test.js
(plain run) → evidence dirty files: 0

$ npm run capture-evidence
(gated run) → evidence dirty files: 6 (all regenerate; discarded after proof)

$ npm test
tests 715, pass 715, fail 0 — and the working tree stays clean
(only this lane's own 3 edits dirty: 2 test files + package.json)
```

## Commit

Single commit on `refactor/TD-006-evidence-capture`:
`refactor(tests): gate swarm evidence capture behind MOMENTUM_CAPTURE_EVIDENCE (TD-006)`
— touches `tests/swarm-e2e-scenarios.test.js`, `tests/swarm-portability-e2e.test.js`
(guard + comment in each `captureEvidence()`), `package.json`
(`capture-evidence` script), and lane-scoped tracking (this record, TD-006
backlog row, new ENH-049 row, two changelog bullets).
