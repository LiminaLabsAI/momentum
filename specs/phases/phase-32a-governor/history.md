---
type: History
status: in-progress
epic: autonomous-execution
---

# Phase 32a — Governor — History

> Append-only (Rule 8). Types: `[DECISION]` `[SCOPE_CHANGE]` `[DISCOVERY]`
> `[FEATURE]` `[ARCH_CHANGE]` `[EVALUATOR]` `[NOTE]`.

### [DISCOVERY] 2026-07-27 — Swarm's wave runner has never run in production
Topics: swarm, autopilot, dead-code, bug-031, call-path-guard
Affects-phases: phase-32a-governor, phase-32d-cross-repo
Affects-specs: core/swarm/conductor.js, bin/swarm.js, core/swarm/supervise.md
Detail: Traced while auditing what autonomy already exists. `pollTurn`
(`conductor.js:305`), which contains the entire `--mode autopilot` wave-advance
branch (`:376`), has **zero production callers** — it appears only at its
definition, its export, and in two test files. There is no `poll` subcommand
among `bin/swarm.js`'s 20 dispatched verbs. `recordRepoComplete` is likewise
definition-and-export only. And `buildSpawnDirectives` is invoked exactly once,
at `bin/swarm.js:170`, hardcoded `waveIndex: 1` — nothing ever builds directives
for wave 2+. Supervisors write saga records that nothing reads; `board.json`
freezes at wave-1-start. Undetected because the e2e tests bypass the CLI and
drive the reconciler in-process, which Phase 18's own history entry states
plainly. Filed **BUG-031**. This is the BUG-028/029/030 class, and v0.42.0's
call-path guard does not cover `core/swarm/` — G5 extends it over `core/run/` so
this phase cannot repeat the defect it was named after.

---

### [DISCOVERY] 2026-07-27 — The cross-repo nudge halts in-flight phases
Topics: ecosystem, hooks, cross-repo-gate, bug-032, advice-vs-gate
Affects-phases: phase-32a-governor, phase-32d-cross-repo
Affects-specs: core/scripts/cross-repo-gate.sh, core/ecosystem/lib/cross-repo.js
Detail: Operator reported that ecosystem-mode sessions could not finish a single
phase in one go, with no swarm involved. Cause found in
`routingMessage()` (`cross-repo.js:120`): the hook is correctly advisory — always
`exit 0`, and its header documents why blocking would be wrong (ADR-0017 E1) —
but the message reads `→ Run /brainstorm-initiative to open one before going
further.` An agent mid-phase obeys the wording, not the exit code. Fires once per
session **per member**, so an N-repo feature halts N times. Filed **BUG-032**;
fix lands in 32d (suppress when a run grant covers the members; reword from
imperative to observation).

---

### [DECISION] 2026-07-27 — Governor invariant is "the next unit starts", not "block the stop"
Topics: governor, adapters, interceptor, reinvoker, portability
Affects-phases: phase-32a-governor, phase-32c-adapter-parity
Affects-specs: core/run/CONTRACT.md
Detail: The first draft specified a `Stop` hook that blocks the agent from
stopping. Research into the other three adapters showed that abstraction is
Claude-Code-shaped: Codex exposes only `notify`/`agent-turn-complete` and
opencode only `session.idle`, both fire-and-forget (opencode issue #16879 is an
open upstream request for the awaiting behaviour that would be required).
Antigravity's five-event surface *does* include `Stop` (live-verified in Phase
22b). So all four adapters can **detect** a stop; only two can **prevent** one.
Reframing the invariant as *"the next unit starts"* admits two backends —
interceptor (block + inject) and re-invoker (observe + relaunch against the
manifest) — and the re-invoker is the external-driver architecture momentum
wanted eventually anyway. The weaker adapters bought the better design. 32a
ships the interceptor only (P4); 32c implements the re-invoker against
`CONTRACT.md`.

---

### [DECISION] 2026-07-27 — Decision authority reuses Rule 14's escalation triggers
Topics: decision-authority, rule-14, blast-radius, adr-0019
Affects-phases: phase-32a-governor
Affects-specs: specs/decisions/0019-decision-authority-model.md
Detail: The design needed a way to separate decisions the agent may take alone
from those requiring the operator. Rather than invent a taxonomy for the operator
to author, the classifier reuses Rule 14's existing escalation triggers (>5
production files, `specs/architecture/` touched, needs-ADR, public-contract
change) — which already encode blast radius, are already mechanically checkable,
and are already familiar. Zero new vocabulary, zero configuration burden.
`specs/config.md` carries only per-project overrides. Ambiguity parks rather than
guessing (D6). Recorded as ADR-0019 in G0.

---

### [DECISION] 2026-07-27 — Specs derived just-in-time; never authored upfront
Topics: spec-driven-development, jit-derivation, amendments, rule-10
Affects-phases: phase-32a-governor, phase-32b-epic-tier
Affects-specs: specs/epics/0001-autonomous-execution.md
Detail: The operator's initial framing allowed "write all phases' specs upfront"
as a configurable option. Rejected — and the operator's own follow-up scenario is
what killed it. They asked what happens when, after phase 1, they observe
something and want to amend a decision. Under upfront authoring an amendment
means hunting through already-written specs, editing them, and reconciling against
tasks already checked `[x]` — every correction becomes a merge conflict. Under
just-in-time derivation the amendment is simply an input when the later phase's
specs are generated. This also honours Rule 10's premise that implementation
invalidates plans. The operator is never re-interviewed because **decisions** are
durable and recorded in the epic; **plans** are perishable and regenerated.

---

### [NOTE] 2026-07-27 — Momentum has been running epics for months without a record type
Topics: epic, tier, naming, phase-families
Affects-phases: phase-32a-governor, phase-32b-epic-tier
Affects-specs: specs/epics/0001-autonomous-execution.md
Detail: Observed while deciding whether a new tier was warranted. `21a/b/c`
(Lanes Walk/Run/Fly), `30a/b/c/d/e` (Team mode) and `31a/b/c` (Ecosystem) are each
one settled design executed across several phases — an epic in everything but
name, held together by operator memory rather than by a record. The letter-suffix
convention *is* the missing tier. Epic 0001 therefore uses the same convention
(32a/b/c/d) rather than introducing a competing one, which also means the new
record type describes work the project already does.

---

### [FEATURE] 2026-07-27 — G0 contracts landed: ADR-0019, run schema, governor contract, trigger table
Topics: decision-authority, governor, run-manifest, adr-0019, contracts
Affects-phases: phase-32a-governor, phase-32c-adapter-parity
Affects-specs: specs/decisions/0019-decision-authority-model.md, core/run/CONTRACT.md, core/run/schema/run.schema.json, core/run/lib/authority-triggers.js
Detail: G0 ships shapes, not behaviour — deliberately, so G1 and G2 cannot drift
while they proceed in parallel and so 32c implements the re-invoker against a
written contract rather than against 32a's code. Four artifacts: **ADR-0019**
(authority is a pure function of `(changeSet, config)`, no model judgement in the
hot path, ambiguity parks); **`run.schema.json`** versioned `schema_version: 1`
from the first commit, tier-agnostic by assertion (a test fails if any
tier-specific field leaks to the top level), with the floor rules encoded as
*type constraints* rather than prose — `push: never` is unrepresentable rather
than merely discouraged; **`CONTRACT.md`** stating the single invariant *"the
next unit starts"* plus the 7-branch decision order, with the kill switch ranked
second because the agent is the thing that may be misbehaving; and the **trigger
table as frozen data**, covering all five Rule-14 triggers and classifying edits
to *itself* as operator-authority so a run cannot widen its own boundary and log
it as routine. Verification: `tests/run-contracts.test.js` **16/16**; full suite
**1177/1177** (baseline 1161 + 16 net-new), zero regressions.

---

### [FEATURE] 2026-07-27 — G1 classifier + G2 park primitive landed
Topics: decision-authority, park, inbox, lock, swarm, adr-0019, adr-0003
Affects-phases: phase-32a-governor
Affects-specs: core/run/lib/authority.js, core/run/lib/inbox.js, core/run/lib/lock.js, core/swarm/inbox.js, core/swarm/lib/manifest.js
Detail: **G1** — `classify(changeSet, config)` is a pure function returning
`operator | agent | park` plus the trigger evaluation that produced it. The
widen-only rule is enforced by *clamping* rather than by documentation: a config
asking for a file threshold of 50 gets 5, and floor triggers have no disable path
at all (asserted by a test that passes a `disable:` key and watches it be
ignored). Path normalization covers `./`, leading `/` and backslashes so a floor
trigger cannot be slipped past by spelling. The ambiguous fall-through — the
DEFAULT branch, and therefore the one most likely to ship untested — is covered
for six malformed inputs. 21 tests.

**G2** — the inbox moved to `core/run/lib/inbox.js` and swarm became a thin
adapter. Two refinements beyond the plan. First, the mkdir lock came with it:
leaving a second copy in `core/swarm/lib/manifest.js` would have been exactly the
duplication ADR-0018 exists to end, and a lock is a bad place to discover drift —
so `core/run/lib/lock.js` is now the one implementation, with a **parametrized
error label** reproducing swarm's timeout message byte-for-byte (ADR-0003's
technique for extracting the wave engine without touching a swarm assertion).
Second, the field label is parametrized: swarm keeps writing `- Repo:` while runs
write `- Scope:`, and the reader accepts both, so inbox items written before this
phase still parse. The optional `- Reason:` line is omitted entirely when absent,
which is what keeps swarm's on-disk format identical. **236/236 swarm tests
green** — the gate. 15 new tests.

Verification: full suite **1198/1198** after G1 (1177 + 21).

---

### [FEATURE] 2026-07-27 — G3: the governor exists, and its production path is tested as a subprocess
Topics: governor, interceptor, kill-switch, budget, strikes, call-path, bug-031
Affects-phases: phase-32a-governor, phase-32c-adapter-parity
Affects-specs: core/run/lib/governor.js, core/run/lib/manifest.js, core/run/lib/hook.js, core/scripts/run-governor.sh, adapters/claude-code/settings.json, adapters/antigravity/hooks.json
Detail: The keystone. `decide()` is pure — no I/O, no clock — so the seven
branches are testable without a live agent, and the branch ORDER is asserted
rather than assumed: a test drives a run with a healthy budget, no strikes and no
parks, engages the kill switch, and requires the kill-switch reason to win. A
kill switch that ranks below anything else is not a kill switch.

Two design corrections surfaced during implementation. **(1)** `recordTurn` had
to be split out of `advance`. `advance` is idempotent by cursor so a doubled
backend event cannot skip a unit — but that means a turn counter living inside it
would no-op on repeat, and a run re-entering the same unit would loop forever
without ever reaching its turn budget. The runaway guard would have been present
and silently disabled. One function moves the cursor; the other counts turns.
**(2)** The continuation message names parked units as off-limits rather than as
a halt, which is what makes parking non-blocking in practice rather than only in
the ADR.

**The production call path is exercised for real.** Four tests spawn
`core/scripts/run-governor.sh` as a subprocess exactly as the host fires it, and
assert its real exit codes: no run → 0 (untouched), live run → **2** with the
continuation on stderr and the turn counted, kill switch → 0 with `stopped`
recorded, corrupt manifest → 0. This is the discipline BUG-031 lacked — `pollTurn`
was green for a year because its tests called it directly and production never
did.

Verification: 37 tests in `run-governor.test.js`; 4 fingerprints re-baselined
after confirming the drift was **only** `settings.json`, `hooks.json` and the new
script; full suite **1250/1250**.

---

### [DISCOVERY] 2026-07-27 — Hook scripts install to adapters that cannot use them
Topics: adapters, packaging, capability-gating, governor
Affects-phases: phase-32c-adapter-parity
Affects-specs: core/scripts/run-governor.sh, bin/momentum.js
Detail: `core/scripts/` installs wholesale to every adapter, so Codex and
opencode now receive `run-governor.sh` even though neither wires it — their hook
surfaces can only observe a turn ending, so the interceptor script is inert
there. Harmless today (an uninvoked file) and consistent with how momentum has
always shipped scripts, but it means the installed tree advertises a capability
the adapter does not have. 32c should decide whether script installation becomes
capability-gated, or whether both backends' scripts simply ship everywhere and
the capability flag remains the single source of truth. Not filed as a bug — it
is a packaging question 32c has to answer anyway.

---

### [DECISION] 2026-07-27 — Park primitive extracted in 32a rather than stubbed
Topics: park, inbox, swarm, scope
Affects-phases: phase-32a-governor
Affects-specs: core/run/lib/inbox.js, core/swarm/inbox.js
Detail: G2 was a candidate for deferral to 32b to keep this phase lean. Kept,
because the authority classifier's `ambiguous → park` branch (D6) is its *default*
path — deferring the sink would ship the most-taken branch untested against a
real implementation. Swarm's inbox is the only park primitive that already exists
and is already tested, so extraction into `core/run/lib/inbox.js` with swarm
re-pointed as a consumer follows ADR-0003's one-engine/thin-adapter pattern. The
236 swarm tests are the gate.
