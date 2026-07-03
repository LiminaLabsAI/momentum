# Phase 21a — Lanes Walk — Retrospective

> Released as **v0.23.0** (2026-07-03). Branch `phase-21a-lanes-walk`.
> Execution: G0 → G1 → (G2 ∥ G3 as live lanes) → G4 → G5, per plan.md.

## What was delivered

- **ADR-0001** (`specs/decisions/0001-concurrent-workstreams.md`) — the
  first real ADR: multi-active-phase model, branch↔phase binding,
  sequential-merge discipline, off-lane brainstorms/spikes, three
  pre-written trial thresholds, TD-008 relationship.
- **Rule 15 (Concurrent Workstreams — Lanes)** + lane-scoped edits to
  Rules 2/4/5/8 + the Rule 6 **Landing Order** subsection — in the
  self-repo CLAUDE.md, the shipped CLAUDE.md template, the condensed
  `core/agent-rules/project.md`, and surgical touch-ups in
  codex/antigravity AGENTS.md (all three adapters inherit).
- **Multi-row Active Phase board** (Phase | Branch | Status | Progress) in
  self `specs/status.md` and the template.
- **Branch→phase resolution**: `check-history-reminder.sh` resolves the
  lane from the current branch (fallback = status.md rows; ad-hoc sink for
  non-phase branches; detached-HEAD fallback), mirrored to the self-repo;
  Rule 15 lane-binding preambles + multi-row-aware steps in 5 recipes
  (log / validate / sync-docs / start-phase / complete-phase);
  `tests/phase-resolution.test.js` (7 tests).
- **Docs**: site page `parallel-work.md` ("Working on multiple things at
  once") + README "Parallel workstreams" section.
- **Live concurrency trial (D6)**: G2 ∥ G3 executed as two real lanes (own
  branch/worktree/agent session), landed sequentially per the new Landing
  Order. **All three pre-written thresholds met** —
  `evidence/trial-report.md`, lane session reports captured verbatim.
- **BUG-012 fixed in-phase**: committed exec bits on 7 shipped scripts +
  `tests/committed-exec-bits.test.js` regression guard.

## What went well

- **Dogfood-in-phase worked.** The conventions were exercised in anger
  before the templates shipped; the trial surfaced two real bugs
  (BUG-012, BUG-013) that only fresh lane worktrees could reveal —
  exactly the SIEVE threshold-first discipline paying off.
- **The append discipline held under real concurrency.** Two agent
  sessions edited the same tracking files on parallel branches; every
  conflict was a trivial keep-both; zero corruption, zero misorientation.
- **Landing Order was executable as written**: merge → suite → rebase →
  merge → suite, 98 s of conflict resolution total.
- **Fingerprint snapshots earned their keep again** — every intentional
  template drift was caught and re-baselined with meta (twice: G1, G2);
  zero unintentional drift shipped.

## What didn't go well

- **Both lane sessions hit harness stalls** (watchdog restarts,
  connection drops) requiring conductor resumes. Not a conventions
  failure, but real friction for multi-session workflows — relevant
  input for FEAT-026's signal design (lanes should be resumable from
  their on-disk state, which is exactly what worked here).
- **Fresh-worktree cold start is under-managed**: BUG-012 (2 red tests on
  any fresh checkout, masked locally for months by `core.fileMode=false`)
  and BUG-013 (site build exits 0 with empty mermaid bodies when
  Playwright's headless shell is missing) both cost lane time. FEAT-026's
  lane-open flow should preflight the substrate.
- The brief's assumption of `nvm` was wrong (system node was already
  ≥22.12) — trivial, but a reminder that environment assumptions in
  briefs need checking.

## Lessons learned

1. **Worst-case contention is sub-lanes of one phase** (shared history.md
   + changelog section). Real multi-phase lanes contend strictly less.
   The measured ceiling: ~1.6 min conflict resolution per landing cycle.
2. **The status.md fallback is load-bearing for sub-lane branches** —
   FEAT-026 should make lane→plan-node binding explicit (registry) rather
   than table-parsed.
3. **Verification probes must check content, not exit codes** — Lane B's
   build "passed" with gutted pages; the mandated dist content probes
   caught it. BUG-013's postbuild gate should make that structural.

## Verification Evidence

### `npm test` (full suite, fresh run on the release candidate — exit 0)

```
ℹ tests 652
ℹ suites 0
ℹ pass 652
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 28948.489166
```

### Per-adapter install smoke — `node bin/momentum.js init <tmp> --agent <agent>` (exit 0 ×3)

```
claude-code: init exit 0, files: 54
codex: init exit 0, files: 58
antigravity: init exit 0, files: 59
```

### Site build — `npm run build` in site/ (node v26.4.0, exit 0)

```
build exit: 0
[starlight:pagefind] Finished building search index in 26.17s.
[@astrojs/sitemap] `sitemap-index.xml` created at `dist`
[build] 13 page(s) built in 27.91s
[build] Complete!
dist/parallel-work/index.html: 61,996 bytes, content probe "main is the
runway" present; empty-body sweep across all 13 pages: minimum first-div
content length 841 chars (no empty sl-markdown-content anywhere).
```

### Concurrency trial (D6) — `evidence/trial-report.md`

```
Threshold 1 (zero tracking corruption):    PASS — post-landing sweep clean
Threshold 2 (zero misorientation):         PASS — 0 events across both lanes
Threshold 3 (merge overhead < 15 min/wk):  PASS — ~1.6 min per landing cycle
Landings: Lane A 4742c76 (suite 651/651) → Lane B rebase (3 keep-both
conflicts, 98 s) → 2b8423f (suite 651/651)
```

## Acceptance criteria check (overview.md)

1. Two phases/lanes simultaneously active, each session resolving its own
   from its branch — **met** (lane reports + resolver outputs captured).
2. All three trial thresholds met — **met** (`evidence/trial-report.md`).
3. Multi-row Active Phase in self + template; all rule surfaces carry
   Rule 15 + lane-scoped language + Rule 6 extension — **met** (G0 + G2,
   fingerprints re-baselined).
4. Branch→phase resolution with fallback; new tests green; full suite
   green — **met** (652/652; 7 resolution tests + exec-bit guard added).
5. Site builds green; v0.23.0 released with operator-approved release
   actions — build **met**; release executed under the operator's
   standing session directive ("complete this phase family", 2026-07-03)
   recorded in phase history.
