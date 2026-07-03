# Phase 21a — Concurrency Trial Report (D6)

> **Verdict: ALL THREE THRESHOLDS MET → the template release (D4) ships in
> v0.23.0.**
>
> Scored by the conductor session on 2026-07-03 against the thresholds
> written into ADR-0001 and `overview.md` BEFORE the trial ran (SIEVE
> discipline). Lane session reports captured verbatim at
> `evidence/lane-a-report.md` and `evidence/lane-b-report.md`.

## Trial design

Groups G2 (templates + fingerprint) and G3 (site docs + README) of this
phase executed as **two live lanes** — own branch, own worktree, own agent
session, running concurrently — under the conventions G0/G1 shipped
(Rule 15, branch→phase resolution, multi-row Active Phase board, Rule 6
Landing Order). The conductor session (parent branch) stayed idle during
lane execution and performed the landings.

| | Lane A | Lane B |
|---|---|---|
| Branch | `phase-21a-lanes-walk-g2` | `phase-21a-lanes-walk-g3` |
| Worktree | `.claude/worktrees/lane-a` | `.claude/worktrees/lane-b` |
| Work | templates + fingerprints (G2) | site page + README (G3) |
| Session window | 00:39:00 – 01:29:54 | 00:39:28 – 01:32:10 |
| Lane commit | `2d65e75` | `2e65777` (rebased → `840259e`) |

Fork point: `713c9c4` (00:37:32). Landings on the phase branch (the lanes'
integration point, recursive per ADR-0001): Lane A merged `4742c76` → full
suite 651/651 green → Lane B rebased onto the updated branch (3 conflicts,
resolved in 98 s) → merged `2b8423f` → full suite 651/651 green.

## Board of record over time (status.md Active Phase rows)

| Commit | 21a row | Lane A row | Lane B row |
|---|---|---|---|
| `713c9c4` fork | G0 ✓ G1 ✓ → trial | pending | pending |
| `2d65e75` (Lane A, on its branch) | unchanged | done — awaiting landing | pending |
| `2e65777` (Lane B, on its branch) | unchanged | pending (stale view of A) | done — awaiting landing |
| `840259e` (Lane B rebased) | unchanged | done — awaiting landing | done — awaiting landing |
| `2b8423f` both landed | unchanged | done — awaiting landing | done — awaiting landing |

Each lane updated ONLY its own row (verified by both lanes via `git show`
single-line diffs). The "stale view" in Lane B's pre-rebase commit is the
expected consequence of branch isolation, resolved mechanically at rebase.

## Threshold 1 — Zero tracking-file corruption: **PASS**

Post-landing integrity sweep on the phase branch (`2b8423f`):
- `history.md`: 12 entries, all present, correct order, format intact.
- `changelog/2026-07.md`: 6 bullets under 2026-07-03 — both lane bullets
  present, no reordering of prior entries.
- `status.md`: 3 Active Phase rows intact, both lane rows show
  `done — awaiting landing`; no other section touched.
- `tasks.md`: G0/G1/G2/G3 marked `[x]` with evidence notes; only G4/G5
  open (correct — not yet done at scoring time).
- `backlog.md`: BUG-012 row appended by Lane A, table structure intact.
- Zero conflict markers anywhere under `specs/`.

## Threshold 2 — Zero session-misorientation events: **PASS**

- Both lanes independently resolved their phase as `phase-21a-lanes-walk`
  via the documented **status.md fallback** (their `phase-*-g2/-g3`
  branches have no phase directory — the intended edge for sub-lanes), and
  captured identical, correct output from the mechanical resolver
  (`scripts/check-history-reminder.sh`).
- Both lanes report **zero** phase/branch/file-ownership confusion.
- Neither lane touched the other's row/section anywhere (verified in both
  landing diffs).
- Honest near-misses recorded (not misorientations): Lane A spent ~15 min
  proving BUG-012 was pre-existing rather than its own regression; Lane B's
  first "build green" would have been a false positive (silent empty-body
  mermaid pages) — caught by the mandated dist content probes.

## Threshold 3 — Tracking-merge overhead < 15 min/week: **PASS**

Narrow reading (what ADR-0001 names: time resolving tracking-file
conflicts):
- Lane A landing: **0 conflicts, 0 min** (clean ort merge).
- Lane B rebase: **3 conflicts** — exactly the predicted worst-case trio
  (status.md adjacent lane rows in one hunk; history.md both-append-at-EOF;
  changelog both-append-same-section). All keep-both, mechanical.
  **Resolution: 98 seconds** including re-verification.
- Lane B landing: 0 conflicts.
- **Total: ~1.6 min per full 2-lane landing cycle.** Even at a
  daily-landing cadence (7 cycles/week) that extrapolates to ~11.4
  min/week, under the 15-minute threshold; at the realistic 1–3
  cycles/week it is 2–5 min/week.

Broad reading (all tracking-coordination overhead): Lane A ~4 min + Lane B
~1.7 min of in-lane tracking updates + 1.6 min conductor resolution ≈
**~7.5 min for the entire trial cycle** — still under threshold even if
incurred weekly in full.

Worst-case note: these sub-lanes shared ONE phase's history.md/changelog
section — the maximum-contention configuration. Two independent phases
(the common real-world case) have separate history files and separate
changelog bullets, so their contention profile is strictly smaller.

## Conventions observations (feed into 21b)

1. **The append discipline works.** All conflicts were trivially
   keep-both; nothing required judgment about whose content wins.
2. **The status.md fallback is load-bearing** for sub-lane branches —
   FEAT-026's registry should make lane→plan-node binding explicit so
   sub-lanes don't depend on table parsing.
3. **Fresh-worktree cold start is the real per-lane tax**, not tracking:
   BUG-012 (committed exec bits — 2 red tests in every fresh worktree,
   fixed this phase) and the Playwright headless-shell gap (silent empty
   mermaid pages on exit 0 — filed BUG-013). Both discovered BECAUSE the
   trial used fresh worktrees; both are exactly what FEAT-026's lane-open
   flow should preflight.
4. **Adjacent table rows conflict as one hunk** — expected git behavior;
   keep-both resolution is obvious, but a lane registry (21b) removes even
   this by moving per-lane state out of a shared table.

## Caveats

- Both lane sessions suffered harness stalls (watchdog restarts) unrelated
  to the conventions; stall time is excluded from overhead numbers (Lane
  B's 43-min gap was a Playwright download + stall, ~10 min active work).
- The trial is N=1 with agent sessions under one conductor. The thresholds
  gate the template release, not the end of measurement — Rule 15 usage in
  the wild (self-repo + downstream installs) continues to generate
  evidence through 21b.
