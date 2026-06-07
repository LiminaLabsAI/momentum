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

With a specific agent:
```bash
npx @avinash-singh-io/momentum init ./my-project --agent claude-code
npx @avinash-singh-io/momentum init ./my-project --agent codex
```

> Migrating from v0.5.x or earlier? The `--coding-agent` flag was renamed to `--agent` in v0.6.0. The old flag now exits with a rename hint.

**Alternative (bash installer):**
```bash
git clone https://github.com/avinash-singh-io/momentum
./momentum/install.sh ./my-project
```

### Supported coding agents

| Agent | Flag | Status |
|-------|------|--------|
| Claude Code | `claude-code` (default) | Supported |
| Codex | `codex` | Supported |
| Cursor, Gemini CLI, others | — | Planned |

---

## What You Get

After `momentum init`, your project has everything it needs to run a structured development workflow:

```
your-project/
├── CLAUDE.md / AGENTS.md            ← Agent-specific primary instructions
├── README.md                        ← Project readme template
├── scripts/
│   └── check-history-reminder.sh   ← Hook: reminds agent to log history
├── .claude/
│   ├── settings.json               ← Claude Code hook config
│   └── commands/                   ← Claude Code slash commands
├── .codex/                         ← Codex projects use this instead
│   ├── hooks.json                  ← Codex hook config
│   └── commands/                   ← Codex command recipes
│       ├── brainstorm-idea.md
│       ├── start-project.md
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
/brainstorm-idea
```

Think through the concept first — no files written. The agent asks one question at a time and produces a structured summary: problem, options, constraints, recommendation, open questions. When the idea is clear, move on:

```
/start-project
```

The agent scaffolds everything: vision files, roadmap, Phase 0 plan using the Group Execution Pattern, `CLAUDE.md`, `specs/status.md`, `specs/backlog/backlog.md`, and an initial git commit.

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

### `/brainstorm-idea`
Explore any idea through structured dialogue — software project, architecture decision, product direction, technical tradeoff, anything. Nothing is written to disk. The output is a structured summary (problem, options, constraints, recommendation, open questions). When the idea is clear, move to `/start-project`.

### `/start-project`
Scaffold a new spec-driven project from a settled idea. Run once on a new or empty repo. Creates vision files, roadmap, Phase 0 plan using the Group Execution Pattern, `CLAUDE.md`, `specs/status.md`, `specs/backlog/backlog.md`, and the initial git commit.

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

Momentum installs `CLAUDE.md` with twelve always-on rules. The agent follows these without being asked:

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
| **Doc sync at completion only** | Never modifies specs mid-phase; runs `/sync-docs` at phase end. Multi-repo: never touches docs in other repos. |
| **Architecture stability** *(monorepo)* | Specs in `specs/architecture/` are read-only mid-phase; additive vs decisional changes route differently |
| **Evaluator discipline** | Lock evaluators before building learning loops; never mutate a locked eval |
| **Verify before claim** | No `[x]` without fresh evidence — running the test, not "looks correct" |

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

## Adapter Authors — Where Files Live

momentum's content lives in two places:

| Location | What goes here |
|----------|----------------|
| `core/<sub>/`                 | **Generic** — works for every supported agent. Default home for all commands, rules, scripts. |
| `adapters/<agent>/<sub>/`     | **Agent-specific** — exploits a capability only that agent has (e.g., Claude Code subagents via the Task tool, Codex AGENTS.md / hook wiring). |

### Adapter Contract v3

Adapters declare their runtime surface in `adapters/<agent>/adapter.js`:

- `displayName` — user-facing name shown by CLI help/errors
- `destinations` — where generic `commands/`, `agent-rules/`, and `scripts/` install for that agent
- `primaryInstruction` — root instruction file such as `CLAUDE.md` or `AGENTS.md`
- `configFiles` — adapter-owned config files such as `.claude/settings.json` or `.codex/hooks.json`
- `capabilities` — informational flags for features like hooks, slash commands, subagents, skills, browser/computer use

The CLI walks `core/<sub>/` first, then **overlays** any `adapters/<chosen>/<sub>/` content on top — for these subdirs:

| Subdir         | Default destination in target |
|----------------|--------------------------------|
| `commands/`    | adapter-owned command surface, e.g. `.claude/commands/` or `.codex/commands/` |
| `agent-rules/` | usually `.agent/rules/` |
| `scripts/`     | usually `scripts/` |

Adapters declare these destinations in their `adapter.js`:

```js
module.exports = {
  displayName: 'Claude Code',
  destinations: {
    commands: ['.claude', 'commands'],
    'agent-rules': ['.agent', 'rules'],
    scripts: ['scripts'],
  },
  primaryInstruction: {
    source: ['instructions', 'CLAUDE.md'],
    destination: ['CLAUDE.md'],
    markerAware: true,
  },
  configFiles: [
    { source: ['settings.json'], destination: ['.claude', 'settings.json'] },
  ],
  capabilities: {
    hooks: true,
    slashCommands: true,
    subagents: true,
  },
  runInstall(targetDir, adapterDir, helpers) { /* settings.json wiring, etc. */ },
  runUpgrade(targetDir, adapterDir, helpers) { /* same */ },
};
```

**The overlay is additive-only.** A given filename may live in EITHER `core/<sub>/` OR exactly one `adapters/<name>/<sub>/`, never both. Duplicates are caught by the CLI **before any writes** and exit with a clear error. To add an agent-specific variant of a generic command, give it a different name (or move the generic one out of `core/`).

Root instruction files and config files are adapter-owned. Do not put Claude Code-specific conventions in `core/`, and do not reduce Claude Code behavior to match another agent. Add the other agent's behavior in its adapter.

## Ecosystems — Multi-Repo Coordination (Tier 1, v0.12.0+)

Single-repo momentum gives one project its own phase/backlog/history. When work spans multiple momentum-installed repos in one session — backend + frontend + infra all participating in a launch, say — the **ecosystem layer** threads them into a coherent unit without owning any of them.

```
<parent>/
├── cerebrio-ecosystem/         ← its own git repo, holds the manifest
│   ├── ecosystem.json
│   ├── initiatives/0001-memory-module.md
│   └── sessions/2026-06-07.md
├── cerebrio-sapience/          ← member: backend
├── cerebrio-frontend/          ← member: client
└── cerebrio-infra/             ← member: infra
```

### Quick start

```bash
# In the parent directory:
mkdir myproduct-ecosystem && cd myproduct-ecosystem
momentum ecosystem init myproduct
momentum ecosystem add ../my-backend  --role platform --id backend
momentum ecosystem add ../my-frontend --role client   --id frontend
momentum ecosystem add ../my-infra    --role infra    --id infra
momentum ecosystem status
```

### What you get

- **`ecosystem.json`** — single source of truth for who's in the constellation, their roles, and dependency edges. Replaces hand-maintained "Repo Map" tables.
- **Initiatives** — `initiatives/NNNN-<slug>.md`, one per cross-repo feature. Frontmatter declares status, repos, owner; body has fixed sections (Why / Per-repo contributions / Linked decisions / Deploy chronology / Close).
- **Daily session log** — `sessions/YYYY-MM-DD.md` auto-appended by each member's PostToolUse hook on `git commit` or `gh pr` events. Reconstructable in one read.
- **Slash commands** — `/ecosystem` for membership operations, `/initiative` for cross-repo features, `/session log` for narrative entries.

### Strictly additive

- Member repos' `specs/` are never modified.
- The only touch on a member is one fenced line at the top of its `CLAUDE.md` / `AGENTS.md`.
- Outside an ecosystem, `momentum` works exactly as before — no behavior change.

See `specs/architecture/ecosystem.md` (in any momentum-installed project after v0.12.0) for the full reference, and the `/ecosystem` command recipe for the agent-facing surface.

## Contributing

This repo is itself a momentum project. See `specs/status.md` for the current phase and `specs/backlog/backlog.md` for open items.

Issues and PRs welcome: [github.com/avinash-singh-io/momentum](https://github.com/avinash-singh-io/momentum)
