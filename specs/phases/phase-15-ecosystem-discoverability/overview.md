# Phase 15 — Ecosystem Agent Discoverability: Overview

## Vision

Phase 9–11 shipped the ecosystem layer (state) + the orchestration primitives (actions). A real-world multi-repo session in the cerebrio ecosystem surfaced a hard truth: **agents don't reach for the primitives by default**. They fall back to direct file reads, hand-author coordination files in the wrong place, and never see /scout, /dispatch, /handoff, /continue, /initiative even though the slash commands exist on disk.

Root cause is **discoverability + degradation**:

1. `momentum ecosystem init` writes `ecosystem.json`, README, initiatives/, sessions/, .state/, .gitignore — but no `CLAUDE.md` / `AGENTS.md`. The agent-discovery surface that an LLM auto-loads at session start is empty. So the agent never learns it's in a coordination layer.
2. The member-repo pointer block is information-only ("Member of X ecosystem at ../X.") rather than action-bearing. Nothing in it tells an agent what to DO when planning cross-repo work.
3. The SessionStart hook surfaces only pending handoffs — not the broader ecosystem context that would prime an agent on "you're inside a coordination layer."
4. `momentum dispatch` CLI silently degrades to keyword-grep summaries when called outside a true agent harness. The "true synthesis" message is buried in a trailing parenthetical inside the artifact.
5. `momentum ecosystem initiative create` was documented as "coming with Phase 9 Group 2" but never shipped — so agents that correctly chose to write an initiative hit friction and hand-author the file from the template.

**Phase 15 closes the discoverability + degradation gaps so agents reach for the orchestration primitives by default, and the primitives don't silently fail when invoked.**

## Hard invariants

- **No new orchestration primitives.** scout / dispatch / handoff / continue stay as-is in shape. We surface them better; we don't redesign them.
- **No new init/upgrade entry points.** `momentum init`, `momentum upgrade`, `momentum ecosystem init/add/remove/status` stay as the surface; new behavior threads through existing commands.
- **Tool-agnostic where possible.** Pointer block, managed ecosystem CLAUDE.md, dispatch CLI banner, initiative create CLI — all live in `core/`. Adapter-specific wiring (SessionStart hook config) stays in `adapters/<agent>/`.
- **Backwards compatible.** Existing ecosystem roots keep working without the new managed CLAUDE.md (it's added by `init` going forward; existing roots get a one-line `momentum ecosystem doctor --fix` follow-up — out of scope for this phase). Existing pointer blocks get rewritten on the NEXT `momentum ecosystem add` against that member; opt-in migration.
- **Test suite stays green.** Current `npm test` passes; new tests cover every new path.

## Key Decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Where does the managed ecosystem CLAUDE.md live? | New template `core/ecosystem/templates/ecosystem-claude.md`. Written by `cmdInit` in `bin/ecosystem.js`. Sibling `ecosystem-agents.md` for Codex parity (same text, different filename so both agent surfaces have what they need without adapter logic in the ecosystem command). |
| 2 | What's the marker contract for the managed ecosystem CLAUDE.md? | Same `## Project Extensions` marker as single-repo CLAUDE.md — preserves a user-extensions block across `momentum upgrade`. The auto-managed prefix carries the orchestration nudges. |
| 3 | Should the pointer block change be idempotent for existing members? | YES — `ensurePointerInjected` already short-circuits if the sentinel exists. We add an explicit `migratePointerIfStale` path that rewrites the block contents when the version stamp inside the fence is older than the current pointer-block version. |
| 4 | How loud should the dispatch CLI degradation note be? | A `note` event emitted BEFORE the `started` event, prefixed `▸ MODE NOTICE:` — surfaces at the very top of stdout. Same text also lands as a section header inside `dispatch-NNN.md` artifact. |
| 5 | What does the SessionStart hook print for ecosystem context? | One line: `▸ Ecosystem: <name> (N members)` + an optional second line `▸ Active initiative: <slug>` only if `.state/active-initiative` is set. Skip silently when no ecosystem reachable. Reuses the parent-walk + sibling-scan algorithm from `session-append.sh` to find the root. |
| 6 | What's the CLI shape for `initiative create`? | `momentum ecosystem initiative create <slug>` (under the existing `ecosystem` subcommand tree, not a top-level command — matches `status` / `add` / `remove`). Calls the existing `core/ecosystem/lib/initiative.js`. Non-interactive: takes `--why "<text>"` `--repos r1,r2` `--owner <name>` flags; if any missing, fall back to defaults (empty why, all members, git user.name). No prompting — works in any agent context. |
| 7 | Cross-adapter scope | This phase wires Claude Code end-to-end and Codex via shared core (pointer block, ecosystem CLAUDE.md → AGENTS.md mirror). Antigravity inherits the core behaviors. Per-adapter validation testing deferred to a follow-up — explicit user direction: "fix for Claude Code first." |

## Key Deliverables

1. **`momentum ecosystem init` auto-writes `CLAUDE.md` + `AGENTS.md`** with marker-aware managed content telling agents: coordination layer, use /scout /dispatch /handoff /initiative, never plan implementation here.
2. **Member-repo pointer block is action-bearing** — lists the orchestration primitives and the cross-repo routing rule; existing members get the new content on their next pointer-touch.
3. **SessionStart hook surfaces ecosystem context** — `▸ Ecosystem: <name> (N members). Active: <slug>` printed automatically when an ecosystem is reachable from CWD.
4. **`momentum dispatch` CLI emits "degraded mode" notice upfront** — first line of stdout, not buried in artifact.
5. **`momentum ecosystem initiative create <slug>` ships** as a real CLI subcommand with flag-driven non-interactive flow.
6. **Tests** for each of the above; full suite stays green.

## Out of scope (deferred)

- Per-adapter explicit Codex / Antigravity validation matrix beyond what core changes give for free → next phase.
- `momentum ecosystem doctor --fix` to retroactively add the managed CLAUDE.md to existing ecosystem roots → ENH follow-up after this phase ships.
- Auto-session-log on dispatch/handoff invocation beyond what Phase 11 already provides → already tracked as part of the tracking contract.

## Success criteria

- A fresh `momentum ecosystem init coord-test` produces a directory whose `CLAUDE.md` and `AGENTS.md` tell an agent at session start: "you're in a coordination layer; use these orchestration primitives; never plan implementation here."
- A fresh `momentum ecosystem add ../some-member` injects a 6-line action-bearing pointer block (not the old 2-liner).
- `momentum dispatch ../r1 ../r2 --prompt "test"` prints a leading `▸ MODE NOTICE` before any other output.
- `momentum ecosystem initiative create test-slug --why "smoke" --owner test` writes `initiatives/0NNN-test-slug.md` and sets `.state/active-initiative`.
- A new agent session opened inside any member repo (or the ecosystem root) prints `▸ Ecosystem: <name> (N members)` via the SessionStart hook.
