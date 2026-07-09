---
type: Phase
status: planned
tags: [team, multiplayer, relay, real-time, ecosystem, multi-repo, lease, ref-cas, contract]
---

# Phase 30c — Team-Fly (Optional Relay + Ecosystem Team Mode)

## Goal

Close the family with two additions, both **optional / additive** and both true
to the git-native, no-server-required identity:

1. **The optional real-time relay** — the D1-deferred layer. Teams that opt in
   get live presence and push notifications on top of the git-native plane; when
   the relay is absent, everything falls straight back to Walk/Run
   (`team sync`). Nothing depends on it.
2. **Ecosystem / multi-repo team mode** — apply Walk's primitives (identity,
   `refs/momentum/*` CAS, fragments) to the **ecosystem** layer so distributed
   teams coordinate across *many* repos, not just one. The substrate map showed
   the ecosystem is a *second* single-filesystem front (`../member` relative
   paths, `.state/` per-machine, swarm wall-clock leases).

Plus: **publish the coordination contract** so third-party tools can consume
momentum's team state — realizing the Lanes-arc "publish lane-state contract
post-dogfood" decision.

## Why

Run gives a team a shared board + trusted landing on **one** repo, but:

- **Visibility is pull-based** — you see teammates only after `sync`. Some teams
  want real-time; the git-native plane can't push. An *optional* relay adds it
  without making momentum depend on a server.
- **The ecosystem is still single-filesystem** — `ecosystem.json` members are
  `../relative` paths (`core/ecosystem/layout.md`), `.state/active-initiative` is
  per-machine and never syncs, and swarm leases are **wall-clock with no
  fencing** (`core/swarm/lib/manifest.js:460-489`) — clock skew alone causes two
  machines to both believe they own a repo. None of this is safe across laptops.
- **The coordination state has no published contract** — third parties can't
  build on it.

## Resolved open questions (from `platform-team-mode.md`)

- **Q3 — does the relay ride the Platform MCP server?** **No hard dependency.**
  Fly ships the relay as its own small, self-hostable, optional component with a
  versioned protocol; it *may* later also be exposed via the Phase-32 Platform
  MCP server, but Fly must not depend on Platform (which comes after). momentum
  ships the relay *code*; it never runs a hosted SaaS (self-host or don't use it).
- **Q4 — ecosystem team mode.** `ecosystem.json` members gain **remote-URL
  identity** (not only `../relative`); ecosystem coordination (initiatives,
  active-initiative, session presence) uses **fragments + ref-CAS**; and swarm's
  wall-clock lease gets the **`refs/momentum/leases/*` CAS** treatment so
  cross-machine ownership is safe (closes the substrate-map hazard).

## Key decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Relay is optional, contract-defined, self-hostable; nothing depends on it** | Preserves offline/no-required-server identity; absent ⇒ full git-native (Walk/Run) |
| 2 | **momentum ships relay code, never a hosted service** | No SaaS, no required infra — operators self-host if they want real-time |
| 3 | **Ecosystem members gain remote-URL identity; ecosystem state → fragments + ref-CAS** | Makes the *second* single-filesystem front multi-machine safe |
| 4 | **Swarm wall-clock lease → `refs/momentum/leases/*` CAS** | Fixes clock-skew double-ownership; git arbitrates leases, no fencing service |
| 5 | **Publish a versioned coordination-fragment + ref contract** | Third-party consumers (dashboards, CI) can read team state; the Lanes-arc contract decision, realized |
| 6 | **ADR-0014** — optional relay + ecosystem team mode + lease-CAS | Records the additive/optional posture and the multi-repo extension |

## Scope

### In
- **Optional relay** — self-hostable relay server + client; mirrors coordination fragments/refs in real time + push notifications; **graceful absence** (detected/configured; absent ⇒ git-native).
- **Ecosystem team mode** — remote-URL members in `ecosystem.json`; synced initiatives / `active-initiative` / session presence via fragments + CAS; cross-machine `momentum ecosystem status`.
- **Swarm lease → ref-CAS** — lease acquisition via `refs/momentum/leases/*` (single winner; no wall-clock double-ownership).
- **Published coordination contract** — versioned schema doc + a sample third-party reader.
- **ADR-0014**; docs (site "team across repos", developer-guide relay setup + contract).

### Out (non-goals)
- A **hosted/managed** relay service (momentum ships code, not SaaS).
- Real-time collaborative editing of specs — out of frame; git-merge is the model.
- The **Platform MCP server** itself (Phase 32) — the relay may later ride it, but that is Platform's scope, not Fly's.
- Changing the trust invariant (ADR-0009 holds; the relay carries no authority — it mirrors, it does not approve).

## Deliverables & verification

Default verification (`specs/config.md`): `test_command = npm test`; `build_command = none`.

| # | Deliverable | Verification |
|---|-------------|--------------|
| D1 | Optional relay (real-time + graceful absence) | With relay up, actor A's fragment appears on actor B **without** a manual `sync`; with relay down, the plane still works via `team sync` (degradation test) |
| D2 | Ecosystem team mode (remote-URL members, synced state) | **Two clones of an ecosystem**: `active-initiative` + initiatives shared via fragments; concurrent edits → zero conflict; `ecosystem status` reflects both |
| D3 | Swarm lease → ref-CAS | Two machines race a lease → exactly one wins; the wall-clock takeover hazard is gone (skew cannot double-own) |
| D4 | Published coordination contract | Versioned schema doc; a sample reader parses live fragments; contract test pins the schema |
| D5 | Relay carries no authority | Test: an approval/land decision is never taken by the relay — it mirrors state only; removing the relay changes nothing about gate outcomes |

## Acceptance criteria

1. A team can **opt into** the relay for real-time presence/notify and **lose
   nothing** when it is absent — behavior is byte-identical to git-native Walk/Run
   without it.
2. Ecosystem coordination works **across machines** with remote-URL members;
   concurrent initiative/active-initiative edits produce zero git conflict.
3. Swarm repo ownership is **safe across machines** via `refs/momentum/leases/*`
   CAS — clock skew can no longer cause double-ownership.
4. The coordination contract is **published, versioned, and consumable** by a
   sample third-party reader.
5. The relay holds **no authority** (mirrors, never approves/lands).
6. Full suite green; the two-clone ecosystem fixture + relay up/down fixture are
   committed evidence.
