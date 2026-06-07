# Ecosystem Layer — Reference

> Single source of truth for how momentum models multi-repo
> coordination. Shipped with `momentum init` (Phase 9, v0.12.0+).
> Member repos read this when they need to understand the cross-repo
> contract; the runtime helpers live in the momentum package itself
> at `core/ecosystem/`.

## When to use ecosystem mode

| You have… | Use mode | First command |
|---|---|---|
| One project | **Single-project** *(default)* | `momentum init` |
| Several related projects working as one product | **Ecosystem** | `momentum init --ecosystem <name>` |
| An existing momentum project that should join an existing ecosystem | **Ecosystem** *(join)* | `momentum join <ecosystem-path>` |
| A member repo you want to detach from its ecosystem | **Standalone** *(leave)* | `momentum leave` |
| Confusion about what state a repo is in | **Diagnostic** | `momentum doctor` |

**Single-project usage is fully supported and is the default.** Ecosystem mode is strictly additive — when no ecosystem.json is reachable, every `momentum` and slash command behaves identically to single-project use. There is no cost to ignoring this entire document if you only have one project.

## What an ecosystem is

A **momentum ecosystem** is a sibling git repo that coordinates a set
of related momentum-installed repos as one logical product. It holds
three things:

1. A **manifest** (`ecosystem.json`) — declares members + roles +
   dependency edges.
2. **Initiatives** (`initiatives/NNNN-<slug>.md`) — first-class records
   of features that span multiple member repos.
3. A **daily session log** (`sessions/YYYY-MM-DD.md`) — auto-appended
   by each member's PostToolUse hook on `git commit` / `gh pr` events.

The ecosystem layer is **strictly additive**. It never writes into a
member's `specs/`. The only touch on a member is one fenced line in
its `CLAUDE.md` / `AGENTS.md` pointing back at the ecosystem.

## Layout

```
<ecosystem-root>/                     ← its own git repo
├── ecosystem.json                    ← manifest (members, roles, edges)
├── README.md
├── initiatives/
│   ├── README.md
│   └── NNNN-<slug>.md
├── sessions/
│   └── YYYY-MM-DD.md
├── .state/                           ← gitignored runtime
│   ├── active-initiative
│   └── last-session
└── .gitignore
```

## Member opt-in / opt-out

```bash
# From inside the ecosystem root:
momentum ecosystem init <name>                   # scaffold a new ecosystem
momentum ecosystem add ../<repo>                 # register a member
momentum ecosystem add ../<repo> --role infra    # with explicit role
momentum ecosystem remove <id>                   # unregister
momentum ecosystem status                        # print state
```

After `add`, the target repo's CLAUDE.md / AGENTS.md gains:

```html
<!-- ecosystem:begin -->
> Member of `<name>` ecosystem at `../<name>`.
> See ecosystem.json for siblings and `momentum ecosystem status` for live state.
<!-- ecosystem:end -->
```

Re-running `add` is a no-op. `remove` strips both the manifest entry
and the fenced block from the member.

## Initiatives

A cross-repo feature is one markdown file at
`initiatives/NNNN-<slug>.md`. Frontmatter:

```yaml
---
id: 1
slug: memory-module
status: in-progress      # | closed | abandoned
started: 2026-06-07
closed:                  # required when status=closed
owner: avinash
repos: [sapience, frontend, infra]
title: "Memory module v1"
---
```

Body sections are fixed: **Why** · **Per-repo contributions** ·
**Linked decisions** · **Deploy chronology** · **Close**. See the
template at `core/ecosystem/templates/initiative-template.md`.

The slash-command surface is `/initiative create|status|close|list`
(see the `/initiative` recipe). Numbering is monotonically increasing
across the ecosystem; the slug is for human readability.

## Session log

Auto-populated by each member repo's PostToolUse hook. Triggers:

| Trigger | Line emitted |
|---|---|
| `git commit` (via Bash tool) | `HH:MMZ [<member>] commit: <subject> (<sha>)` |
| `gh pr create` / `gh pr merge` (via Bash tool) | `HH:MMZ [<member>] pr: <cmd-preview>` |
| `/session log <message>` | `HH:MMZ [<member>] note: <message>` |

First write of the day prepends a header:

```markdown
# Session YYYY-MM-DD
Active initiative: <slug>           # only when .state/active-initiative is set
```

Outside any ecosystem the hook is a silent no-op — single-repo
momentum projects see no change.

## How discovery works

Every command (CLI or hook) finds the ecosystem root via a
bounded upward walk. From `$PWD`, climb up to 5 parents by default
(configurable via the `MOMENTUM_MAX_PARENT_WALK` env var) looking for
a directory whose **siblings** contain an `ecosystem.json`. First hit
wins; cached per-process.

This means the ecosystem repo and member repos live as **siblings**
under one parent directory:

```
<parent>/
├── <ecosystem>/         ← contains ecosystem.json
├── <member-1>/          ← contains CLAUDE.md + the ecosystem pointer
├── <member-2>/
└── <member-3>/
```

## What stays per-repo (unchanged)

| Per-repo (member) | Cross-repo (ecosystem) |
|---|---|
| `specs/status.md` | `ecosystem.json` |
| `specs/phases/*` | `initiatives/*` |
| `specs/backlog/` | (Tier 2) — backlog aggregation |
| `specs/changelog/` | `sessions/` |
| `specs/decisions/` (ADRs) | (Tier 2) — federated impact-map |
| `/track`, `/brainstorm-phase`, `/start-phase`, `/complete-phase`, `/sync-docs` | `/ecosystem`, `/initiative`, `/session` |

## What's NOT in Tier 1

The following are deferred to a future phase ("Tier 2"):

- `/switch-repo` with context carry-over between repos.
- Federated impact-map and cross-repo `/sync-docs`.
- Shared rules of record (a single source of truth for Rules 1–12).
- Deploy-order awareness (e.g. "platform must deploy before client").
- Multi-repo `/review-code`.
- Inter-repo parallel agent orchestration (extending Phase 8
  worktrees across repos).

## Failure modes (operator playbook)

| Symptom | Cause | Fix |
|---|---|---|
| `not inside an ecosystem root` | cwd is not in/under a known ecosystem | `cd` into one, or `momentum ecosystem init <name>` |
| `target doesn't look momentum-installed` | `add`'s target lacks CLAUDE.md/AGENTS.md | run `momentum init` on the target first |
| `member id already registered` | id collision in manifest | `--id <different>` or `remove` first |
| Session log not updating | hook script missing or unreadable; member not registered | `cat scripts/check-history-reminder.sh`; verify with `momentum ecosystem status` |
| Manifest rejected by `add` | schema violation in the new state | read the per-path error list; fix `ecosystem.json` by hand or call `remove` then `add` |
