---
type: Retrospective
---

# Phase 21b — Lanes Run — Retrospective

> Built as **v0.24.0** (2026-07-03) on the stacked branch
> `phase-21b-lanes-run` (parent: `phase-21a-lanes-walk`). Release parked
> on operator approval behind 21a's.

## What was delivered

- **FEAT-026** — `core/lanes/lib/state.js` (registry + per-lane manifests
  + inbox at `<git-common-dir>/momentum/lanes/`, stateVersion 1 internal,
  mkdir-lock chokepoint, atomic writes, Rule 15 plan-node inference as
  data); `momentum lanes` CLI: `open` (worktree create/reuse at
  `../<repo>.lanes/<id>`, substrate detection, BUG-012-class preflight),
  `done`, `close`, board (plan node, grade, status, age, ✉ unread,
  ⚠ overlap; always-on queue-pressure footer), `queue` (FIFO + freshness
  flags), `signal`/`inbox` (5 typed signals, monotonic seqs, ack →
  processed/), `--json` marked unstable.
- **FEAT-027** — `momentum lanes land`: validate-first checklist (done
  status, FIFO turn with loud `--force`, rebase-freshness never
  forceable, Rule-14-graded gates: spike exempt / quick-task ad-hoc
  record / phase retrospective Verification Evidence), `--execute` merges
  `--no-ff`, marks landed, sends advisory rebase nudges to open lanes.
  Never pushes.
- **ENH-047** — `--touches` declarations at open; advisory overlap
  warnings at open, on the board, and at land.
- **ADR-0002**; `/lanes` recipe shipped to all three adapters; site
  parallel-work page updated (Run shipped section); README updated.
- **Dogfood (D8)**: G3 (board) ∥ G4 (signals) were built inside lanes
  opened by the new CLI itself, exchanged a live cross-session signal
  before their code ever merged, and were landed BY `momentum lanes land`
  through the real queue (freshness refusal → rebase → land, quick-task
  gates on real ad-hoc records, suite green between landings).

## What went well

- **The mechanism dogfooded the mechanism.** The board's first real
  render showed the repo's own two live lanes — including the ✉1 from a
  signal the sibling lane had just sent. The land command's first real
  use landed the lanes that built its siblings.
- **File-disjoint lane design worked**: lazy dispatcher routes + shared
  read-helpers pre-landed in state.js meant G3 ∥ G4 touched zero common
  code files; their only rebase conflicts were the known tracking
  appends (keep-both, ~1 min).
- **Validate-first landing caught real staleness** — both lanes were
  refused pre-rebase exactly as designed ("freshness is never
  forceable"), then landed cleanly post-rebase.

## What didn't go well

- An uncommitted G6 recipe file leaked into the fingerprint tests during
  the landing window (3 red until moved aside) — working-tree hygiene
  matters when the suite fingerprints the install payload.
- `momentum lanes --json` initially parsed as an unknown subcommand
  (G3's report caught it; dispatcher now treats a leading flag as the
  board).

## Lessons learned

1. Landing evidence should be producible by the lane itself — the
   quick-task ad-hoc records doubled as both Rule 14 discipline and gate
   input with zero extra ceremony.
2. The FIFO queue + freshness pairing forces exactly the Landing Order
   the conventions prescribed — prose became mechanism with no new
   concepts.
3. Advisory-only overlap warnings were sufficient for this phase's lanes;
   whether they stay advisory under heavier WIP is a 21c-and-beyond
   observation point.

## Verification Evidence

### `npm test` (full suite, fresh on the release candidate — exit 0)

```
ℹ tests 684
ℹ pass 684
ℹ fail 0
```

(Growth: 652 → 684 = +13 state/open-close, +7 board, +6 signals, +6 land.)

### Per-adapter install smoke — `momentum init <tmp> --agent <a>` (exit 0 ×3)

```
claude-code: init exit 0, files: 55
codex: init exit 0, files: 59
antigravity: init exit 0, files: 60
```

(+1 file per adapter vs v0.23.0 = the /lanes recipe.)

### Site build (exit 0)

```
13 page(s) built in 1.72s
dist/parallel-work/index.html: "momentum lanes" present ×3 (Run section live)
```

### Fingerprints

Re-baselined ×3 with meta; drift = lanes recipe (ADDED per adapter) +
CLAUDE.md template mechanism pointer only.

### Live landing evidence (FEAT-027 on its own phase)

```
evidence/d8-lane-open.txt   — lanes opened by the CLI (staged-delivery board refusal visible)
evidence/d8-landing.txt     — freshness refusal → rebase → land ×2, quick-task
                              gates on specs/adhoc records, board draining to
                              "queue: empty"; suites 677/677 and 684/684 between landings
```

## Acceptance criteria check (overview.md)

1. Board from any worktree with plan node/status/pressure — **met** (lane
   sessions rendered it from their worktrees; conductor from the main).
2. Overlap warns at open/board, never blocks — **met** (tests + live).
3. `lanes land` refuses out-of-turn/stale/gate-fail with actionable
   messages; `--execute` lands — **met** (tests + two live landings).
4. Signals round-trip cross-session with ack — **met** (tests + live
   G4→G3 signal).
5. New tests green; full suite green; fingerprints intentional-only;
   site build green — **met** (684/684; drift list above).
6. ≥2 groups as CLI-opened lanes — **met** (G3 + G4; evidence files).

## Release status

v0.24.0 is built + verified on `phase-21b-lanes-run`. Releasing requires
landing 21a first (stacked): the operator runbook in `specs/status.md`
Next Actions #1 covers both in order.
