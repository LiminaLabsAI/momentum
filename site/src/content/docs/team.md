---
title: Team mode
description: Git-native multiplayer coordination — N humans on N clones sharing one git remote. Durable identity, conflict-free per-actor fragments, and refs/momentum compare-and-swap. No server, no daemon, offline-first — now across whole ecosystems.
---

momentum began single-operator: one filesystem, no identity. **Team mode** removes
both assumptions and turns momentum into a **git-native coordination plane** for a
distributed team — **N humans on N clones sharing one git remote**. No server, no
daemon, offline-first. The remote you already have is the only shared infrastructure.

Want to see the whole thing work end-to-end across two clones (and two repos) in
about ten seconds?

```bash
bash scripts/demo-team.sh
```

## The two primitives

Everything below is built from exactly two git-native mechanisms.

| Primitive | What it is | Solves |
|---|---|---|
| **Per-actor fragments** | Each actor writes append-only files under `.momentum/team/<view>/<actor>-…json`, committed with your normal git flow. A compile step folds them into the rendered view. | Shared bulk state (the board, presence, active initiative) that would otherwise conflict on every concurrent edit. An actor only ever writes files under its own `<actor>-` prefix, so two actors **never touch the same file** — the merge is conflict-free *by construction*. |
| **Ref compare-and-swap** | `refs/momentum/*` — pushing a new ref is atomic; the first push wins, a second is rejected as a non-fast-forward. The payload rides in an empty-tree commit message. | Allocation collisions (two people both picking "the next phase" / version / backlog id) that fragments can't prevent because they merge too *late*. The remote arbitrates; no server exists. |

Fragments are for state that can be *eventually* consistent. Ref-CAS is for
decisions that must be *atomic and single-winner*.

## Identity — momentum knows WHO

Coordination needs a durable actor. momentum derives one with zero config from
git's own identity (`git config user.email`), overridable by `$MOMENTUM_ACTOR`:

```bash
momentum team whoami        # → alice  (source: git-email, alice@team.dev)
```

Every claim, approval, and lease is attributed to this actor.

## In one repo

| Command | What it does |
|---|---|
| `momentum claim <phase\|version\|id> <key>` | Atomically reserve an allocation before you act — exactly one clone wins the ref-CAS. |
| `momentum team record` / `board` / `compile` | Record your Active-Phase row as a fragment; compile all actors' rows into one conflict-free table in `specs/status.md`. |
| `momentum team heartbeat` / `presence` | Heartbeat-on-invocation presence; liveness (active/idle/offline) is derived from age — no daemon. |
| `momentum team approve` / `check` | A reviewer≠author approval ledger; `lanes land` can require ≥1 peer approval. |
| `momentum team turn <take\|release>` | One shared landing turn across clones — Rule 6's landing order for N humans. |
| `momentum team lease <acquire\|release>` | A single-owner cross-machine lease via ref-CAS — clock skew can't double-own. |
| `momentum team sync` | Fetch coordination refs; fragments arrive via normal branch integration. |

## Across repos — team at the ecosystem layer

An [ecosystem](/ecosystem/) is itself a git repo, so the same keystone applies one
level up: **ecosystem-team state travels via the ecosystem repo's own fragments and
`refs/momentum/*`.** Three single-operator assumptions fall away.

### Remote-URL members

Members no longer have to be `../relative` folders on one disk. A member may carry a
`remote` (a git URL) alongside — or instead of — `path`:

```json
{ "id": "svc", "remote": "https://example.com/svc.git", "role": "platform" }
```

Teammates on different machines and folder layouts share one ecosystem.
`momentum ecosystem status` resolves each member — a local checkout shows its git
state; a remote-only member is resolved by URL (with a best-effort reachability
probe). Register one with:

```bash
momentum ecosystem add --remote https://example.com/svc.git --id svc --role platform
```

### Shared active initiative & presence

The active initiative — which cross-repo initiative the team is driving — used to be
a per-machine file. It's now a per-actor fragment in the ecosystem repo, compiled to
a single shared value, **attributed to who set it**:

```
$ momentum ecosystem status
Active initiative: memory-overhaul  (set by 'alice')

Presence:
  ● bob  active  — ecosystem status
```

Two teammates can set it concurrently and merge with **zero conflict** — the
last-writer-wins fold is deterministic, and each actor's fragment is its own file.

### Cross-machine swarm ownership

[Swarm](/swarm/) coordinates one feature across many repos. Its manifest mutates too
fast to ride git commits, so only the **contended thing — repo ownership — is
shared**, via `refs/momentum/leases/*` compare-and-swap. When the ecosystem root has
a git remote this is the **default**: a takeover must win the CAS, so clock skew can
never let two machines own the same repo. With no remote, the single-machine
wall-clock path is byte-for-byte unchanged.

## The contract is public

The fragment layout and the `refs/momentum/*` namespace are a **versioned, published
contract** — any dashboard, CI job, or bot can read team state without momentum
installed:

```bash
momentum team contract          # the JSON contract
node scripts/read-team-board.js # a sample third-party reader (Node + git only)
```

`scripts/read-team-board.js` depends on nothing but Node builtins and `git`. Copy it
into your own tooling and adapt it.

## What team mode is not

- **Not a server.** There is no momentum service. The git remote is the only shared
  infrastructure; an [optional relay](/swarm/) adds real-time fan-out when present
  but nothing ever depends on it.
- **Not always-on.** Solo, single-machine, offline behavior is invariant — team
  mechanisms activate only when there's something (a remote, other actors) to
  coordinate with.
