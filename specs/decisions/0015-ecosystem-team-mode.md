---
type: ADR
---

# ADR-0015: Ecosystem (Multi-Repo) Team Mode

## Status

Accepted (Phase 30e — Ecosystem Team Mode)

## Context

Team Mode (ADR-0012/0013/0014) made momentum's coordination plane multiplayer
**for one repo** — durable identity, per-actor conflict-free fragments, and
`refs/momentum/*` compare-and-swap, all git-native and offline-first. But the
**ecosystem layer** (the `ecosystem.json` coordination root that ties multiple
member repos together) still carries the two single-operator assumptions Team
Mode removed for a single repo:

1. **One filesystem** — members are `../relative` paths on one disk, and
   ecosystem-state (`.state/active-initiative`, initiatives, session activity)
   lives per-machine.
2. **Swarm ownership is single-filesystem** — swarm's manifest (who owns which
   repo across a wave) is one file on one disk; its wall-clock lease can
   double-own a repo across machines (the substrate-map hazard; 30d shipped an
   opt-in `refs/momentum/leases/*` fence for it).

The ecosystem coordination root is *itself a git repo*, so the settled Team-mode
keystone applies directly.

## Decision

Ecosystem-team state is **git-native, via the ecosystem repo**, exactly like the
single-repo plane:

1. **Remote-URL members.** `ecosystem.json` members gain an optional `remote`
   (a git URL) alongside `path`. Discovery + `ecosystem status` resolve a member
   by `remote` when present; `path` (`../relative`) stays valid for co-located
   use. A member needs at least one of `path` / `remote`. This lets teammates on
   different machines/layouts share one ecosystem.

2. **Ecosystem-state → per-actor fragments.** `active-initiative` (today the
   per-machine `.state/active-initiative`), the initiative list, and
   session-presence become per-actor append-only fragments under the ecosystem
   repo's `.momentum/team/` (reusing `core/team/lib/fragments`), compiled into
   the rendered view. N humans across N clones share them **conflict-free by
   construction**, synced by `momentum team sync` at the ecosystem-root level.

3. **Swarm ownership = ref-CAS leases as source of truth.** Swarm's manifest
   mutates too fast (leases renew every few minutes) to ride git commits.
   Therefore repo **ownership** — the only contended thing — moves to
   `refs/momentum/leases/<swarm-repo>` compare-and-swap (the fence built + tested
   in 30d, `core/swarm/lib/manifest.js`), made the **DEFAULT when the ecosystem
   root has a remote**. The manifest's `owner`/`lease_*` fields become a **local
   projection** of the ref state; renewals are cheap ref refreshes; a takeover
   must win the CAS. Coarser swarm state (plan/status/board) syncs via the
   ecosystem fragments (#2); the optional relay (ADR-0014) adds real-time when
   present.

4. **Single-machine invariance is a hard gate.** With **no remote**, the existing
   wall-clock lease path is **byte-unchanged**, and the **231 swarm tests must
   stay green**. This is the same "gate the risky path behind a default that
   preserves existing behavior" discipline that made 30d's fence safe.

## Consequences

- **Positive.** A distributed team coordinates across *multiple* repos —
  shared active-initiative + presence across machines, cross-machine-safe swarm
  ownership — all git-native, no required server, reusing the lease-CAS +
  fragments + relay already shipped. Minimal new surface.
- **Negative / accepted.** Ownership is shared but not the *whole* swarm manifest
  (coarse state is eventually consistent via fragments/relay). Remote-URL member
  resolution may need a fetch. The ref-CAS ownership path is only the default
  when a remote is present (solo/offline keeps wall-clock).

## Relates

Extends ADR-0012 (Walk), ADR-0013 (Run), ADR-0014 (Fly) from single-repo to the
multi-repo ecosystem layer; relates ADR-0001/0002/0003 (lanes) and the ecosystem
layer (`core/ecosystem/`). Closes ENH-065.
