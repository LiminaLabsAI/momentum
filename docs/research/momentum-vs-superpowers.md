# Momentum vs. Superpowers — Head-to-Head Comparison

> Research conducted 2026-04-25. Reference for momentum v2 planning.

---

## Philosophy

| | **Momentum** | **Superpowers** |
|---|---|---|
| **Core idea** | Project lifecycle manager — manage the *arc* of building software | Task execution enhancer — make the agent *better at doing things* |
| **Metaphor** | Project manager that never sleeps | Senior engineer with superpowers |
| **Unit of work** | Phase (weeks/sprints) | Task (2-5 minutes) |
| **What it manages** | Backlog, phases, decisions, specs, releases | Current brainstorm → plan → implementation |
| **Memory model** | Persistent specs, history logs, changelogs | Ephemeral (no cross-session persistence) |
| **Enforcement** | CLAUDE.md rules (conventions) | SessionStart hook + meta-skill (auto-triggered) |
| **Persuasion** | Straightforward instructions | Cialdini's principles, anti-rationalization tables |

---

## Command/Skill Comparison

| Capability | **Momentum** | **Superpowers** |
|---|---|---|
| **Brainstorming** | `/brainstorm-idea` — structured dialogue, summary output | `brainstorming` — Socratic Q&A, visual mockup server, writes spec file |
| **Phase planning** | `/brainstorm-phase` — writes overview + plan + tasks with Group Execution Pattern | N/A — no concept of phases |
| **Plan writing** | Embedded in `/brainstorm-phase` | `writing-plans` — converts spec into 2-5 min bite-sized tasks |
| **Plan execution** | Manual (agent follows `plan.md`) | `subagent-driven-development` — fresh subagent per task, 2-stage review loop |
| **Inline execution** | Default mode | `executing-plans` — fallback when subagents unavailable |
| **TDD** | None | `test-driven-development` — rigid RED-GREEN-REFACTOR with 12 anti-rationalization counters |
| **Debugging** | None | `systematic-debugging` — 4-phase root cause, 3-strikes rule |
| **Code review** | None | `requesting-code-review` + `receiving-code-review` + named `code-reviewer` agent |
| **Verification** | `/complete-phase` checks task checkboxes | `verification-before-completion` — "NO COMPLETION CLAIMS WITHOUT FRESH EVIDENCE" |
| **Git branching** | `/start-phase` creates branch | `using-git-worktrees` — isolated worktrees |
| **Git completion** | `/complete-phase` — 3-way merge + tag + GitHub Release | `finishing-a-development-branch` — merge/PR/keep/discard |
| **Backlog tracking** | `/track` — auto-IDs, priority tiers, detail files | None |
| **Phase lifecycle** | `/start-phase`, `/complete-phase` | None |
| **Decision logging** | `/log` — typed, append-only, topic-linked | None |
| **Spec sync** | `/sync-docs` — topic-based routing to affected files | None |
| **Backlog grooming** | `/review` — priority reassessment, dependency checks | None |
| **Validation** | `/validate` — structural + referential integrity | None |
| **Migration** | `/migrate` — onboard existing projects safely | None |
| **Parallel agents** | Group Execution Pattern (declared, manual) | `dispatching-parallel-agents` — concurrent subagent dispatch |
| **Skill authoring** | None | `writing-skills` — TDD applied to documentation |
| **Auto-activation** | CLAUDE.md rules (9 autonomous behaviors) | SessionStart hook + meta-skill (skills trigger without invocation) |
| **Multi-platform** | Claude Code only | Claude Code, Codex, Cursor, Gemini, Copilot CLI, OpenCode |

---

## Where Superpowers Wins

| Area | Detail |
|---|---|
| **Execution quality** | Subagent-per-task with 2-stage adversarial review catches real bugs. Momentum has no execution engine — trusts the agent to follow `plan.md`. |
| **TDD enforcement** | Rigid, psychologically-designed rules with rationalization counters. Momentum doesn't address testing discipline. |
| **Debugging methodology** | 4-phase root cause process with 3-strikes rule. Momentum has no debugging guidance. |
| **Code review** | Structured review with severity levels, adversarial spec reviewer ("do NOT trust the implementer"), review loops. Momentum has zero review capability. |
| **Verification rigor** | Explicit "no completion claims without evidence" skill. Momentum's verification is limited to checking task checkboxes. |
| **Auto-activation** | SessionStart hook + meta-skill = skills trigger without user invocation. Momentum requires users to invoke commands manually. |
| **Persuasion engineering** | Skills use Cialdini's principles, red-flag tables, rationalization counters. Momentum's rules are straightforward instructions. |
| **Multi-platform** | 6+ agents supported. Momentum is Claude Code only. |
| **Subagent orchestration** | Real parallel/sequential subagent dispatch with model selection. Momentum declares parallelism but doesn't execute it. |
| **Community** | 166K stars, active ecosystem. Momentum is a solo project. |

---

## Where Momentum Wins

| Area | Detail |
|---|---|
| **Project lifecycle** | Full backlog → phase → release pipeline. Superpowers has no concept of phases, backlogs, or releases. |
| **Persistent tracking** | Status, backlog, changelog, decision logs, phase history — all versioned in git. Superpowers is stateless between sessions. |
| **Decision audit trail** | Append-only `history.md` with typed entries, topic linking, impact mapping. Superpowers writes specs but doesn't track *why* decisions were made. |
| **Release management** | 3-way merge (phase → staging → main), versioned tags, GitHub Releases. Superpowers has basic branch finishing. |
| **Spec sync intelligence** | Topic-based cross-referencing routes changes to exactly the affected files. Superpowers doesn't maintain specs beyond initial design doc. |
| **Architecture protection** | Read-only architecture specs during phases, ADR-only amendments. Superpowers has no architecture governance. |
| **Backlog management** | Auto-IDs, priority tiers, detail files, grooming reviews. Superpowers has nothing. |
| **Validation** | Structural + referential integrity checks. Superpowers has no project health monitoring. |
| **Migration** | Can onboard existing projects safely. Superpowers is install-and-go only. |
| **Long-term project memory** | Months of decisions, retrospectives, changelogs searchable in `specs/`. Superpowers remembers nothing after session ends. |

---

## The Gap Analysis

```
                    EXECUTION QUALITY ──────────────► Superpowers dominates
                    
    PROJECT MANAGEMENT ◄────────────── Momentum dominates
    
                         OVERLAP
                    ┌─────────────────┐
                    │  Brainstorming   │  Both good, Superpowers slightly better
                    │  Plan writing    │  Both good, different approaches
                    │  Git workflow    │  Both good, Momentum more complete
                    └─────────────────┘
                    
    NEITHER HAS:
    ├── Self-learning across sessions
    ├── Context-window awareness  
    ├── MCP integration
    └── Auto-spec generation from prompts
```

---

## Key Insight: Complementary, Not Competitive

Superpowers makes the agent **execute better** (TDD, debugging, code review, subagents).
Momentum makes the agent **manage better** (phases, backlog, decisions, releases).

The ideal system combines both:
- Momentum's lifecycle wrapping Superpowers' execution engine
- Phase plans executed via subagent-driven development
- TDD and code review embedded in every phase task
- History logging capturing learnings from code reviews
- Backlog tracking feeding brainstorming context

---

## What Momentum Should Absorb

### P0 — Critical for v2

| Feature | From Superpowers | Adaptation for Momentum |
|---|---|---|
| Execution engine | `subagent-driven-development` | Phase plan groups dispatched to subagents with review loops |
| TDD enforcement | `test-driven-development` | Add as autonomous Rule 11 with anti-rationalization |
| Verification rigor | `verification-before-completion` | Strengthen `/complete-phase` — run actual tests, not just check boxes |

### P1 — High Value

| Feature | From Superpowers | Adaptation for Momentum |
|---|---|---|
| Debugging methodology | `systematic-debugging` | Add as skill/command that auto-activates on repeated failures |
| Code review | `requesting-code-review` + `receiving-code-review` | Add `/review-code` at phase boundaries |
| Auto-activation | SessionStart hook + meta-skill | Add session-start hook that loads rules + triggers orientation |
| Persuasion engineering | Red flags, rationalization tables | Harden existing rules with anti-rationalization counters |

### P2 — Nice to Have

| Feature | From Superpowers | Adaptation for Momentum |
|---|---|---|
| Skill authoring | `writing-skills` | Let users create project-specific commands |
| Visual companion | Brainstorming mockup server | Add to `/brainstorm-idea` or `/brainstorm-phase` |
| Multi-platform | Platform adapters + tool mappings | Extend existing adapter architecture |

---

## What Superpowers Can Never Do (Momentum's Moat)

1. **"What's the status of this project?"** — Superpowers can't answer; Momentum reads `status.md`
2. **"What bugs are blocking us?"** — Superpowers has no backlog; Momentum has `backlog.md`
3. **"Why did we choose X over Y?"** — Superpowers forgot; Momentum has `history.md`
4. **"Ship a release"** — Superpowers finishes a branch; Momentum does full merge + tag + GitHub Release
5. **"What changed this month?"** — Superpowers doesn't know; Momentum has `changelog/`
6. **"Is the spec structure healthy?"** — Superpowers has no validation; Momentum has `/validate --deep`
7. **"Onboard this existing project"** — Superpowers can't; Momentum has `/migrate`
8. **"What was decided in Phase 2?"** — Superpowers has no memory; Momentum has `history.md` + `retrospective.md`
