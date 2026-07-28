---
type: History
phase: 34
---

# Phase 34 — Intelligence — History

### [DECISION] 2026-07-28 — Scope cut to detection; rule evolution deliberately excluded
Topics: intelligence, learnings, blast-radius
Affects-phases: phase-34-intelligence
Affects-specs: specs/planning/roadmap.md
Detail: The roadmap row for this phase bundled four capabilities: self-learning
hooks, retrospective-driven rule evolution, self-healing (recurring failure →
ADR proposal), and context-window-aware task sizing. Built only the detection
spine plus ADR *proposal*. Automatic rule mutation is excluded on blast radius —
an agent rewriting the rules that govern agents is the highest-risk change in
the system, and building it the same day as the detector that would feed it
compounds two unproven things. Context-window-aware task sizing is excluded as
unrelated (execution ergonomics, not learning); it stays in the roadmap row.

---

### [DECISION] 2026-07-28 — Rule 11 governs this phase, so the evaluator ships first
Topics: intelligence, evaluator-discipline, rule-11
Affects-phases: phase-34-intelligence
Affects-specs: none
Detail: This is a detection loop over a corpus, which is precisely what Rule 11
covers. G0 commits a frozen, versioned evaluator BEFORE any detector exists, and
the corpus is a SNAPSHOT rather than a live read of `specs/` — a live corpus
would change underneath the detector and silently rewrite its own score history,
the exact failure the rule exists to prevent. The known-good answers are not
invented: they are the thirteen instances this session established independently
(six "green here, dead where it ships", seven stale-closure backlog entries).

---

### [DECISION] 2026-07-28 — Precision is scored, not just recall
Topics: intelligence, false-positives, trust
Affects-phases: phase-34-intelligence
Affects-specs: none
Detail: A detector that misses the pattern is useless; one that invents patterns
is worse, because its output lands on Rule 4's pre-phase check — the surface
agents use to decide whether the backlog is worth trusting. Phase 33's
retrospective already stated the general form: a checker that condemns
legitimate tooling is a checker people silence, and a silenced guard is how all
seven of its drifts survived. The v1 evaluator therefore bounds spurious classes
(≤ 2) alongside recall thresholds, and both numbers are part of the locked
contract.

---

### [NOTE] 2026-07-28 — The premise was measured, not assumed
Topics: intelligence, corpus
Affects-phases: phase-34-intelligence
Affects-specs: none
Detail: Before designing, counted what exists: 228 `[DECISION]`, 84
`[DISCOVERY]`, 27 `[ARCH_CHANGE]` history entries, 46 retrospectives, 148
backlog rows, 21 ADRs. Then checked what reads them: nothing. The only consumer
in the codebase is `core/swarm/lib/incremental-log.js`, which tails the last n
lines of a history-shaped file for progress display. No code has ever asked
"has this happened before?" — which is why a defect class reached its sixth
instance before being named, despite individual entries saying "Nth instance of
this shape" in prose.

---
