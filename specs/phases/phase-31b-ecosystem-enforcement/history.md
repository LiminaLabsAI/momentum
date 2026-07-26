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
### [DECISION] 2026-07-27 — G0 complete: ADR-0017 + the coverage query
Topics: adr-0017, g0, detect, contracts, land-event, config
Affects-phases: phase-31b-ecosystem-enforcement
Affects-specs: specs/decisions/0017-layered-ecosystem-enforcement.md, core/ecosystem/lib/detect.js
Detail: Group 0 done. ADR-0017 records E1–E7 — most importantly WHY enforcement
is split across two axes rather than consolidated: detection must fire before
the mistake and a git hook fires after the commit, so the nudge takes the agent
axis (best-effort, nothing depends on it) while the teeth stay on the git axis
(unbypassable). `core/ecosystem/lib/detect.js` answers the coverage question as
a QUERY over 31a's event stream — no new tracker, and no git calls at all, which
is the property that licenses running it from a PreToolUse hook on every edit
(guarded by a source assertion, not just intent). Three semantics worth pinning:
a CLOSED initiative covers nothing (coverage is live-state, not history); PARTIAL
coverage does not count, and the uncovered member is named because that member is
exactly the part nobody planned; and `opts.extra` lets the caller fold in a
member with no event yet, which is the whole PreToolUse case. `land` added to
EVENT_KINDS. Config: `detect_window_hours` returns null when undeclared (so
callers can tell declared-24 from defaulted-24, mirroring
integration_verify_command), while `landing_order` DEFAULTS to `enforce` — unlike
a verification command momentum cannot invent, the landing order is derivable
from edges momentum registered itself, so defaulting it off would silently
disable a gate nobody opted out of. Suite 1084 → 1098.

---
### [FEATURE] 2026-07-27 — G1 complete: fleet orient (ENH-067)
Topics: g1, enh-067, orient, session-start, packaging
Affects-phases: phase-31b-ecosystem-enforcement
Affects-specs: core/ecosystem/lib/orient.js, bin/ecosystem.js, core/scripts/sessionstart-handoff.sh
Detail: `momentum ecosystem status` and the SessionStart banner now carry each
member's active phase, open P0/P1 items, and lanes — read by parsing the
member's own tracking files, never by importing member-specific code or running
git. `--brief` preserves the pre-31b output for scripts. The design constraint
that mattered most was degradation: a fleet view that dies on one bad member is
useless exactly when it matters, so a missing checkout, an unmanaged member, and
a corrupt table all yield partial summaries rather than an error (asserted).
`memberBrief()` is the shape G2's nudge will use — it is what turns "this is
cross-repo work" into "frontend has BUG-001 open on the cost formatter you are
about to touch" (AC-4). Suite 1098 → 1108.

---

### [DISCOVERY] 2026-07-27 — orient.js had to become dependency-free to ship
Topics: packaging, install, core-not-shipped, orient
Affects-phases: phase-31b-ecosystem-enforcement
Affects-specs: core/ecosystem/lib/orient.js, bin/momentum.js
Detail: The SessionStart banner needed orient, and the banner script runs inside
a MEMBER repo — which receives no copy of momentum's `core/`. The first draft
required `./index` for `resolveMemberLocation`, which works in this repo and
would have silently failed in every install: the fleet line would simply never
appear downstream, with no error to explain why. Caught by asking where the
script actually runs rather than where it lives. Fixed by inlining the minimal
member-path resolution (the `hasLocal`/`localPath` semantics only), making
orient.js node-builtins-only, and shipping it into `scripts/` beside
`session-append.sh` via both `init` and `upgrade`. A test asserts the require
list is exactly `fs`/`path` so the dependency cannot creep back. Same class as
31a's eco-event.js constraint, which is why it was recognized quickly.

---

### [DISCOVERY] 2026-07-27 — real backlog titles are paragraphs, not one-liners
Topics: usability, dogfood, orient, condense
Affects-phases: phase-31b-ecosystem-enforcement
Affects-specs: core/ecosystem/lib/orient.js
Detail: Running the new fleet view against the real 8-member cerebrio-ecosystem
immediately showed the design was wrong in practice: several member P1 titles are
full paragraphs carrying embedded spec catalogues, component lists, and markdown
detail links. The output was unreadable — the precise opposite of orienting, and
it would have been worse inside a nudge. Added `condense()`: strips detail links,
inline code fences and bold markers, cuts at the first natural break, hard-caps
at 72 chars. The member's own backlog remains where you read the whole thing.
Worth noting the sequence — this defect was invisible in the synthetic fixtures
and obvious within one second of real data.

---
