---
type: Phase
status: in-progress
tags: [team, integration, recipes, rule-15, lanes-land, pre-push, ecosystem, multi-repo, fingerprints]
---

# Phase 30d — Team Integration

## Goal

Make the Team-mode primitives shipped in **v0.37.0** (Walk/Run/Fly) *actually
used by momentum's real workflows* — not just standalone `momentum team`
commands. v0.37.0 built the git-native coordination plane and proved it works
(1002/1002 + a two-clone demo); this phase **wires it in** so a team gets the
benefit without knowing the primitives exist. Closes the deferred **ENH-064**.
Target **v0.38.0**.

## Why

The v0.37.0 core is real but *opt-in*: you only get collision-free allocation if
you remember to run `momentum claim`, and the reviewer≠author gate only fires if
you run `momentum team check` by hand. The value lands when the **recipes** and
the **landing flow** use the primitives automatically:

- `/brainstorm-phase` should claim its phase number via ref-CAS — so two people
  brainstorming at once can't both grab "Phase 31" (the exact collision that
  started this whole arc).
- `/complete-phase` should reserve the version via `momentum claim version`
  before tagging (ENH-057, mechanism shipped — now wire it into the gate).
- `lanes land` should honor the shared turn + require peer approval when the
  team configures it.
- Rule 15's shared-tracking guarantee should cite the *mechanism* (fragments +
  CAS), not only social convention.
- The ecosystem (multi-repo) layer — still single-filesystem — should gain team
  mode (the deferred Fly scope).

## Already started (this lane, `feat-team-integration`)

- **Live two-clone demo** — `scripts/demo-team.sh` (G3 partial). ✅
- **Durable actor stamped on lane signals** — `core/lanes/lib/signals.js`
  gains `actor` alongside `from: branch` (G2 partial). ✅

## Key decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Wire, don't rebuild — consume the shipped `core/team/*` primitives | v0.37.0 already tested; this is integration only |
| 2 | Recipe + Rule 15 changes go through instruction regeneration + **fingerprint re-baseline** | ADR-0004/0010 projection model — instruction surfaces are generated |
| 3 | The `pre-push` review-gate change is a **hook change** — requires explicit operator approval | Memory: hook-file changes need an action-specific yes |
| 4 | `lanes land` review gate is **opt-in via config** (`review_min_approvals`), defaulting to solo-compatible | N=1 behavior unchanged unless a team opts in |
| 5 | Ecosystem team mode reuses Walk/Fly primitives (fragments + `refs/momentum/leases/*` CAS) | No new substrate; same git-native plane |

## Scope

### In
- **G0** — `momentum claim` in `/brainstorm-phase` + `/start-phase` + `/hotfix` (next number) and `/complete-phase` (reserve version); reword **Rule 15**; `changelog/`→fragments; `refreshGitignore` `!.momentum/team/`; regenerate instructions + re-baseline 4 adapter fingerprints.
- **G1** — `lanes land`: honor the shared turn + reviewer≠author gate (config-gated); migrate `.momentum/merge-approved` → attributed multi-actor ledger in `pre-push`; config keys in `config.md`.
- **G2** — Ecosystem team mode: remote-URL members in `ecosystem.json`; `active-initiative`/initiatives/session-presence → fragments; wire `core/team/lib/lease.js` ref-CAS into `core/swarm/lib/manifest.js` (replace wall-clock leases); auto-heartbeat on `momentum` invocation.
- **G3** — Verify + docs + release: sample third-party contract reader; site/README "team across repos"; ecosystem-team e2e; extend `scripts/demo-team.sh`; full suite + fingerprints; release v0.38.0.

### Out (non-goals)
- No change to the v0.37.0 primitives' behavior (this is wiring).
- No real-time relay changes (Fly relay stands as-is).
- No trust-invariant change (ADR-0009 holds; the review gate stays client-side-honest).

## Deliverables & verification

Default verification (`specs/config.md`): `test_command = npm test`.

| # | Deliverable | Verification |
|---|-------------|--------------|
| D1 | `momentum claim` wired into recipes | Recipe-content tests assert the claim step; 4 fingerprints re-baselined |
| D2 | Rule 15 cites the mechanism | Rules-body test; fingerprints |
| D3 | `lanes land` turn + review gate (config-gated) | Test: land blocked without peer approval when `review_min_approvals≥1`; solo unchanged |
| D4 | `pre-push` multi-actor approval ledger | Hook test: records approver; reviewer≠author enforced |
| D5 | Ecosystem team mode | Two-clone ecosystem e2e: remote-URL members + shared active-initiative + swarm lease-CAS single-owner |
| D6 | Docs + extended demo | Site/README render; `demo-team.sh` covers ecosystem + relay |

## Acceptance criteria

1. Running `/brainstorm-phase` concurrently on two clones cannot produce two of
   the same phase number (claim-gated) — proven by test/demo.
2. `/complete-phase` reserves the version before tagging (ENH-057 wired).
3. With `review_min_approvals ≥ 1`, `lanes land` refuses a self-approved change
   and accepts a peer-approved one; solo (default) behavior unchanged.
4. Ecosystem coordination works across two clones with remote-URL members; swarm
   ownership is safe via `refs/momentum/leases/*` CAS.
5. Full suite green; all 4 adapter fingerprints re-baselined for the intended
   instruction drift; released v0.38.0 with complete tracking (tasks.md,
   roadmap, status) BEFORE the tag.
