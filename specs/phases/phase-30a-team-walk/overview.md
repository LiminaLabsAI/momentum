---
type: Phase
status: planned
tags: [team, multiplayer, distributed, identity, git-native, coordination, claims, fragments, ref-cas]
---

# Phase 30a — Team-Walk (Multiplayer-Correct Coordination)

## Goal

Make momentum safe for **N humans on N clones sharing one git remote** — no lost
coordination state, no allocation collisions — with **zero new infrastructure**
(git-native, offline-first). This is the first phase of the **Team-mode family**
(30a Walk → 30b Run → 30c Fly) and it converts momentum's two load-bearing
single-operator assumptions into their multiplayer forms:

1. **One filesystem → the shared git remote.** Coordination state that today
   lives *inside `.git`* (`<git-common-dir>/momentum/lanes`, never pushed) or in
   sibling dirs learns to travel between machines through ordinary git.
2. **No identity → a durable actor.** momentum is identity-blind today (actors
   are random per-process UUIDs and branch names). Team-Walk stamps every
   coordination write with a durable actor derived from `git config`.

Walk's outcome is *correctness*, not richness: after a `sync`, two independent
clones see a consistent, conflict-free shared coordination state with correct
attribution — and two people can never collide on the "next" phase / backlog ID
/ version. Live board with presence and the shared merge queue are **Run (30b)**;
the optional real-time relay and ecosystem team mode are **Fly (30c)**.

## Why

`/brainstorm-phase` this session surfaced the gap the hard way: while we designed
this phase, a **parallel lane brainstormed Phase 29** — two sessions both
reaching for "the next phase number." That is the collision, live, in the
operator's own workflow. The substrate map (agent-verified, file:line) confirmed
the root cause:

- **The only coordination state that crosses machines today is `status.md` /
  `backlog.md` / `changelog/`** — and only by Rule 15 *social convention*, not
  mechanism. Everything else (lane board / signals / queue at
  `<git-common-dir>/momentum/lanes` — `core/lanes/lib/state.js:33,64-69`; swarm
  leases + ecosystem topology; handoff `.momentum/inbox`) is **local and never
  pushed**, so on N clones it fragments into N disjoint silos.
- **Zero identity in `core/`** — grep for `user.email` / `author` / `os.hostname`
  returns no functional hits. "Actors" are random UUIDs (`bin/swarm.js:98`) and
  branch names (`core/lanes/lib/signals.js:122`).
- Our own `research-parallel-agent-landscape.md:55-58` already named the cure —
  the **towncrier/reno per-writer-fragment pattern** for the tracking-file
  hotspot — as *researched but deliberately unbuilt*. Walk builds it.

## Key decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Coordination plane is git-native, no server** (real-time relay deferred to Fly) | Operator D1; true to momentum's no-daemon / "plain git default, optional substrate by detection" identity |
| 2 | **Consistency model is eventually consistent** — `sync` = fetch + compile | A server-free plane cannot be strongly consistent; planning-grade coordination tolerates it |
| 3 | **Actor identity = `git config user.email` (+ `user.name`)**, `MOMENTUM_ACTOR` override, deterministic fallback when unset | Zero-config, durable, already present in every clone; ties "who" to git's own identity |
| 4 | **Bulk coordination state → per-actor append-only committed *fragments* + a compile step** (towncrier/reno pattern) | Collision-free *by construction* (each actor writes only its own files); fixes the `status.md`/`changelog` merge hotspot |
| 5 | **Atomic allocation → `refs/momentum/*` ref compare-and-swap** (first push wins; loser deflects) | Claims need a *pre-merge*, atomic, single-winner channel — fragments merge too late to prevent a collision. Git's per-ref atomic update *is* the CAS; the remote arbitrates, no server exists |
| 6 | **Absorbs ENH-057 (release race) + ENH-056 (self-merge guard)** | Same collision family — the version-at-runway race is the identical problem; fixed once, here |
| 7 | **`.momentum/team/*` fragment dir is committed & synced; `refs/momentum/*` refspec is installed by `init`/`upgrade`** | Coordination must ride ordinary `fetch`/`push`; the refspec makes the CAS channel transparent |

## Scope

### In
- **Actor identity lib** (`core/identity/`) — resolve durable actor from `git config`; `MOMENTUM_ACTOR` override; deterministic fallback; single source used everywhere "who" is stamped.
- **Fragment transport** — per-actor append-only fragment format + a **compile** step that folds fragments into human-readable views; convert the `status.md` **Active Phase table** and `changelog/` to fragment-compiled.
- **`refs/momentum/*` ref-CAS helper** (`core/team/lib/`) — atomic claim/deflect over a custom ref namespace; refspec installed by `init`/`upgrade`.
- **`momentum claim <phase|id|version>`** — collision-free allocation via CAS; deflect-and-retry the loser.
- **`momentum team sync`** — fetch coordination refs + recompile the compiled views (the explicit "see teammates" step).
- **Wire identity** through existing writers: lane signal `from`, swarm actor, ecosystem session line, and the `.momentum/merge-approved` record (who approved).
- **Recipe integration** — `/brainstorm-phase`, `/start-phase`, `/hotfix` claim their next number via `momentum claim`.
- **Rule 15 reworded** — the shared-tracking guarantee references the *mechanism* (fragments + CAS), not only social convention.
- **ADR-0012** — git-native multiplayer coordination (identity + fragments + ref-CAS; eventual consistency accepted).

### Out (non-goals — later in the family or out of frame)
- Live presence / heartbeat + cross-machine board rendering (**Run 30b**).
- One *shared* merge queue across contributors + reviewer≠author enforcement (**Run 30b**).
- The optional real-time relay — the deferred D1 layer (**Fly 30c**).
- Ecosystem / multi-repo team mode — the second single-filesystem front (**Fly 30c**).
- Server-side branch protection — stays an optional forge-adapter concern (unchanged trust posture; ADR-0009 invariant holds).
- Migrating `backlog.md` to fragments — Walk does `status.md` Active Phase table + `changelog/` only; backlog fragmenting is a **Run** candidate (larger surface, more ID structure).

## Deliverables & verification

Default verification (`specs/config.md`): `test_command = npm test`; `build_command = none`.

| # | Deliverable | Verification |
|---|-------------|--------------|
| D1 | Durable actor identity everywhere (`core/identity/`) | Unit: email→actor; `MOMENTUM_ACTOR` override; missing-`git config` deterministic fallback |
| D2 | Collision-free claims via `refs/momentum/*` CAS (`momentum claim`) | **Two-clone bare-remote fixture**: concurrent claim of the same number → exactly one wins, loser deflects + retries, no lost push |
| D3 | Fragment transport + compile (status Active Phase table + changelog) | Two actors append fragments + merge → **zero merge conflict**; compiled view shows both rows correctly attributed |
| D4 | ENH-057 / ENH-056 folded | Release-race scenario serializes to one version at the runway; `--execute` from a lane's own worktree is refused (ENH-056) |
| D5 | Identity wired through writers + recipes; Rule 15 reworded | Suite + adapter fingerprint re-baselines; recipe claim-integration test |
| D6 | `momentum team sync` (fetch + compile) | Test: actor B's committed+pushed fragments become visible in actor A's compiled view only after `sync` (eventual-consistency contract made explicit) |

## Acceptance criteria

1. Two independent clones against **one bare remote** can each plan/claim a next
   phase/ID/version concurrently, and exactly one wins each contested claim — no
   collision, no lost push — proven by a committed e2e fixture.
2. Two actors recording coordination (Active Phase rows, changelog lines)
   concurrently and merging produce **zero git conflict**; the compiled view is
   consistent and correctly attributed.
3. Every coordination write carries a **durable actor identity** (not a random
   per-process UUID).
4. `momentum team sync` makes a teammate's pushed coordination visible locally;
   the eventual-consistency contract is explicit and tested.
5. ENH-057 (release race) and ENH-056 (self-merge) scenarios are closed by the
   claim/guard mechanism.
6. Full suite green; the two-clone fixture is committed evidence.
