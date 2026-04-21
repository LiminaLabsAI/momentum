# momentum

> Spec-driven development for AI coding agents. One install. Every project.

Momentum gives any project a structured workflow: phase planning, backlog tracking, history logging, doc sync, and git discipline — all driven by slash commands that your AI coding agent reads and executes automatically.

Every decision gets recorded. Every phase gets planned. Every release gets tagged. The agent knows the rules; you stay in flow.

---

## Install

```bash
npx @avinash-singh-io/momentum init
```

With a target directory:
```bash
npx @avinash-singh-io/momentum init ./my-project
```

With a specific coding agent:
```bash
npx @avinash-singh-io/momentum init ./my-project --coding-agent claude-code
```

**Alternative (bash installer):**
```bash
git clone https://github.com/avinash-singh-io/momentum
./momentum/install.sh ./my-project
```

### Supported coding agents

| Agent | Flag | Status |
|-------|------|--------|
| Claude Code | `claude-code` (default) | Supported |
| Cursor, Gemini CLI, others | — | Planned |

---

## What You Get

After `momentum init`, your project has everything it needs to run a structured development workflow:

```
your-project/
├── CLAUDE.md                        ← Agent rules (9 autonomous behaviors)
├── README.md                        ← Project readme template
├── scripts/
│   └── check-history-reminder.sh   ← Hook: reminds agent to log history
├── .claude/
│   ├── settings.json               ← Wires the hook into Claude Code
│   └── commands/                   ← 8 slash commands
│       ├── brainstorm-project.md
│       ├── brainstorm-phase.md
│       ├── start-phase.md
│       ├── complete-phase.md
│       ├── sync-docs.md
│       ├── log.md
│       ├── track.md
│       └── review.md
├── .agent/
│   └── rules/project.md            ← Condensed agent rules (non-Claude Code agents)
└── specs/
    ├── README.md
    ├── status.md                    ← Current phase, blockers, P0 items
    ├── backlog/
    │   ├── backlog.md               ← Bugs, features, tech debt, enhancements
    │   └── details/                 ← Detail files for complex items
    ├── changelog/                   ← Monthly change logs (YYYY-MM.md)
    ├── decisions/
    │   ├── README.md
    │   ├── 0000-template.md         ← ADR template
    │   └── impact-map.json          ← Topic → spec file index (used by /sync-docs)
    ├── phases/
    │   ├── README.md                ← Phase index with status
    │   └── index.json               ← Topic index (used by /sync-docs)
    ├── planning/
    │   └── roadmap.md
    └── vision/
        ├── project-charter.md
        ├── principles.md
        └── success-criteria.md
```

---

## The Lifecycle

### Starting a new project

```
/brainstorm-project
```

The agent asks you one question at a time to understand your idea, then scaffolds:
- Vision files (`project-charter.md`, `principles.md`, `success-criteria.md`)
- Roadmap with natural phases
- Phase 0 plan using the Group Execution Pattern
- Initial `CLAUDE.md`, `specs/status.md`, `specs/backlog/backlog.md`
- Initial git commit

Then:
```
/start-phase
```

The agent creates a feature branch, updates tracking, and you're ready to implement.

---

### Each phase

```
/brainstorm-phase   →   /start-phase   →   implement   →   /sync-docs   →   /complete-phase
```

| Step | Command | What happens |
|------|---------|-------------|
| 1 | `/brainstorm-phase` | Reviews history, defines scope with you, writes `overview.md` + `plan.md` + `tasks.md` + `history.md` |
| 2 | `/start-phase` | Creates branch, updates `status.md` + `phases/index.json`, commits |
| 3 | Implement | Agent works through groups, auto-commits, logs decisions to `history.md` |
| 4 | `/sync-docs` | Reads phase history, identifies affected specs, propagates updates |
| 5 | `/complete-phase` | Verifies acceptance criteria, writes retrospective, merges, tags, releases |

---

### Between phases

```
/track    ← log a bug, feature, tech debt, or enhancement at any time
/log      ← manually record a decision or discovery to history.md
/review   ← groom the backlog: re-prioritize, close stale items, plan the next phase
```

---

## Commands

### `/brainstorm-project`
Turn an idea into a fully spec-driven project. Run once on a new or empty repo before anything else. The agent asks questions one at a time, then creates your vision, roadmap, Phase 0 plan, and full spec structure in one pass.

### `/brainstorm-phase`
Plan the next phase before starting it. Reviews what was learned in the last phase, checks the roadmap, defines scope with you, and writes all phase files (`overview.md`, `plan.md`, `tasks.md`, `history.md`) using the Group Execution Pattern.

### `/start-phase`
Begin a planned phase. Creates the git branch, updates `specs/status.md` and `specs/phases/index.json`, logs a phase-start entry to `history.md`, and commits.

### `/complete-phase`
Verify, finalize, and release. Checks all tasks are done and acceptance criteria are met, runs `/sync-docs`, writes a retrospective, updates all tracking files, merges branch → staging → main, tags, and creates a GitHub Release.

### `/sync-docs`
Propagate phase history to specs. Token-efficient: reads `history.md` and two small indexes first, builds a targeted file list, shows you the sync plan, then makes only the necessary edits. Never touches files not in the plan.

### `/track`
Log a backlog item — bug, feature, tech debt, or enhancement. Auto-decides whether the item is a one-liner or needs a `details/{ID}.md` file based on complexity:

| One-liner | Detail file |
|-----------|-------------|
| Self-contained, < 2 sentences | Requires design or options evaluation |
| No design choices to make | Touches multiple files or systems |
| Obvious fix | Non-obvious implementation path |
| < 30 min of work | Cross-cutting impact or > 30 min |

### `/log`
Manually record a decision, discovery, or scope change to the active phase's `history.md`. The agent infers the entry type (`[DECISION]`, `[DISCOVERY]`, `[SCOPE_CHANGE]`, etc.), extracts topics, and appends in the standard format.

### `/review`
Groom the backlog between phases. Re-assesses priorities, flags orphaned items, checks for P0 blockers, and reports a summary of what needs attention before the next phase starts.

---

## The Spec Structure

`specs/` is the single source of truth for everything that isn't code.

| File | Purpose |
|------|---------|
| `specs/status.md` | **Read this first.** Current phase, health, blockers, P0 items, next actions |
| `specs/backlog/backlog.md` | Four tables: Bugs, Features, Tech Debt, Enhancements — each with ID, priority, status, phase |
| `specs/phases/phase-N-*/overview.md` | Goal, scope, deliverables, acceptance criteria |
| `specs/phases/phase-N-*/plan.md` | Group Execution Pattern with full implementation approach |
| `specs/phases/phase-N-*/tasks.md` | Granular checklist `[ ]` / `[x]` |
| `specs/phases/phase-N-*/history.md` | Append-only log of decisions and discoveries |
| `specs/phases/phase-N-*/retrospective.md` | Post-release review (created by `/complete-phase`) |
| `specs/decisions/NNNN-*.md` | Architecture Decision Records |
| `specs/changelog/YYYY-MM.md` | Monthly change log |

---

## The Group Execution Pattern

Every `plan.md` declares its execution order at the top:

```
# Sequential:  Group 0 → Group 1 → Group 2
# Parallel:    (Groups 0 + 1 + 2 in parallel) → Group 3
# Mixed:       Group 0 → (Groups 1 + 2 in parallel) → Group 3
```

Each group header states whether it's sequential or parallel, its external dependencies, and its commit message. Standard layout:

- **Group 0** — contracts, types, schemas (sequential — blocks everything downstream)
- **Middle groups** — independent feature areas (parallel candidates)
- **Second-to-last** — wiring and integration (sequential)
- **Last** — verification: tests, smoke tests, benchmarks (sequential)

The agent implements each group in order, committing after each one.

---

## Autonomous Agent Rules

Momentum installs `CLAUDE.md` with nine always-on rules. The agent follows these without being asked:

| Rule | Behavior |
|------|----------|
| **Orient first** | Before ANY work, read `specs/status.md` |
| **Auto-update tracking** | After meaningful work, update `tasks.md`, `status.md`, `changelog` |
| **Auto-track discoveries** | Bugs or enhancements found mid-phase → immediately added to backlog |
| **Pre-phase bug check** | Scans for P0/P1 bugs before starting a new phase |
| **Phase boundary awareness** | Prompts you to run `/complete-phase` when all tasks are done |
| **Git lifecycle** | Auto-creates branches, commits atomically, asks before merging to main |
| **Plan before implementing** | Uses `/brainstorm-phase` for non-trivial work |
| **Record phase history** | Appends `[DECISION]` / `[DISCOVERY]` / etc. entries to `history.md` |
| **Doc sync at completion only** | Never modifies specs mid-phase; runs `/sync-docs` at phase end |

---

## History-First Philosophy

The `history.md` file is the heart of momentum. Every significant event during a phase gets appended in a structured format:

```
### [DECISION] 2026-04-21 — Chose Option A for adapter pattern
Topics: cli, adapters, dip
Affects-phases: phase-4-enhanced-commands
Affects-specs: specs/architecture/contracts/interface-spec.md
Detail: Option A ships adapter.js per coding agent. Consistent with the
DIP boundary from Phase 1 and establishes the pattern for future adapters.

---
```

Entry types: `[DECISION]` | `[SCOPE_CHANGE]` | `[DISCOVERY]` | `[FEATURE]` | `[ARCH_CHANGE]` | `[NOTE]`

`/sync-docs` reads these entries and uses the Topics + Affects-specs fields to know exactly which files to update — no guessing, no over-writing.

---

## Backlog IDs and Priorities

| Type | Prefix | Example |
|------|--------|---------|
| Bug | `BUG-` | `BUG-001` |
| Feature | `FEAT-` | `FEAT-001` |
| Tech Debt | `TD-` | `TD-001` |
| Enhancement | `ENH-` | `ENH-001` |

| Priority | Meaning |
|----------|---------|
| `P0` | Critical — blocks current phase |
| `P1` | High — current or next phase |
| `P2` | Medium — within 2 phases |
| `P3` | Low — nice to have |

---

## Contributing

This repo is itself a momentum project. See `specs/status.md` for the current phase and `specs/backlog/backlog.md` for open items.

```bash
# Plan the next enhancement
/brainstorm-phase

# Start work
/start-phase
```

Issues and PRs welcome: [github.com/avinash-singh-io/momentum](https://github.com/avinash-singh-io/momentum)
