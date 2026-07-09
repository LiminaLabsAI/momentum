---
title: Rules
description: The 13 autonomous agent rules — full text, why each exists, the red flags they catch, and the anti-rationalization counters.
---

The rules live at `.agent/rules/project.md` (referenced from `CLAUDE.md` /
`AGENTS.md`). They load into every agent session and govern how the agent
behaves **between explicit instructions** — orientation, tracking, git
discipline, decision logging, doc sync, verification.

Rules ship as defaults. Project-specific extensions live under
`## Project Extensions` in `CLAUDE.md` / `AGENTS.md` and are **preserved
across `momentum upgrade`**.

The format below is the source-of-truth format, ported faithfully. Each
rule has the **statement** (what the agent does), the **why** (when needed
to disambiguate edge cases), the **red flags** (rationalizations the agent
catches itself making and stops), and where present, the
**anti-rationalization counters** (specific bypasses the agent rejects).

## Rule 1 — Always Orient First

Before ANY work, read `specs/status.md`.

### Why
Every other rule depends on knowing where you are. Without orientation, the
agent picks up loose threads and works on stale problems. The status file
captures: active phase, blockers, P0/P1 items, next actions. Reading it
costs five seconds and prevents whole categories of "I assumed you were
still on Phase 11" failure modes.

## Rule 2 — Auto-Update Tracking After Changes

After completing ANY meaningful work, automatically update:

1. Active phase `tasks.md` — `[x]` complete, `[/]` in-progress
2. `specs/status.md` — if phase progress, blockers, or P0 items changed
3. `specs/changelog/YYYY-MM.md` — log what changed (one line per change)

### Red flags (STOP and update now)

- **"I'll batch tracking at the end"** — context fades; log now.
- **"Too small to log"** — small changes accumulate into invisible drift.
- **"The diff makes it obvious"** — diffs show *what*; logs explain *why*.

### Why
Tracking debt compounds invisibly. A `tasks.md` one day stale is recoverable;
one week stale is fiction. Status drift is how phases silently lose
direction. Real-time tracking costs 30 seconds per update; reconstructing
later costs 30 minutes.

## Rule 3 — Auto-Track Discoveries

When you discover a bug, tech debt, or enhancement during work:

- Add it to `specs/backlog/backlog.md` immediately
- Mention it to the user

### Why
Discoveries lost are discoveries you'll re-discover later, only with less
context. The cost of writing the backlog row at the moment of discovery is
seconds; the cost of re-noticing the same issue a week later (and trying to
remember the root cause from scratch) is hours.

## Rule 4 — Pre-Phase Bug Check

Before starting a new phase, scan the backlog for P0/P1 bugs. Surface them
to the user with a recommendation: "N open bugs (X critical), recommend
fixing before proceeding."

### Why
Carrying P0 bugs into a new phase compounds risk. The phase's verification
will surface them eventually — better to address them upfront than discover
them at `/complete-phase` and block the release.

## Rule 5 — Phase Boundary Awareness

When completing the last task in a phase: **prompt the user** to run
`/complete-phase` — never auto-complete.

### Why
Completion is a human decision. The agent assists; it doesn't override. The
distinction matters most when the agent thinks something is done but the
user has additional context (a manual verification step, a discussion-pending
review, a release timing constraint).

## Rule 6 — Git Lifecycle (Automatic)

- **Before ANY code change:** check branch; **auto-create a feature branch**
  if on `main`/`staging`. Phase work → `phase-N-shortname`; bug fix →
  `fix/BUG-NNN-short-desc`; feature → `feat/short-desc`; tech debt →
  `refactor/TD-NNN-short-desc`.
- **Auto-commit** after each logical unit with conventional commits
  (`feat:` / `fix:` / `docs:` / `refactor:` / `chore:` / `infra:`).
- **Push** to remote after significant milestones.
- **Never auto-merge to staging or main** — always ASK the user.
- **Delete merged feature branches** once confirmed merged.

### Red flags (STOP and switch branches)

- **"Just one commit to main"** — branch first, decide later.
- **"I'll create the branch after these edits"** — branch is non-optional.
- **"--no-verify just this once"** — fix the underlying check.
- **"Force push is fine, nobody else is on this branch"** — `--force-with-lease`
  at minimum.

### Why
Direct commits to `main` bypass review, history, and rollback. A single
rushed commit on `main` is harder to revert than ten commits on a branch.
The branch convention is the cheapest possible insurance against catastrophic
mistakes.

## Rule 7 — Plan Before Implementing

For non-trivial work, use `/brainstorm-phase` first. Present the plan for
the user's approval before making changes.

### Why
A 30-minute plan saves 3-day rebuilds. The brainstorm step also surfaces
constraints the user has in mind but hasn't articulated — questions like
"how aggressive a redesign?" or "which features go on the landing?" only
land in conversation, not in implementation.

## Rule 8 — Record Phase History

Append to `specs/phases/<active-phase>/history.md` after meaningful changes.

### Entry types

| Trigger | Entry type |
|---|---|
| ADR created or status changed | `[DECISION]` |
| Phase scope added or reduced | `[SCOPE_CHANGE]` |
| Bug / tech debt / enhancement added to backlog | `[DISCOVERY]` |
| New feature added to plan | `[FEATURE]` |
| Architecture pattern changed | `[ARCH_CHANGE]` |
| Locked evaluator defined or changed | `[EVALUATOR]` |
| Anything else worth a future reader's time | `[NOTE]` |

After writing a history entry, update `specs/decisions/impact-map.json`
with new topics so `/sync-docs` can find affected files.

### Format (APPEND ONLY)

```
### [TYPE] YYYY-MM-DD — Short title
Topics: topic-1, topic-2
Affects-phases: phase-N-name (or "none")
Affects-specs: path/to/file.md#section (or "none")
Detail: One to three sentences describing what changed and why.

---
```

### Red flags (STOP and log)

- **"I'll write history at phase end"** — you won't remember the *why*.
- **"Not important enough to log"** — if it's not worth logging, it's not
  worth deciding — log it or revert it.
- **"It's in the commit message"** — history is canonical.

### Why
History is the only place where the *why* of a decision is captured at the
moment it was made. Specs document the current state; commits document
mechanical changes; only history captures motivation. Without it, six months
later nobody can reconstruct whether a constraint is load-bearing or
accidental.

## Rule 9 — Doc Sync Protocol — Never Mid-Phase, Always at Completion

- **During a phase:** record to `history.md` only. Do NOT update other specs.
- **At phase completion:** run `/sync-docs` BEFORE `/complete-phase`.

### Multi-project projects (cross-project guard)

**NEVER modify docs in another repo.** If a history `Affects-specs:` path
starts with `../`, leave that file alone and flag the cross-project impact to
the user with the exact path. Cross-repo doc ownership is structural — never
quietly change docs you don't own.

### Why
Mid-phase spec edits mean specs and rationale drift out of sync; whoever
reads the spec mid-phase sees the new content but doesn't see *why* it
changed. Batching the doc sync at completion ensures every spec edit has
a corresponding history entry already on record.

## Rule 10 — Architecture Specs Stability (monorepo only)

Files under `specs/architecture/` are constitutional documents.

### During phase implementation

- **READ** specs as a stable reference.
- **NEVER modify** them based on implementation discoveries.
- **Log all gaps and changes** as `[ARCH_CHANGE]` in phase history with
  `Affects-specs:`.

### At phase completion (`/sync-docs`)

- **Additive changes** (new fields, new ports, new modes — extending an
  existing design) → update specs directly. **No ADR required.**
- **Decisional changes** (approach changes, design direction shifts) →
  **ADR amendment FIRST**, then spec update.

### Red flags (STOP and route correctly)

- **"Just one field, not a real change"** — additive: fine at completion,
  not now.
- **"Faster to fix the spec than to log the gap"** — locally faster;
  globally catastrophic.
- **"Spec is wrong, code is right, update spec"** — only after an ADR
  documents *why* the design shifted.

### Why
The architecture is the reference others depend on. Editing the reference
while everyone's holding it makes implementation decisions hard to verify
against the constraints. Bookkeeping discipline keeps the reference stable
during work and the rationale visible after.

## Rule 11 — Evaluator Discipline — Lock Evaluators Before Loops

Before building any learning, optimization, or self-improvement loop:

1. Define the **evaluation set** — a fixed corpus with known-good outputs.
2. Define the **scalar** — a single number that improves or doesn't.
3. **Commit** the evaluator to `tests/benchmarks/` with a version tag.
4. Build the loop **AFTER** the evaluator is committed.
5. **NEVER** change the evaluator while the loop is being optimized.

### Red flags (STOP and freeze)

- **"Just one tweak to the eval so this run looks better"** — exactly the
  failure mode. Version-bump to v2; don't mutate v1.
- **"Lock the evaluator after we know what works"** — you can't know
  without a locked reference.
- **"The eval doesn't measure what we care about"** — version-bump; the
  current eval stays frozen.

### Why
Optimization loops with mutable evaluators don't measure progress — they
measure motion. Every "small fix" to the eval set silently rewrites the
score history and makes A-vs-B comparisons meaningless. Locking the
evaluator first costs an hour; not locking it costs the entire experiment.

## Rule 12 — Verify Before Claim — No Completion Without Evidence

Before marking any task `[x]`, run the verification command (test, lint,
typecheck, smoke, build) and **read its output**. **Fresh evidence in this
session** — not confidence, not similar-earlier-tests, not "looks right" —
is the only signal of completion.

### Red flags (STOP and run the verification)

- **"I'm confident this works"** — confidence is not evidence.
- **"The change is too small to test"** — "small" is the most common
  regression predicate.
- **"I'll batch verifications at the end"** — you won't know which change
  broke what.
- **"Unit tests pass"** — unit tests miss wiring bugs; run the integration
  path too.

### Anti-rationalization counters

- **"The diff is obviously correct"** — diffs lie when context is incomplete.
- **"Type checking passed"** — types catch shape errors, not behavior.
- **"CI will catch it"** — CI catches it AFTER you claimed done.

### Why
The most common AI-coding failure mode is "should work now" — claiming
completion based on intent rather than evidence. Box-checking without
verification compounds across phases until shipped releases contain unrun
code paths.

If verification was not run in this session, the task is unverified — leave
it `[/]` (in progress). If a command can't run in the current environment,
say so explicitly — never silently downgrade to "looks correct".

## Rule 13 — Test-Driven Development (TDD) (Opt-in)

If enabled in the project rules extensions (under `## Project Extensions`
in `CLAUDE.md` / `AGENTS.md`), follow a strict test-first development loop:

1. **Red** — Write a unit or integration test that specifies the new behavior
   *before* writing any application code.
2. **Verify failure** — Run the test runner and verify that the newly added
   test fails. Do not write any implementation code until you have seen the
   test fail.
3. **Green** — Write the minimal application code necessary to make the test
   pass.
4. **Refactor** — Clean up and optimize the code while keeping all tests
   green.

### Red flags (STOP and write tests first)

- **"I will write the tests at the end"** — writing tests post-facto is not
  TDD and leads to confirmation bias.
- **"The change is too simple to warrant a test-first approach"** — simple
  changes are excellent TDD candidates to establish correct wiring.

### Why
Tests written after the implementation **describe what the code does**.
Tests written before describe **what the code should do** — a much stronger
specification. The discipline of seeing the test fail is the only proof that
the test actually validates the new behavior (otherwise it might be testing
something the existing code already satisfies).

---

## Where the rules live

The canonical source is `.agent/rules/project.md` in any momentum-installed
project. `momentum upgrade` syncs the rules from the published template;
anything under `## Project Extensions` is **preserved** so project-specific
rules don't get clobbered on upgrade.

The rules are referenced from the primary instruction file (`AGENTS.md` for
opencode, Codex, and Antigravity; `CLAUDE.md` for Claude Code). Agents load the
instruction file at session start, which in turn references the rules file.

[→ canonical source on GitHub](https://github.com/LiminaLabsAI/momentum/blob/main/.agent/rules/project.md)

## What's not a rule

Some behaviors that feel like they could be rules deliberately aren't:

- **Verbose logging** — Rule 8 covers history entries, but routine narration
  ("about to run npm test now, let me know if you want me to stop") is not
  required and gets in the way.
- **Asking before every action** — the autonomous execution contract for
  `/start-phase` pre-authorizes most actions. Rules 5, 6, and Rule 12 each
  carve out the specific decisions that *do* require user input.
- **Style config** — opinions about code formatting, naming, comment
  style live in CLAUDE.md / AGENTS.md project extensions, not in the rules
  file. Rules are universals; style is per-project.

The line between "rule" and "preference" is sharp on purpose. Rules are the
discipline the agent applies regardless of project. Everything else is
configuration.
