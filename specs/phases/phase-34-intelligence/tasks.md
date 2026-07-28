---
type: Tasks
status: in-progress
---

# Phase 34 — Intelligence — Tasks

> Execution G0 → G1 → G2. Baseline **1436/1436**. Governed run, `tdd: strict`.
> **G0 ships before G1 by Rule 11** — the evaluator is committed before the loop
> it scores, or the score history is meaningless.

## Group 0 — The locked evaluator (before any detector)
- [ ] `tests/benchmarks/recurring-patterns-v1/corpus/` — frozen snapshot of the real evidence
- [ ] `expected.json` — `ships-broken` (6 members), `stale-closure` (7 members)
- [ ] `README.md` — the scalar, the freeze date, and what justifies a v2 (never a v1 edit)
- [ ] `tests/learnings-evaluator.test.js` — the benchmark is well-formed and checksum-frozen
- [ ] Verify: `npm test`

## Group 1 — The detector, scored against frozen v1
- [ ] `core/learnings/lib/patterns.js` — pure `(corpus) → {classes, members, evidence}`
- [ ] `core/learnings/lib/corpus.js` — the I/O half, separated so the analyser stays pure
- [ ] Signals: explicit self-reference, shared vocabulary, cross-reference density
- [ ] `tests/learnings-detection.test.js` — recall ≥ 6/6 and ≥ 5/7; **precision bounded** (≤ 2 spurious classes)
- [ ] **Proven red**: empty corpus scores 0; corpus with self-reference phrases stripped loses `ships-broken`
- [ ] Verify: `npm test`

## Group 2 — Surface + lifecycle wiring
- [ ] `momentum learnings [--json]` — report-only, reachable from the real binary
- [ ] Rule 4 pre-phase check reports recurrence counts
- [ ] ADR **proposal** at threshold → `specs/decisions/proposed/`, never auto-accepted
- [ ] `tests/learnings-cli.test.js` — CLI reachable; proposals land in `proposed/` only
- [ ] `retrospective.md` + `## Verification Evidence`
- [ ] Verify: full suite green
