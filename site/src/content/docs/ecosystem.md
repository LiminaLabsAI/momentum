---
title: Ecosystem mode
description: Coordinate work across multiple related repos from a single AI agent session — opt-in, additive.
---

Single-project momentum is the default. When you have **multiple related
projects** that need to coordinate — a platform + SDK + CLI, or a
frontend + backend + infra — ecosystem mode lets one agent session work
across all of them while preserving per-project tracking discipline.

**Hard invariant**: a project running `momentum init` without `--ecosystem`
sees zero difference from before ecosystem mode existed. Ecosystem mode is
purely additive.

## When to use it

Reach for ecosystem mode when:

- You have **≥ 2 repos** that share a single product or platform.
- You frequently change two repos for one feature.
- You want one agent session to scan all of them, draft initiatives that
  span them, and keep a unified daily log.

Skip it when:

- You only have one repo.
- Your "related" repos are loosely coupled and rarely change together.

## Quickstart

```bash
# From inside the first project:
npx @avinash-singh-io/momentum init --ecosystem my-eco

# Creates ../my-eco/ as a sibling git repo + registers this project
# as the first member.

# From each additional project:
npx @avinash-singh-io/momentum join ../my-eco
```

You now have:

```
parent-dir/
├── my-eco/                ← ecosystem root (new, sibling git repo)
│   ├── ecosystem.json     ← members, roles, dependency edges
│   ├── initiatives/       ← cross-repo features
│   └── sessions/          ← daily activity log (auto-appended)
├── project-a/             ← member: own specs/, has pointer block
├── project-b/             ← member: own specs/, has pointer block
└── project-c/             ← member: own specs/, has pointer block
```

## What ecosystem mode adds

- **Cross-repo session log** — `sessions/YYYY-MM-DD.md` auto-records commits
  and PRs across every member repo. One file per day.
- **Cross-repo initiatives** — `initiatives/NNNN-<slug>.md`. A feature that
  spans multiple repos gets one initiative file with sub-tasks per member.
- **`/track` aggregation** — one view across all members' backlogs.
- **Ecosystem CLI** — `momentum ecosystem status`, `momentum doctor`,
  `momentum join`, `momentum leave`.
- **Orchestration primitives** — `/scout`, `/dispatch`, `/handoff`,
  `/continue`. The main agent composes these per task.

## What it doesn't change

- Each member's `specs/` is **untouched**. Phases, backlog, history all live
  in the member repo, exactly as in single-project mode.
- Every per-project slash command works the same way it did before.
- The npm package surface is unchanged.

## Leaving an ecosystem

```bash
# From inside the member project:
npx @avinash-singh-io/momentum leave
```

Removes the pointer block from `CLAUDE.md` / `AGENTS.md` and de-registers
the project from `ecosystem.json`. Per-project work continues unchanged.

## Diagnosing state

```bash
npx @avinash-singh-io/momentum doctor
```

Reports whether the current directory is a standalone project, an
ecosystem root, or an ecosystem member, plus any detected issues with the
state files.
