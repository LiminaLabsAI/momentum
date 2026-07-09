---
type: Planning Note
---

# Platform Direction — Team Mode (adopted 2026-07-10)

> **Status:** direction adopted in an operator `/brainstorm-phase` session
> (2026-07-10). **Roadmap placement decided same session (operator): the whole
> Walk → Run → Fly family runs NEXT, before Intelligence and Platform.** Walk is
> fully planned as **Phase 30a** (`specs/phases/phase-30a-team-walk/`); Run (30b)
> and Fly (30c) committed scope is recorded below and gets fully brainstormed at
> its own phase start (per the 21a→21b→21c precedent). Intelligence renumbers
> 30→31, Platform 31→32. Supporting evidence: `research-parallel-agent-landscape.md`
> and the session's substrate map (agent-verified, file:line).

## The reframe (adopted)

The Parallel-Lanes arc made momentum **the coordination & trust plane for one
human running N agent lanes on one machine**. Team Mode extends that plane to
**N humans on N clones sharing one git remote** — *real* distributed teams, not
one operator emulating a team. The metric is unchanged — **time from idea to
trusted merge** — but the two serial constraints multiply: now there are many
humans' attention and one shared integration point they all land on.

Two load-bearing single-operator assumptions must convert (substrate map):

| Assumption today | Team-mode form |
|---|---|
| **One filesystem** — coordination state at `<git-common-dir>/momentum/lanes`, sibling dirs, `.momentum/inbox` — never pushed | **The shared git remote** — per-actor committed fragments + `refs/momentum/*` CAS, on ordinary fetch/push |
| **No identity** — random per-process UUIDs + branch names | **Durable actor** from `git config` (`MOMENTUM_ACTOR` override) |

**Design invariant (operator D1): git-native, no server.** The plane is
eventually consistent (`sync` = fetch + compile). A real-time relay is an
*optional* Fly layer nothing depends on — same progressive-enhancement pattern
as adapter capability flags and the Lanes substrate delegation.

## The family — one arc, three phases

| Phase | Layers | Committed scope |
|---|---|---|
| **Walk = Phase 30a** (**PLANNED 2026-07-10** — `specs/phases/phase-30a-team-walk/`) | Identity (L0) · git-native fragment transport + compile (L1) · collision-free claims via ref-CAS (L2) | `core/identity/` durable actor; per-actor append-only committed fragments + compile (status Active Phase table + changelog); `refs/momentum/*` CAS helper + installed refspec; `momentum claim <phase\|id\|version>`; `momentum team sync`; wire identity through writers/recipes; reword Rule 15; **ADR-0012**. **Folds ENH-057 + ENH-056.** Outcome: momentum is *multiplayer-correct*. |
| **Run = Phase 30b** (**PLANNED 2026-07-10** — `specs/phases/phase-30b-team-run/`) | Live board + presence (L3) · shared landing + review (L4) | Presence/heartbeat fragments + last-seen; cross-machine **board rendering** (`momentum team` shows every actor's lanes live-ish); **one shared merge queue** across contributors (`lanes land` reads the synced queue — FIFO turn + rebase-freshness across clones via `refs/momentum/queue/*` CAS); **reviewer≠author gate** (attributed approvals ledger — the trust gate distinguishes self-approval from peer review, client-side-honest); `backlog.md` → fragments. ADR-0013. |
| **Fly = Phase 30c** (**PLANNED 2026-07-10** — `specs/phases/phase-30c-team-fly/`) | Optional relay · ecosystem team mode | The **optional real-time relay** (the deferred D1 layer — self-hostable, authority-free, may later ride the Phase-32 Platform MCP server but ships standalone) adding live presence/notify, degrading cleanly to git-native when absent; **ecosystem / multi-repo team mode** — remote-URL members + ecosystem state → fragments + `refs/momentum/leases/*` CAS for swarm leases (the second single-filesystem front). Publish the versioned coordination-fragment contract. ADR-0014. |

## Decisions (2026-07-10)

1. **Own (build in-house):** actor identity (`core/identity/`), fragment
   transport + compile, `refs/momentum/*` ref-CAS, `momentum claim`,
   `momentum team sync` (Walk); presence + shared queue + reviewer≠author (Run);
   ecosystem team mode + optional relay contract (Fly).
2. **Git-native, no server (D1).** The remote is the only required substrate. A
   relay is an optional Fly accelerator, never a prerequisite; absent ⇒ the plane
   is fully git-native. No daemon, no hosted service in the required path.
3. **Same-repo team first.** Multi-repo / ecosystem team mode is a Fly concern —
   a whole second single-filesystem front, deliberately sequenced after the
   single-repo plane is proven.
4. **Identity from git, not accounts.** `git config user.email` is the
   zero-config actor; no momentum account system (would imply a server).
5. **Collision-free by construction where possible; CAS only where a single
   winner is mandatory.** Fragments (own-path-prefix invariant) for bulk state;
   `refs/momentum/*` CAS for allocation (phase/id/version) where the collision
   must be prevented pre-merge.

## Open questions

> **All four resolved 2026-07-10** when the full family specs were written —
> resolutions recorded in each phase's `overview.md` (Resolved open questions) +
> `history.md`. Summary: **Q1** presence = heartbeat-on-invocation (no daemon);
> **Q2** reviewer≠author = attributed approvals ledger, client-side-honest;
> **Q3** relay ships standalone/optional, not Platform-dependent; **Q4**
> ecosystem team mode = remote-URL members + fragment state + `refs/momentum/leases/*`
> lease-CAS. Original framing kept below for provenance.

### Original framing (resolved)

- **Q1 (Run):** presence liveness without a daemon — heartbeat-on-command vs a
  short-TTL fragment refreshed on any `momentum` invocation. How stale is
  "offline"?
- **Q2 (Run):** reviewer≠author enforcement is client-side only (the trust gate
  is local `pre-push`). True enforcement needs the shared remote's protection —
  document the forge-adapter path vs a fragment-based "N approvals recorded."
- **Q3 (Fly):** does the optional relay ride the Phase-32 Platform MCP server, or
  ship as its own tiny thing? Sequencing vs Platform.
- **Q4 (Fly):** ecosystem team mode — do `../member` relative paths give way to
  remote URLs, and does the swarm lease model (wall-clock, no fencing) need the
  ref-CAS treatment before it's safe across machines?
