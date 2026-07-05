## Momentum Recipes — opencode Commands

Every momentum recipe ships as a native opencode command at
`.opencode/commands/<name>.md` ([opencode commands
docs](https://opencode.ai/docs/commands/)). opencode auto-discovers them
at startup — type `/` in the TUI and the full recipe set appears; e.g.
`/brainstorm-phase` runs the phase-planning recipe. Arguments flow via
`$ARGUMENTS` (e.g. `/track BUG some description`).

The shipped recipe set (one command per recipe):

| Recipe | What it does |
|---|---|
| brainstorm-idea | Explore an idea before scaffolding anything |
| brainstorm-phase | Plan the next implementation phase (gate-protected) |
| start-project | Scaffold a new spec-driven project |
| start-phase | Begin a planned phase (autonomous execution contract) |
| complete-phase | Verify, retro, release a finished phase |
| sync-docs | Propagate history entries to other spec docs |
| track | Track a backlog item (bug / feature / tech debt / enhancement) |
| review | Review and groom the backlog between phases |
| log | Append a manual narrative entry to the history of the phase bound to your branch (fallback: status.md) |
| hotfix | Ship a bounded ad-hoc change (quick-task / spike) without a phase |
| lanes | Work with lanes — concurrent workstreams in one repo (Rule 15) |
| migrate | Onboard an existing project into momentum |
| validate | Check spec structure health |
| ecosystem | Cross-repo ecosystem coordination |
| initiative | Manage cross-repo initiatives |
| session | Append a manual narrative entry to today's ecosystem session log |
| systematic-debug | Systematically isolate, reproduce, and resolve task execution failures |
| scout | Read-only context fetch from one ecosystem member repo |
| dispatch | Parallel multi-repo fan-out + synthesis |
| handoff | Cross-session control transfer with structured context block |
| continue | Pick up a pending handoff in this repo |
| review-code | Multi-perspective code review (uses momentum-reviewer-* subagents) |
| swarm | Sustained parallel multi-project feature delivery (uses the swarm-supervisor agent) |

The recipes are platform-independent — they describe what to do, not how
opencode specifically should do it. When a recipe mentions "use the Task
tool" (Claude Code terminology), use opencode's task tool: invoke the
relevant subagent (`@momentum-reviewer-qa` mention or automatic task
dispatch).

## Momentum Skills

Momentum also ships skills at `.opencode/skills/<name>/SKILL.md`
([opencode skills docs](https://opencode.ai/docs/skills/)). opencode
discovers them natively and exposes them through the `skill` tool — the
agent loads a skill on demand when its description matches the work.
Skills complement commands: commands are user-invoked (`/name`), skills
are agent-invoked (momentum-orient runs Rule 1 orientation without you
asking).

Add project-specific skills under `.opencode/skills/<name>/SKILL.md`
with `name` + `description` frontmatter (name must match
`^[a-z0-9]+(-[a-z0-9]+)*$`).

## Momentum Plugin — enforcement hooks

Momentum's enforcement layer ships as one plugin at
`.opencode/plugins/momentum.js` ([opencode plugins
docs](https://opencode.ai/docs/plugins/)), auto-loaded at startup:

| Hook | Purpose |
|---|---|
| `tool.execute.before` | Brainstorm gate — blocks write-class tools targeting `specs/**` while `.momentum/brainstorm-active` exists (throws to block, mirroring the Claude Code PreToolUse gate). |
| `tool.execute.after` | History reminder — prompts for a `history.md` append when meaningful edits land during phase work (Rule 8). |
| `session.created` | Handoff banner — surfaces pending `.momentum/inbox/` handoffs at session start. |

The plugin is self-contained (no npm dependencies) and reads the same
`.momentum/` sentinels as the other adapters' hook scripts — the
enforcement semantics are identical across platforms.

## Momentum Subagents

Momentum ships four agents at `.opencode/agents/` ([opencode agents
docs](https://opencode.ai/docs/agents/)):

- `momentum-reviewer-security.md` — OWASP/STRIDE-focused
- `momentum-reviewer-qa.md` — test coverage + edge cases + regression risk
- `momentum-reviewer-architecture.md` — rule compliance + pattern consistency
- `swarm-supervisor.md` — per-repo supervisor spawned by `/swarm start`

The three reviewers declare `mode: subagent` with `permission: edit: deny`
— they cannot modify the codebase. The `review-code` recipe dispatches
all three in one turn so opencode can fan them out via the task tool.
The swarm supervisor is not read-only — supervisors write code, that's
the job.

To add a project-specific reviewer, drop another `<name>.md` into
`.opencode/agents/` with `description` + `mode: subagent` frontmatter.

## Swarm — Lookup Pattern

Momentum's swarm primitive ships on opencode. The swarm recipe lives at
`.opencode/commands/swarm.md` (`/swarm <sub>`); the CLI floor is
`momentum swarm <sub> [args]` — both produce the same on-disk artifacts.

**Supervisor spawn**: the conductor dispatches spawns through
`adapters/opencode/adapter.js::spawn(directive)`, which shells

```bash
opencode run --dir <repoPath> --agent swarm-supervisor "<boot directive>"
```

`--dir` pins each supervisor's working directory to its repo — no MCP
cwd shim needed (unlike Codex). If `opencode` isn't on PATH,
`momentum swarm start --spawn` degrades to dry-run and prints the spawn
directives for manual launch.

## Instruction precedence note

opencode reads `AGENTS.md` (this file) as its primary project
instruction, with `CLAUDE.md` as a compatibility fallback — when both
exist (e.g. a project installed for multiple agents), `AGENTS.md` wins
and nothing is read twice. opencode also discovers Claude-compatible
skill paths (`.claude/skills/`, `.agents/skills/`); momentum's opencode
surfaces live under `.opencode/` so multi-adapter installs stay
side-by-side without collisions.
