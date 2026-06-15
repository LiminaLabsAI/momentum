# Project Rules: <Project Name>

> Antigravity configuration for this momentum-managed project.
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

## Antigravity-native layout under `.agent/` and `.agents/`

Momentum installs Antigravity-discoverable assets under two directories
at the project root (this matches the documented `agy` CLI layout — note
that `.agent/` (singular) hosts workflows and rules; `.agents/` (plural)
hosts skills and hooks):

| Path | Purpose |
|---|---|
| `.agent/workflows/` | Step-by-step workflow recipes — each `<name>.md` auto-registers as `/<name>` slash command in `agy`. Includes all momentum phase + orchestration commands. |
| `.agent/rules/` | Always-on rules (Rule 1 through Rule 12) — auto-loaded by `agy`. |
| `.agent/engines/` | Execution engines (subagent dispatch playbook). |
| `.agents/skills/` | On-demand persona/capability skills — each `<name>/SKILL.md` loads when invoked. Momentum ships `momentum-orient` + three reviewer skills. |
| `.agents/hooks.json` | Pre/Post tool event hooks + SessionStart. |

## Workflows = momentum recipes (native slash commands)

When the user types `/<name>` (e.g. `/brainstorm-phase`, `/start-phase`,
`/sync-docs`, `/complete-phase`, `/dispatch`, `/handoff`, `/continue`,
`/review-code`), `agy` reads the matching workflow file from
`.agent/workflows/<name>.md` and follows its numbered steps.

Workflows ship in two layers:

1. **Core workflows** — momentum's cross-adapter phase + ecosystem commands. Installed from `core/commands/*.md` to `.agent/workflows/*.md`. Examples: `brainstorm-phase`, `start-phase`, `sync-docs`, `complete-phase`, `track`, `validate`, `ecosystem`, `initiative`, `session`, `systematic-debug`.
2. **Antigravity-specific workflows** — orchestration primitives with native parallel subagent fan-out. Installed from `adapters/antigravity/workflows/*.md`. Examples: `scout`, `dispatch`, `handoff`, `continue`, `review-code`.

To add a project-specific workflow, drop a Markdown file into
`.agent/workflows/<name>.md` with YAML frontmatter:

```markdown
---
description: One-line summary used for auto-detection
---

### 1. First step
...

### 2. Second step
...
```

Max 12,000 characters per workflow file. Use `// run workflow: <name>`
to compose workflows.

## Skills = personas the agent loads to BECOME

Momentum installs five skills at `.agents/skills/`:

- **`momentum-orient`** — Read `specs/status.md` first. Codifies Rule 1.
- **`momentum-reviewer-security`** — OWASP/STRIDE security review persona.
- **`momentum-reviewer-qa`** — Test coverage / edge cases / regression risk.
- **`momentum-reviewer-architecture`** — Rule compliance / pattern consistency.
- **`swarm-supervisor`** — Phase 18 / v0.20.4. Per-repo supervisor persona spawned by `/swarm start`. Drives one repo's phase to completion under a pinned cwd. See `## Swarm — Lookup Pattern` below.

The three reviewer skills are loaded by the `/review-code` workflow,
which dispatches them in parallel via Antigravity's native subagent
fan-out, then consolidates findings. The swarm-supervisor skill is
loaded by each Wave-N supervisor on spawn; it is not invoked directly
by the user.

Add project-specific skills under `.agents/skills/<name>/SKILL.md` with
YAML frontmatter (`name`, `description`).

## Swarm — Lookup Pattern

> Phase 18 / v0.20.4 — Antigravity parity of the Phase 17 + 17.5
> swarm primitive.

Momentum's swarm primitive — sustained parallel multi-project feature
delivery — ships on Antigravity as of v0.20.4. The user-facing
workflow lives at `.agent/workflows/swarm.md`; `agy` auto-registers it
as `/swarm`. The per-repo supervisor persona lives at
`.agents/skills/swarm-supervisor/SKILL.md`.

The CLI floor is `momentum swarm <sub> [args]`. The slash command and
the CLI produce the same on-disk artifacts.

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

**Spawn dispatch**: the conductor (this user session) dispatches spawns
through `adapters/antigravity/adapter.js::spawn(directive)` — which
shells `agy` with the supervisor skill as the persona and the
directive's `repoPath` as the cwd. Each supervisor BECOMES the
`swarm-supervisor` skill on boot.

**`agy` not on PATH**: `momentum swarm start --spawn` degrades to
dry-run and prints spawn directives the user can launch manually.

## Antigravity Native Artifacts Integration

When in planning mode or executing a phase, keep Antigravity's native artifacts in sync with momentum's spec files:

- **Durable Checklist**: Map `specs/phases/phase-N-*/tasks.md` directly into your native `task.md` artifact. Update both simultaneously as work proceeds.
- **Implementation Alignment**: Ensure that the `implementation_plan.md` artifact mirrors the scope and groups declared in `specs/phases/phase-N-*/plan.md`.
- **Walkthrough Evidence**: Append the verification evidence gathered for `/complete-phase` into your native `walkthrough.md` artifact.

## Hooks

Antigravity hook wiring lives in `.agents/hooks.json`. Momentum installs
reusable shell scripts to `scripts/` and references them:

| Event | Matcher | Script | Purpose |
|---|---|---|---|
| `PreToolUse` | `run_command\|view_file\|.*write.*\|apply_patch` | `scripts/brainstorm-gate.sh` | Blocks writes to `specs/` while a `/brainstorm-*` session is active (sentinel `.momentum/brainstorm-active`). Exits 2 to block. |
| `PostToolUse` | `run_command\|apply_patch\|.*write.*` | `scripts/check-history-reminder.sh` | Prompts for `history.md` append when meaningful edits land during an active phase (Rule 8). |
| `SessionStart` | (none) | `scripts/sessionstart-handoff.sh` | When `agy` fires SessionStart, auto-greets with any pending handoff banner + ecosystem context. (SessionStart vendor support pending VAL-002.) |

### SessionStart fallback

If `agy`'s SessionStart event isn't yet supported, the handoff pickup
hint also lives in this AGENTS.md primary-instruction text below: if a
`.momentum/inbox/handoff-NNN.md` file exists at session start, read it
and acknowledge before continuing.

## Always-On Rules

Read `.agent/rules/project.md` at the start of each session and follow
it as the durable project rule source. The most important operating
rules:

1. Orient first by reading `specs/status.md`.
2. Update durable tracking files after meaningful work.
3. Add discovered bugs, tech debt, and enhancements to backlog immediately.
4. Check P0/P1 bugs before starting a new phase.
5. Stop at phase boundaries and ask before completion/release.
6. Use feature branches, atomic commits, and user approval before merges.
7. Plan before non-trivial implementation.
8. Append meaningful decisions/discoveries to active phase `history.md`.
9. Sync docs at phase completion, not mid-phase.
10. Treat architecture specs as stable during phase work.
11. Lock evaluators before optimization loops.
12. Verify with fresh evidence before marking work complete.

## Project Extensions

> Everything below this heading is preserved across `momentum upgrade`.
> Add project-specific navigation, rules, cross-repo references, etc. here.
> Anything above this heading is managed by momentum and may be replaced on upgrade.
