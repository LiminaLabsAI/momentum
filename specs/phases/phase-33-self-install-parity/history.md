---
type: History
status: in-progress
---

# Phase 33 — Self-Install Parity — History
### [DISCOVERY] 2026-07-28 — momentum's own install was seven files behind what it ships
Topics: self-install-parity, drift, release-hygiene
Affects-phases: phase-33-self-install-parity
Affects-specs: none
Detail: The G1 guard, on its first real run, found 2 missing recipes
(`brainstorm-initiative.md`, `complete-initiative.md`) and 5 stale files. Two are
notable beyond bookkeeping: `scripts/cross-repo-gate.sh` was the pre-v0.43.1
build — momentum was running the buggy version of a fix it shipped that same day
— and `sync-docs.md` predated the Phase 31b handoff-delivery requirement, the
very rule whose absence let a reviewed multi-repo session drop its glossary
propagation. Repaired with `selfcheck --fix`.

---

### [ARCH_CHANGE] 2026-07-28 — The installed surface has one declaration, three readers
Topics: self-install-parity, install-surface, adr-0018
Affects-phases: phase-33-self-install-parity
Affects-specs: none
Detail: G1's first parity engine derived the surface from `adapter.destinations`
alone, which made it blind to the two files the installer copies out of
`core/ecosystem/` as special cases (`session-append.sh`, `orient.js`) and to the
one it conditionally deletes (`run-governor.sh` on re-invoker adapters). That is
a hole exactly where parity breaks: special cases are what people forget to
update, so had `session-append.sh` gone stale the checker would have answered
"no drift". Extracted `core/install/extras.js` — previously open-coded twice in
`bin/momentum.js` (init and upgrade) — now read by all three. Surface 51 → 53.

---

### [DISCOVERY] 2026-07-28 — BUG-035: the governor CLI stored flag-shaped positionals
Topics: run-cli, durable-record, tdd-gate
Affects-phases: phase-33-self-install-parity
Affects-specs: none
Detail: `momentum run decide --what "…"` stored the literal `--what` as the
decision summary and exited 0. Found by walking into it during this phase. Two
harms: `decisions[]` is what the epic tier reads, and `check-task` matches the
red→green task string exactly — so a poisoned entry fails a strict-TDD gate much
later for reasons unrelated to the cause. Fixed with a shared `positional()`
refusal across all five payload-carrying subcommands; this run's own poisoned
entries were repaired in place. Filed and resolved as BUG-035.

---
### [NOTE] 2026-07-28 — Phase 33 closed under a governed run
Topics: self-install-parity, dogfooding, governor
Affects-phases: phase-33-self-install-parity
Affects-specs: specs/project-rules.md#release-checklist
Detail: G0→G2 executed end-to-end under run_0bd78b54 (budget 40 turns, used 1;
release=per-phase, tdd=strict) — the first phase momentum has run under its own
governor. The strict-TDD gate did its job twice: it required a recorded red→green
before G1's tasks could be marked, and BUG-035's poisoned task string would have
made that gate refuse later for an unrelated-looking reason. `momentum selfcheck`
added to the release checklist as item 3, beside `verify-published.sh`.

---
### [NOTE] 2026-07-28 — The installer refactor was verified through the installer, not only the library
Topics: self-install-parity, install-surface, verification
Affects-phases: phase-33-self-install-parity
Affects-specs: none
Detail: `selfcheck` reporting green did NOT prove the refactored installer
correct — momentum's own install had been repaired by `--fix` copying from
source, not by running `init`/`upgrade`. Closed the gap directly: real `init`
into fresh repos for both backend classes (claude-code keeps `run-governor.sh`,
opencode correctly does not; special-case copies byte-exact and executable), then
real `upgrade` on both, confirming upgrade does not restore the script it just
removed — the exact 32c regression. Also confirmed this is covered by an existing
automated test rather than only by that manual pass: the opencode fingerprint
fixture pins `session-append.sh`/`orient.js` present and `run-governor.sh` absent,
so a regression fails in all three directions.

---
### [DISCOVERY] 2026-07-28 — BUG-036: the governor could not report success
Topics: governor, run-lifecycle, dogfooding
Affects-phases: phase-33-self-install-parity
Affects-specs: core/run/CONTRACT.md
Detail: Absorbed as a forward-only amendment to this run. Phase 33 finished and
the Stop hook kept re-invoking the agent to do work that no longer existed:
`status: complete` shipped in the 32a schema and `setStatus` always accepted it,
but no command could reach it. A declared state with no production path —
BUG-031's shape a THIRD time in this epic, and one the orphan guard structurally
cannot see, because it walks exports rather than schema enums. The consequence
was that a finished run stayed `running`, branch 7 answered `continue` forever,
and the run ended only by exhausting its budget as `budget-turns`: every success
was indistinguishable from a runaway. Fixed with `momentum run complete` and a
dedicated COMPLETE branch ranked above the budget rail but still below the kill
switch. The re-invoker driver was blind identically — its success path asserted
the string "run is not in a running state".

---

### [NOTE] 2026-07-28 — The parity guard caught its own author, same session
Topics: self-install-parity, vendored-runtime
Affects-phases: phase-33-self-install-parity
Affects-specs: none
Detail: Editing `core/run/lib/governor.js` for BUG-036 silently staled the
vendored copy at `.momentum/runtime/run/lib/governor.js`, and the new
`tests/self-install-parity.test.js` failed the suite on it within minutes. Before
this phase nothing in momentum's own repo would have noticed — the hooks would
have kept running the previous build of the governor, which is precisely how
`cross-repo-gate.sh` came to sit at its pre-v0.43.1 version. Repaired with
`selfcheck --fix`.

---
