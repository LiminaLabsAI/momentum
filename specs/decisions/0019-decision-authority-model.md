---
type: ADR
initiative: none
---

# ADR-0019: Decision Authority Model

## Status

Accepted (Phase 32a — Governor, Epic 0001 Autonomous Execution)

## Context

### The problem is not autonomy

Momentum stops too often, and the reflex reading is "the agent needs more
autonomy." Sorting the actual interruptions says otherwise:

| Interruption | Nature |
|---|---|
| "shall I do group 3?" | Already authorized — pure waste |
| "what is the goal of this phase?" | Already decided — pure waste |
| "ready to merge?" × N phases | A real decision, asked N times when once would do |
| "cross-repo — open an initiative?" | A real decision, asked mid-run instead of at plan time |

Not one is a question of *how much* autonomy. Every one is a **decision
collected at the wrong time, or re-collected after it was already made**.

Momentum has no memory of decisions, so it re-asks. And it cannot distinguish a
decision it may take alone from one requiring the operator, so it either asks
about everything or about nothing.

### "Collect everything upfront" is empirically dead

The obvious fix — brainstorm exhaustively, then run blind — was tested against
this repo's own record. Across `specs/phases/*/history.md`:

| Entry type | Count |
|---|---|
| `[DECISION]` | 221 |
| `[SCOPE_CHANGE]` | 30 |

Every phase has some. The median is ~6. Phase 14 recorded 19 decisions or scope
changes across 20 total entries. These arose **during** implementation, after
the brainstorm closed — not from planning failure, but because that is what
implementation is. Nobody could know `findRoot` walked up only until they were
standing in it.

An autonomous runner therefore *will* meet unanticipated decisions, roughly six
times per phase. A design that does not answer **"what happens at decision #7"**
is decoration.

### Three possible answers, none sufficient alone

| Answer | Fails when |
|---|---|
| **Stop and ask** | This is today's behaviour — the thing being fixed |
| **Decide and log** | Eventually silently picks the database, and two phases build on it |
| **Classify upfront** | Only covers decisions somebody anticipated — definitionally not these |

### Momentum already has a blast-radius model

Rule 14 (Work-Type Escalation) already enumerates when work is too consequential
for the light path:

> touches more than ~5 files of production code · modifies anything under
> `specs/architecture/` · needs an ADR · changes a public contract/interface ·
> displaces a planned phase

That is *exactly* the "this is the operator's call" list. It is already
mechanically checkable, already documented, already familiar. It is currently
used to select a work type; nothing prevents it from also selecting a decision
authority.

## Decision

**Decision authority is classified mechanically, by reusing Rule 14's escalation
triggers, and ambiguity parks.**

1. **The classifier is a pure function.** `(changeSet, config) → authority`,
   where `authority ∈ {operator, agent, park}`. No model judgement in the hot
   path: the same inputs always yield the same authority, so the decision is
   testable, auditable, and reproducible after the fact.

2. **The trigger table is data, not prose.** One source
   (`core/run/lib/authority-triggers.js`) read by both the classifier and its
   tests, so they cannot drift — the failure mode ADR-0018 was written to end.

3. **The three answers are layered, not chosen between.**

   ```
   Rule-14 triggers define the boundary
     ├── inside  → agent decides, logs [DECISION], continues
     ├── outside → operator's call → park the thread, continue everything else
     └── unmatched → park (never guess)
   ```

4. **The default is `park`.** An unmatched change never silently becomes the
   agent's call. Unknown blast radius is not the agent's to absorb.

5. **Config overrides layer above the floor, never below.** A project may
   *widen* the operator's authority (claim more decisions) or add project-specific
   triggers. It may not narrow the invariant floor — the trust-layer paths,
   `specs/architecture/`, and public contracts are always the operator's,
   exactly as ADR-0009 makes the trust layer non-configurable while its
   mechanisms remain configurable.

6. **Parking is non-blocking.** A parked decision freezes only the thread that
   needs it. Independent work continues. Questions batch for the operator, who
   reads them via `momentum run status` without interrupting the run.

## Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| **Mechanical Rule-14 reuse (chosen)** | No new taxonomy; zero operator authoring burden; testable pure function; already-familiar semantics | Only as good as Rule 14's triggers; genuinely novel risk shapes fall through to `park` (acceptable — that is the safe direction) |
| Operator authors a per-epic authority taxonomy | Precisely fitted to each feature | Real work at brainstorm time; misclassification is silent; a taxonomy authored before implementation shares the flaw the 221-decision count already exposed |
| Model-judged authority ("ask the agent if this is a big deal") | Handles novelty | Non-reproducible, untestable, unauditable; the judgement being trusted is the one under review |
| Always stop | Safe | Is the status quo |
| Always decide | Fast | Compounds a wrong call across an entire epic |

## Consequences

**Easier.** Autonomy stops being a mode and becomes a consequence: with the
authority boundary defined, a run proceeds until it meets something outside it.
The operator authors nothing new — `specs/config.md` carries overrides only.
Every autonomous decision lands in `decisions[]` on the run manifest with the
trigger evaluation that produced it, so "why did it decide that alone?" is
answerable months later.

**Harder / risks.**

- *The classifier's reach is Rule 14's reach.* A consequential decision that
  trips no trigger falls through to `park`, which is safe but can over-park and
  strand work. Mitigated by the parked-work threshold: past it, the run stops
  cleanly rather than limping.
- *`changeSet` must be knowable before the change lands.* For file-count and
  path triggers this is the planned diff, not the applied one; a plan that
  understates its own blast radius under-classifies. Mitigated by re-evaluating
  at commit time and escalating retroactively — a decision may be re-classified
  `operator` after the fact, which parks the *next* unit rather than pretending
  the last one was authorized.
- *Widen-only config is a real constraint.* Projects wanting a looser floor
  cannot have it. That is intentional and inherited from ADR-0009.

## Related

ADR-0003 (one engine at every scale — D1's precedent) ·
ADR-0009 (trust invariant vs. configurable mechanisms — the widen-only rule) ·
ADR-0017 (advice vs. enforcement — why parking must be real, not a printed
suggestion) · ADR-0018 (data-over-duplication; the call-path guard this phase
extends) · ADR-0020 (scope grant — 32b, the authorization this classifier gates)
