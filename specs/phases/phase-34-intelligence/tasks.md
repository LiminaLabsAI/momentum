---
type: Tasks
status: complete
---

# Phase 34 — Intelligence — Tasks

> Execution G0 → G1 → G2. Baseline **1436/1436**. Governed run, `tdd: strict`.
> **G0 ships before G1 by Rule 11** — the evaluator is committed before the loop
> it scores, or the score history is meaningless.

## Group 0 — The locked evaluator (before any detector)
- [x] `tests/benchmarks/recurring-patterns-v1/corpus/` — frozen snapshot of the real evidence
- [x] `expected.json` — `ships-broken` (6 required); `stale-closure` (2 required, 2 ambiguous, 3 must-not-fire)
- [x] `README.md` — the scalar, the freeze date, and what justifies a v2 (never a v1 edit)
- [x] `tests/learnings-evaluator.test.js` — the benchmark is well-formed and checksum-frozen
- [x] Verify: `npm test` — **1441/1441** (1436 baseline + 5 evaluator tests)

## Group 1 — The detector, scored against frozen v1
- [x] `core/learnings/lib/patterns.js` — pure `(corpus) → {classes, members, evidence}`
- [x] `core/learnings/lib/corpus.js` — the I/O half, separated so the analyser stays pure
- [x] Signals: explicit self-reference + co-citation (shipped); shared-vocabulary and cross-reference-density **not built** — the declaration signal alone hit 6/6, and unproven signals would only cost precision
- [x] `tests/learnings-detection.test.js` — recall 6/6 on `ships-broken`, 2/2 on `stale-closure` required; **zero hits** on must-not-fire; ≤ 2 spurious classes
- [x] **Proven red**: empty corpus scores 0; corpus with self-reference phrases stripped loses `ships-broken`
- [x] Verify: `npm test` — **1450/1450** (1441 + 9 detection tests)

## Group 2 — Surface + lifecycle wiring
- [x] `momentum learnings [--json]` — report-only, reachable from the real binary
- [x] Rule 4 pre-phase check reports recurrence counts
- [x] ADR **proposal** at threshold → `specs/decisions/proposed/`, never auto-accepted
- [x] `tests/learnings-cli.test.js` — CLI reachable; proposals land in `proposed/` only
- [x] `retrospective.md` + `## Verification Evidence`
- [x] Verify: full suite green — **1456/1456** (1436 baseline + 20 new)
