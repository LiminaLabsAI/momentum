# Phase 11 — Dynamic Orchestration & Context Handover (PLANNING STUB)

> Status: planned, not started. Target v0.14.0. Brainstorm via `/brainstorm-phase` when ready.
>
> This is a planning stub, not a finished design. It captures the problem shape, the proposed primitives, the capability matrix to research, the specs-maintenance contract, and open questions — enough to scope the phase when work begins, not enough to commit to implementation details.

## Problem shape

Phase 9 shipped the ecosystem layer as a **passive observer** — it records cross-repo activity (session log, initiatives) but never directs it. Phase 10 makes the ecosystem easy to set up, easy to transition into and out of, and tested across agents.

What's missing: **active orchestration** in one agent session across multiple member repos, with momentum's tracking discipline preserved across every cross-repo move.

## The reframe (locked during Phase 10 brainstorm)

Orchestration is **dynamic, not a fixed shape**. The same use case sometimes calls for a single scout, sometimes for parallel fan-out, sometimes for a hybrid (scout first, then dispatch). The framework's job is to provide **primitives** the main agent composes per task — not to dictate a pipeline.

Three proposed primitives:

| Primitive | Purpose | Example use |
|---|---|---|
| `scout <repo>` | Read-only context fetch from one member repo; returns structured summary | "What's the current API shape in sapience for the auth endpoint?" |
| `dispatch <repo1> <repo2> ...` | Parallel fan-out: spawn one sub-agent per listed repo with a scoped prompt; synthesize results | "Get me the current state of frontend AND backend so I know what to align" |
| `handoff <repo>` | Control transfer with structured context block; receiving agent reads handoff first thing | "I'm done with the sapience changes; pick up in frontend with these decisions in hand" |

The main agent decides which (or which combination) per task.

## Capability matrix to research

The available primitives depend on what each adapter's agent can do. Adapter Contract v3 has capability flags, but the relevant flags need research and clean declaration:

| Agent | Subagent spawning | Parallel execution | Hook system | Slash commands | Status |
|---|---|---|---|---|---|
| Claude Code | Task tool + Workflow tool | Yes (Workflow) | PreToolUse / PostToolUse / SessionStart | Yes | Known |
| Codex | TBD | TBD | `.codex/hooks.json` | Yes | **Research** |
| Antigravity | TBD | TBD | TBD | TBD | **Research** |
| Cursor (future) | Likely none | Sequential only | None | None (rules-based) | Planned Phase 12 |
| Gemini CLI (future) | Likely none | Sequential only | TBD | None (single-file) | Planned Phase 12 |

Phase 11 begins by completing this matrix via documentation review + smoke testing.

## Capability-driven routing

The orchestration primitives route per adapter capability:

- **Agents with parallel subagent spawning** (Claude Code today; Codex/Antigravity TBD): full primitives — `scout` spawns one subagent, `dispatch` spawns N, `handoff` produces a context block.
- **Agents with sequential-only execution**: `scout` and `handoff` work as user-driven flows; `dispatch` degrades to sequential ("now in repo X" → done → "now in repo Y") or returns "not supported on this adapter" with a remediation message.
- **Agents with no slash commands** (Cursor, Gemini): primitives invoked via momentum CLI (`momentum scout <repo>`, etc.) rather than slash commands. Same underlying orchestration.

The framework asks the adapter "can you spawn?" and routes accordingly. No primitive silently degrades to a worse experience without telling the user.

## Specs maintenance contract — non-negotiable

Every primitive that crosses a repo boundary must preserve momentum's tracking discipline:

| Event | What must happen |
|---|---|
| `scout` reads context from repo X | Session log records the scout call; if scout surfaces a finding (bug, decision worth recording), it lands in repo X's `backlog.md` or `history.md` with proper IDs. |
| `dispatch` fans out to N repos | Session log records the dispatch + each sub-agent's scope; each sub-agent's findings tracked per its repo's discipline. |
| `handoff` transfers control to repo Y | Session log records the handoff with the structured context block; receiving repo's session is annotated with "received from X — see handoff-NNN". |
| Any cross-repo decision | Logged as a `[DECISION]` in the originating repo's active phase history AND referenced in the receiving repo's session. |

Orchestration wraps momentum's discipline — it never bypasses it.

## Open design questions

1. **Where does the handoff context block live?** Options: in the receiving repo's `.momentum/inbox/` (file-based); in the ecosystem-root sessions/ (centralized); in-memory only (lost across sessions).
2. **How does the receiving agent learn about a pending handoff?** Options: SessionStart hook reads `.momentum/inbox/`; explicit `momentum handoff list` command; first-action banner.
3. **What's the scoping mechanism for sub-agent prompts?** Initiatives provide one natural scope. Active phase is another. A third: arbitrary user-defined "context window" passed to the primitive.
4. **How do we test cross-repo orchestration?** Per-adapter smoke tests work for single-repo. Multi-repo orchestration needs ecosystem fixtures with multiple member repos. Reuse Phase 10's `mkLeaderAndMember` helpers, extended.
5. **Does `dispatch` synchronize results or stream them?** Synchronous synthesis is simpler; streaming is more interactive but adds complexity.
6. **How does specs maintenance handle a `dispatch` whose sub-agent crashes mid-task?** Partial state in member repos needs reconciliation. Probably: sub-agent failure surfaces as a `[DISCOVERY]` in the originating session log; the main agent decides whether to retry or proceed.

## Dependency chain

1. Adapter Contract v3 capability-flag audit (Phase 10 Workstream 4 — completes here)
2. Codex / Antigravity capability research (Phase 11 Group 0)
3. Primitive design — schemas, return shapes, error model (Phase 11 Group 0)
4. Adapter wiring — per-adapter primitive implementations (Phase 11 Groups 1-3)
5. Specs-maintenance contract enforcement — hooks, tests (Phase 11 Group 4)
6. User-facing commands and documentation (Phase 11 Group 5)

## What this stub is NOT

- A finished design — the open questions are real and need real answers.
- A commitment to a specific implementation shape — the primitives may merge, split, or rename based on research.
- A timeline — Phase 11 starts when scheduled.

## What this stub IS

- A reference point so the orchestration story doesn't get lost between phases.
- A guarantee that Phase 10's capability-flag audit isn't busywork — it feeds directly into Phase 11.
- A statement of the specs-maintenance contract so that whoever picks up Phase 11 knows the invariant.

## Notes from the originating conversation (2026-06-07)

- User explicitly framed orchestration as dynamic, not sequential-or-parallel.
- User emphasized specs maintenance is critical: "we also need to maintain the specs and all of the context right whatever we are doing. That's very important."
- User accepted deferring this work after Phase 10 lands: "whatever looks confusing or requires some research, requires some understanding we can move it to the next phase."
- Previously-planned Phase 11 (Hardening & Activation) moves to Unscheduled Future Work — this work takes the Phase 11 slot.
