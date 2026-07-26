---
type: Phase
status: planned
tags: [ecosystem, multi-repo, initiative, lifecycle, git-native, enforcement, write-path]
---

# Phase 31a — Ecosystem Lifecycle Spine

## Goal

Give cross-repo work the same lifecycle structure that makes single-repo
momentum self-enforcing: an **entry point** that produces an initiative, a
**git-native write path** that keeps the record true without agent cooperation,
and a **completion gate** that demands evidence across members.

Closes BUG-028 + ENH-066/067/068. Target **v0.40.0**. First half of the
31a → 31b arc (31b = enforcement: detection/routing, fleet orient,
dependency-ordered landing).

## Why

Five independent multi-repo sessions were reviewed on 2026-07-26. Every one
shipped its feature and every one left the ecosystem's records rotted: session
logs empty, dependency graphs stale, initiatives uncommitted or absent,
glossaries unpropagated, and in one case two defects reaching production that a
cross-repo verification gate would have caught. In all five, the operator had to
supply the discipline by hand — "maintain the specs," "write specs before
implementation," "plan properly."

Single-repo momentum does not have this problem, and the reason is mechanical,
not cultural: its rules are enforced by hooks, gates, and commands that fire
whether or not the agent remembers them. Grounding the five reports against the
code found the ecosystem tier failing for two structural reasons.

**1. The enforcement axis is wrong.** Momentum's gates live on the *agent
tool-hook* axis (PreToolUse / PostToolUse). Cross-repo work constantly does the
three things that bypass that axis: it runs in lane worktrees, it merges via the
forge API, and it launches from a container directory that is neither the
ecosystem root nor a member. A gate that a normal workflow routinely walks around
is not a gate.

**2. The ecosystem tier shipped records without writers.** The data model landed;
the write path did not. `Deploy chronology`, `Per-repo contributions`, and
`Linked decisions` exist in the initiative template and **no code anywhere writes
them** (zero references). `ecosystem.json` `dependencies[]` is initialized empty
and pruned on `remove` — **no command ever adds an edge**. And the session log is
outright dead on the default adapter: `check-history-reminder.sh` guards its
append on `tool_name = "Bash"`, but `adapters/claude-code/settings.json`
registers that hook with matcher `Edit|Write`, so Bash events never arrive
(BUG-028).

The good news is what the review also found: **the spine already exists.**
Phase 30e built a real git-native coordination substrate at the ecosystem tier —
per-actor fragments with zero-conflict merge, ref-CAS leases, attributed
presence. And `initiative → swarm → member-phase` is already hard-coupled:
`core/swarm/schema/manifest.schema.json` makes `initiative` a **required** field
that must reference a real `initiatives/NNNN-<slug>.md`. So this phase invents no
new unit of work. It completes the middle of a spine that has a head and a tail
and no body — you can `create` an initiative, and if you go all the way to
`/swarm` everything is wired, but nothing connects the two and nothing writes
results back.

## Key decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | Enforcement axis = **git-native, event-sourced** | Agent tool-hooks are bypassed by worktrees, `gh` API merges, and container-dir launches — the exact three things cross-repo work does constantly. Git hooks fire regardless of agent, cwd, or launch directory, and need no per-adapter parity. Consistent with ADR-0012/0015. |
| D2 | Cross-repo entry = **brainstorm → initiative**, mirroring Rule 1's unfounded-project route | Routing beats blocking. When a project is unfounded, Rule 1 does not block or warn — it routes to `/start-project` to author the missing foundational record (ADR-0008). Cross-repo work with no initiative is the same situation one tier up. Operator decision, 2026-07-26. |
| D3 | The initiative lifecycle is a **structural mirror** of the phase lifecycle | Same shape ⇒ every agent already knows it; near-zero new vocabulary; no new ceremony to forget. |
| D4 | **Do not invent a new unit** of cross-repo work | `initiative → swarm → member-phase` already exists and is schema-enforced. Adding a fourth concept would fragment a space that is currently coherent. Complete the middle. |
| D5 | Member identity resolves via **`git rev-parse --git-common-dir`**, never `$PWD` | `session-append.sh` realpath-matches `$PWD` against `members[].path`, so work in a lane worktree resolves to no member and silently no-ops. Lane worktrees are momentum's own recommended flow (Rule 15) — the write path must not be blind to it. |
| D6 | Integration verification is **config-declared, not owned** | momentum is forge-neutral and ships no CI. `complete-initiative` always requires per-member Rule 12 evidence; an ecosystem-level `integration_verify_command` is additionally required **when declared**. Mirrors how `test_command` already works in `specs/config.md`. |
| D7 | 31a ships the **spine**; routing/orient/landing → 31b | A dogfoodable spine beats a complete design nobody has run. |
| D8 | In 31a the **routing is agent-convention**; 31b makes it mechanical | Stated plainly rather than overclaimed. BUG-009 was filed against Rule 6 for exactly this overstatement — prose describing enforcement that no mechanism backed. This phase will not repeat it. |
| D9 | Renumber: Intelligence → 32, Platform → 33 | This arc takes the 31 slot. |
| D10 | BUG-028 lands in **G0**, not as a standalone hotfix | A separate release for a one-line settings change would still drag 4 adapter fingerprint re-baselines, and the session-log half is superseded by the G1 write path inside this same arc. The brainstorm-gate half it restores is real, so it lands first thing with a regression-proof test. |

## Scope

### In scope

**G0 — Contracts.** ADR-0016 (the mirror, the git-native write path, the evidence
contract); ecosystem-level config surface for `integration_verify_command` and
dependency edges; initiative frontmatter extension linking member contributions;
BUG-028 matcher fix + the regression-proof test; file the review's findings as
backlog items so 31b has a groomed input.

**G1 — Git-native write path.** `post-commit` (and `post-merge`) hooks in member
repos appending *attributed event fragments* to the Phase-30e substrate; member
resolution per D5; `sessions/` compiled from fragments — zero-conflict, surviving
worktrees and concurrent members.

**G2 — Lifecycle head.** `/brainstorm-initiative` under the same gate contract as
`/brainstorm-phase` (sentinel; zero disk writes until explicit approval);
`initiative start` fans out member phase / ad-hoc records, writes `Per-repo
contributions`, and registers dependency edges in `ecosystem.json`.

**G3 — Lifecycle tail.** `/complete-initiative`: every listed member contribution
complete with **fresh** Rule 12 evidence, plus the declared integration verify;
then populate `Close` + chronology and deactivate.

**G4 — Writers + adapter parity.** Deploy chronology auto-appends on tag/release
events; the three dead template sections get real writers; 4-adapter command
projection; fingerprint re-baselines.

**G5 — Verification.** Two-clone multi-repo e2e, full suite, retrospective.

### Out of scope → 31b

- Mid-session cross-repo **detection** (second-member-touched routing)
- **Fleet orient** — `ecosystem status` carrying each member's phase, P0/P1 backlog, and lanes
- **Dependency-ordered cross-repo landing gate** (Rule 6 Landing Order, one tier up)
- **Cross-repo doc-sync delivery** via handoff (ownership-preserving)
- The ecosystem-tier **Rule rewrite**

### Non-goals

- Owning CI, or shipping forge-specific guards (momentum stays forge-neutral)
- Editing another repo's `specs/` — the `sync-docs` ownership boundary holds
- Replacing `swarm` — this phase feeds it, it does not compete with it

## Deliverables

| # | Deliverable | Verification |
|---|---|---|
| 1 | ADR-0016 + config surface + initiative frontmatter | `npm test` |
| 2 | BUG-028 matcher fix + installed-config regression test | `npm test` (new test fails pre-fix) |
| 3 | Git-native event write path (`post-commit`/`post-merge` → fragments) | `npm test` + two-clone e2e |
| 4 | `/brainstorm-initiative` + `initiative start` (fan-out, edges) | `npm test` |
| 5 | `/complete-initiative` + evidence gate | `npm test` (refusal case asserted) |
| 6 | Chronology/contributions/decisions writers; 4-adapter parity; fingerprints | `npm test` |
| 7 | Two-clone multi-repo lifecycle e2e + retrospective | `npm test` |

Verification defaults from `specs/config.md`: `test_command = npm test`;
`build_command = none`. No deviation.

## Acceptance criteria

1. A commit made in a member repo **from a lane worktree, by any agent, launched
   from any directory** appears in the ecosystem session log. *(Directly
   falsifies the five-session evidence.)*
2. `/brainstorm-initiative` → `initiative start` → `/complete-initiative` runs
   end-to-end across ≥2 members in a two-clone test.
3. `complete-initiative` **refuses to close** when a member contribution lacks
   fresh evidence, and says which member and why.
4. `Per-repo contributions`, `Linked decisions`, and `Deploy chronology` are
   populated by machinery, not by hand.
5. A dependency edge added by `initiative start` is present in `ecosystem.json`.
6. Full suite green (1028 + net-new); the **236 swarm tests stay green**;
   single-machine / no-ecosystem behavior byte-unchanged.
