---
type: Retrospective
status: complete
epic: autonomous-execution
---

# Phase 32b — Epic Tier — Retrospective

Second phase of **Epic 0001 — Autonomous Execution**. Target v0.43.0.

## What shipped

The missing rung: **one feature, several phases, one approval.**

| Group | Delivered |
|---|---|
| G0 | ADR-0020 (scope grant); `epic.schema.json`; grant shape closed into the field 32a reserved |
| G1 | `epic.js` + `momentum epic` CLI; phase graph delegated to `core/waves` |
| G2 | `grant.js` — six refusal reasons; `pre-push` integration, fail-closed |
| G3 | `derive.js` (JIT specs, no interview) + `amend.js` (the operator→run channel) |
| G4 | `/brainstorm-epic`; `--derive` mode; epic-tier run start; `tdd: strict` enforcement |
| G5 | Two-phase e2e on one approval; this retrospective |

**Epic acceptance criterion #1 is met**: a two-phase epic lands both phases on
exactly one human approval, driven through the real CLI and the real `pre-push`
hook.

## What went well

**Adversarial-first on the grant.** The plan required refusal tests before the
happy path, and writing them first is what surfaced that `no-grant` is its own
case — five reasons became six. The happy path was three lines and obviously
correct; every hour spent on this module was spent on the ways it must say no,
which is the right ratio for a trust boundary.

**Running the code, not just testing it.** Three of this phase's four findings
came from executing something against real data and reading the output, not from
a failing assertion. `waves()` returned a plan that contradicted the epic's own
prose graph; the bootstrap record would not parse; the grant would not have
shipped. None of those were caught by tests, because in each case the test would
have encoded the same wrong assumption the code did.

**The orphan guard, again.** Five test-only exports in `epic.js`, flagged the
moment they existed. That is twice in two phases, and it has now cost less time
than one of the bugs it prevents.

**Derivation demonstrated rather than asserted.** A forward-only amendment was
absorbed with the run still `running`, then appeared in the derived spec of a
phase that did not exist yet. That round trip *is* the argument for D10 over
upfront authoring, and showing it end to end is worth more than any amount of
prose about merge conflicts.

## What didn't

**The first epic record momentum ever wrote, momentum could not read.** It used
a nested `policy:` map; `core/lib/frontmatter.js` returns `data: null` for
anything outside the OKF v0.1 subset (ADR-0005). Hand-authoring a record for a
format whose constraints live in a different subsystem is exactly the kind of
mistake a schema does not catch, because the file never reaches the schema. The
fix was flattening four keys — widening the OKF subset would have been an
ADR-0005 decision affecting every consumer and every published bundle, and was
not worth it for cosmetics.

**The grant would have shipped non-functional to every installed project.**
`run-check.js` reaches `grant.js` through a *computed* path; the runtime-closure
walker follows *static* requires. It would have worked perfectly here and
silently done nothing everywhere else — and because `tryScopeGrant` fails
closed, nothing would have broken loudly enough to notice. This is **BUG-030's
shape one layer down**, found in the same epic that exists partly to stop
repeating it. Caught only by checking `computeClosure()` output rather than
assuming.

**Two tests were silently testing nothing.** They mutated the epic record with
string replacements matching a block-list format the serializer does not emit,
then asserted against unchanged input and passed. The "ordering comes from deps,
not list order" test in particular claimed to reverse the phase order and did
not. Both now assert the mutation applied before relying on it. A test that
passes vacuously is worse than no test: it buys confidence and returns nothing.

**Three fingerprint re-baselines across two phases.** Each was verified
drift-only-as-intended, but the pattern is clear — adapter-visible changes should
be batched to the end of a group rather than made as they occur.

## What was learned

1. **Run it against real data before believing it.** Every unit test for
   `waves()` passed while it produced a plan contradicting the epic it was
   reading. The bug was in an assumption both the code and its tests shared —
   which is precisely the class tests cannot catch, and execution can.

2. **"No recorded X" and "no X" are different facts.** A phase with no
   `overview.md` has no *recorded* dependencies; treating that as *having none*
   put it in wave 1 and presented a guess as a plan. Under D10, un-scaffolded
   phases are the normal state of an epic in flight, so this distinction is
   load-bearing rather than pedantic.

3. **Put judgment where judgment belongs, and enforcement where it is
   deterministic.** The amendment classifier does not read the text and guess.
   The caller supplies the signal; the library enforces the consequence. Same
   split as ADR-0019's `needs_adr`. A library that guessed would be
   unreproducible, unauditable, and — worst — confidently wrong at the moment it
   matters.

4. **Fail-closed is a property you must be able to point at.** `tryScopeGrant`
   returns `false` on every error path, so a broken grant subsystem can only make
   the hook stricter. Nothing about failing can authorize. That asymmetry is what
   let ADR-0020 relax *when* a human approves without touching *whether* one must.

5. **A refusal that does not explain itself will be worked around.** Six distinct
   grant reasons, each rendered as a sentence. "Blocked" teaches nothing; "the
   grant was minted for a different epic" ends the investigation.

## Deferred

| Item | To |
|---|---|
| Re-invoker backend (Codex, opencode) | 32c |
| Capability-gating script installation | 32c |
| Initiative-tier runner; swarm wave-runner removal | 32d |
| Widening the orphan guard beyond `core/run/` | 32d |
| `momentum epic amend` (the `run amend` path covers the need today) | unscheduled |

## Verification Evidence

Captured 2026-07-27 on branch `epic-0001-autonomous-execution`.

### `npm test` — full suite

```
$ npm test
ℹ tests 1383
ℹ pass 1383
ℹ fail 0
```

Baseline at the close of 32a was **1285/1285**. Net-new this phase: **98**.

### Per-group test files

```
$ node --test tests/epic-contracts.test.js     → 12/12  pass
$ node --test tests/epic-library.test.js       → 16/16  pass
$ node --test tests/run-grant.test.js          → 15/15  pass
$ node --test tests/run-grant-prepush.test.js  → 11/11  pass
$ node --test tests/run-amend-derive.test.js   → 23/23  pass
$ node --test tests/epic-wiring.test.js        → 13/13  pass
$ node --test tests/epic-e2e.test.js           →  8/8   pass
```

### Guards — run BEFORE this retrospective was written (32a's lesson)

```
$ node --test tests/run-reachability.test.js
ℹ tests 4   ℹ pass 4   ℹ fail 0          # no orphaned exports in core/run

$ node --test tests/swarm-*.test.js
ℹ tests 236  ℹ pass 236  ℹ fail 0        # extraction still byte-compatible
```

### The headline — one approval, two landings

Driven through the real CLI and the real `pre-push` hook as a subprocess:

```
epic create attachments --phases phase-1-api,phase-2-ui --release per-feature
run derive phase-1-api  --epic attachments --write     # no interview
run derive phase-2-ui   --epic attachments --write     # no interview
run start  epic attachments                            # cursor → phase-1-api

run grant --branches staging,main --landings 2         # ← THE ONE APPROVAL

pre-push staging  → exit 0   "scope grant grant_… consumed (1 landing remaining)"
pre-push main     → exit 0   "scope grant grant_… consumed (0 landings remaining)"
pre-push main     → exit 1   "the grant's landing budget is spent"

grant.consumptions = [
  { branch: 'staging', actor: 'ada@example.com', remaining: 1 },
  { branch: 'main',    actor: 'ada@example.com', remaining: 0 },
]
```

Control, same file: with no grant, `staging` and `main` are both refused; a
single-use sentinel authorizes exactly one of them — which is the two-approval
behaviour this phase replaces.

### Amendments — live

```
$ momentum run amend "prefer GCS over S3 for any later blob storage work" --forward-only
▸ Amendment recorded — forward-only
  absorbed — it becomes an input when later phases derive their specs

$ momentum run status
▸ Run run_848d2374 — running          ← never stopped

$ momentum run derive phase-32c-adapter-parity --epic autonomous-execution
## Operator amendments since the epic was written
- 2026-07-27 — prefer GCS over S3 for any later blob storage work
```

### TDD strict enforcement

```
$ momentum run check-task "wire the thing"
Error: tdd: strict — "wire the thing" has no recorded red→green on G1.
exit=1

$ momentum run red-green "wire the thing"
$ momentum run check-task "wire the thing"
▸ "wire the thing" may be marked [x] — red→green on record
exit=0
```

### Config validation — the coupled rules

```
✗ COUPLED — release granularity may never be finer than merge granularity
    got: release=per-phase, merge=per-feature
✗ COUPLED — release: per-feature requires tdd: strict
    got: release=per-feature, tdd=opt-in
```

## Acceptance criteria

| # | Criterion | Status |
|---|---|---|
| 1 | 2-phase epic, exactly one human approval, clean clone | ✅ `epic-e2e.test.js` |
| 2 | Forward-only amendment: zero prompts. Backward: hard-stop naming affected work | ✅ |
| 3 | Specs derived with no interview; derivation reproducible | ✅ byte-identical across processes |
| 4 | Grant refuses expired / out-of-scope / revoked, each distinctly | ✅ all six reasons distinct |
| 5 | Orphan guard green over `core/run/` | ✅ run before this file was written |
| 6 | Solo behaviour byte-unchanged; swarm 236/236 | ✅ |
| 7 | Full suite green; net-new ≥ 50 | ✅ 1383/1383; **98** net-new |

## Not yet done

The epic's criterion #6 — *"32b, 32c and 32d were each built by the 32a
runner"* — holds for this phase: 32b was built under `momentum run start phase
phase-32b-epic-tier`, with decisions recorded through `run decide` and the
cursor advanced per group. 32c and 32d remain.

`release: per-feature` means nothing from 32a or 32b has merged. Both phases sit
on `epic-0001-autonomous-execution`, which is the policy working as designed —
the stack lands when the epic completes.
