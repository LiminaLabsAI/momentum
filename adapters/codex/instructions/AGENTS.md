# Project Rules: <Project Name>

> Codex configuration for this momentum-managed project.
> Full condensed rules are installed at `.agent/rules/project.md`.

## Navigation

| Question | File |
|----------|------|
| Current state / what phase? | `specs/status.md` |
| What's in the backlog? | `specs/backlog/backlog.md` |
| Phase tasks/progress? | `specs/phases/phase-N-*/tasks.md` |
| Why was X chosen? | `specs/decisions/NNNN-*.md` |
| Roadmap / timeline? | `specs/planning/roadmap.md` |
| How to contribute? | `docs/developer-guide.md` |

> **First file to read: ALWAYS `specs/status.md`.**

## Momentum Recipes — Codex Skills

Each momentum recipe ships as a native Codex skill at
`.agents/skills/<name>/SKILL.md` ([Codex skills
docs](https://developers.openai.com/codex/skills)). Codex auto-discovers
skills under `.agents/skills/` at session start across CLI, IDE, and
desktop app — so when the user invokes `/brainstorm-phase`, asks "run
brainstorm-phase", or types `$brainstorm-phase`, Codex routes directly
to that skill.

The shipped recipe set (one skill per recipe, all under
`.agents/skills/`):

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
| swarm | Sustained parallel multi-project feature delivery (uses swarm-supervisor subagent) |
| momentum-orient | Read `specs/status.md` before starting any work (Rule 1) |

Each `SKILL.md` declares `name` + `description` frontmatter and includes
the full recipe body. The recipes are platform-independent — they
describe what to do, not how Codex specifically should do it. When you
read a recipe that mentions "use the Task tool" (Claude Code
terminology), translate to Codex's equivalent: spawn the relevant
`momentum-reviewer-*` subagent (see below), or use natural-language
parallel fan-out.

> Legacy installs from momentum ≤ v0.20.0 shipped recipes as Markdown
> fragments under `.codex/commands/`. `momentum upgrade --agent codex`
> regenerates skills under `.agents/skills/` and removes the old
> lookup directory.

## Codex Subagents

Momentum ships four subagents discoverable at `.codex/agents/`:

- `momentum-reviewer-security.toml` — OWASP/STRIDE-focused
- `momentum-reviewer-qa.toml` — test coverage + edge cases + regression risk
- `momentum-reviewer-architecture.toml` — rule compliance + pattern consistency
- `swarm-supervisor.toml` — Phase 18 / v0.20.4. Per-repo supervisor spawned by `/swarm start`. Drives one repo's phase to completion under a pinned cwd (see MCP cwd shim section below).

The three reviewers each declare `sandbox_mode = "read-only"` so they
cannot modify the codebase. The `review-code` recipe dispatches all
three in a single turn so Codex can fan them out in parallel (subject
to `agents.max_threads`, default 6). The swarm supervisor does not
declare a read-only sandbox — supervisors write code, that's the job.

To add a project-specific reviewer, drop another `*.toml` into
`.codex/agents/` with required keys `name`, `description`,
`developer_instructions`. Optionally set `sandbox_mode = "read-only"` if
the subagent shouldn't modify files.

## Codex Hooks

Codex hook wiring lives in `.codex/hooks.json`. Momentum installs reusable
shell scripts to `scripts/` and references them from this file:

| Event | Matcher | Script | Purpose |
|---|---|---|---|
| `PreToolUse` | `apply_patch\|Bash` | `scripts/brainstorm-gate.sh` | Blocks writes to `specs/` while a `/brainstorm-*` session is active (sentinel `.momentum/brainstorm-active`). Exits 2 to block. |
| `PostToolUse` | `apply_patch\|Bash` | `scripts/check-history-reminder.sh` | Prompts for `history.md` append when meaningful edits land during phase work — resolved to the phase bound to the current branch (fallback: `status.md`) (Rule 8). |
| `SessionStart` | (none) | `scripts/sessionstart-handoff.sh` | Auto-greets with any pending handoff banner + ecosystem context. |

> Matcher uses `Bash` (not `shell`) because that's the canonical
> `tool_name` Codex emits for shell tool calls — see the [Codex hooks
> reference](https://developers.openai.com/codex/hooks).

### Trust review

Hooks are **enabled by default** in current Codex CLI (`hooks` is `stable`
in `codex features list`). The first time momentum's hooks run in a fresh
project, Codex prompts you to review and trust them via `/hooks`. Trust is
recorded per-hash, so any change to the hook command requires re-approval.

If hooks don't appear to fire:

1. Run `/hooks` inside Codex and confirm `brainstorm-gate.sh`,
   `check-history-reminder.sh`, and `sessionstart-handoff.sh` are listed
   and marked trusted.
2. Run `codex doctor` and confirm `hooks` shows as `stable: true`.
3. Only as a last resort, force-enable in `~/.codex/config.toml`:

   ```toml
   [features]
   hooks = true
   ```

The `brainstorm-gate.sh` script resolves the project root from
`CLAUDE_PROJECT_DIR` → `MOMENTUM_PROJECT_DIR` → `pwd`, so Codex's default
cwd-as-session-root behavior works without env-var configuration.

## Codex Skills

All momentum recipes ship as Codex skills under `.agents/skills/<name>/SKILL.md`
(see the "Momentum Recipes — Codex Skills" section above for the full
shipped set). Each `SKILL.md` declares `name` + `description` frontmatter
per the [Codex skills format](https://developers.openai.com/codex/skills).

Add additional project-specific skills under
`.agents/skills/<name>/SKILL.md` following the same convention. Invoke
via the `/skills` picker or `$<skill-name>` mention.

## Swarm — Lookup Pattern

Momentum's swarm primitive — sustained parallel multi-project feature
delivery — ships on Codex as of Phase 18 / v0.20.4. The swarm recipe
lives as a Codex skill at `.agents/skills/swarm/SKILL.md`; Codex
auto-discovers and routes `/swarm <sub>` to it.

The CLI floor is `momentum swarm <sub> [args]`. The slash command and
the CLI produce the same on-disk artifacts — pick whichever fits the
moment.

| Subcommand | What it does |
|---|---|
| `start` | Plan + spawn Wave 1. Presents wave plan for approval before any spawn. |
| `status` | Render the materialized board cache. Read-only. |
| `tell` | Push a one-shot context note to one supervisor (`swarm-context.md`). |
| `broadcast` | Push context to every supervisor in the swarm. |
| `verify` | Contract verifier + manifest+brief drift check. |
| `complete` | Synthesize the cross-repo changeset and finalize the swarm. |
| `resume` | Re-attach this session to a swarm; renews owned leases. |
| `cancel` | Graceful halt; preserves all artifacts for forensics. |
| `budget` | Adjust a per-repo token budget. |
| `claim` | Multi-session ownership primitive (Phase 17.5). |
| `release` | Release ownership; idempotent. |
| `focus` | Issue a single-use focus token to hand a repo to a side session. |
| `join` | Register a second session as co-conductor; optionally consume a token. |
| `absorb` | Converge two swarms back into one (forensic-preserving). |
| `inbox` | Supervisor → conductor questions (`list` / `write` / `resolve`). |
| `preview-merge` | Dry-run `git merge --no-commit` per supervisor branch. |

**Supervisor declaration**: `.codex/agents/swarm-supervisor.toml`. Each
supervisor reads `core/swarm/supervise.md` end-to-end on boot. The
conductor (this user session) dispatches spawns through
`adapters/codex/adapter.js::spawn(directive)` — which shells
`codex --cwd <repoPath>` with the supervisor TOML.

If `codex` CLI isn't on PATH, `momentum swarm start --spawn` degrades
to dry-run: it prints the spawn directives so the user can launch
sessions manually.

## MCP cwd shim — Codex configuration

> Phase 18 / v0.20.4. Required for the swarm primitive to honor the
> per-repo cwd pin every supervisor needs.

Each supervisor must run with its `repoPath` as its working directory —
that's the hard invariant the supervise.md recipe is written against
(every "stay in repoPath, never cd out" guard in `swarm-supervisor.toml`).

Codex's CLI accepts `--cwd <path>` for each `codex` invocation, so the
conductor's spawn call honors cwd at process boundary. Inside a
supervisor session, momentum relies on Codex's MCP filesystem server to
keep file ops scoped to that cwd — which means you (the user) configure
the MCP filesystem server's `--root` to follow `$PWD`.

In `~/.codex/config.toml` add:

```toml
[mcp_servers.filesystem]
command = "npx"
args    = ["-y", "@modelcontextprotocol/server-filesystem", "${PWD}"]
```

(See [Codex MCP servers](https://developers.openai.com/codex/mcp) for
the canonical form. `${PWD}` is interpolated by Codex at server-spawn
time, so each supervisor sees its own pinned `repoPath` as the
filesystem server root.)

**Verifying the shim**: inside a supervisor session, run:

```bash
pwd
ls -la
```

You should see `repoPath` and the repo's top-level contents, not the
ecosystem root. If you see the ecosystem root, the shim isn't applied —
exit and reconfigure before launching supervisors.

**If the doc-only shim doesn't hold on your Codex version**: file a
bug against momentum and fall back to running each supervisor in a
separate terminal with `cd <repoPath> && codex …` — a manual cwd pin.
This is the documented escalation point referenced in Phase 18 G1
plan.md; if the MCP shim is widely broken, momentum will ship a
minimal `core/swarm/mcp-cwd-server.js` in a follow-up.

## Always-On Rules

Read `.agent/rules/project.md` at the start of each session and follow it
as the durable project rule source. The most important operating rules:

1. Orient first by reading `specs/status.md`.
2. Update durable tracking files after meaningful work.
3. Add discovered bugs, tech debt, and enhancements to backlog immediately.
4. Check P0/P1 bugs before starting a new phase.
5. Stop at phase boundaries and ask before completion/release.
6. Use feature branches, atomic commits, and user approval before merges.
7. Plan before non-trivial implementation.
8. Append meaningful decisions/discoveries to the `history.md` of the phase bound to your branch (fallback: `status.md`).
9. Sync docs at phase completion, not mid-phase.
10. Treat architecture specs as stable during phase work.
11. Lock evaluators before optimization loops.
12. Verify with fresh evidence before marking work complete.

## Project Extensions

> Everything below this heading is preserved across `momentum upgrade`.
> Add project-specific navigation, rules, cross-repo references, etc. here.
> Anything above this heading is managed by momentum and may be replaced on upgrade.
