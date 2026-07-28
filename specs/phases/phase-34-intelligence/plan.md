---
type: Plan
phase: 34
status: complete
---

# Phase 34 — Intelligence — Plan

Three groups, executed G0 → G1 → G2 under a governed run.
Baseline **1436/1436**.

The order is not negotiable: **Rule 11 requires the evaluator to be committed
before the loop it scores.** G0 before G1 is the whole point, not a convenience.

---

## Group 0 — The locked evaluator

Ships *before* any detector exists.

1. `tests/benchmarks/recurring-patterns-v1/corpus/` — a **frozen snapshot** of
   the real evidence: the backlog rows, code markers and retrospective section
   for the known instances. Snapshot, not a live read of `specs/`, because a live corpus
   would change under the detector and silently rewrite its own score history —
   the exact failure Rule 11 exists to prevent.
2. `tests/benchmarks/recurring-patterns-v1/expected.json` — the known-good
   answers:
   - class `ships-broken` — 6 members (BUG-002, 030, 031, 033, 034, phase-33)
   - class `stale-closure` — 2 required (TD-009, ENH-063), 2 ambiguous
     (TD-012, TD-013), 3 must-not-fire (BUG-007, BUG-027, BUG-028)
3. `tests/benchmarks/recurring-patterns-v1/README.md` — states the scalar, the
   freeze date, and **what would justify a v2** (never a v1 edit).
4. `tests/learnings-evaluator.test.js` — asserts the evaluator is *well-formed
   and frozen*: corpus files exist, expected.json parses, and the fixture
   checksums match. This guards the evaluator itself, since a benchmark that can
   drift is not a benchmark.
5. **Verify:** `npm test`. G0 introduces no detector — if anything scores here,
   something is wrong.

---

## Group 1 — The detector, scored against the frozen v1

1. `core/learnings/lib/patterns.js` — **pure**. `(corpus) → {classes, members,
   evidence}`. No filesystem walk inside the analyser; the caller supplies the
   corpus, same shape as `governor.decide()` and `parity.check()`.
2. `core/learnings/lib/corpus.js` — the I/O half: read `specs/` into the corpus
   shape. Separated so the analyser stays testable against the frozen fixture.
3. Signals to detect, in order of evidence strength:
   - **explicit self-reference** — entries literally saying "Nth instance of
     this shape" / "same shape as BUG-0NN". The cheapest and strongest signal,
     and it is already in the corpus by hand.
   - **shared vocabulary** — recurring phrases across `[DISCOVERY]` entries and
     backlog details.
   - **cross-reference density** — items citing the same prior IDs.
4. `tests/learnings-detection.test.js` — scores against the frozen v1:
   **recall 6/6** on `ships-broken`, **2/2** on `stale-closure` required,
   **zero hits** on must-not-fire, and no more than 2 spurious classes.
   Thresholds are committed here and are part of the locked contract.
5. **Prove it red:** an empty corpus must score 0, and a corpus with the
   self-reference phrases stripped must lose the `ships-broken` class — proving
   the detector reads evidence rather than hardcoding the answer. This is the
   32c lesson: prove the guard against every shape it must handle.
6. **Verify:** `npm test`.

---

## Group 2 — The surface, and the lifecycle wiring

1. `momentum learnings [--json]` — recurring classes, member count, evidence
   trail. Report-only. Same posture as `selfcheck`: reporting is the default,
   because a tool that acts on its own inference is a tool nobody trusts.
2. **Rule 4 wiring** — the pre-phase check already reads `backlog.md` for P0/P1.
   It now also reports *"class `ships-broken` has recurred 6 times; the last 3
   were found post-release."* That is the moment the information is worth
   having: before committing to a phase, not after.
3. **ADR proposal at threshold** — a class at ≥ N members emits a **draft** ADR
   to `specs/decisions/proposed/`, never to `specs/decisions/`, and never
   auto-numbered into the accepted set. A human accepts it or deletes it.
4. `tests/learnings-cli.test.js` — CLI reachable from the real binary (the
   BUG-033 lesson: a correct library nobody can invoke is not shipped), and the
   proposal path writes to `proposed/` and nowhere else.
5. `retrospective.md` + `## Verification Evidence`.
6. **Verify:** full suite green.

---

## What would make this phase wrong

Recorded up front, so the retrospective can be honest about it:

- **If the detector only finds what its authors already knew**, it is a
  hardcoded lookup wearing a costume. G1's strip-the-phrases test exists to
  catch exactly that, and if it cannot be made to pass honestly, the right
  outcome is to say so rather than weaken the test.
- **If precision is poor**, this becomes noise attached to every phase start,
  and Rule 4 is where agents decide whether to trust the backlog at all.
  Degrading that surface would cost more than this phase adds.
