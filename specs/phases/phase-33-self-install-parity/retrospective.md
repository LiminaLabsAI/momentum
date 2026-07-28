---
type: Retrospective
phase: 33
status: complete
---

# Phase 33 — Self-Install Parity — Retrospective

## What this phase was

A three-group phase that began as a footnote. While setting up the *first real
governed run* — dogfooding Epic 0001's governor on an actual phase — the governor
did not fire. The cause was not the governor. It was that momentum's own install
did not contain it.

`.claude/settings.json` had no `Stop` hook. `scripts/run-governor.sh` was absent.
**momentum had shipped a governor it could not itself run**, for the entire life
of the feature that needs it.

## The finding

The guard, on its first real run against this repo, reported seven drifts:

| Kind | File | What it means |
|---|---|---|
| missing | `.claude/commands/brainstorm-initiative.md` | recipe shipped, never installed here |
| missing | `.claude/commands/complete-initiative.md` | ditto |
| changed | `.claude/commands/complete-phase.md` | pre-ENH-057 (no `claim version`) |
| changed | `.claude/commands/hotfix.md` | pre-ENH-057 (no `claim id`) |
| changed | `.claude/commands/initiative.md` | pre-ADR-0016 lifecycle |
| changed | `.claude/commands/sync-docs.md` | **pre-Phase-31b** |
| changed | `scripts/cross-repo-gate.sh` | **pre-v0.43.1** |

The last two are the ones that matter.

`cross-repo-gate.sh` was the build from *before* the BUG-032 fix — a fix committed
**that same day**. momentum was running the buggy version of something it had
already shipped to users.

`sync-docs.md` predated the Phase 31b handoff-delivery requirement (ADR-0017 E6).
That rule exists because a reviewed multi-repo session's glossary propagation
never happened *despite the rule working exactly as designed* — the fix was to
deliver handoffs into the target repo's inbox rather than mention them in chat.
momentum had been running the version that only mentions them.

So the drift was not bookkeeping. **momentum was, in two separate places,
executing the pre-fix version of its own fixes.**

## The engine's own blind spot

G1's first parity engine derived the shipped surface from `adapter.destinations`
plus the runtime closure — deliberately, so it could not become a second
hand-written list that drifts from the installer (the duplication ADR-0018 exists
to end).

That reasoning was right and the result was still wrong. Three files never fit
the `destinations` shape:

- `session-append.sh` and `orient.js` live under `core/ecosystem/` but install
  into `scripts/`, because that is where the hooks resolve them.
- `run-governor.sh` copies with `core/scripts/` and must be **removed again** for
  adapters that cannot invoke an interceptor.

All three were open-coded twice in `bin/momentum.js` (init and upgrade). The
parity engine, reading only `destinations`, was blind to exactly them — which is
to say **blind to the files most likely to drift**, since special cases are what
people forget to update. Had `session-append.sh` gone stale, `selfcheck` would
have answered "no drift".

The fix was not to copy the list into `parity.js`. It was `core/install/extras.js`
— one declaration, three readers. Surface 51 → 53.

**The lesson is narrower than "don't duplicate":** deriving from a source of truth
is only as complete as that source. `destinations` describes the *mechanical* part
of an install and was never claimed to describe all of it. A derivation is a claim
about coverage, and that claim needs its own test — which is now
`the surface covers every installer special case`.

## BUG-035, walked into live

Recording a G1 decision, I typed `momentum run decide --what "…" --why "…"`. The
CLI takes the summary positionally. It stored the literal string `--what` as the
decision summary, printed `▸ Decision logged on G1: --what`, and exited 0. The
`--why` parsed correctly, so the record looked half-plausible.

Two harms, and the second is the sharp one:

1. `decisions[]` is what the epic tier reads — a poisoned summary propagates into
   the decision table as a permanent artifact.
2. `check-task` matches the red→green task string **exactly**. A poisoned
   `red-green` entry makes a strict-TDD gate refuse *much later*, for reasons that
   look nothing like the cause.

Fixed for the class, not the instance: one `positional(args, usage)` helper across
all five payload-carrying subcommands, refusing anything matching `/^--/` and
naming the actual problem. This run's own two poisoned decisions and one poisoned
red→green entry were repaired in place.

## The pattern this closes

Sixth variant of "green here, dead where it ships":

| | Where it was green | Where it was dead |
|---|---|---|
| BUG-002 | working tree | tarball glob |
| BUG-030 | tests injecting a root | `findRoot` in production |
| BUG-031 | tests calling `pollTurn` | no production caller existed |
| BUG-033 | working tree | published tarball (unvendored `hook.js`) |
| BUG-034 | claude-code's cwd | Antigravity's cwd |
| **Phase 33** | **working tree** | **momentum's own install** |

Every previous guard checks the working tree. `verify-published.sh` (v0.43.2)
closed the "what users download" half. This closes the "what momentum itself runs"
half — and that half was worse, because it is the install nobody thought to check
and therefore the one that drifted furthest.

## What went well

- **Dogfooding found it.** Nothing else would have. The phase exists only because
  the governor was pointed at a real phase, and it failed in the one repo whose
  install nobody audits.
- **The guard was proven red against every shape it must catch** — both synthetic
  drifts (`missing` and `changed`), *and* all three originating defects
  re-introduced one at a time in a sandbox, clean before and after each. This is
  32c's lesson applied without being re-taught: a probe that exercises one failure
  mode proves only one failure mode.
- **The blind spot was found inside the same group that shipped it**, by asking
  what the four "extra" files actually were instead of accepting them as noise.

## What to watch

- `scripts/orient.js` remains a TRANSITIONAL copy from 31c G1→G3. It is now
  declared in `core/install/extras.js` with that status recorded. When
  `sessionstart-handoff.sh` and `cross-repo.js` finally resolve it from the
  runtime, delete the entry — the declaration is the place that will make the
  staleness visible.
- `extra` stays informational and must remain so. A checker that condemns
  legitimate dev tooling is a checker people silence, and a silenced guard is how
  all seven of these drifts survived.

## Verification Evidence

| Claim | Command | Result |
|---|---|---|
| Full suite green | `npm test` | **1427/1427**, 0 fail (1420 baseline + 7 new) |
| Guard runs in the suite | `npm test` glob `tests/*.test.js` | parity tests discovered and executed |
| momentum's own install is clean | `node bin/momentum.js selfcheck` | `53 files · no drift` |
| CLI agrees with the library | `momentum selfcheck --json` | exit 0, `missing:[] changed:[]` |
| Detector fires — `missing` | sandbox: delete a shipped recipe | CAUGHT, green again on restore |
| Detector fires — `changed` | sandbox: append to a shipped `.sh` | CAUGHT, green again on restore |
| Original defect 1 | sandbox: strip `Stop` hook from `settings.json` | **CAUGHT** (changed) |
| Original defect 2 | sandbox: delete `scripts/run-governor.sh` | **CAUGHT** (missing) |
| Original defect 3 | sandbox: stale `scripts/cross-repo-gate.sh` | **CAUGHT** (changed) |
| Surface covers installer special cases | `tests/self-install-parity.test.js` | passes; fails if `extras.js` gains an unmapped entry |
| Conditional removals honoured | same | `run-governor.sh` present for claude-code, absent for opencode |
| `--fix` is opt-in | same | default path contains no write call |
| BUG-035 refusal | `tests/run-cli.test.js` | all 5 subcommands exit non-zero, manifest untouched |
| 7 real drifts repaired | `selfcheck --fix` then re-run | `Repaired 7 file(s)` → `no drift` |

## Acceptance

- [x] momentum's own install matches what it ships, and drift fails a test
- [x] The guard is proven red against every shape it must catch, including all
      three originating defects
- [x] The parity surface reads the installer's own declaration — no second list
- [x] `momentum selfcheck` is in the release checklist beside `verify-published.sh`
- [x] Suite green at 1427/1427
