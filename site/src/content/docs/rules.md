---
title: Rules
description: The 13 autonomous agent rules — what each does, why it exists, and the red flags it catches.
---

The rules live at `.agent/rules/project.md` (referenced from `CLAUDE.md` /
`AGENTS.md`). They're loaded into every agent session and govern how the
agent behaves *between* explicit instructions — orientation, tracking,
git discipline, decision logging, verification.

Rules ship as defaults. Project-specific rules go under `## Project Extensions` in `CLAUDE.md` / `AGENTS.md` and are preserved across `momentum upgrade`.

## Rule 1 — Always Orient First

Before any work, the agent reads `specs/status.md` to learn the active
phase, blockers, and P0 items. **Why:** every other rule depends on
knowing where you are.

## Rule 2 — Auto-Update Tracking After Changes

After completing meaningful work, the agent automatically updates the
active phase's `tasks.md`, `specs/status.md`, and the monthly changelog.

**Why:** tracking debt compounds invisibly. Stale tracking one day later
is recoverable; one week later is fiction. **Red flag:** "I'll batch the
tracking updates at the end."

## Rule 3 — Auto-Track Discoveries

When the agent discovers a bug, tech debt, or enhancement during work,
it adds it to `specs/backlog/backlog.md` immediately and mentions it
to you.

**Why:** discoveries lost are discoveries you'll re-discover later.

## Rule 4 — Pre-Phase Bug Check

Before starting a new phase, the agent scans the backlog for P0/P1
bugs and recommends fixing them first.

**Why:** carrying critical bugs into a new phase compounds risk.

## Rule 5 — Phase Boundary Awareness

When the last task in a phase is complete, the agent prompts you to
run `/complete-phase` — never auto-completes.

**Why:** completion is a human decision; the agent assists, doesn't
override.

## Rule 6 — Git Lifecycle (Automatic)

The agent auto-creates feature branches, commits per a conventional
style, and pushes — but never merges to `staging` / `main` without your
explicit approval.

**Why:** direct commits to `main` bypass review, history, and rollback.
**Red flag:** "Just one tiny commit to main." It's never just one.

## Rule 7 — Plan Before Implementing

For any non-trivial work, the agent runs `/brainstorm-phase` first and
presents the plan for your approval.

**Why:** a 30-minute plan saves 3-day rebuilds.

## Rule 8 — Record Phase History

Every meaningful change during a phase appends an entry to
`history.md` (DECISION / DISCOVERY / SCOPE_CHANGE / ARCH_CHANGE / NOTE).

**Why:** history is the only place where the *why* of a decision is
captured at the moment it was made.

## Rule 9 — Doc Sync Protocol — Never Mid-Phase, Always at Completion

During a phase, the agent only writes to `history.md`. At completion,
`/sync-docs` applies the pending history entries to other specs.

**Why:** mid-phase spec edits mean specs and rationale drift out of
sync. In multi-repo projects, this rule also prevents the agent from
editing specs in a different repo.

## Rule 10 — Architecture Specs Stability

Files under `specs/architecture/` are constitutional. During a phase,
the agent treats them as a stable reference. Additive changes (new
fields, new ports) update specs directly at completion; decisional
changes require an ADR amendment first.

**Why:** architecture rewrites mid-phase make the reference move while
you're depending on it.

## Rule 11 — Evaluator Discipline — Lock Evaluators Before Loops

For any learning, optimization, or self-improvement loop, the
evaluation set and scoring function get committed *first*, with a
version tag. The loop optimizes against the locked evaluator;
evaluator changes go to a version-bump, never a mutation.

**Why:** mutable evaluators measure motion, not progress.

## Rule 12 — Verify Before Claim — No Completion Without Evidence

Before marking any task complete, the agent runs the verification
command (test, lint, typecheck, smoke test), reads the output, and
only checks the box if the output shows pass.

**Why:** the most common AI-coding failure is "should work now" —
claiming completion based on intent rather than evidence.

## Rule 13 — Test-Driven Development (Opt-In)

When enabled via `## Project Extensions`, the agent follows a strict
test-first loop: write a failing test, verify the failure, write
minimal code to pass, refactor.

**Why:** post-facto tests confirm what the code already does. TDD
ensures the test specifies what the code *should* do.

---

**Full text + red flags + anti-rationalization counters** live in
[`.agent/rules/project.md`](https://github.com/avinash-singh-io/momentum/blob/main/.agent/rules/project.md)
in any momentum-installed project.
