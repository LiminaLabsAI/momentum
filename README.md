# momentum

> **Agent-agnostic, specs-driven development framework.**
> Manage a single project or orchestrate a multi-project ecosystem from one AI agent session.

[![npm](https://img.shields.io/npm/v/@avinash-singh-io/momentum)](https://www.npmjs.com/package/@avinash-singh-io/momentum)

[**Visit the site →**](https://trymomentum.github.io)

---

## What momentum does

Every project gets a structured workflow: phase planning, backlog tracking, history logging, doc sync, and git discipline — all driven by slash commands your AI coding agent runs automatically. Every decision gets recorded. Every phase gets planned. Every release gets tagged.

momentum works with any supported agent (Claude Code, Codex, Antigravity today; Cursor + Gemini CLI planned). It scales from one repo to N repos: ecosystem mode lets one agent session orchestrate work across multiple related projects without losing momentum's tracking discipline.

## Who it's for

Builders using AI coding agents who want their projects' state — phases, decisions, history, backlog — to outlive any single session. If you've ever lost context between sessions, re-explained a decision to your agent, or watched a phase drift because nobody wrote down *why*, momentum is the missing layer.

---

## Which scale are you?

| You have… | Run this | Read |
|---|---|---|
| **One project** | `momentum init` | [Single-project quickstart](#single-project-quickstart) |
| **Several related projects** | `momentum init --ecosystem <name>` | [Ecosystem quickstart](#ecosystem-quickstart) |
| **An existing project, want to join an ecosystem** | `momentum join ../<ecosystem>` | [Joining an ecosystem](#joining-an-existing-ecosystem) |
| **Confused about current state** | `momentum doctor` | [Diagnosing state](#diagnosing-state) |

**Single-project usage is the default.** If you run `momentum init` with no flags, nothing about ecosystems appears anywhere — no extra files, no prompts. Ecosystem mode is opt-in.

---

## Supported agents

| Agent | Flag | Status | Primary instruction file |
|---|---|---|---|
| Claude Code | `--agent claude-code` *(default)* | Shipped | `CLAUDE.md` |
| Codex | `--agent codex` | Shipped | `AGENTS.md` |
| Antigravity | `--agent antigravity` | Shipped | `AGENTS.md` |
| Cursor | — | Planned (Phase 12) | `.cursor/rules/` |
| Gemini CLI | — | Planned (Phase 12) | `GEMINI.md` |

All commands and primitives work the same across agents. The adapter contract handles per-agent wiring (where the primary instruction lives, how hooks attach, where slash commands install).

---

## Single-project quickstart

```bash
# In an empty (or existing) project directory:
npx @avinash-singh-io/momentum init

# Open your agent (Claude Code, Codex, Antigravity) in this directory.
# Then run the slash commands inside the agent:
/start-project     # scaffold from a clear idea
/brainstorm-phase  # plan your next phase
/start-phase       # begin implementation
/complete-phase    # verify, release, commit
```

That's it. Your project now has:
- `specs/` — status, backlog, phases, decisions, planning
- A primary instruction file (`CLAUDE.md` / `AGENTS.md`) with agent rules
- Hooks that nudge you to log decisions and update tracking
- 15+ slash commands the agent uses to drive the workflow

No ecosystem files. No cross-repo state. Just one project, managed.

**[→ See "What you get" below](#what-you-get) for the full file map.**

---

## Ecosystem quickstart

If you have several related projects (a platform + a SDK + a CLI, or a frontend + backend + infra), set them up as one ecosystem:

```bash
# From inside the first project:
npx @avinash-singh-io/momentum init --ecosystem my-eco

# This creates ../my-eco/ as a sibling git repo + registers
# the current project as its first member.

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

**What ecosystem mode adds (and what it doesn't):**

- **Adds:** cross-repo session log (`sessions/YYYY-MM-DD.md` auto-records commits + PRs across members), cross-repo initiatives (one feature spans multiple repos), `/track` aggregation (one view across all members), and the ecosystem CLI.
- **Doesn't change:** each member's own `specs/` is untouched. Every per-project slash command still works exactly as it did in single-project mode. The ecosystem layer is strictly additive.

### Joining an existing ecosystem

If a teammate already created an ecosystem and you have a momentum-installed project to add to it:

```bash
# From inside your project:
npx @avinash-singh-io/momentum join ../their-ecosystem
```

### Leaving an ecosystem

```bash
# From inside your project:
npx @avinash-singh-io/momentum leave
```

Reversible. Strips the pointer block + removes the manifest entry. Your project's own `specs/` are untouched.

### Diagnosing state

If you're unsure whether a repo is standalone, a member, or an ecosystem root:

```bash
npx @avinash-singh-io/momentum doctor
```

Prints current state (Standalone / Member / Leader / Leader+Member / Broken-*) and lists the exact commands you can run next.

---

## Architecture (one page)

```
momentum (CLI)
├── core/                  ← tool-agnostic logic (zero deps)
│   ├── commands/          ← slash command recipes (markdown, agent-agnostic)
│   ├── agent-rules/       ← rules every agent honors (Rules 1-12)
│   ├── scripts/           ← hook scripts (bash, POSIX)
│   ├── ecosystem/         ← ecosystem layer (manifest schema, lib, layout)
│   └── specs-templates/   ← scaffold copied into every new project
└── adapters/              ← per-agent wiring
    ├── claude-code/       ← CLAUDE.md, .claude/hooks, .claude/commands/
    ├── codex/             ← AGENTS.md, .codex/hooks.json, .codex/commands/
    └── antigravity/       ← AGENTS.md, equivalent hook + command paths
```

**The principle:** `core/` knows nothing about specific agents. `adapters/<agent>/` knows everything about its agent. `momentum init --agent <name>` walks both directories and writes the right files to the right places. New agents add an adapter; core never changes.

[See `core/ecosystem/layout.md`](./core/ecosystem/layout.md) for the ecosystem on-disk contract.

---

## What you get

After `momentum init`, your project has:

```
my-project/
├── CLAUDE.md              ← agent rules + project navigation (or AGENTS.md)
├── .agent/rules/          ← detailed agent rules
├── .claude/commands/      ← slash command recipes (per adapter)
├── .claude/hooks.json     ← hook config (per adapter)
├── specs/
│   ├── status.md          ← current phase + blockers + P0s (Rule 1: read first)
│   ├── backlog/           ← BUG-NNN, FEAT-NNN, TD-NNN, ENH-NNN
│   ├── phases/            ← per-phase overview / plan / tasks / history
│   ├── decisions/         ← ADRs + impact-map.json (drives /sync-docs)
│   ├── planning/          ← roadmap + future-phase planning stubs
│   ├── changelog/         ← YYYY-MM.md, one-line-per-change
│   └── architecture/      ← stable reference docs (if monorepo)
└── scripts/check-history-reminder.sh  ← hook script
```

---

## Commands reference

Organized by purpose. All commands are agent-agnostic markdown recipes the agent reads on invocation.

### Planning
- `/brainstorm-idea` — explore an idea before committing
- `/brainstorm-phase` — design the next phase before creating it
- `/start-project` — scaffold a new project from a clear idea
- `/start-phase` — begin implementation
- `/complete-phase` — verify, release, commit (evidence-rigorous)

### Execution & tracking
- `/track` — record a backlog item (bug, feature, tech debt, enhancement)
- `/log` — record a manual entry in the active phase history
- `/sync-docs` — propagate phase-history entries to affected specs
- `/review-code` — multi-perspective code review of pending changes
- `/migrate` — onboard an existing project into momentum structure

### Ecosystem (multi-repo)
- `/ecosystem` — operator toolkit (init / add / remove / status)
- `/initiative` — create / status / close cross-repo features
- `/session log <msg>` — narrative entry on today's session file

### Maintenance
- `/validate` — check the spec structure health
- `/review` — groom the backlog between phases

---

## Orchestration (ecosystem mode)

When you're in an ecosystem and need to work across member repos from one agent session, momentum gives you three primitives. Three doors into one shared library — slash commands inside the agent (Claude Code, Codex), natural-language inference when you describe a task without naming the primitive, and `momentum <verb>` from the terminal (works on every adapter, including Antigravity).

| Primitive | What it does | Typical use |
|---|---|---|
| `scout <repo>` | Read-only context fetch from one ecosystem member | "What's the current auth shape in `sapience`?" |
| `dispatch <r1> <r2> ...` | Parallel fan-out + synthesis across multiple members | "Audit `X-Cerebrio-Auth` usage across the stack" |
| `handoff <repo>` | Cross-session control transfer with a structured context block | "I'm done in `sapience` — pick up in `frontend`" |

**End-to-end examples:**

```bash
# Scout before changing — read sapience without leaving your frontend session
momentum scout sapience "auth endpoint shape"
# → ▸ scout sapience: auth endpoint shape
# → ▸ reading specs/status.md, specs/architecture/...
# → ▸ Summary: POST /core/auth/v1/login (totp_code, 401, 423)
# → logged to sessions/<today>.md, trace at .momentum/runs/scout-001.md

# Dispatch — fan out across 4 repos
momentum dispatch sapience frontend py cli --prompt "audit X-Cerebrio-Auth header usage"
# → ▸ dispatch 4 repos in parallel ...
# → ▸ Synthesis: 19 call sites total; rename safe with 3 caveats ...

# Handoff — write a context block for the receiving repo
momentum handoff frontend --summary "wire X-CB-Auth rename to LoginForm" \
  --decision "Renamed header" --file core/auth/login.ts \
  --verify "npm test" --question "back-compat shim?"
# → writes .momentum/inbox/handoff-001.md in frontend
# → emits [DECISION] in sapience phase history
# Next agent session in frontend gets greeted by the SessionStart hook:
# → ▸ 1 pending handoff: handoff-001 from sapience — Read now? [y/skip]
momentum continue   # picks up the oldest pending
```

### Pick your door

- **Slash command** (Claude Code, Codex): `/scout`, `/dispatch`, `/handoff`, `/continue` — predictable, in-context.
- **Natural language** (any adapter): describe the task in prose; the agent infers the primitive ("inferred: scout (single repo, read-only)").
- **CLI** (every adapter, scripts, CI): `momentum scout`, `momentum dispatch`, `momentum handoff`, `momentum continue` — universal floor, scriptable.

All three doors call into `core/orchestration/` so the output shape is identical.

### Capability-driven routing

Some adapters don't yet support all surfaces. The router degrades gracefully and **labels the degraded mode up front** so you're never silently slower:

| Adapter | Slash commands | Parallel sub-agents (`dispatch`) | SessionStart auto-greet |
|---|---|---|---|
| Claude Code | ✅ | ✅ | ✅ |
| Codex | ✅ | sequential (pending live validation) | ✅ |
| Antigravity | ❌ chat-driven | ✅ | ❌ banner via instruction text |

When you run `momentum dispatch` on a sequential-only adapter, you'll see `▸ note: this adapter does not declare parallel subagents — running sequentially`. The output shape is identical to parallel mode.

### Tracking contract — "auto when meaningful, never noise"

- **Cheap layer (always auto):** one line in the ecosystem session log per primitive invocation; a structured `.momentum/runs/<primitive>-NNN.md` artifact; handoff inbox file in the receiving repo.
- **Curated layer (auto when meaningful):** `[DISCOVERY]` in the scouted / per-repo active phase `history.md` when a finding meets Rule 3 thresholds (real bug, real tech debt, real enhancement); `[NOTE]` in the originating phase history for dispatch syntheses; `[DECISION]` in the originating phase history for every handoff. **No new entry types** — orchestration plugs into existing `[DISCOVERY]` / `[DECISION]` / `[NOTE]`.
- **Never auto:** `backlog.md` writes. Tracking proposes; you confirm.

---

## CLI reference

```
momentum init [target] [--agent <name>] [--ecosystem <name>] [--no-ecosystem]
momentum upgrade [target] [--agent <name>]
momentum join <ecosystem-path>
momentum leave
momentum doctor
momentum ecosystem <init | add | remove | status> [...]
momentum scout <repo> "<prompt>"
momentum dispatch <r1> [r2 ...] --prompt "<text>" [--sequential]
momentum handoff <repo> [--summary "<text>"] [--decision "..."]* [--file "..."]* [--verify "..."]* [--question "..."]*
momentum continue [--handoff <id>]
```

**Notable flags:**

| Flag | Purpose |
|---|---|
| `--agent <name>` | Pick adapter: `claude-code` *(default)* / `codex` / `antigravity` |
| `--ecosystem <name>` | (on `init`) Scaffold an ecosystem sibling + register this repo |
| `--no-ecosystem` | (on `init`) Bypass post-init auto-detect prompt |

**Notable env vars:**

| Var | Default | Purpose |
|---|---|---|
| `MOMENTUM_MAX_PARENT_WALK` | `5` | Bound on parent-directory walk-up when locating an ecosystem root |

---

## Install

### npx (recommended)
```bash
npx @avinash-singh-io/momentum init
```

### Global install
```bash
npm install -g @avinash-singh-io/momentum
momentum init
```

### Bash installer (no Node required for install — Node still required for `momentum init`)
```bash
git clone https://github.com/avinash-singh-io/momentum
./momentum/install.sh ./my-project
```

### Upgrade
```bash
npx @avinash-singh-io/momentum upgrade
```

The `## Project Extensions` marker in `CLAUDE.md` is preserved byte-for-byte across upgrades. Anything you put below that line stays. Anything above is managed by momentum.

> Migrating from v0.5.x or earlier? The `--coding-agent` flag was renamed to `--agent` in v0.6.0. The old flag now exits with a rename hint.

---

## How it works (90 seconds)

1. **Specs-driven core.** Every project tracks its state in `specs/` — current phase, blockers, backlog, ADRs, planning. The agent reads `specs/status.md` first on every session (Rule 1).
2. **Rules + hooks keep it honest.** 12 always-on rules govern when to log decisions, when to commit, when to verify before claiming "done." Hooks nudge the agent in real time. Persuasion-hardened: every rule has Why / Red Flags / Anti-Rationalization counters inline so the rule survives pressure.
3. **Slash commands drive workflow.** `/start-phase`, `/complete-phase`, `/track`, `/sync-docs` — each is a markdown recipe the agent reads and executes. You stay in flow; the agent does the bookkeeping.
4. **Ecosystem mode (optional).** When you have multiple related repos, `momentum init --ecosystem` adds a thin coordination layer above them. Auto session log, cross-repo initiatives, aggregated `/track`. Strictly additive — single-project mode is unchanged.

---

## Links

- Source: https://github.com/avinash-singh-io/momentum
- npm: https://www.npmjs.com/package/@avinash-singh-io/momentum
- Issues: https://github.com/avinash-singh-io/momentum/issues
- Roadmap: [`specs/planning/roadmap.md`](./specs/planning/roadmap.md)
- Architecture: [`core/ecosystem/layout.md`](./core/ecosystem/layout.md)
- Developer guide: [`docs/developer-guide.md`](./docs/developer-guide.md)

---

## License

MIT
