# {{NAME}} — Ecosystem (Coordination Layer)

> **You are in a momentum ecosystem coordination root — NOT a project.**
> This directory coordinates work across multiple sibling project repos.
> Auto-managed by `momentum`. The content above `## Project Extensions`
> may be refreshed by `momentum upgrade`.

## What this directory is

| Path | Purpose |
|------|---------|
| `ecosystem.json` | Manifest: members, roles, dependency edges |
| `initiatives/` | Cross-repo feature files (`NNNN-<slug>.md`) — first-class records of features that span >1 member |
| `sessions/` | Auto-appended daily activity log (`YYYY-MM-DD.md`); member-repo hooks write here |
| `.state/` | Runtime state (gitignored) — active initiative pointer, etc. |
| `CLAUDE.md` / `AGENTS.md` | These instructions |

**There are no `specs/` here.** Per-project specs, phases, backlog, and history stay in each member repo. The ecosystem layer is strictly additive — it never writes into a member's `specs/`.

## Cross-repo work? Run `/brainstorm-initiative` — NEVER plan implementation here

If a feature, refactor, or coordination effort touches MORE THAN ONE member
repo, the entry point is the **initiative lifecycle** — the ecosystem-tier
mirror of the phase lifecycle you already know:

```
/brainstorm-initiative                              # objective, members, edges, criteria
  → momentum ecosystem initiative create <slug>     # writes initiatives/NNNN-<slug>.md
  → momentum ecosystem initiative start <slug>      # contributions + edges + active
    → each member runs its OWN /start-phase or /hotfix
      → momentum ecosystem initiative complete <slug>  # evidence gate, then close
```

Same shape as `/brainstorm-phase → /start-phase → /complete-phase`, one tier up.
The initiative is the *only* place cross-repo scope, deploy chronology, and
links to per-repo decisions live. Per-repo implementation stays in each
member's `specs/phases/`.

> **What is and is not enforced (ADR-0016 D8).** Momentum does **not** yet
> detect that a session has touched a second member repo — that ships in Phase
> 31b. Today this routing is agent convention. What IS mechanical: every commit
> in a member repo is captured by a `post-commit` git hook into the ecosystem
> event log, regardless of agent, cwd, or worktree.

**Anti-pattern:** do not create planning notes, task lists, or "phase" files
directly in this coordination root. There is no `specs/phases/`. If you find
yourself reaching for one, you are working in the wrong layer — switch to a
member repo or open an initiative.

## Orchestration primitives (use these for multi-repo work)

These are agent commands you should invoke when working across member repos. Each has a CLI fallback under `momentum <name>`; the agent command is the LLM-synthesis door, the CLI is the keyword/scripted door.

| Primitive | When to use |
|---|---|
| `/scout <repo>` | Read-only context fetch from another member ("what's in `<repo>/specs/status.md` right now?"). Use before planning any cross-repo work. |
| `/dispatch <r1> <r2> "<intent>"` | Parallel multi-repo audit/investigation ("audit how X is implemented across A, B, C"). Spawns one sub-agent per repo and synthesises. **Do NOT use `momentum dispatch` from the CLI for synthesis** — CLI mode produces keyword summaries only; use the agent command. |
| `/handoff <repo>` | Transfer context to an agent working in another member repo. Writes a structured handoff into the target's `.momentum/inbox/`. The receiving agent picks it up via `/continue` on session start. |
| `/continue` | Pick up a pending handoff from this repo's inbox (SessionStart hook surfaces these automatically). |
| `/initiative create <slug>` | Same as the CLI above; the agent door also wires the active initiative for follow-up `/session log` entries. |
| `/session log "<note>"` | Append a narrative entry to today's `sessions/YYYY-MM-DD.md`. Auto-events (commits/PRs) are logged by the PostToolUse hook in each member; use `/session log` for decisions, problems hit, checkpoint notes. |

## Discovery — how to find current state

```bash
momentum ecosystem status        # manifest summary + per-member git state
cat ecosystem.json               # raw manifest
ls initiatives/                  # all initiatives, active marked in .state/active-initiative
tail sessions/$(date -u +%F).md  # what happened today
```

## Quick member management

```bash
momentum ecosystem add ../<repo-name>    # register a member (must already be `momentum init`-installed)
momentum ecosystem remove <member-id>    # unregister
```

`add` also injects a fenced pointer block into the member's `CLAUDE.md`/`AGENTS.md` so agents working *inside* the member know they're part of this ecosystem and can reach the orchestration primitives.

## Docs

- Full ecosystem mode: https://trymomentum.github.io/ecosystem/
- Orchestration primitives: https://trymomentum.github.io/orchestration/
- Concepts: https://trymomentum.github.io/concepts/

---

## Project Extensions

> Everything below this heading is preserved across `momentum upgrade`.
> Add ecosystem-specific notes, conventions, cross-repo references,
> escalation contacts, etc. here. Anything above this heading is
> managed by momentum and may be refreshed on upgrade.
