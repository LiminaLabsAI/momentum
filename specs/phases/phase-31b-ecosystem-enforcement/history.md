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
### [FEATURE] 2026-07-27 — G3 complete: dependency-ordered landing (ENH-068)
Topics: g3, enh-068, landing-order, lanes, adr-0017
Affects-phases: phase-31b-ecosystem-enforcement
Affects-specs: core/ecosystem/lib/landing.js, core/lanes/lib/land.js
Detail: Rule 6's Landing Order now extends across members. `lanes land` resolves
the in-progress initiative declaring this member's contribution, treats every
`ecosystem.json` edge with `from == this member` as upstream, and refuses until
each upstream has recorded a `land` event for THIS initiative. The refusal names
the member, its contribution, and the edge kind — "not landable" alone would
leave the operator to go find out why, which is how the ordering was tracked in
prose in the first place. When the land would complete the initiative's final
contribution, the declared integration verify must pass first: the same check
`initiative complete` runs, brought forward to the moment it can still PREVENT
the bad cross-repo state rather than merely decline to record it (the alembic
multiple-heads shape). Suite 1108 → 1121.

---

### [DECISION] 2026-07-27 — two scoping rules that keep the gate from crying wolf
Topics: landing-order, false-positives, edges, design
Affects-phases: phase-31b-ecosystem-enforcement
Affects-specs: core/ecosystem/lib/landing.js
Detail: Implementing the gate surfaced two ways a naive version would block
legitimate work, and both are now explicit. (1) An edge to a member with NO
contribution in this initiative does not block. `ecosystem.json` edges describe
standing architectural dependencies; only a member actually changing something
for this initiative has anything to land. Without this, every registered edge
would become a permanent blocker the moment any initiative opened. (2) A `land`
event only counts for the initiative it names. Landing backend for unrelated work
says nothing about whether backend's contribution to THIS initiative is in.
Both are asserted. The general principle: a gate that fires on work it should not
is worse than no gate, because operators learn to reach for `--force-order` by
reflex — which is precisely the failure mode `--no-verify` demonstrates.

---

### [NOTE] 2026-07-27 — solo safety is asserted, not assumed
Topics: invariance, solo, lanes, regression-risk
Affects-phases: phase-31b-ecosystem-enforcement
Affects-specs: tests/ecosystem-landing-order.test.js
Detail: `lanes land` is used overwhelmingly by single-repo projects, so the
ecosystem gate had to be provably inert for them. Four separate states now assert
`applicable: false` with zero output — no ecosystem at all, a repo that is not a
registered member, a member with no in-progress initiative declaring a
contribution, and an initiative that has closed. The call site in land.js is
additionally wrapped in a try/catch so an absent or unreadable ecosystem layer
degrades to solo behavior rather than breaking a merge. Recorded because "it
only affects ecosystems" is the kind of claim that is easy to assert and easy to
get wrong.

---
### [FEATURE] 2026-07-27 — G2 complete: cross-repo detection + routing nudge
Topics: g2, detection, nudge, adr-0017, e1, ac-4
Affects-phases: phase-31b-ecosystem-enforcement
Affects-specs: core/ecosystem/lib/cross-repo.js, core/scripts/cross-repo-gate.sh, core/git-hooks/eco-event.js
Detail: Both halves of E1 are live. The git-native banner fires from post-commit
whenever a commit lands in an uncovered second member — verified with a plain
`git commit` and no agent at all, which is the point: it covers humans, scripts,
and any agent whose nudge was bypassed. The PreToolUse nudge fires BEFORE the
write, always exits 0, and fires once per session per member (keyed by the
adapter's session_id, time-throttled when none is supplied). Its value is AC-4:
it names the target member's open P0/P1, so the message reads "frontend: P1
BUG-001 — Cost formatter shows 'Not specified' for sub-cent values" rather than
"this is cross-repo work". That is precisely the information the reviewed session
lacked while rewriting that exact formatter. Registered across all four adapters;
`cross-repo.js` is parity-fenced against `detect.js`. Suite 1121 → 1131.

---

### [DISCOVERY] 2026-07-27 — three silent-failure bugs, all found by running it
Topics: stderr, realpath, hooks, testing, silent-failure
Affects-phases: phase-31b-ecosystem-enforcement
Affects-specs: core/scripts/cross-repo-gate.sh, core/git-hooks/post-commit, core/git-hooks/post-merge
Detail: Every one of these produced a working-looking feature that emitted
nothing, and none would have been caught by reasoning about the code.
(1) `cross-repo-gate.sh` redirected node's stderr to /dev/null to keep failures
quiet — but the nudge itself is written to stderr, so the redirect suppressed
exactly the message the hook exists to print. (2) The same `2>/dev/null` in the
`post-commit`/`post-merge` wrappers hid the banner; both now rely on
run-check.js's try/catch for silence instead. (3) Member matching realpath'd the
member directory but not the target, and since a PRE-write hook by definition
runs before the file exists — often before its directory exists — macOS resolved
one side to /private/var and the other to /var, so they never matched and the
nudge silently never fired for a new file in a new directory. Fixed with a
`realish()` helper that realpaths the nearest existing ancestor and re-appends
the rest. The pattern worth carrying forward: a feature whose failure mode is
SILENCE cannot be verified by inspection — it has to be run.

---

### [ARCH_CHANGE] 2026-07-27 — the shipped-runtime duplication is now a pattern, not an incident
Topics: packaging, duplication, shipped-runtime, td-012
Affects-phases: phase-31b-ecosystem-enforcement
Affects-specs: core/git-hooks/eco-event.js, core/ecosystem/lib/orient.js, core/ecosystem/lib/cross-repo.js
Detail: Three files now exist as deliberate self-contained duplicates because an
installed project receives no copy of momentum's `core/`: `eco-event.js` (31a),
`orient.js` (31b G1), and `cross-repo.js` (31b G2). Each is node-builtins-only,
each ships beside the hook that needs it, and each is fenced by a parity test
against the core implementation it mirrors. That discipline is holding — the
parity tests are cheap and have caught nothing yet precisely because they exist —
but three instances is a pattern rather than an incident, and the next one should
not be written before the packaging question is answered properly. Filed as
TD-012: define a shipped-runtime story (a single versioned `momentum-runtime`
directory installed into targets) instead of growing per-feature duplicates.

---
### [FEATURE] 2026-07-27 — G4 complete: doc-sync delivery + the honesty correction
Topics: g4, e6, e7, sync-docs, handoff, rules, bug-009
Affects-phases: phase-31b-ecosystem-enforcement
Affects-specs: core/commands/sync-docs.md, core/ecosystem/lib/pointer.js, core/ecosystem/templates/
Detail: Two changes, both about making an existing rule actually land. (E6)
`/sync-docs` now DELIVERS its cross-repo entries as structured handoffs into the
target member's inbox rather than mentioning them in chat. The ownership rule is
untouched and still absolute — it never edits a `../` path — but "flag it to the
user" was a message that died with the session, which is exactly why one reviewed
session's glossary propagation never happened DESPITE the rule working as
designed. Delivery is not ownership: the receiving repo's own agent decides what
to change. (E7) The rules text now states each layer's real strength in a
three-row table — write path unconditional, landing gate enforced, nudge
best-effort — with the reason for each. 31a's "convention, not enforcement"
wording is removed, deliberately NOT replaced by a blanket "enforced" claim, and
three tests now assert the distinction survives future editing. Suite 1131 → 1134.

---

### [DECISION] 2026-07-27 — understating is as corrosive as overstating
Topics: e7, honesty, rules, bug-009, testing
Affects-phases: phase-31b-ecosystem-enforcement
Affects-specs: tests/cross-repo-nudge.test.js, tests/pointer-block-content.test.js
Detail: BUG-009 was filed because Rule 6 claimed "(Automatic)" over prose no
mechanism backed. 31a over-corrected into the opposite error, labelling routing
"convention, not enforcement" — correct at the time, wrong the moment detection
shipped. The lesson recorded here is that BOTH directions cost the same thing:
an agent that finds the rules text wrong once discounts all of it, and it cannot
tell whether the error was optimistic or pessimistic. So the fix is not "be
conservative", it is "be specific" — name the strength of each layer separately
and say why. And because prose drifts, three tests now assert the distinction is
present rather than trusting a future editor to preserve it. That is the part
that makes this different from the last two attempts.

---
### [DISCOVERY] 2026-07-27 — a latent 31a defect: ecosystem-root discovery walks up but not sideways
Topics: discovery, find-root, events, td-013, silent-failure
Affects-phases: phase-31b-ecosystem-enforcement
Affects-specs: core/ecosystem/lib/events.js, specs/backlog/backlog.md
Detail: `core/ecosystem/lib/index.js` `findRoot()` walks UP ONLY, but
`core/ecosystem/layout.md` documents the ecosystem root as a SIBLING of its
members — the layout `ecosystem init` + `ecosystem add ../<repo>` actually
produce. Five discovery implementations exist across momentum and the other four
all scan siblings; `findRoot` is the outlier. It stayed hidden through all of
31a because the git hooks carry their own sibling-aware resolver, so nothing
exercised `findRoot` from a member repo until G3's `recordLand()` called
`recordEvent()` from library code — whereupon it silently returned "no ecosystem"
and the `land` event never recorded. Failure mode: silence. Worked around by
adding `resolveEcosystemRootFrom()` to events.js (mirroring the documented
algorithm) rather than changing `findRoot`, whose up-only semantics other callers
may depend on. Filed TD-013.

---

### [NOTE] 2026-07-27 — G5 complete: verified, dogfooded, at the release gate
Topics: g5, verification, e2e, dogfood, invariance
Affects-phases: phase-31b-ecosystem-enforcement
Affects-specs: specs/phases/phase-31b-ecosystem-enforcement/evidence/verification.md
Detail: Suite 1135/1135 (baseline 1084, +51). Swarm 236/236. OKF 318/318. Solo
repo byte-unchanged — four commits, no directories created, no banner, no extra
output. One e2e asserts all eight acceptance criteria by replaying the reviewed
session's narrative: an agent drifts from backend into frontend where BUG-001 is
already open against the very formatter it is about to rewrite. Cost measured
rather than estimated. The live dogfood against the real 8-member
cerebrio-ecosystem is a TRUE NEGATIVE and is reported as such: this session is
genuinely single-repo, so every enforcement layer correctly stays silent while
orient still reports real fleet state — a gate that fired here would be the
defect. Also observed and deliberately not fixed: 30 stale open lanes across 5
members (BUG-026 class), visible only because the new fleet view exists.

---

### [DECISION] 2026-07-27 — the phase lesson: silence cannot be verified by inspection
Topics: testing, silent-failure, lesson, methodology
Affects-phases: phase-31b-ecosystem-enforcement
Affects-specs: none
Detail: Four defects in this phase shared one failure mode — two `2>/dev/null`
redirects that suppressed the exact messages the hooks exist to print, a realpath
asymmetry that made the nudge never fire for a new file in a new directory, and
an ecosystem-root resolver that walked up but not sideways. Each produced a
feature that looked implemented, read correctly, and emitted nothing. None would
have been caught by inspection; all four were caught by running the thing and
looking at the output. This is the same lesson 31a learned from BUG-028 (a
matcher that could never deliver the tool its script branched on), which suggests
it is structural to this subsystem rather than incidental: hooks are advisory and
fail-open by design, so their bugs do not announce themselves. Recorded as a
standing rule for the ecosystem tier — for any advisory/fail-open path, the
acceptance test must assert the OUTPUT, not the code path.

---
