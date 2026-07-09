---
type: History
status: planned
---

# Phase 30c — Team-Fly — History

### [DECISION] 2026-07-10 — Relay is optional, self-hostable, and Platform-independent (resolves Q3)
Topics: relay, real-time, optional, no-server, platform
Affects-phases: phase-30c-team-fly
Affects-specs: specs/phases/phase-30c-team-fly/overview.md#key-decisions
Detail: The D1-deferred real-time relay ships as its own small, self-hostable,
optional component with a versioned protocol — nothing depends on it and its
absence falls straight back to git-native Walk/Run. It may LATER also be exposed
via the Phase-32 Platform MCP server, but Fly must not depend on Platform (which
comes after). momentum ships relay code, never a hosted SaaS.

### [DECISION] 2026-07-10 — Ecosystem team mode: remote-URL members + fragment state + lease-CAS (resolves Q4)
Topics: ecosystem, multi-repo, remote-url, lease, ref-cas
Affects-phases: phase-30c-team-fly
Affects-specs: specs/decisions/0014-relay-ecosystem-team-mode.md, core/ecosystem/layout.md
Detail: The ecosystem is the second single-filesystem front (`../relative`
members, per-machine `.state/`, wall-clock swarm leases). Fly applies Walk's
primitives: members gain remote-URL identity; `active-initiative`/initiatives/
session presence become synced fragments; swarm lease acquisition moves to
`refs/momentum/leases/*` CAS so clock skew can no longer double-own a repo
(closes the substrate-map hazard at `core/swarm/lib/manifest.js:460-489`).

### [DECISION] 2026-07-10 — The relay carries no authority
Topics: relay, trust, authority-free, adr-0009
Affects-phases: phase-30c-team-fly
Affects-specs: specs/phases/phase-30c-team-fly/overview.md#deliverables--verification
Detail: The relay mirrors coordination state and pushes notifications only — it
never takes a gate/land/approve decision. Removing the relay must change no gate
outcome (asserted by test). Keeps ADR-0009's trust invariant intact: authority
stays in the git-native plane, the relay is pure convenience.

### [ARCH_CHANGE] 2026-07-10 — Publish the coordination contract
Topics: contract, schema, third-party, lanes-arc
Affects-phases: phase-30c-team-fly
Affects-specs: specs/decisions/0003-lane-state-contract.md
Detail: The coordination-fragment + `refs/momentum/*` layout is published as a
versioned contract with a sample third-party reader — realizing the Lanes-arc
"publish lane-state contract post-dogfood" decision (ADR-0003 §5). A contract
test pins the schema; breaking changes require a version bump.

### [DECISION] 2026-07-10 — ADR-0014 authored in Group 0
Topics: adr-0014, contracts
Affects-phases: phase-30c-team-fly
Affects-specs: specs/decisions/0014-relay-ecosystem-team-mode.md
Detail: Optional relay + ecosystem team mode + lease-CAS authored as ADR-0014 in
G0 before consumers. Extends ADR-0012 (Walk) + ADR-0013 (Run); relates ADR-0003
(lane-state contract), ADR-0009 (trust invariant). Number pending final
assignment at `/start-phase`.

---
