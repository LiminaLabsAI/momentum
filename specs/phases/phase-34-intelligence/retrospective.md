---
type: Retrospective
phase: 34
status: complete
---

# Phase 34 — Intelligence — Retrospective

## What this phase was

momentum writes a great deal about itself and reads none of it.

Measured before designing: 228 `[DECISION]`, 84 `[DISCOVERY]` and 27
`[ARCH_CHANGE]` history entries, 46 retrospectives, 148 backlog rows, 21 ADRs.
The only consumer in the codebase was `core/swarm/lib/incremental-log.js`,
tailing the last *n* lines of a history file for progress display. **No code had
ever asked "has this happened before?"**

The cost was not theoretical. A defect class reached its **sixth** instance
before anyone named it, even though individual entries said "Nth instance of
this shape" in prose. The information was written down. Nobody was counting.

## The shape that made it work

Two questions, two methods, and refusing to blur them:

- **Recurrence** is genuinely a text question, because momentum's authors
  already answered it: *"Fourth instance of this class in one arc (BUG-002
  tarball glob, BUG-030 findRoot, BUG-031 pollTurn, BUG-033 unvendored hook.js)"*.
  The detector reads declarations and harvests co-cited ids. It infers nothing.
- **Stale closure** is not text at all. It is a contradiction between a row's
  `status` cell and closing markers in shipped source.

Forcing both through one fuzzy pass would have been the easy design and a
dishonest one.

## Rule 11, taken literally

The evaluator shipped in G0, **before any detector existed** — and the test that
proved it asserted `!fs.existsSync(patterns.js)`.

That guard could only hold until G1, which is the interesting part. A guard you
must delete to make progress proves nothing afterwards, so it became a question
git can answer forever: *was the benchmark added in an earlier commit than the
thing it scores?* Rule 11's real failure mode is an evaluator written to flatter
a detector that already exists, and that is now visible a year from now.

The corpus is a v0.44.0 snapshot with checksums. Editing a fixture to flatter a
score fails in the same commit. Proven by trying the tempting edit — moving
`TD-013` from `ambiguous` into `required` — which fired two tests.

## What the evaluator cost, honestly

Building it corrected a claim I had already reported and shipped.

The post-v0.44.0 reconciliation said **seven** stale backlog entries, two of them
P1. The truth is **four**, and **zero** P1s. BUG-007, BUG-027 and BUG-028 were
already `resolved`. That audit split rows on every `|`, and those three carry
pipes inside their description text — `apply_patch\|shell`, `Edit\|Write`, and
BUG-027 an unescaped one, in an entry *about* malformed markdown rows. The
priority cell it read was description text.

The two "stale P1s" were exactly the misparsed rows.

They are now the evaluator's `must_not_fire` set. The best available use of a
mistake is as the fixture for the tool that replaces the process that made it.

## Is it a lookup wearing a costume?

The phase plan named that risk before any code was written, so the answer had to
be evidence rather than assurance:

- **Strip the declarations** and the class collapses.
- **No member id** appears in executable code — only in comments.
- **It finds a class it has never seen**, in invented text.
- And on the live repo it returns **seven** members where the frozen corpus has
  six. It picks up BUG-036 — in no fixture, in no expected set — because that
  entry says "BUG-031 shape, third instance in this epic".

The last one is the strongest. A lookup cannot find a member nobody told it
about.

## What it found on its first live run

`stale-closure` on **ENH-062** — a genuinely stale row that the same morning's
hand reconciliation missed. Verified before believing it: `momentum config sync`
dispatches from the real binary, `core/config.js` carries the implementation,
`tests/config-sync.test.js` passes 5/5. The row still says `open`.

Deliberately **not** flipped. Reporting is the design, and flipping a status on
partial evidence is precisely the error the morning audit made. `ENH-054` also
fired on weaker evidence and is recorded as the marginal case.

## What was cut, and why

- **Automatic rule evolution.** In the roadmap row for this phase; excluded on
  blast radius. An agent rewriting the rules that govern agents is the highest-
  risk change in the system, and building it the same day as the detector that
  would feed it compounds two unproven things.
- **Shared-vocabulary and cross-reference-density signals.** Planned, not built.
  The declaration signal alone hit 6/6, and adding unproven signals could only
  cost precision — which lands on Rule 4, the surface agents use to judge whether
  the backlog is worth trusting.
- **Context-window-aware task sizing.** Unrelated concern; stays in the roadmap.

## Also found while dogfooding

**BUG-038 — a test that expired 18 minutes after a release.** G0's suite went red
with no code change. `cross-repo-nudge.test.js` froze an event at
`2026-07-27T12:00Z` and spawned the gate as a subprocess reading the wall clock
against a 24h window. It aged out at `2026-07-28T12:00Z`; v0.44.1 was tagged at
**11:42Z** on a genuinely green suite. A clean worktree at the tag reproduces it.

Swept for siblings with a clock-shifting preload run 30 days ahead: six failures,
**all six artifacts of the tool itself**, which cannot shift subprocess clocks or
filesystem mtimes. Zero further real bombs. Recorded as a null result and
deliberately not wired into `npm test` — a check with six standing false
positives is one people learn to skip.

## Verification Evidence

| Claim | Command | Result |
|---|---|---|
| Full suite green | `npm test` | **1456/1456**, 0 fail (1436 baseline + 20 new) |
| Recall — recurrence | `tests/learnings-detection.test.js` | **6/6** required members |
| Recall — stale closure | same | **2/2** required (TD-009, ENH-063) |
| Precision — must-not-fire | same | **0 hits** on BUG-007/027/028 |
| Precision — spurious classes | same | 2 classes total, limit 2 |
| Not a lookup — strip test | same | class collapses when declarations removed |
| Not a lookup — no baked ids | same | zero member ids in executable code |
| Not a lookup — unseen class | same | finds an invented 3-member class |
| Evaluator frozen | `tests/learnings-evaluator.test.js` | checksums match; tampering fires 2 tests |
| Rule 11 ordering | same | benchmark commit predates detector commit, in git |
| Parser honours `\|` | same | naive split proven wrong on the same row |
| CLI reachable | `tests/learnings-cli.test.js` | `momentum learnings --json` exit 0 |
| Proposals stay drafts | same | writes only to `specs/decisions/proposed/` |
| Default never writes | same | no `proposed/` dir without `--propose` |
| Empty project | same | exits 0, "no recurring patterns found" |
| Live dogfood | `momentum learnings` | 7-member class; ENH-062 stale, verified by hand |
| Install clean | `momentum selfcheck` | 53 files, no drift |
| Fingerprints | `rebaseline --check` then `--write` | 1 file per adapter, re-baselined with note |

## Acceptance

- [x] Frozen `v1` evaluator committed before the detector — enforced, then made durable in git
- [x] Six "green here, dead where it ships" instances found
- [x] Stale-closure class found, with the misparsed rows excluded
- [x] Precision scored, not just recall
- [x] `momentum learnings` surfaces classes with evidence
- [x] Rule 4 reports recurrence and staleness, framed as advisory
- [x] ADRs proposed, never auto-applied
- [x] Suite green; phase run end-to-end under momentum's own governor
