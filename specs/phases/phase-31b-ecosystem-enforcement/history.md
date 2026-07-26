---
type: History
status: in-progress
---

# Phase 31b — Ecosystem Enforcement — History

### [DECISION] 2026-07-27 — E1: enforcement is layered across two axes, not consolidated on one
Topics: adr-0017, enforcement, detection, git-hooks, agent-hooks
Affects-phases: phase-31b-ecosystem-enforcement
Affects-specs: specs/decisions/0017-layered-ecosystem-enforcement.md
Detail: Operator decision. 31a moved enforcement onto the git axis (ADR-0016 D1)
because agent tool-hooks are bypassed by the three things cross-repo work does
constantly — lane worktrees, forge-API merges, and container-directory launches.
But detection has a requirement the write path did not: it must fire BEFORE the
mistake, and a git hook fires after the commit. Rather than weaken D1 or accept
late detection, 31b splits the two roles. Git-native carries the teeth (the
landing gate refuses; the post-commit banner records and reports, agent-
independently). The agent hook carries the nudge, firing before the edit where a
git hook cannot. ADR-0016 D1 already sanctioned exactly this when it demoted
agent hooks rather than deleting them: "they remain useful — they can prompt
before a mistake, where a git hook only fires after the commit". Rejected:
git-native-only (correct but only ever tells you after the work exists) and
agent-hook-only (preventive but re-creates the bypass gap 31a was built to
escape).

---

### [ARCH_CHANGE] 2026-07-27 — E2: detection needs no new substrate
Topics: adr-0017, detection, event-stream, fragments, single-source
Affects-phases: phase-31b-ecosystem-enforcement
Affects-specs: core/ecosystem/lib/detect.js
Detail: The obvious implementation of "has this session touched a second member"
is a new per-session tracking mechanism. It is unnecessary: 31a's write path
already records `{actor, ts, member}` for every commit, so the question is a
QUERY over data momentum already collects — "this actor has events in ≥2 members
within the window, and no in-progress initiative's repos[]/contributions[] covers
them". Building a parallel tracker would create a second source of truth to keep
honest, which is the failure mode this arc exists to close. Consequence worth
noting: the coverage query is pure file reads over the fragment stream and
`initiatives/` with NO git calls, which is what makes it cheap enough to run from
a PreToolUse hook on every edit.

---

### [DECISION] 2026-07-27 — E3/E4/E5: landing order lives in `lanes land`, derives from edges, reads recorded events
Topics: adr-0017, landing-order, enh-068, lanes, ownership
Affects-phases: phase-31b-ecosystem-enforcement
Affects-specs: core/lanes/lib/land.js, core/ecosystem/lib/detect.js
Detail: Three linked decisions for ENH-068. (E3) `lanes land` becomes
ecosystem-aware rather than momentum gaining a cross-repo orchestrator — each
member still lands with its own command, which now also consults the ecosystem
edges. A true orchestrator would have to drive merges in repos it does not own,
crossing the boundary 31a deliberately respected, and would add a fourth
cross-repo concept against ADR-0016 D4. (E4) Order derives from the REGISTERED
edges rather than a declared sequence: edge `{from: frontend, to: backend}` means
backend lands first, so the order cannot drift from the dependency it represents
— and 31a already made edge registration automatic via `initiative start --edge`.
(E5) "Landed" is a recorded `land` event, not an inferred state; inferring from
branch or merge state means guessing about repos this machine may not have
checked out, the same reason the 31a completion gate blocks on absent members
rather than skipping them.

---

### [DECISION] 2026-07-27 — E7: the rules text is corrected in the same release as the mechanism
Topics: adr-0017, honesty, bug-009, rules, d8
Affects-phases: phase-31b-ecosystem-enforcement
Affects-specs: core/instructions/rules-body.md, core/ecosystem/templates/
Detail: 31a deliberately labelled its cross-repo routing "convention, not
enforcement" (ADR-0016 D8), because nothing detected cross-repo scope. Shipping
detection without correcting that wording would make the rules wrong in the
opposite direction — and a rule that understates is only marginally better than
one that overstates, since both teach agents to distrust the text. The honest
post-31b statement is specific rather than blanket: the routing NUDGE is
best-effort (an agent hook, bypassable exactly where 31a documented); the LANDING
GATE is enforced (it refuses); the WRITE PATH is unconditional (a git hook,
agent-independent). G4 additionally ships a test asserting the rules text carries
that distinction, so it cannot silently drift back. BUG-009 — Rule 6 claiming
"(Automatic)" over prose no mechanism backed — is the precedent being mechanized
against.

---

### [SCOPE_CHANGE] 2026-07-27 — all five deliverables in one phase
Topics: scope, phasing, enh-067, enh-068, doc-sync
Affects-phases: phase-31b-ecosystem-enforcement
Affects-specs: specs/status.md
Detail: Operator chose the full five-item scope over a four-item trim (deferring
cross-repo doc-sync delivery) or a 31b/31c split. So this phase carries
detection + nudge, fleet orient (ENH-067), dependency-ordered landing (ENH-068),
handoff-delivered cross-repo doc sync, and the ecosystem-tier Rule rewrite.
Note the Rule rewrite was never optional under either alternative — E7 makes it
a correctness requirement of shipping detection at all, not a documentation
nicety that could be deferred.

---

### [NOTE] 2026-07-27 — the two decisions taken without asking
Topics: design, ownership, lanes, detection
Affects-phases: phase-31b-ecosystem-enforcement
Affects-specs: none
Detail: Recorded for a future reader wondering why these were not operator
decisions. Both follow directly from precedent already set and approved in 31a,
and were surfaced to the operator at brainstorm rather than buried: (1)
`lanes land` becomes ecosystem-aware rather than adding a new cross-repo
orchestrator — follows ADR-0016 D4 (no new concept) and the ownership boundary;
(2) detection queries the existing event stream rather than adding a tracker —
follows the single-source-of-truth discipline the whole arc is built on. Either
could have been an operator question; neither had a live alternative worth the
round-trip.

---
