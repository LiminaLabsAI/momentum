---
type: Retrospective
status: complete
---

# Phase 30 — Team Mode (Walk + Run + Fly) — Retrospective

The Team-mode family took momentum from a single-operator tool to a **git-native
multiplayer coordination plane for N humans on N clones sharing one git remote** —
no server, no daemon, offline-first (operator decision D1). Built and verified in
one isolated lane (`phase-30a-team-walk-impl`) after fixing an initial lane-
isolation mistake (see history). Shipped as **v0.37.0** covering all three phases.

## What shipped

- **Walk (30a, ADR-0012)** — `core/identity` durable actor from git config;
  `core/team/lib/fragments` per-actor append-only fragments (conflict-free by
  construction) + `compile` into `status.md`; `core/team/lib/refcas` git-ref
  compare-and-swap; `momentum claim` (closes ENH-057) + `momentum team
  board/record/sync/compile`.
- **Run (30b, ADR-0013)** — `presence` (heartbeat-on-invocation + liveness),
  `approvals` (reviewer≠author ledger, client-side-honest), `queue` (one shared
  landing turn across clones via ref-CAS); `momentum team
  heartbeat/presence/approve/check/turn`. ENH-056 confirmed already covered by
  the ENH-050 self-merge guard.
- **Fly (30c, ADR-0014)** — `lease` (cross-machine lease-CAS, fixes swarm
  wall-clock double-ownership); `relay/` (self-hostable, authority-free
  store-and-poll relay + client with graceful absence); `contract/` (versioned,
  third-party-consumable coordination contract); `momentum team
  lease/relay/contract`.

## Verification Evidence

All verification run in this session on the lane (`node --test --test-concurrency=1`):

- **Full suite: 1001 / 1001 passing** (baseline Phase-29 `main` 970 + 31 new
  Team-mode tests). Duration ~60s. Zero failures, zero skipped.
- **Per-phase test files (all green):**
  - `tests/team-walk.test.js` — 9 (identity override/git/fallback; fragments
    own-prefix/monotonic/foldLatest; **refcas concurrent claim → exactly one
    winner** on a real bare-remote two-clone fixture).
  - `tests/team-claim.test.js` — 4 (`momentum claim` one-winner, loser exits 2,
    usage, whoami).
  - `tests/team-compile.test.js` — 5 (two-actor rows, foldLatest own-row,
    applyManaged idempotent, record+board CLI, **compileStatusFile into
    status.md idempotent**).
  - `tests/team-e2e.test.js` — 1 (**two-clone conflict-free fragment merge** —
    both rows, attribution preserved — **+ one-winner claim**).
  - `tests/team-run.test.js` — 7 (presence liveness thresholds; **reviewer≠author
    self-vs-peer + threshold-2**; **shared-turn single-holder across clones**;
    approve/check CLI exit codes; turn CLI; Run e2e).
  - `tests/team-fly.test.js` — 5 (**lease single-owner across clones**; relay
    publish→poll; **graceful absence never throws**; authority-free; contract
    version pinned).
  - `tests/team-family-e2e.test.js` — 1 (**the whole plane, two devs, two
    clones**: identity → claim → fragment merge → presence → shared turn →
    reviewer≠author → lease → relay + graceful absence).
- **Integration:** the lane rebased cleanly onto the Phase-29 `main` (7c2dd45) —
  zero conflicts — and the combined suite (Phase 29 + Team family) is green,
  proving no regression against the newly-landed instruction-variation work.

## Deferred to a follow-up (does not block the release)

Instruction-template wiring that overlaps the Phase-29 surfaces was intentionally
kept out of the mechanism commits to avoid re-tangling: reword Rule 15 to cite
the fragment/CAS mechanism, wire `momentum claim` into the phase recipes, wire
durable identity into the legacy lane-signal `from`/swarm actor, `refreshGitignore`
`!.momentum/team/` for downstream installs, and the adapter fingerprint
re-baselines. These are additive integration/docs — filed as an ENH follow-up.

## Lessons

- **Lane isolation is not optional** — a `git checkout -b` in a shared checkout
  entangled two lanes' commits. `momentum lanes open` (separate worktree) is the
  rule when another session is live. Fixed mid-flight; the family's whole thesis.
- **Git is a coordination substrate, not just version control** — ref-CAS gives
  atomic cross-machine allocation for free; the remote is the arbiter, no server.
