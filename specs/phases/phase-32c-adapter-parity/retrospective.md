---
type: Retrospective
status: complete
epic: autonomous-execution
---

# Phase 32c — Adapter Parity — Retrospective

Third phase of **Epic 0001 — Autonomous Execution**. Target v0.43.0.

## What shipped

**All four supported agents now drive autonomous runs.** Two of four was not
parity, and the operator said so directly: *"I need all the supported agent
should have this behaviour and feature."*

| Group | Delivered |
|---|---|
| G0 | `backend.js` (selection) + the conformance suite, written **before** either backend was finished |
| G1 | `reinvoke.js` — the re-invoker backend, and the external driver loop |
| G2 | Codex + opencode flipped to `reinvoker`; capability-gated script install |
| G3 | Guard repair, verification, this retrospective |

The invariant `core/run/CONTRACT.md` states — **the next unit starts** — is now
satisfied two ways: the **interceptor** blocks a stop and injects in place
(Claude Code, Antigravity), and the **re-invoker** observes a stop and relaunches
against the manifest (Codex, opencode).

## What went well

**Writing the conformance suite first.** It is the definition of parity, and a
suite authored after the implementations would have been shaped by them —
"parity" quietly becoming "whatever both happen to do". Written first, it was red
in 13 places and each one named real work.

**It immediately caught that 32a's interceptor never implemented the contract
32a wrote.** The interceptor worked — subprocess tests proved the production
path — but exposed no `supports()`/`onTurnEnd()`. A contract only one
implementation satisfies is a description, not a contract; nobody notices until
a second implementation arrives. Ours arrived one phase later, which is about as
lucky as that gets.

**Reading the adapters rather than assuming symmetry.** The opencode plugin's
own comments record that its event handler is skipped in run-mode because its
presence hangs `opencode run` on 1.17.x. That single sentence, already written
down by a previous phase, is what turned a one-shot respawn into a driver loop.

## What didn't

**The orphan guard had a false negative and had been reporting green over code
it could not see.** Its `exportsOf()` regex required a multi-line
`module.exports = {\n…\n};` block, so every module ending
`module.exports = { a, b };` on one line contributed **zero** exports.
`backend.js`, `lock.js`, `grant.js` and `amend.js` were invisible to it — across
two entire phases in which its green result was cited as evidence.

A guard with a silent blind spot is worse than no guard: it converts *unchecked*
into *checked and fine*. Every "orphan guard clean" claim in 32a's and 32b's
retrospectives was weaker than stated at the time, and this file is the
correction.

Repaired, it found **12 orphans immediately**, including the whole of
`backend.js` — which meant the capability-gated script install this phase's own
plan called for existed as a function nothing called. The BUG-031 shape, hiding
inside the guard built to catch BUG-031.

**One-shot respawn would have shipped broken.** The first re-invoker spawned a
replacement and exited. For opencode that chain is: session idles → handler fires
→ spawns `opencode run` → *that* session has no handler → nothing observes its
turn ending → the run stops after one unit, with no error anywhere. Codex has the
same shape for a different reason: `notify` lives in `~/.codex/config.toml`,
user-owned config momentum does not install into, so the re-trigger cannot be
assumed to exist at all.

**Gating install was not enough.** `upgrade` re-copies `core/scripts` wholesale,
so the next upgrade would have silently restored a script the adapter cannot
invoke. The idempotence test caught it; I had not thought of it.

## What was learned

1. **A guard is code, and untested code is untested code.** 32a's retrospective
   said "a guard nobody has seen fail is a guard nobody knows works" and added a
   synthetic-orphan probe to prove it goes red. That probe passed the whole time
   — because the probe file *also* used a multi-line export. The lesson updates
   to: **prove the guard red against every SHAPE it must handle**, not against
   one convenient instance.

2. **"Both work" is not parity; "the same assertions pass" is.** A conformance
   suite with a single backend-specific carve-out is two suites in one file. The
   discipline is not writing more tests, it is refusing to branch on which
   implementation you are holding.

3. **Take architectural phrases literally.** "The loop lives in a process" was
   written in 32a as a description of the re-invoker's virtue. Implemented as
   fire-and-forget it was just words. Implemented as spawn-wait-decide-repeat it
   is the thing that makes this backend structurally incapable of the `pollTurn`
   failure — the loop is a while-loop with a process in it, not somebody's good
   intentions.

4. **Constraints already written down are cheaper than constraints rediscovered.**
   The opencode run-mode hang was documented in the adapter by an earlier phase.
   Reading it cost a minute; discovering it in production would have cost a
   silent, one-unit-then-stop failure that produces no error to search for.

5. **Declare, do not guess.** Headless invocation commands are a table of facts
   about vendor CLIs. An adapter absent from it degrades to printing the resume
   command rather than pretending to continue — because a guessed invocation
   produces a backend that appears to work and silently does nothing.

## Deferred

| Item | To |
|---|---|
| Initiative-tier runner; swarm wave-runner removal (BUG-031) | 32d |
| Cross-repo nudge fix (BUG-032) | 32d |
| Widening the orphan guard beyond `core/run/` | 32d — and it should now be **re-run over 32a/32b's surface**, since its blind spot means those phases' green results were never fully earned |
| Live vendor-CLI dogfood of `codex exec` / `opencode run` | VAL item — needs both runtimes installed; the driver loop is unit-proven with an injected spawner |
| Codex `notify` one-line user config | Documented for the operator; momentum does not own `~/.codex/config.toml` |

## Verification Evidence

Captured 2026-07-27 on branch `epic-0001-autonomous-execution`.

### `npm test` — full suite

```
$ npm test
ℹ tests 1406
ℹ pass 1406
ℹ fail 0
```

Baseline at the close of 32b was **1383/1383**. Net-new this phase: **23**.

### The conformance suite — the parity bar

```
$ node --test tests/run-backend-conformance.test.js
ℹ tests 23
ℹ pass 23
ℹ fail 0
```

Same assertions, both backends, no carve-outs. Includes `ALL FOUR adapters
resolve to a real backend`, which is the phase's reason for existing.

### The repaired orphan guard

```
$ node --test tests/run-reachability.test.js
ℹ tests 4
ℹ pass 4
ℹ fail 0
```

Run **before** this retrospective was written. On repair it reported 12 orphans;
all were either wired to a production caller (`backend.js` → the installer) or
unexported, with the affected tests rewritten against public surfaces.

### Swarm gate — unchanged by three phases of extraction

```
$ node --test tests/swarm-*.test.js
ℹ tests 236
ℹ pass 236
ℹ fail 0
```

### Invariance — a repo with no run is untouched

```
$ T=$(mktemp -d); git init -q "$T"
$ MOMENTUM_PROJECT_DIR="$T" bash core/scripts/run-governor.sh </dev/null
governor exit=0
$ ls -A "$T"
.git                      ← nothing created
```

### Capability-gated script install — both directions, and idempotent

```
$ momentum init "$A" --agent codex
$ ls $A/scripts/run-governor.sh
  no run-governor.sh — gated

$ momentum init "$B" --agent claude-code
$ ls $B/scripts/run-governor.sh
  run-governor.sh present

$ momentum upgrade "$A"
$ ls $A/scripts/run-governor.sh
  still gated — idempotent
```

The last line is the one the idempotence test forced: gating install alone would
have let the next upgrade silently restore the script.

### The driver loop

Four tests with an injected spawner, so the loop is exercised without either
vendor CLI present:

```
DRIVER: the loop runs units until the governor says stop          → 3 units, then "run is not in a running state"
DRIVER: an agent that does not move the cursor is struck          → "strike limit reached", strikes.G1 = 3
DRIVER: the kill switch ends the loop                             → 1 unit, then "kill switch engaged"
DRIVER: an adapter with no declared headless path degrades        → 0 units, "no-headless-path", resume command printed
```

The second is the one that matters: without it the driver would re-run the same
unit until its budget died, burning the whole run to reproduce one failure.

## Acceptance criteria

| # | Criterion | Status |
|---|---|---|
| 1 | Conformance suite passes for BOTH backends, no carve-outs | ✅ 23/23 |
| 2 | `governorBackend` non-null on all four adapters | ✅ |
| 3 | Re-invoker idempotent — doubled event starts the unit once | ✅ cursor is the guard |
| 4 | Re-invoker fails open on every error path | ✅ |
| 5 | Non-interceptor adapters no longer receive `run-governor.sh` | ✅ install **and** upgrade |
| 6 | Invariance; swarm 236/236; orphan guard green | ✅ |
| 7 | Full suite green; net-new ≥ 40 | ⚠️ **1406/1406, but 23 net-new — target missed** |

**Criterion 7 is not met and is recorded as missed rather than reworded.** The
target was ≥ 40 net-new tests; this phase added 23. The count is low because
much of G3 was *repair* — fixing a guard and deleting orphaned exports produces
little new test surface while being the most valuable work in the phase. I am
not going to pad the number to clear a bar; the honest reading is that the
target was a poor proxy for this phase's shape, and the conformance suite plus
the driver tests are the coverage that matters.

## Not yet done

The epic's criterion #6 — *"32b, 32c and 32d were each built by the 32a
runner"* — holds for this phase: 32c ran under `momentum run start phase
phase-32c-adapter-parity`, with decisions recorded via `run decide` and the
cursor advanced per group. Its specs were **derived** by `momentum run derive`
from the epic record — the first phase in momentum's history whose specs were
generated rather than authored, which is D10 working rather than described.

32d remains. Nothing has merged: `release: per-feature` means all three phases
sit on `epic-0001-autonomous-execution` until the epic completes.
