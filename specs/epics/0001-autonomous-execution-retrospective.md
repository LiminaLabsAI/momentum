---
type: Retrospective
epic: autonomous-execution
status: complete
---

# Epic 0001 — Autonomous Execution — Retrospective

Four phases, 2026-07-27 → 2026-07-28. Suite **1161 → 1415** (+254). Unlanded at
time of writing by its own policy.

## What it was for

The operator's complaint, in their words:

> *"I just want that go ahead and write the specs and implement the whole
> feature, not only one phase… it should implement end-to-end… it should not ask
> multiple times shall I continue?"*

And the specific symptom that opened the investigation:

> *"In ecosystem mode it was not able to execute the whole phase in one go."*

## What was actually wrong

Not what it looked like. The diagnosis that made the epic tractable:

> **Momentum planned at four tiers and executed at one — and that one was
> governed by prose with no enforcer.**

Three separate causes wearing one symptom:

1. **The Autonomous Execution Contract was a sign on a wall.** It explicitly
   forbade asking between groups. It was read once at `/start-phase` and had
   scrolled out of context by group four. Momentum could mechanically stop an
   agent from *writing* (the brainstorm gate) but had no way to stop one from
   *stopping*.
2. **There was no word for "a feature that takes three phases."** The vocabulary
   went task → group → phase → *(nothing)* → initiative. The project had been
   running epics for years under a letter-suffix convention held together by
   operator memory.
3. **`--mode autopilot` was dead code.** `pollTurn` had no production caller and
   never had; the board froze at wave-1-start. Filed as **BUG-031**.

Plus **BUG-032**: the cross-repo nudge said *"before going further"*, and an
agent obeys wording rather than exit codes.

## The reframe the design turned on

> **This is not an autonomy problem. It is a decision-handling problem.**

The operator *wanted* a merge gate — just one, not four. Sorting the actual
interruptions showed none of them were about "how much autonomy": every one was a
decision **collected at the wrong time, or re-collected after it was made**.

From which:

> **Decisions are durable. Plans are perishable. Collect decisions once;
> regenerate plans continuously.**

That single sentence resolved the epic's central tension — "gather everything
upfront" versus "don't compromise spec-driven development" — and everything else
followed from it.

## The number that killed the naive design

Before designing, the premise was measured against the repo's own history:

| Entry type | Count |
|---|---|
| `[DECISION]` | 221 |
| `[SCOPE_CHANGE]` | 30 |

Every phase had some; median ~6. So "brainstorm exhaustively, then run blind" was
already empirically dead, and the architecture's real question became **"what
happens at decision #7?"** Ten minutes of counting saved a design that would have
failed on contact.

## What shipped

| Phase | Delivered |
|---|---|
| **32a Governor** | ADR-0019 decision authority; run manifest; park primitive; governor + interceptor backend; safety rails; `momentum run`; `config validate`; the orphan guard |
| **32b Epic Tier** | ADR-0020 scope grant; `epic` record + CLI; JIT spec derivation; amendments channel; `/brainstorm-epic`; TDD-strict enforcement |
| **32c Adapter Parity** | Backend selection; the re-invoker + external driver loop; all four agents autonomous; capability-gated install |
| **32d Cross-Repo** | Guard debt repaid; **BUG-031 closed**; **BUG-032 closed**; initiative tier |

**Every completion criterion met** except one, recorded as missed rather than
reworded (32c's net-new-test target; see below).

## What went well

**Measuring premises instead of assuming them.** The 221-decision count. The
adapter research that showed only two of four could block a stop. The blast-radius
count that turned a 24-test demolition into a 6-test retirement. Each took
minutes and each changed the design.

**Letting constraints improve the architecture.** Codex and opencode *cannot*
block a turn ending. Rather than shipping to two adapters, that forced the
invariant to be restated as **"the next unit starts"** — which admitted a second
backend that is the external-driver architecture momentum wanted anyway. The
weaker adapters bought the better design.

**The operator's objections were load-bearing.** The mid-run amendment scenario
("after phase 1 I observe something and want to change a decision") is what
settled just-in-time derivation, because under upfront authoring every correction
becomes a merge conflict. The insistence that *all four* agents must have the
feature is what produced the conformance suite. Neither was in the original plan.

**Refusing to pad numbers.** 32c missed its net-new-test target (23 vs 40) and
says so. 32d's ratchet did not fall and says so. A retrospective that reports
only wins is a marketing document.

## What didn't

This epic shipped its own defect class **three times**, in the code written to
prevent it:

1. **32a** — the manifest's entire mutation API had no production caller. The
   guard, written that same phase, caught it minutes after existing. Without it,
   the governor would have run while `decisions[]` and `parked[]` stayed
   permanently empty.
2. **32b** — the scope grant would have shipped **non-functional to every
   installed project**: `run-check.js` reaches it through a computed path the
   runtime-closure walker cannot follow. It fails closed, so nothing would have
   broken loudly.
3. **32c** — the **guard itself** was blind to single-line `module.exports`, so
   it had been green over four modules for two phases. Its own synthetic-orphan
   probe passed the whole time, because the probe used the shape the guard could
   already see.

And once, carelessly: **I overwrote an existing test file with a shell heredoc,
destroying 11 tests. The suite reported 1404/1404, zero failures.** Nothing broke
— the tests were simply gone. Caught only because the arithmetic did not work.

## What was learned

1. **A green suite is not evidence that nothing was lost.** Twice this epic a
   green result meant less than it appeared to. Test-count arithmetic is now part
   of the evidence, not an afterthought.

2. **Prove a guard red against every SHAPE it must handle, not one instance.**
   32a's probe proved the guard worked on the case it already handled. That is
   the difference between testing a guard and reassuring yourself about one.

3. **Only enumeration catches unwired code.** Phase 31c tried care and the class
   reproduced twice within hours. A guard that discovers its own surface and
   fails on new entries is the only thing that works, and it must be re-run after
   every widening.

4. **Put judgment where judgment belongs; make enforcement deterministic.** The
   authority classifier and the amendment classifier both take a *caller-supplied
   signal* rather than reading text and guessing. Reproducible, auditable, and
   wrong in the safe direction when unsure.

5. **Make bad options unrepresentable rather than discouraged.** `push: never`
   is absent from the enum, so no project can select it and no validator must
   catch it.

6. **Wording is behaviour when the reader is an agent.** BUG-032 sat behind a
   correct exit code, a correct ADR, and a deliberate design decision. None of it
   mattered against one imperative sentence.

7. **Dead code props up dead code.** Reachability is transitive; removing a root
   exposes its dependents. A flat count after a real deletion is progress.

## The dogfood

Criterion #6 — *"32b, 32c and 32d were each built by the 32a runner"* — holds.
Each ran under `momentum run`, with decisions recorded through `run decide` and
the cursor advanced per group. **32c and 32d had their specs generated by
`momentum run derive`** — the first phases in momentum's history whose specs were
derived rather than authored, which is D10 demonstrated rather than described.

## Open

| Item | Where |
|---|---|
| 87-item legacy orphan tail | Ratcheted; cannot grow |
| Live multi-repo dogfood (initiative tier, cerebrio fleet) | Operator VAL item |
| Live vendor-CLI dogfood (`codex exec`, `opencode run`) | Operator VAL item |
| The landing itself | **Awaiting operator approval** |

## Verification Evidence

```
$ npm test
ℹ tests 1415   ℹ pass 1415   ℹ fail 0
```

Baseline on `main` at v0.42.0: **1161**. Net-new across the epic: **254**.

```
swarm suite            236/236     (unchanged across four phases of extraction + a removal)
backend conformance     23/23      (same assertions, both backends, no carve-outs)
epic e2e                 8/8       (two-phase epic, ONE approval)
orphan guard             5/5       (core/run at zero; legacy tail ratcheted at 87)
cross-repo nudge        19/19      (BUG-032 closed)
```

### The headline, end to end

```
run grant --branches staging,main --landings 2      ← THE ONE APPROVAL
pre-push staging  → exit 0   "scope grant consumed (1 landing remaining)"
pre-push main     → exit 0   "scope grant consumed (0 landings remaining)"
pre-push main     → exit 1   "the grant's landing budget is spent"
```

Control, same file: with no grant, a single-use sentinel authorizes exactly one
of those two pushes — which is the two-approval behaviour this epic replaces.
