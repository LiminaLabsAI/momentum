---
title: Skills
description: Every slash command your AI agent uses to drive the momentum workflow.
---

momentum ships ~15 slash commands grouped by lifecycle. Each command is a
markdown file under `core/commands/` (or per-agent overlay under
`adapters/<agent>/commands/`). Your agent loads them at session start and
runs them when you (or it) types `/<name>`.

All commands link to the canonical source on GitHub.

## Project lifecycle

Commands you run rarely — typically once per project.

- **`/brainstorm-idea`** — Explore an idea through structured dialogue
  before committing anything. Nothing gets written to disk.
  [→ source](https://github.com/avinash-singh-io/momentum/blob/main/core/commands/brainstorm-idea.md)
- **`/start-project`** — Scaffold a new project from a clear idea. Creates
  `specs/`, instruction file, agent rules, and hooks. Runs after
  `/brainstorm-idea`.
  [→ source](https://github.com/avinash-singh-io/momentum/blob/main/core/commands/start-project.md)
- **`/migrate`** — Onboard an existing project with manual or outdated
  momentum-like structure into the proper layout.
  [→ source](https://github.com/avinash-singh-io/momentum/blob/main/core/commands/migrate.md)
- **`/validate`** — Check the spec-structure health of a momentum project.
  Index-first by default; `--deep` for full scan.
  [→ source](https://github.com/avinash-singh-io/momentum/blob/main/core/commands/validate.md)

## Phase lifecycle

The core loop. You'll run these every phase.

- **`/brainstorm-phase`** — Plan the next phase through structured dialogue.
  Blocked by the brainstorm-gate from writing to `specs/` until you approve.
  [→ source](https://github.com/avinash-singh-io/momentum/blob/main/core/commands/brainstorm-phase.md)
- **`/start-phase`** — Begin a new implementation phase. Creates the phase
  directory, branch, and initial commit. Then executes the plan
  autonomously per the Autonomous Execution Contract.
  [→ source](https://github.com/avinash-singh-io/momentum/blob/main/core/commands/start-phase.md)
- **`/sync-docs`** — Apply pending history entries to other specs.
  Run at phase completion, before `/complete-phase`.
  [→ source](https://github.com/avinash-singh-io/momentum/blob/main/core/commands/sync-docs.md)
- **`/complete-phase`** — Verify, finalize, and release a completed phase.
  Tags, publishes (for npm packages), and closes the loop.
  [→ source](https://github.com/avinash-singh-io/momentum/blob/main/core/commands/complete-phase.md)
- **`/log`** — Record a manual entry in the active phase history file.
  Use when the agent missed something the user wants tracked.
  [→ source](https://github.com/avinash-singh-io/momentum/blob/main/core/commands/log.md)

## Backlog

- **`/track`** — Track a backlog item — bug, feature, tech debt, or
  enhancement. One command, four item types.
  [→ source](https://github.com/avinash-singh-io/momentum/blob/main/core/commands/track.md)
- **`/review`** — Review and groom the backlog between phases. Surfaces
  stale items, priority drift, and missing context.
  [→ source](https://github.com/avinash-singh-io/momentum/blob/main/core/commands/review.md)

## Cross-repo (ecosystem)

Active only when ecosystem mode is on.

- **`/ecosystem`** — Cross-repo ecosystem coordination. Adds members,
  removes them, reports status.
  [→ source](https://github.com/avinash-singh-io/momentum/blob/main/core/commands/ecosystem.md)
- **`/initiative`** — Manage cross-repo initiatives. A single feature that
  spans more than one member repo.
  [→ source](https://github.com/avinash-singh-io/momentum/blob/main/core/commands/initiative.md)
- **`/session`** — Append a manual narrative entry to today's ecosystem
  session log.
  [→ source](https://github.com/avinash-singh-io/momentum/blob/main/core/commands/session.md)
- **`/scout`** — Read-only context fetch from one ecosystem member repo.
  Returns a structured summary.
  [→ source](https://github.com/avinash-singh-io/momentum/blob/main/core/commands/scout.md)
- **`/dispatch`** — Parallel multi-repo fan-out + synthesis. One sub-agent
  per listed repo with auto-tailored prompts.
  [→ source](https://github.com/avinash-singh-io/momentum/blob/main/core/commands/dispatch.md)
- **`/handoff`** — Cross-session control transfer with a structured
  context block. The receiving session reads it first.
  [→ source](https://github.com/avinash-singh-io/momentum/blob/main/core/commands/handoff.md)
- **`/continue`** — Pick up a pending handoff in this repo.
  [→ source](https://github.com/avinash-singh-io/momentum/blob/main/core/commands/continue.md)

## Quality + review

- **`/review-code`** — Multi-perspective code review of pending changes on
  the current branch. Dispatches role-specific subagents (security / QA /
  architecture) in parallel.
  [→ source](https://github.com/avinash-singh-io/momentum/blob/main/core/commands/review-code.md)
- **`/systematic-debug`** — Systematically isolate, reproduce, and resolve
  task execution failures.
  [→ source](https://github.com/avinash-singh-io/momentum/blob/main/core/commands/systematic-debug.md)
