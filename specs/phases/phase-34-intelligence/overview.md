---
type: Phase
status: in-progress
tags: [intelligence, learnings, recurring-failure, evaluator-discipline, dogfood]
deps: []
---

# Phase 34 — Intelligence

## Goal

**momentum writes a rich evidence corpus about itself and never reads it back.**
This phase makes it read.

Measured on 2026-07-28, in this repo:

| Artifact | Count |
|---|---|
| `[DECISION]` history entries | 228 |
| `[DISCOVERY]` history entries | 84 |
| `[ARCH_CHANGE]` history entries | 27 |
| Retrospectives | 46 |
| Backlog rows | 148 |
| ADRs | 21 |

Nothing consumes any of it. The single reader in the codebase is
`core/swarm/lib/incremental-log.js`, which tails the last *n* lines of a
history-shaped file for progress display. No code has ever asked
*"has this happened before?"*

## Why this, and why now

Two costs landed in the last 48 hours, both from the same root:

**1. A defect class reached its SIXTH instance before anyone named it.**

| | Where it was green | Where it was dead |
|---|---|---|
| BUG-002 | working tree | tarball glob |
| BUG-030 | tests injecting a root | `findRoot` in production |
| BUG-031 | tests calling `pollTurn` | no production caller existed |
| BUG-033 | working tree | published tarball |
| BUG-034 | claude-code's cwd | Antigravity's cwd |
| Phase 33 | working tree | momentum's own install |

Every one was found by a *different accident*. The class was legible in the
backlog by instance three — each entry even says "Nth instance of this shape" in
prose — but nothing was counting, so nothing escalated. The guard that would
have caught instance six existed conceptually at instance three.

**2. Seven backlog entries were stale, two of them P1.**

TD-012, TD-013, TD-009, ENH-063, BUG-007, BUG-027, BUG-028 were all marked open
for work already shipped. Rule 4 reads `backlog.md` at every phase start to
decide whether bugs should be fixed first — so a stale P1 sends every future
phase chasing something fixed months ago. Nothing noticed, because nothing
cross-checks a backlog entry against the code and tests that claim to close it.

The corpus that would have caught both existed the whole time.

## Scope

**In:**
- Mine `history.md`, retrospectives, and `backlog.md` for **recurring patterns**
- Surface them where the decision is made — Rule 4's pre-phase check
- Propose an ADR when a class crosses a threshold

**Out, deliberately:**
- **Automatic rule mutation.** "Retrospective-driven rule evolution" was in the
  roadmap row for this phase. An agent rewriting the rules that govern agents is
  the highest-blast-radius change in the system, and it is not something to build
  on the same day as the detector that feeds it. Propose to a human; never apply.
- **Context-window-aware task sizing.** A different concern (execution
  ergonomics, not learning) that shares nothing with this machinery. Stays in
  the roadmap row for a later phase.

## The governing constraint — Rule 11

This is a detection loop over a corpus, which is exactly what Rule 11 governs:
*lock the evaluator before building the loop.* Not doing so would let every
"improvement" to the detector silently rewrite its own score history.

So G0 ships a **frozen, versioned evaluator** — a fixed corpus with known-good
answers, committed **before** any detector code exists. The known-good set is not
invented: it is the thirteen instances above, which this session established
independently and can enumerate exactly.

Both directions are scored, because they fail differently:

- **Recall** — does it find the known instances? A detector that misses the
  pattern is useless.
- **Precision** — does it invent patterns that are not there? A detector that
  cries wolf is *worse* than useless. Phase 33's lesson, stated in its own
  retrospective: "a checker that condemns legitimate tooling is a checker people
  silence, and a silenced guard is how all seven of these drifts survived."

## Acceptance

- [ ] A frozen `v1` evaluator exists in `tests/benchmarks/`, committed before the detector
- [ ] The detector finds the six "green here, dead where it ships" instances
- [ ] The detector finds the stale-backlog class
- [ ] Precision is scored, not just recall — no unbounded false positives
- [ ] `momentum learnings` surfaces recurring classes with their evidence
- [ ] Rule 4's pre-phase check reports "this class has recurred N times"
- [ ] An ADR is **proposed**, never auto-applied
- [ ] Suite green; phase run end-to-end under momentum's own governor
