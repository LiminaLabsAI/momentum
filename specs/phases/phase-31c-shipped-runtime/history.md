---
type: History
status: in-progress
---

# Phase 31c — Shipped Runtime — History

### [DISCOVERY] 2026-07-27 — BUG-030: the cross-repo landing gate has never fired in production
Topics: bug-030, enh-068, discovery, findroot, landing-gate
Affects-phases: phase-31c-shipped-runtime
Affects-specs: core/ecosystem/lib/landing.js, core/ecosystem/lib/index.js
Detail: Found while checking whether `findRoot`'s up-only semantics were even
worth asking the operator about. `core/ecosystem/lib/landing.js:82` calls
`lib.findRoot(repoRoot)` with no fallback, and `lanes land` calls
`landingCheck(repoRoot)` with no injected root. In the STANDARD sibling layout
that `ecosystem init` + `ecosystem add ../repo` produce, `findRoot` returns null,
`landingCheck` returns `applicable: false`, and the entire ecosystem gate is
silently skipped. Verified live: `findRoot(frontend) = null`,
`landingCheck (no root) = applicable: false`, `landingCheck (explicit) =
applicable: true`. **v0.41.0 shipped ENH-068 — its headline deliverable —
non-functional**, and every 31b test passed `ecosystemRoot` explicitly, so none
exercised the discovery path production uses. The two CLIs escape the same bug
only because they fall back to `state.findRegistration`.

---

### [DISCOVERY] 2026-07-27 — three defects, one shape: the test took a path production doesn't
Topics: testing, silent-failure, bug-028, bug-029, bug-030, meta
Affects-phases: phase-31c-shipped-runtime
Affects-specs: none
Detail: The 31a/31b arc produced three bugs with an identical signature — the
test exercised a path production does not take. BUG-028: the test piped
`tool_name:'Bash'` straight into the hook script, bypassing the matcher that
could never deliver it. BUG-029: `orient.js` re-implemented lane-registry
reading with nothing pinning it to the authority. BUG-030: tests injected
`ecosystemRoot` where production must discover it. Notably, Phase 31b shipped a
matcher-reachability test *specifically to close BUG-028's class* — and the class
reproduced twice within hours, in different clothing each time. The conclusion
driving this phase: a parity fence DETECTS drift after someone writes a
duplicate, and a note in a retrospective prevents nothing. The duplicates have to
stop existing, and the injection shortcut has to be closed by a test that
enumerates entry points rather than trusting authors to remember (R6).

---

### [ARCH_CHANGE] 2026-07-27 — R1: the premise behind the duplication was never measured
Topics: adr-0018, td-012, packaging, closure, runtime
Affects-phases: phase-31c-shipped-runtime
Affects-specs: core/git-hooks/eco-event.js, core/ecosystem/lib/orient.js, core/ecosystem/lib/cross-repo.js
Detail: Three hook-side helpers were hand-written as dependency-free mirrors of
core logic on the stated grounds that an installed project receives no `core/`,
so shipping core would be too heavy. Measured for the first time in this
brainstorm: the require closure needed for hooks to use core directly is **9
files, 65 kB** — 4.6% of the package's 1.4 MB unpacked size — and every file in
it is already free of external dependencies, so it copies verbatim. The
duplication was never justified by cost; it was justified by nobody having priced
the alternative. Recording this specifically because I wrote the third duplicate
(`cross-repo.js`) under the unexamined assumption, and BUG-029 came out of the
second. The decision is therefore to DELETE the duplication rather than fence it
better.

---

### [DISCOVERY] 2026-07-27 — discovery is seven implementations across three algorithms
Topics: td-013, discovery, findroot, registration
Affects-phases: phase-31c-shipped-runtime
Affects-specs: core/ecosystem/lib/index.js
Detail: TD-013 was filed as "five implementations, two algorithms". The audit
found seven across three: (1) **up-only walk** — `core/ecosystem/lib/index.js`
`findRoot`, which is the exported API and the only WRONG one, since
`core/ecosystem/layout.md` documents the ecosystem as a SIBLING of its members;
(2) **sibling scan** — `events.js`, `eco-event.js`, `session-append.sh`,
`sessionstart-handoff.sh`, `cross-repo-gate.sh`; (3) **registration lookup** —
`state.findRegistration`, used as the fallback by `bin/ecosystem.js` and
`bin/swarm.js`. Every ad-hoc copy is correct and the sanctioned API is broken,
which is why the bug surfaced in library code (`landing.js`) rather than in a
CLI. Checked all three real `findRoot` callers: none relies on up-only
semantics, so unifying is a safe strengthening rather than a contract break.

---

### [DECISION] 2026-07-27 — R2: one literal relative path instead of a resolver
Topics: adr-0018, runtime, resolution, simplicity
Affects-phases: phase-31c-shipped-runtime
Affects-specs: specs/decisions/0018-shipped-runtime.md
Detail: The runtime lives at `.momentum/runtime/` and is required as the literal
`../.momentum/runtime/…`. This works because `scripts/` and `.githooks/` both sit
exactly one level below repo root, so the same relative path resolves from
either. Deliberately chosen over a resolver function: `cross-repo.js` currently
carries a five-entry candidate list to find `orient.js` because the install
layout differs from the repo layout, and that kind of ad-hoc lookup is precisely
what accumulates into the mess this phase is undoing. The cost is a real
constraint — a future adapter installing hooks at a different depth would break
the path — so G1 ships a test asserting all four adapters install at depth 1.
Taking a constraint plus an assertion over flexibility plus a lookup.

---

### [DECISION] 2026-07-27 — R4: the runtime is committed, not gitignored
Topics: adr-0018, runtime, fresh-clone, gitignore
Affects-phases: phase-31c-shipped-runtime
Affects-specs: .gitignore
Detail: Vendoring 65 kB into a user's repo means upgrade diffs, which is a real
cost. Gitignoring it and regenerating on `upgrade` avoids that but produces a
worse failure: a fresh clone would have hooks that silently no-op until someone
happened to run `upgrade` — the exact silent-failure mode this whole arc keeps
producing (BUG-028's dead matcher, BUG-029's garbage lane count, BUG-030's
skipped gate). `.githooks/` is already committed for the same reason, and
`!.momentum/team/` is the existing precedent for negating a `.momentum/` ignore.
AC-6 (a fresh clone has working hooks with no `upgrade` run) exists to hold this
decision honest.

---

### [DECISION] 2026-07-27 — R8: BUG-030 is fixed inside 31c, not hotfixed first
Topics: bug-030, sequencing, release
Affects-phases: phase-31c-shipped-runtime
Affects-specs: specs/status.md
Detail: Operator decision. BUG-030's fix IS R3 (the unified `findRoot`), so a
separate v0.41.2 would either duplicate the unification or ship a narrower
workaround that 31c then rewrites. Accepted cost, stated plainly: the cross-repo
landing gate stays non-functional on npm until v0.42.0. The mitigating facts are
that ENH-068 has never worked, so nothing regresses, and that the failure is
fail-open — `lanes land` skips the ecosystem check rather than blocking a landing
incorrectly.

---

### [SCOPE_CHANGE] 2026-07-27 — all seven implementations, including the two in bash
Topics: scope, shell, discovery, r5
Affects-phases: phase-31c-shipped-runtime
Affects-specs: core/ecosystem/scripts/session-append.sh, core/scripts/sessionstart-handoff.sh
Detail: Operator chose to collapse all seven discovery implementations rather
than only the five in JS. The two bash walkers (`session-append.sh`,
`sessionstart-handoff.sh`) will delegate to a node entry point in the runtime, so
exactly one implementation of the algorithm exists in the codebase. Not a new
runtime cost: `session-append.sh` already spawns python3 for member resolution
and `sessionstart-handoff.sh` already spawns node for the fleet line, so this
consolidates existing subprocess use. Each keeps its fail-open path, and G3
measures the per-commit cost rather than assuming it (the 31a/31b precedent).
Rejected: leaving bash with its own copy, which would mean any future change to
discovery rules has to be made in two languages — the mechanism by which the
current seven-way split accumulated.

---
### [DECISION] 2026-07-27 — G0 complete: ADR-0018 + one findRoot; BUG-030 fixed
Topics: g0, adr-0018, findroot, bug-030, discovery
Affects-phases: phase-31c-shipped-runtime
Affects-specs: specs/decisions/0018-shipped-runtime.md, core/ecosystem/lib/index.js
Detail: Group 0 done. ADR-0018 records R1–R8. `findRoot` is now the single
resolver — up-walk → sibling scan → registration fallback — and all seven call
sites use it, which fixes BUG-030 as a consequence rather than as a patch:
`landingCheck(dir)` with no injected root now returns `applicable: true` in the
standard sibling layout, where it previously returned false and `lanes land`
skipped the entire cross-repo gate. `events.js`'s 31b-era local resolver is
reduced to a delegation, and both CLIs' bolted-on `findRegistration` fallbacks
are gone. The regression test deliberately drives the PRODUCTION call path and
was demonstrated failing against the pre-31c implementation. Suite 1140 → 1149.

---

### [DISCOVERY] 2026-07-27 — a pre-existing test had codified the bug as intended behaviour
Topics: testing, bug-030, blessed-defect, state-machine-test
Affects-phases: phase-31c-shipped-runtime
Affects-specs: tests/state-machine.test.js
Detail: `tests/state-machine.test.js` → "findRoot honors MOMENTUM_MAX_PARENT_WALK
env override" failed after the unification, on an assertion that a GENEROUS walk
bound still would not find a sibling root. Its own comment explained why:
"eco is a SIBLING of `tmp/a/...` — findRoot only looks at the current dir's
ecosystem.json on each step up… not that sibling-walk is implemented in
findRoot." So the test did not merely miss BUG-030's cause — it documented that
cause as correct behaviour and asserted it. That is a materially worse failure
mode than an absent test, because it actively defends the defect against anyone
who tries to fix it. Rewritten to pin the real contract: the bound is honoured in
BOTH directions (default bound stops short; raised bound reaches the sibling).
Worth carrying forward as a review question — when a test asserts a NEGATIVE
about our own behaviour, is it protecting a contract or protecting a bug?

---

### [ARCH_CHANGE] 2026-07-27 — the AC-2 guard uses a self-cleaning allowlist
Topics: g0, testing, guard, allowlist, honesty
Affects-phases: phase-31c-shipped-runtime
Affects-specs: tests/unified-discovery.test.js
Detail: The "exactly one discovery implementation" assertion cannot be a precise
detector — the heuristic (a file that references the manifest AND walks siblings)
is file-wide, and it produced a false positive on `bin/momentum.js`, whose
sibling scan is the auto-ecosystem prompt asking "are there other momentum
projects here?", a different question entirely. Rather than tune the regex until
it looked clean, every exception is listed WITH ITS REASON, and the test fails
two ways: if an unexplained file appears, and if an allowlisted entry no longer
matches (so the list cannot rot). `core/git-hooks/eco-event.js` is on it marked
`pending G2 rewire`, which makes the phase's own progress visible in the test —
that entry must be gone by G2. Recorded because the tempting alternative was a
cleverer grep that silently swallowed the false positive and would have swallowed
a real eighth implementation too.

---
