## Antigravity-native layout under `.agents/`

Momentum installs every Antigravity-discoverable asset under the ONE
canonical customization root, `.agents/`, at the project root (ADR-0005;
Antigravity accepts four root spellings, and `.agents/` is the one all
vendor examples and reference docs use):

| Path | Purpose |
|---|---|
| `.agents/workflows/` | Step-by-step workflow recipes — each `<name>.md` auto-registers as `/<name>` slash command. Includes all momentum phase + orchestration commands. |
| `.agents/engines/` | Execution engines (subagent dispatch playbook). |
| `.agents/skills/` | On-demand persona/capability skills — each `<name>/SKILL.md` is discovered by name+description and loads on activation. Momentum ships `momentum-orient` + three reviewers + `swarm-supervisor`. |
| `.agents/hooks.json` | Lifecycle hooks (five events: PreToolUse, PostToolUse, PreInvocation, PostInvocation, Stop). |

## Workflows = momentum recipes (native slash commands)

When the user types `/<name>` (e.g. `/brainstorm-phase`, `/start-phase`,
`/sync-docs`, `/complete-phase`, `/dispatch`, `/handoff`, `/continue`,
`/review-code`), `agy` reads the matching workflow file from
`.agents/workflows/<name>.md` and follows its numbered steps.

Workflows ship in two layers:

1. **Core workflows** — momentum's cross-adapter phase + ecosystem commands. Installed from `core/commands/*.md` to `.agentss/workflows/*.md`. Examples: `brainstorm-phase`, `start-phase`, `sync-docs`, `complete-phase`, `track`, `validate`, `ecosystem`, `initiative`, `session`, `systematic-debug`.
2. **Antigravity-specific workflows** — orchestration primitives with native parallel subagent fan-out. Installed from `adapters/antigravity/workflows/*.md`. Examples: `scout`, `dispatch`, `handoff`, `continue`, `review-code`.

To add a project-specific workflow, drop a Markdown file into
`.agents/workflows/<name>.md` with YAML frontmatter:

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
workflow lives at `.agents/workflows/swarm.md`; `agy` auto-registers it
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

Antigravity hook wiring lives in `.agents/hooks.json` (named-group schema,
five lifecycle events — there is NO SessionStart event on Antigravity).
Hook commands run with CWD = `.agents/`, so momentum wires them through the
boundary shim `scripts/antigravity-hook-adapter.sh` (ADR-0005), which
translates Antigravity's camelCase payloads and response contract and
delegates to the same shared scripts every adapter uses:

| Named hook | Event | Matcher | Behavior |
|---|---|---|---|
| `momentum-brainstorm-gate` | `PreToolUse` | `write_to_file\|run_command\|.*write.*\|.*edit.*\|.*replace.*` | Blocks writes to `specs/` while a `/brainstorm-*` session is active (sentinel `.momentum/brainstorm-active`) — responds `{"decision":"deny","reason":…}`. |
| `momentum-history-reminder` | `PostToolUse` | same write-family matcher | Runs `check-history-reminder.sh`; reminders are QUEUED (PostToolUse has no message channel) and injected on the next model invocation (Rule 8). |
| `momentum-session-context` | `PreInvocation` | (flat — no matcher) | At `invocationNum 0`, runs `sessionstart-handoff.sh` and injects the pending-handoff banner + ecosystem context as an `ephemeralMessage`; every invocation also drains queued reminders. |

### Session-start fallback

Injection depends on the vendor hook runner. The handoff pickup hint also
lives in this AGENTS.md primary-instruction text as a belt-and-braces
fallback: if a `.momentum/inbox/handoff-NNN.md` file exists at session
start, read it and acknowledge before continuing.
