# recurring-patterns-v1 — LOCKED 2026-07-28

A frozen evaluator for Phase 34's pattern detector, committed **before any
detector code exists** (Rule 11, steps 1–4).

## The scalar

**Recall on `required[]`, with zero hits on `must_not_fire[]`.**

One number per task, and the second half is not decoration. A detector that
finds every pattern *and* invents others is worse than useless here, because its
output lands on Rule 4's pre-phase check — the surface an agent uses to decide
whether the backlog is worth trusting at all. Phase 33 stated the general form:
a checker that condemns legitimate tooling is a checker people silence.

## Why the corpus is a snapshot

The fixtures under `corpus/` are captured verbatim from `v0.44.0`, not read live
from `specs/`. A live corpus changes as the project changes, which would let each
"improvement" to the detector silently rewrite its own score history — the exact
failure Rule 11 exists to prevent. These files are inputs, not documentation:
edit them and the benchmark is a different benchmark.

## What is in here

| File | Role |
|---|---|
| `corpus/ships-broken-rows.md` | 5 backlog rows whose text self-references a prior instance of the same defect shape |
| `corpus/phase-33-pattern.md` | the retrospective section naming the class and its 6th member |
| `corpus/stale-closure-rows.md` | 7 rows as of v0.44.0 — 4 genuinely open, 3 already resolved |
| `corpus/code-markers.md` | what `core/ bin/ tests/ scripts/` said about each id at v0.44.0 |
| `expected.json` | the known-good answers and the thresholds |

## Honest limits of v1

Recorded here rather than discovered later, because an evaluator that overstates
its own coverage is worse than a small one.

1. **`TD-013` is unreachable by this method.** Its fix never cited the id — zero
   markers anywhere — so no marker-based detector can find it. It is scored
   `ambiguous`: neither credited nor penalised. Pretending v1 covers it would
   make the recall number a lie.
2. **`TD-012` is genuinely mid-state.** Its markers read "TD-012 tracks
   consolidating this shipped-runtime story" — describing it as still open, which
   it partly was (2 of 3 mirrors closed). Also `ambiguous`.
3. **Partial self-labelling in `ships-broken`.** BUG-002/030/031 carry
   "Nth instance of this shape" phrasing written by earlier sessions, with no
   detector in view — clean evidence. BUG-033/034 were written on 2026-07-28, the
   same day this benchmark was frozen, by the same session. That phrasing was an
   honest observation at discovery time, not labelling for a detector that did
   not yet exist, but it is not independent, and a v1 recall of 6/6 should be
   read with that in mind. **G1 must therefore also pass the strip test**: with
   the self-reference phrases removed, the class must degrade — proving the
   detector reads evidence rather than reciting an answer.

## The `must_not_fire` rows are a parser test

`BUG-007`, `BUG-027` and `BUG-028` are already `resolved`, so a correct detector
has no reason to flag them. They are in the corpus because their descriptions
contain pipes — `apply_patch\|shell`, `Edit\|Write`, and in BUG-027's case an
**unescaped** one — and any reader that splits a row on every `|` shifts the
columns and reads the priority cell out of the description text.

This is not a hypothetical failure mode. It is precisely what made the
2026-07-28 manual backlog audit report **seven** stale entries including two P1s
when the truth was **four** and **zero**. The tool this benchmark scores exists
partly because the hand-rolled version got it wrong; these three rows are how we
find out if it got it wrong the same way.

## What justifies a v2 (never a v1 edit)

- A materially larger corpus (more phases, more instances)
- A new detection method that makes `TD-013`-shaped items reachable
- A change to the scalar or the thresholds

Any of those is a **new directory** — `recurring-patterns-v2/` — with its own
freeze date, and prior runs re-scored against it if they are to be compared.
Editing `v1` in place would make every score before the edit incomparable with
every score after, which is the whole failure Rule 11 names.
