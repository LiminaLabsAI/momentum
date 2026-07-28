---
type: Retrospective
status: complete
epic: autonomous-execution
---

# Phase 32a — Governor — Retrospective

First phase of **Epic 0001 — Autonomous Execution**. Target v0.43.0.

## What shipped

A single approved phase now executes hands-off on the two adapters that can
intercept a stop, with durable state and safety rails that are tested rather
than asserted.

| Group | Delivered |
|---|---|
| G0 | ADR-0019; versioned `run.schema.json`; `core/run/CONTRACT.md`; the Rule-14 trigger table as frozen data |
| G1 | `authority.js` — pure `(changeSet, config) → operator \| agent \| park` |
| G2 | `inbox.js` park primitive + `lock.js`, both lifted out of swarm; swarm a thin adapter |
| G3 | `manifest.js`, `governor.js`, `hook.js`, `run-governor.sh`; Stop wired on Claude Code + Antigravity |
| G4 | `momentum run` CLI; `momentum config validate` (free/coupled/floor); swarm wave runner deprecated |
| G5 | The orphan-export guard; invariance assertion; this retrospective |

## What went well

**Framing the problem as decision-handling rather than autonomy.** The design
turned on one reframe: momentum was not stopping too often because it lacked
autonomy, but because it had no memory of decisions and no way to tell one it
could take alone from one requiring the operator. Every mechanism in this phase
follows from that, and none of it needed a new taxonomy — Rule 14's escalation
triggers already encoded blast radius.

**Measuring the premise before designing against it.** The naive design —
brainstorm exhaustively, then run blind — was killed by counting this repo's own
history logs: 221 `[DECISION]` + 30 `[SCOPE_CHANGE]` entries, every phase
affected, median ~6. That number made "what happens at decision #7" the
question the architecture had to answer, and it took ten minutes to obtain.

**Researching the adapters before committing to an abstraction.** The first
draft specified a hook that blocks the agent from stopping. Checking Codex and
opencode showed that phrasing is Claude-Code-shaped: both can only *observe* a
turn ending. Reframing the invariant as *"the next unit starts"* admitted two
backends — and the re-invoker one is the external-driver architecture momentum
wanted eventually anyway. The weaker adapters bought the better design.

**The orphan guard paid for itself within minutes of existing.** See below.

## What didn't

**The manifest's mutation API shipped with no production caller — in this very
phase, in the code written to fix exactly that class of defect.** `advance`,
`recordDecision`, `recordPark`, `resolvePark`, `recordStrike` and
`clearStrikes` were all built, all unit-tested, and reachable from nothing but
tests. Had G5's guard not been written, this phase would have shipped a governor
that ran while `decisions[]` and `parked[]` stayed permanently empty — BUG-031's
shape, reproduced by the author of BUG-031's fix, inside a week.

The lesson is not "be more careful." Phase 31c already tried that and the class
reproduced twice within hours. The lesson is that **only enumeration catches
this** — a guard that discovers exports itself and fails on new ones, rather
than a habit anybody has to remember. The fix was six new CLI subcommands
(`run advance|decide|park|resolve|strike|clear-strikes`), which are also the
surface an agent inside a run actually needs.

**Eight helpers were exported "for tests."** The same guard flagged them. Each
was either wired to a real consumer (`REASON` and `DEFAULT_PARK_THRESHOLD` now
render in `run status`) or unexported, with the affected assertions rewritten
against the public surface. "Exported for testing" is how dead code starts.

**Two fingerprint re-baselines in one phase.** Hook wiring, then recipe edits.
Both were verified drift-only-as-intended before rewriting, but batching the
adapter-visible changes would have been one pass instead of two.

## What was learned

1. **A guard nobody has seen fail is a guard nobody knows works.** The orphan
   test writes a synthetic unreachable export, asserts the detector goes red,
   removes it, and asserts green again. Costs four lines; converts a belief
   into evidence.

2. **Idempotence and counting are different concerns and must not share a
   function.** `advance` is idempotent by cursor so a doubled backend event
   cannot skip a unit. A turn counter inside it would have no-opped on repeat —
   a run re-entering the same unit would have looped forever without reaching
   its turn budget. The runaway guard would have been present and silently
   disabled. Splitting `recordTurn` out is the entire fix, and the reasoning is
   now a test.

3. **Make bad options unrepresentable rather than discouraged.** `push: never`
   is absent from the enum, so no project can select it and no validator has to
   catch it. Compare the coupled rules, which *are* checks — the difference is
   whether a wrong value can exist at all.

4. **A refusal that does not explain itself teaches nothing.** Every config
   violation names the rule and states why. `release: per-feature` + `tdd:
   opt-in` is refused with "one approval covering several phases of diff is not
   a review anybody performs" — which is the actual argument, not a policy
   citation.

5. **The operator's objection improved the design.** The mid-run amendment
   scenario they raised (observing something after phase 1 and wanting to change
   a decision) is what settled just-in-time spec derivation: under upfront
   authoring every operator correction becomes a merge conflict against specs
   already written and tasks already checked off.

## Deferred

| Item | To |
|---|---|
| Re-invoker backend (Codex, opencode) | 32c |
| `epic` tier, JIT spec derivation, scope grant (ADR-0020), amendments | 32b |
| Removal of swarm's wave runner (deprecated here) | 32d |
| Widening the orphan guard beyond `core/run/` | 32d |
| Capability-gating script installation (see `[DISCOVERY]` in history) | 32c |
| `tdd: strict` enforcement at the task-marking layer | 32b — needs the epic runner to have a task layer to enforce against |

## Verification Evidence

Captured 2026-07-27 on branch `epic-0001-autonomous-execution`.

### `npm test` — full suite

```
$ npm test
ℹ tests 1285
ℹ pass 1285
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

Baseline on `main` at v0.42.0 was **1161/1161**. Net-new: **124** tests.

### Per-group test files

```
$ node --test tests/run-contracts.test.js      → 16/16   pass
$ node --test tests/run-authority.test.js      → 21/21   pass
$ node --test tests/run-inbox.test.js          → 15/15   pass
$ node --test tests/run-governor.test.js       → 39/39   pass
$ node --test tests/run-cli.test.js            → 30/30   pass
$ node --test tests/run-reachability.test.js   →  4/4    pass
```

### G2 gate — swarm must be unchanged by the extraction

```
$ node --test tests/swarm-*.test.js
ℹ tests 236
ℹ pass 236
ℹ fail 0
```

### Production call path — the governor hook, invoked as the host invokes it

```
$ MOMENTUM_PROJECT_DIR=$T bash core/scripts/run-governor.sh </dev/null
exit=0                                   # no run.json — untouched

$ momentum run start phase phase-32a-governor --unit G3 --turns 10
$ MOMENTUM_PROJECT_DIR=$T bash core/scripts/run-governor.sh </dev/null
exit=2                                   # stop BLOCKED
▸ momentum run — the run is still active; continue without asking.
  Run:    run_33632284  (phase: phase-32a-governor)
  Next:   G3
  Turns:  0/10
  Pre-authorized — proceed silently:
    - Commit per the plan's per-group commit message — do not ask.

$ touch $T/.momentum/run-stop
$ MOMENTUM_PROJECT_DIR=$T bash core/scripts/run-governor.sh </dev/null
exit=0
status after kill: stopped
```

### Config validation — the illegal combinations refuse by name

```
$ momentum config validate
▸ Config policy (specs/config.md)
✓ run policy is valid.

# release finer than merge (epic completion criterion #4):
✗ run policy is invalid:
  COUPLED — release granularity may never be finer than merge granularity
    got: release=per-phase, merge=per-feature
    why: Tagging a version that has not been merged to the terminal branch is
         incoherent: the tag would point at a commit no release branch contains.

# coarse gate without strict verification:
✗ run policy is invalid:
  COUPLED — release: per-feature requires tdd: strict
    got: release=per-feature, tdd=opt-in
    why: One approval covering several phases of diff is not a review anybody
         performs. Gate frequency may be traded away only by buying
         verification rigor.
```

### During-run loop — live

```
$ momentum run start phase p --unit G1
$ momentum run decide "chunked uploads manually" --why "library lacks streaming"
▸ Decision logged on G1: chunked uploads manually
$ momentum run park "S3 or GCS for blobs?" --unit G2 --reason operator-authority
▸ Parked 0001 on G2: S3 or GCS for blobs?
  This freezes ONLY that unit — continue with everything else.
$ momentum run advance G2
▸ Cursor → G2
$ momentum run strike --unit G2
▸ Strike 1/3 on G2
$ momentum run status
  Decisions taken autonomously (1):
    - [G1] chunked uploads manually
        library lacks streaming
  Parked questions (1/5) — these units are frozen, others proceed:
    - 0001 [G2] S3 or GCS for blobs?
        a Rule-14 trigger fired
  Answer one:  momentum run resolve <id> "<answer>"
```

### Fingerprints

Both re-baselines verified drift-only-as-intended before rewriting:

```
$ node scripts/rebaseline-fingerprints.js --check
△ claude-code: 2 change(s)   ~ .claude/settings.json   + scripts/run-governor.sh
△ codex:       1 change(s)                             + scripts/run-governor.sh
△ antigravity: 2 change(s)   ~ .agents/hooks.json      + scripts/run-governor.sh
△ opencode:    1 change(s)                             + scripts/run-governor.sh
```

## Acceptance criteria

| # | Criterion | Status |
|---|---|---|
| 1 | Multi-group phase completes with zero "shall I continue?" prompts | ✅ hook returns exit 2 with the continuation; verified as a subprocess |
| 2 | Kill switch halts in one turn; `run continue` resumes with no lost work | ✅ |
| 3 | Runaway simulation halts at the strike limit | ✅ |
| 4 | Swarm suite stays 236/236 | ✅ |
| 5 | Call-path guard fails when an export is orphaned | ✅ **proven red** on a synthetic orphan, then green |
| 6 | `config validate` rejects `release: per-phase` + `merge: per-feature` | ✅ |
| 7 | Full suite green; net-new tests ≥ 40 | ✅ 1285/1285; **124** net-new |
| 8 | Solo / no-run behaviour byte-unchanged | ✅ asserted directly (no output, no files, no `.momentum/`) |

## Not yet done for this phase

The epic's completion criterion #6 — *"32b, 32c and 32d were each built by the
32a runner"* — is a gate on the EPIC, not on this phase, and cannot be satisfied
until those phases exist. 32a's own dogfood is partial: the governor has been
exercised end-to-end as a subprocess and through the full CLI loop, but not yet
across a multi-hour unattended phase. That happens when 32b is built with it.
