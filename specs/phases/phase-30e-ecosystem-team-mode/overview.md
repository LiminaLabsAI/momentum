---
type: Phase
status: planned
tags: [team, ecosystem, multi-repo, remote-members, fragments, swarm, lease-cas, ref-cas]
---

# Phase 30e — Ecosystem (Multi-Repo) Team Mode

## Goal

Extend the git-native Team-mode plane — single-repo, shipped in **v0.37.0**
(Walk/Run/Fly) + **v0.38.0** (30d integration) — up to the **ecosystem layer**,
so a distributed team coordinates across **many repos at once**, not just one.
Closes **ENH-065**. Target **v0.39.0**.

Team Mode fixed momentum's two single-operator assumptions — *one filesystem* and
*no identity* — **for one repo**. The ecosystem layer still carries them: members
are `../relative` paths on one disk, ecosystem-state (`.state/active-initiative`)
is per-machine, and swarm ownership assumes one manifest on one disk. 30e converts
all three the same git-native way (the ecosystem repo's own git + `refs/momentum/*`).

## Why

The ecosystem (`ecosystem.json` coordination root) is *itself a git repo*, so the
settled Team-mode keystone applies directly: ecosystem-team state travels via the
ecosystem repo's fragments + `refs/momentum/*` leases. The one genuinely hard part
is **swarm** — its manifest mutates constantly (leases renew every few minutes), so
it can't ride git commits. The operator-chosen answer: **the contended thing
(ownership) is shared via `refs/momentum/leases/*` CAS** (the fence already built +
tested in 30d, made the default when a remote is present); the manifest stays a
local projection. Minimal new surface, maximal reuse.

## Key decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Ecosystem-team state travels via **the ecosystem repo's own git** (per-actor fragments) + `refs/momentum/*` (leases) | Same proven pattern as single-repo Team Mode |
| 2 | **Remote-URL members** — `ecosystem.json` members gain an optional `remote` (git URL); discovery/`ecosystem status` resolve by URL; `../relative` stays valid | Teammates don't need identical folder layouts / same disk |
| 3 | **Ecosystem-state → fragments** — `active-initiative` / initiatives / session-presence become per-actor fragments in the ecosystem repo, compiled | Shared conflict-free across N clones (like the single-repo board) |
| 4 | **Swarm ownership = ref-CAS leases as source of truth** — the 30d `MOMENTUM_SWARM_LEASE_CAS` fence becomes the **default when a remote is present**; manifest → local projection; renewals = cheap ref updates | Only ownership is shared, via the mechanism already proven; single-machine unchanged |
| 5 | Publish a sample **contract reader** + "team across repos" **docs** + extend `demo-team.sh`; tidy `.gitignore` `.momentum/team/*.log` in the template (deferred from 30d) | Consumable + documented; close the loose ends |
| 6 | **ADR-0015** — ecosystem team mode; leases-as-source-of-truth | Records the multi-repo extension + the swarm-ownership decision |

## Scope

### In
- **Remote-URL members** — optional `remote` field on `ecosystem.json` members; discovery + `ecosystem status` resolve remote-identified members (relative paths still valid).
- **Ecosystem-state → fragments** — `active-initiative` / initiatives / session-presence → per-actor fragments in the ecosystem repo (`.momentum/team/`) + compile; `ecosystem status` reflects shared state; `momentum team sync` at ecosystem level.
- **Swarm leases-as-source-of-truth** — ref-CAS ownership becomes the default for shared ecosystems (remote present); manifest becomes a projection; single-machine path unchanged.
- **Contract reader + docs + demo** — sample third-party reader of the published `core/team/contract`; site/README "team across repos"; extend `scripts/demo-team.sh` (ecosystem + relay).
- **Tidy** — `.gitignore` template negates fragments but ignores `.momentum/team/*.log` (local audit).
- **ADR-0015**.

### Out (non-goals)
- No change to single-repo Team Mode (v0.37/0.38 behavior is invariant).
- No hosted service; the optional relay stays optional and never required.
- No change to solo/single-machine swarm behavior (wall-clock lease path unchanged when no remote).

## Deliverables & verification

Default verification (`specs/config.md`): `test_command = npm test`.

| # | Deliverable | Verification |
|---|-------------|--------------|
| D1 | Remote-URL members | **Two-clone ecosystem** with URL members: discovery/`ecosystem status` resolve both machines; relative paths still work |
| D2 | Ecosystem-state → fragments | Two clones set `active-initiative` concurrently + merge → **zero conflict**; compiled view consistent |
| D3 | Swarm leases-as-source-of-truth | Two-clone swarm: ownership via `refs/momentum/leases/*` CAS; **skew can't double-own**; **single-machine unchanged — 231 swarm tests stay green** |
| D4 | Contract reader + docs + demo | Sample reader prints the board from published fragments/refs; docs render; demo covers ecosystem + relay |
| D5 | `.gitignore` tidy | Template negates `.momentum/team/` but ignores `*.log`; fingerprints re-baselined |

## Acceptance criteria

1. A distributed team coordinates across **multiple repos**: shared
   `active-initiative` + presence across machines with **zero git conflict**;
   `ecosystem status` resolves remote-URL members on both clones.
2. Swarm repo ownership is **safe across machines** via `refs/momentum/leases/*`
   (skew can't double-own) when a remote is present.
3. **Solo / single-machine behavior is byte-unchanged** — the 231 swarm tests and
   all ecosystem tests stay green with the new paths off (no remote).
4. The coordination contract is consumable by a sample third-party reader.
5. Full suite green; released **v0.39.0** with complete tracking (tasks/roadmap/
   status) BEFORE the tag, and clean branches (only `main` + `staging`).
