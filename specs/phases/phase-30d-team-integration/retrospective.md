---
type: Retrospective
status: complete
---

# Phase 30d — Team Integration — Retrospective

Wired the v0.37.0 Team-mode primitives into momentum's real workflows (closes
**ENH-064**), shipped as **v0.38.0**. Built in the isolated lane
`feat-team-integration` (opened with `momentum lanes open` — the discipline held).

## What shipped

- **G0 — recipe claim-wiring + Rule 15.** `momentum claim` now runs inside the
  real flows: `/brainstorm-phase` reserves the phase number (two people can't
  both create "Phase N"), `/complete-phase` reserves the version before tagging
  (ENH-057), `/hotfix` reserves new backlog IDs. Rule 15 cites the fragment/CAS
  mechanism. Downstream `.gitignore` commits `.momentum/team/`. All 4 adapter
  fingerprints re-baselined via a new **`scripts/rebaseline-fingerprints.js`**
  (proven zero-drift before use — the re-baseline is trustworthy, not
  "make-the-test-pass").
- **G1 — review gate + pre-push audit.** `momentum lanes land` enforces a
  **reviewer≠author** gate when `review_min_approvals ≥ 1` (config-gated, OFF by
  default = solo-safe). The `pre-push` hook records an **attributed
  merge-approval audit** (who authorized each protected push) — operator-approved
  hook change, additive + best-effort. 4 team config keys registered.
- **G2 — presence + swarm lease-CAS.** Auto-heartbeat (any `momentum team`
  command refreshes presence — live, no daemon). **Opt-in cross-machine lease
  fence in swarm** (`MOMENTUM_SWARM_LEASE_CAS=1`): a wall-clock takeover must
  also win a `refs/momentum/leases/*` CAS, closing the clock-skew double-own
  hazard — additive, fail-open, OFF by default.

## Verification Evidence

`node --test --test-concurrency=1` on the lane, this session:

- **Full suite: 1008 / 1008 passing** (baseline 1002 + 6 net-new 30d tests).
- **Zero regressions on the sensitive subsystems**, proven by keeping them green
  with the new paths OFF by default:
  - **231 / 231 swarm tests** pass with the lease fence off (opt-in).
  - **23 / 23 git-hooks tests** pass (+ 1 new: pre-push writes the attributed
    audit line).
  - **15 / 15 lanes-land tests** pass (+ 2 new: review gate blocks self / passes
    peer; OFF by default = silent).
- **New tests (all green):** `tests/lanes-review-gate.test.js` (reviewer≠author,
  config-gated), `tests/swarm-lease-cas.test.js` (fence blocks a cross-machine
  takeover when another machine holds the ref-CAS lease; allows when free),
  git-hooks audit-line test, auto-heartbeat test.
- **Fingerprints:** re-baselined per change with `scripts/rebaseline-fingerprints.js`,
  each run verified zero-drift against the prior fixtures before writing.
- **Live demo** `scripts/demo-team.sh` still drives the whole plane across two
  clones (unchanged from v0.37.0).

## Deferred (honest — filed under ENH-064 follow-up)

The rest of the ecosystem team-mode was intentionally NOT rushed at the tail of a
long session: **remote-URL members** in `ecosystem.json` and **ecosystem-state
→ fragments** (they're incomplete without each other), plus the sample
third-party contract reader and the site/README "team across repos" docs. The
swarm lease-CAS primitive — the load-bearing cross-machine safety fix — IS
shipped (opt-in). Recommend a small follow-up phase for the remaining
multi-repo surface.

## Lessons

- **Gate risky changes behind an opt-in default-off flag** — the swarm lease
  fence closed a real hazard while keeping 231 tests green, because it never
  changes default behavior. Additive + fail-open beats a risky rewrite.
- **Prove the re-baseline tool zero-drift before trusting it** — did this once,
  then every fingerprint re-baseline was mechanical and safe.
