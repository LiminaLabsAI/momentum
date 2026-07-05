---
type: Plan
---

# Phase 21b — Lanes Run — Implementation Plan

```
# Execution: G0 → G1 → G2 → (G3 ∥ G4 — as lanes opened by the NEW CLI) → G5 → G6
```

The G3 ∥ G4 parallelism is deliverable D8: both groups run as lanes
created with `momentum lanes open` itself — the mechanism dogfoods the
mechanism. Landing follows `momentum lanes land` where its own group has
shipped (G5 lands G3/G4's lanes manually per Rule 6; G5+ uses the CLI).

## Group 0 — Scaffold + ADR-0002

- [ ] Phase files (this set); status.md board row; changelog; index.json.
- [ ] `specs/decisions/0002-lane-state-and-graded-gates.md`: anchor at
  `git-common-dir/momentum/lanes/`; registry + manifest + inbox shapes
  (internal, versioned `stateVersion: 1`); mkdir-lock concurrency; lane
  id = sanitized branch; grades map Rule 14 work types → evidence depth;
  landing turn = FIFO(done); rebase-freshness; advisory overlaps;
  default worktree home `../<repo>.lanes/<lane-id>`.

**Commit:** `docs: start Phase 21b - Lanes Run (ADR-0002)`

## Group 1 — State layer (`core/lanes/lib/state.js`)

- [ ] Anchor resolution: `git rev-parse --git-common-dir` from any cwd →
  `<common>/momentum/lanes/` (mkdir -p on first write).
- [ ] Registry (`registry.json`): stateVersion, lanes[] (id refs).
- [ ] Per-lane manifest (`<id>/manifest.json`): id, branch, planNode
  {type: phase|adhoc|unbound, ref}, worktree, grade, touches[], status
  open|done|landed|closed, opened/doneAt/landedAt ISO, note.
- [ ] mkdir-lock write chokepoint (swarm manifest.js pattern); reads are
  lock-free.
- [ ] Plan-node inference from branch name (phase-* ↔ specs/phases dir;
  fix/chore/feat → adhoc; else unbound) — the 21a resolution, made data.
- [ ] `tests/lanes-state.test.js`: anchor from main worktree AND from a
  linked worktree resolve to the SAME dir; registry round-trip; manifest
  round-trip; concurrent-write lock stress; plan-node inference cases.

**Commit:** `feat(lanes): lane state anchored at the shared git dir`

## Group 2 — open / done / close (`bin/lanes.js` + CLI wiring)

- [ ] `momentum lanes open <branch> [--path P] [--grade g] [--touches a,b]
  [--from ref] [--no-worktree] [--note s]`: creates/uses branch, creates
  worktree (default `../<repo>.lanes/<id>`; skips with --no-worktree or
  when branch is already checked out somewhere), infers plan node +
  grade (phase-*→phase, fix/*→quick-task default), writes manifest,
  registers lane. Prints overlap warnings (ENH-047) vs active lanes.
- [ ] Substrate detection: treehouse binary on PATH → one-line hint;
  GitButler mentioned in help text only.
- [ ] Preflight warnings (never blocking): committed non-755 `*.sh`
  visible in the new worktree; node < engines.node.
- [ ] `momentum lanes done <id>` (status → done, doneAt stamped);
  `momentum lanes close <id> [--rm-worktree]` (status → closed;
  optionally `git worktree remove`).
- [ ] `bin/momentum.js` dispatch + help text.
- [ ] `tests/lanes-open-close.test.js`.

**Commit:** `feat(lanes): open/done/close with substrate detection + preflight`

## Group 3 — Board + queue  **(LANE, opened via the new CLI)**

- [ ] `momentum lanes` (no args) → board: one line per non-closed lane
  (id, branch, plan node, grade, status, age, touches, overlap ⚠) +
  **queue pressure** footer (N done-but-unlanded, oldest wait).
- [ ] `momentum lanes queue` → landing order (FIFO of done lanes) with
  each lane's gate grade + freshness vs the integration ref.
- [ ] `--json` for both (internal shape, marked unstable).
- [ ] `tests/lanes-board.test.js`.

**Commit:** `feat(lanes): ambient board + landing queue with queue pressure`

## Group 4 — Signals + inbox  **(LANE, opened via the new CLI)**

- [ ] `momentum lanes signal <id> <pause|resume|redirect|kill|message>
  [text]` → one JSON file `<id>/inbox/NNNN-<type>.json` (mkdir-lock,
  monotonic NNNN).
- [ ] `momentum lanes inbox <id> [--ack N|--ack-all]` → list unread;
  ack moves to `inbox/processed/`.
- [ ] Board shows `✉ N` unread per lane.
- [ ] `tests/lanes-signals.test.js`.

**Commit:** `feat(lanes): cross-session signals + lane inbox`

## Group 5 — Landing: graded gates + turn + freshness (FEAT-027)

- [ ] Land G3/G4's actual lanes first, manually per Rule 6 Landing Order
  (suite green between) — captures evidence for D8.
- [ ] `momentum lanes land <id> [--into ref] [--execute]`: checks
  (1) lane status done; (2) turn = head of FIFO queue (override
  `--out-of-turn` prints loud warning, exits 2 without --force… no:
  advisory only, warn + require `--force`); (3) freshness — integration
  ref is ancestor of lane branch (else "rebase first"); (4) graded gate:
  spike→none, quick-task→`specs/adhoc/<ref>/record.md` exists,
  phase→`specs/phases/<ref>/retrospective.md` contains
  `## Verification Evidence`; (5) overlap re-warn. Default = validate +
  print plan; `--execute` = `git merge --no-ff` into `--into` (default:
  current branch) + status → landed + advisory rebase signal to
  remaining open lanes' inboxes.
- [ ] `tests/lanes-land.test.js`.

**Commit:** `feat(lanes): merge queue with graded evidence gates + overlap warnings`

## Group 6 — Docs + recipe + verification + release prep

- [ ] `core/commands/lanes.md` recipe (all adapters inherit via existing
  transforms); CLI help final pass.
- [ ] Site `parallel-work.md`: "What's coming in Run" → shipped section
  with real commands; README Parallel workstreams updated.
- [ ] CLAUDE.md template + self-repo Rule 15: pointer to `momentum lanes`
  as the mechanism (one-line addition, above the marker).
- [ ] Fingerprint re-baseline (intended drifts only); full suite;
  3-adapter smoke; site build + no-empty-body sweep.
- [ ] Retrospective + evidence; version bump → 0.24.0; release runbook
  parked on operator approval (stacked below 21a).

**Commit:** `docs(lanes): recipe + site + README; chore(release): v0.24.0 prep`
