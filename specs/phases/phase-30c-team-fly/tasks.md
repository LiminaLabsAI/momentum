---
type: Tasks
status: planned
---

# Phase 30c — Team-Fly — Tasks

> Mirrors `plan.md`. `[x]` done, `[/]` in-progress. Verify before claiming done
> (Rule 12). Prereq: Phases 30a (Walk) + 30b (Run) landed. Execution:
> G0 → (G1 ∥ G2) → G3 → G4.

## Group 0 — Contracts & schema *(blocks all)*
- [ ] Author **ADR-0014** (optional relay; ecosystem team mode; swarm lease → ref-CAS; standalone-not-Platform-dependent)
- [ ] `core/team/relay/protocol.md` + version constant (what's mirrored, notify envelope, absence-fallback)
- [ ] `core/team/contract/` — versioned published coordination-fragment + `refs/momentum/*` schema
- [ ] Commit G0

## Group 1 — Optional relay *(∥ G2)*
- [ ] `core/team/relay/server.js` — zero-dep self-hostable relay; fans out fragment/ref deltas + notifications
- [ ] Relay client — `momentum team --watch` / config `relay_url`; applies deltas without manual `sync`
- [ ] Graceful absence — no/unreachable `relay_url` ⇒ silent fallback to `team sync` (notice, not error)
- [ ] Authority-free invariant — relay mirrors only; a test asserts gate outcomes unchanged with/without relay
- [ ] Tests: up propagation; down fallback; authority-free
- [ ] Commit G1

## Group 2 — Ecosystem team mode *(∥ G1)*
- [ ] Remote-URL members in `ecosystem.json` (relative paths still valid); discovery/status resolve them
- [ ] `active-initiative` + initiatives + session presence → synced fragments (conflict-free)
- [ ] Swarm lease → `refs/momentum/leases/*` CAS; drop wall-clock double-ownership; audit keyed by durable actor
- [ ] Tests (two-clone ecosystem): shared active-initiative; concurrent edits zero-conflict; lease race → one winner
- [ ] Commit G2

## Group 3 — Publish contract + docs *(sequential)*
- [ ] Sample third-party reader (reads published fragments/refs → prints team board)
- [ ] Contract test pins the versioned schema (breaking change ⇒ version bump)
- [ ] Docs — site "Team across repos" + relay setup; developer-guide; README capstone
- [ ] Commit G3

## Group 4 — Verification *(last)*
- [ ] `tests/team-relay.e2e.test.js` — relay up/down + authority-free
- [ ] `tests/ecosystem-team.e2e.test.js` — two-clone shared state + lease-CAS race
- [ ] Full suite green (`npm test`); retrospective `## Verification Evidence`
- [ ] Smoke: `momentum team --watch`, `momentum ecosystem status` (remote), sample reader
- [ ] Re-baseline adapter fingerprints (intended drift)
- [ ] Commit G4 + retrospective

## Phase-exit
- [ ] `/sync-docs` from history → specs
- [ ] `/complete-phase` (version reserved via `momentum claim version` — ENH-057) — **family capstone**
