---
title: Concepts
description: The five primitives that make up a momentum project — phases, backlog, history, ADRs, and ecosystem mode.
---

momentum is a small set of primitives organized into a workflow. Once you
understand the five concepts on this page, the rest of the toolkit is just
glue.

## Phases

A **phase** is a unit of work — a focused sprint to ship one coherent piece
of value. Every phase has four files:

```
specs/phases/phase-N-shortname/
├── overview.md      # goal, scope, deliverables, acceptance criteria
├── plan.md          # implementation approach (Group Execution Pattern)
├── tasks.md         # granular checklist [ ] / [x] / [/]
└── history.md       # append-only log of decisions and discoveries
```

A phase lifecycle is: `/brainstorm-phase` → `/start-phase` → ship → `/sync-docs` → `/complete-phase`.

Phases are the unit of git discipline too. Each phase gets its own branch,
its own PR, and a tagged release at the end. Direct commits to `main` are
blocked by convention.

## Backlog

The **backlog** at `specs/backlog/backlog.md` is a single markdown file with
four sections: Bugs, Features, Tech Debt, Enhancements. Each item has an ID,
priority (`P0`–`P3`), status (`open` / `in-progress` / `resolved` / `deferred`),
and a one-paragraph context block.

```
| BUG-001 | Title | P1 | open | phase-N | One paragraph of context |
```

The backlog is the durable home for everything that doesn't fit in the
current phase. Items get pulled into phases as work begins. Resolved items
stay in the file as searchable history.

## History

Every phase has a `history.md` — an **append-only log** with structured
entries:

```
### [DECISION] 2026-06-07 — Short title
Topics: phase-N, area, area
Affects-phases: phase-N
Affects-specs: specs/file.md
Detail: One to three sentences on what changed and why.
```

Entry types: `[DECISION]` `[SCOPE_CHANGE]` `[DISCOVERY]` `[FEATURE]` `[ARCH_CHANGE]` `[EVALUATOR]` `[NOTE]`.

History is the only place where the *why* of a decision is captured at the
moment it was made. Specs document the current state; commit messages
document mechanical changes; only history captures motivation. Six months
later, history is what tells you whether a constraint is load-bearing or
accidental.

## ADRs

When a decision is structural or contested enough to deserve its own
document, momentum uses **Architecture Decision Records** at
`specs/decisions/NNNN-title.md`. Each ADR captures context, alternatives,
decision, and consequences. ADRs supersede history entries when the decision
becomes a reference point future phases need to consult.

## Ecosystem mode

Single-project usage is the default. When you have **multiple related
projects** — a platform + SDK + CLI, or a frontend + backend + infra — you
can group them into an **ecosystem**:

```bash
npx @avinash-singh-io/momentum init --ecosystem my-eco
```

This creates a sibling git repo at `../my-eco/` that holds cross-repo
manifests, initiatives, and a daily session log. Each member project keeps
its own `specs/` — ecosystem mode adds, never replaces. Per-project commands
still work exactly as in single-project mode.

[Read the ecosystem quickstart →](/momentum/ecosystem/)

## How they fit together

A single-project workflow looks like this:

1. Discover or be told about work → land it in the **backlog**.
2. Pull backlog items into a **phase**.
3. Run the phase — every meaningful change lands in **history**.
4. Important decisions get an **ADR**.
5. At completion, sync docs and release.

Multi-project workflows add **ecosystem** state on top — cross-repo
initiatives, aggregated tracking, a shared session log — but each member
still runs the per-project loop unchanged.
