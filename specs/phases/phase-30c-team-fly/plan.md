---
type: Plan
status: planned
---

# Phase 30c — Team-Fly — Implementation Plan

```
Execution order:
  Sequential:  Group 0 → (Group 1 ∥ Group 2) → Group 3 → Group 4
```

- **Group 0** blocks everything (contracts + ADR-0014 + published schema).
- **Groups 1 and 2** — optional relay vs ecosystem team mode — are independent, parallel.
- **Group 3** publishes the contract + docs (sequential).
- **Group 4** is verification (sequential, last).

**Prereq:** Phases 30a (Walk) and 30b (Run) landed — Fly consumes Walk's
identity/fragments/ref-CAS and Run's presence/board/queue contract (the relay
relays Run's state; ecosystem mode reuses the same primitives). Verification
default: `npm test` (config; no build).

---

## Group 0 — Contracts & schema *(Sequential — blocks all)*

**External deps:** none (git only).
**Commit:** `feat(team): relay protocol + ecosystem-team + lease-CAS contracts (ADR-0014)`

- [ ] **ADR-0014 — Optional relay + ecosystem team mode.** Records: the relay is optional/self-hostable/authority-free and nothing depends on it; the relay may later ride the Phase-32 Platform MCP server but Fly ships standalone; ecosystem state moves to fragments + ref-CAS; swarm leases move to `refs/momentum/leases/*` CAS.
- [ ] **Relay protocol contract** (`core/team/relay/protocol.md` + a version constant) — what the relay mirrors (fragment/ref deltas), the notify envelope, and the absence-fallback rule.
- [ ] **Published coordination-fragment schema** (`core/team/contract/` — versioned) — the on-wire/on-disk shape of every coordination fragment + `refs/momentum/*` layout, so third parties can consume it.

## Group 1 — Optional relay *(∥ Group 2)*

**External deps:** a self-hosted relay endpoint for the live test (fixture spawns a local relay).
**Commit:** `feat(team): optional real-time relay (self-hostable, authority-free)`

- [ ] **Relay server** (`core/team/relay/server.js`) — zero-dependency Node HTTP/WebSocket; subscribes to a repo's coordination refs/fragments and fans out deltas + notifications. Self-hosted; momentum ships it, does not run it.
- [ ] **Relay client** — `momentum team --watch` (or a config `relay_url`) subscribes; applies deltas locally so presence/board update **without** a manual `sync`.
- [ ] **Graceful absence** — no `relay_url` (or unreachable) ⇒ silently fall back to pull-based `team sync`; a one-line notice, never an error.
- [ ] **Authority-free invariant** — the relay mirrors state only; gate/land/approve decisions are never taken by it (a test asserts removing the relay changes no gate outcome).
- [ ] Tests: relay-up delta propagation without sync; relay-down fallback; authority-free assertion.

## Group 2 — Ecosystem team mode *(∥ Group 1)*

**External deps:** none (fixture builds a two-clone ecosystem with bare remotes).
**Commit:** `feat(ecosystem): multi-machine team mode — remote-URL members + fragment state + lease-CAS`

- [ ] **Remote-URL members** — `ecosystem.json` members carry a remote URL (not only `../relative`); discovery/status resolve remote-identified members; `../relative` stays valid for co-located use.
- [ ] **Ecosystem state → fragments + CAS** — `active-initiative` (today per-machine `.state/`), initiatives, and session presence become synced fragments; concurrent edits merge conflict-free.
- [ ] **Swarm lease → `refs/momentum/leases/*` CAS** — lease acquisition/renewal/takeover via ref-CAS (single winner); remove the wall-clock double-ownership path; audit trail keyed by the durable actor (Walk identity), not a random session UUID.
- [ ] Tests (two-clone ecosystem): shared active-initiative; concurrent initiative edits zero-conflict; lease race → one winner; skew cannot double-own.

## Group 3 — Publish contract + docs *(Sequential)*

**External deps:** none.
**Commit:** `docs(team): publish coordination contract + team-across-repos docs`

- [ ] **Sample third-party reader** — a tiny script that reads the published fragments/refs and prints the team board (proves the contract is consumable outside momentum).
- [ ] **Contract test** — pins the versioned schema (breaking change ⇒ version bump + test update).
- [ ] Docs — site "Team across repos" + relay setup; developer-guide relay + contract; README team-mode capstone.

## Group 4 — Verification *(Sequential — last)*

**External deps:** none (fixtures spawn their own bare remotes + local relay).
**Commit:** `test(team): relay up/down + ecosystem-team + lease-CAS e2e`

- [ ] **Relay e2e** (`tests/team-relay.e2e.test.js`): delta propagation with relay up; graceful fallback with relay down; authority-free.
- [ ] **Ecosystem-team e2e** (`tests/ecosystem-team.e2e.test.js`): two-clone shared state, lease-CAS race.
- [ ] Full suite green (`npm test`); retrospective `## Verification Evidence` (Rule 12).
- [ ] Smoke: `momentum team --watch` (relay), `momentum ecosystem status` (remote members); sample contract reader.
- [ ] Re-baseline adapter fingerprints for intended drift.
