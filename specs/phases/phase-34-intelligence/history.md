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
### [DISCOVERY] 2026-07-28 — The manual backlog audit was wrong, and the reason is this phase's thesis
Topics: intelligence, backlog-integrity, parsing, self-correction
Affects-phases: phase-34-intelligence
Affects-specs: specs/changelog/2026-07.md, specs/backlog/backlog.md
Detail: While snapshotting the frozen corpus for G0, the "seven stale backlog
entries, two of them P1" claim from the post-v0.44.0 reconciliation turned out to
be **wrong**. The truth is four (TD-009 P3, TD-012 P2, TD-013 P2, ENH-063 P2) and
**zero P1s**. BUG-007, BUG-027 and BUG-028 were already `resolved`.

The cause is exactly what this phase exists to fix. That audit was a throwaway
`awk -F'|'` over `backlog.md`, and backlog descriptions contain pipes — BUG-007
(`apply_patch\|shell`) and BUG-028 (`Edit\|Write`) carry escaped ones, and
BUG-027 carried an **unescaped** one. Splitting on every `|` shifted their
columns, so the priority cell was read out of the description and the status cell
out of the priority. The two "stale P1s" were precisely those misparsed rows.

Two things follow. First, the record is corrected in the changelog rather than
quietly amended. Second, this is the strongest available argument for the phase:
a hand-rolled reader of the corpus produced a confidently-wrong answer about the
project's own state, and nothing would have caught it — the same failure mode as
a stale entry, one level up. `core/learnings/lib/corpus.js` must therefore be a
real parser with its own tests, not a regex, and the v1 evaluator must include a
pipe-bearing row as a fixture.

Also fixed in passing: BUG-027's row contained a literal unescaped `|` in the
phrase "missing its trailing `|`" — an entry **about** a malformed markdown row
that was itself malformed, breaking every parser that read it.

---
### [DISCOVERY] 2026-07-28 — BUG-038: a test that expired 18 minutes after the release
Topics: intelligence, time-bombs, verification-integrity
Affects-phases: phase-34-intelligence
Affects-specs: none
Detail: G0's suite run went red with no code change. `cross-repo-nudge.test.js`
pinned its event to a frozen `NOW` and spawned `cross-repo-gate.sh` as a real
subprocess, which reads the wall clock against a 24h window. The event aged out
at 2026-07-28T12:00:00Z; v0.44.1 was tagged at 11:42Z on a genuinely green
suite. A clean worktree at the released tag reproduces the failure — nothing to
bisect, because nothing changed but the date. Fixed by dating subprocess-backed
events relative to the real clock while the injected-clock tests keep the frozen
NOW.

---

### [NOTE] 2026-07-28 — The time-bomb sweep found nothing further, and says so
Topics: intelligence, time-bombs, false-positives
Affects-phases: phase-34-intelligence
Affects-specs: none
Detail: Built `scripts/timeshift.js` to check whether BUG-038 was one instance
or a class, and ran the suite 30 days ahead. Six failures — and all six are
artifacts of the tool, which patches `Date` in-process but cannot shift
subprocess clocks or filesystem mtimes. Five failed at a process boundary, one
against a stamp-file mtime. **Zero further real bombs.** Recorded as a null
result rather than dressed up as findings, and the tool is deliberately NOT
wired into `npm test`: a check carrying six standing false positives is one
people learn to skip, which is the failure Phase 33 already paid for.

---
