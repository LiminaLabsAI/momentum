---
type: ADR
---

# ADR-0012: Git-Native Multiplayer Coordination

## Status

Accepted (Phase 30a — Team-Walk)

## Context

momentum's coordination plane was built for **one operator on one machine**.
An agent-verified substrate map confirmed two load-bearing single-operator
assumptions:

1. **One filesystem.** Lane board/signals/queue live at
   `<git-common-dir>/momentum/lanes` — *inside `.git`, never pushed*
   (`core/lanes/lib/state.js`). Swarm leases + ecosystem topology assume
   `../sibling` paths on one disk. The only coordination state that crosses
   machines is `status.md` / `backlog.md` / `changelog/` — and only by Rule 15
   *social convention*, not mechanism.
2. **No identity.** There is no user/author/machine anywhere in `core/`; actors
   are random per-process UUIDs (`bin/swarm.js`) and branch names
   (`core/lanes/lib/signals.js`).

The Parallel-Lanes arc (ADR-0001/0002/0003) gave *one* human the coordination
fabric of a team. Team Mode extends that to **N humans on N clones sharing one
git remote**. The operator chose **git-native, no server** (over a hosted
service and over a purist git-only-forever stance): the plane must ride ordinary
`fetch`/`push`, work offline, and add no required infrastructure — the same
"plain git default, optional substrate by detection" posture momentum already
takes for lane substrates.

The hard problem is **allocation under concurrency**: two people both picking
"the next phase number" / version / backlog id (observed live — this phase was
brainstormed while a parallel lane held Phase 29). ENH-057 is the same problem
(two sessions released within a minute and permanently burned npm 0.28.0).

## Decision

Team-mode coordination is **git-native and eventually consistent**, built on
three primitives:

1. **Durable actor identity** (`core/identity/`). Resolved from
   `git config user.email`/`user.name`, overridable by `$MOMENTUM_ACTOR`, with a
   deterministic per-repo+user fallback. No accounts, no server — git's own
   identity is the zero-config source of "who."

2. **Per-actor append-only fragments** (`core/team/lib/fragments.js`) for bulk
   coordination state (status Active-Phase table, changelog, later backlog).
   Each actor writes only files prefixed with its own `<actor>-`, so two actors
   **never touch the same path** → the git merge is conflict-free *by
   construction* (the towncrier/reno pattern our own
   `research-parallel-agent-landscape.md` flagged as researched-but-unbuilt). A
   `compile` step folds fragments into the rendered view. Fragments are
   COMMITTED under `.momentum/team/` (the one exception to the gitignored
   `.momentum/`).

3. **Git-ref compare-and-swap** (`core/team/lib/refcas.js`) for atomic
   allocation. A claim = pushing a NEW `refs/momentum/<ns>/<key>` to the remote;
   the first push wins, a second is non-fast-forward-rejected. **The remote
   arbitrates; no server exists.** Fragments can't do this — they merge too late
   to *prevent* a collision; the ref-CAS is pre-merge and atomic.

**Consistency model:** eventually consistent. `momentum team sync` = fetch
coordination refs + recompile. You see teammates after a sync — an explicit,
documented boundary. A real-time relay is deferred to Fly (30c) as an *optional*
layer nothing depends on.

**Trust posture unchanged:** ADR-0009's trust invariant holds. Identity says
*who*; it does not grant authority. Reviewer≠author enforcement is Run (30b).

## Consequences

- **Positive.** No new infrastructure; works offline; collisions are prevented
  (ref-CAS) or structurally impossible (own-prefix fragments); ENH-057 and
  ENH-056 are closed by the same claim mechanism; the trust model is untouched.
- **Negative / accepted.** Eventual consistency — a teammate's work is invisible
  until you `sync`. The `refs/momentum/*` namespace must be fetched via an
  installed refspec (transparent once `init`/`upgrade` add it). Fragments add
  files under `.momentum/team/` to the repo (small, append-only, compilable).
- **Follow-ons.** Run (30b) adds presence + shared merge queue + reviewer≠author
  on these primitives; Fly (30c) adds the optional relay + ecosystem team mode +
  swarm lease-CAS + a published coordination-fragment contract.

## Relates

Extends ADR-0001 (concurrent workstreams) from N agent-sessions to N humans;
relates ADR-0002 (lane state), ADR-0003 (lane-state contract — published in
Fly), ADR-0009 (trust invariant).
