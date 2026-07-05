---
title: FAQ
description: Common questions about installing, using, comparing, and contributing to momentum.
---

## Why momentum vs. a plain `CLAUDE.md`?

A plain `CLAUDE.md` tells your agent how you want it to behave. momentum
gives the *project itself* a structured workflow: phases with explicit
plans, a backlog with priorities, an append-only history of decisions,
hooks that enforce the discipline, and orchestration primitives for
working across multiple repos.

The instruction file is one piece; the rest is what keeps state coherent
across sessions, branches, and team members. You can think of `CLAUDE.md`
as the agent's prompt; momentum is the project's *state layer*.

## How does this compare to Cursor / Copilot rules?

Cursor's `.cursor/rules/*.mdc` files and GitHub Copilot's
`.github/copilot-instructions.md` are **per-IDE instruction files**.
They tell the agent how to write code in your project. They don't give the
project itself a workflow.

momentum is a layer above: it adds phases, backlog, history, ADRs,
ecosystem mode, and orchestration. Its rules instruction is loaded into the
same instruction-file slot — `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/`,
`GEMINI.md`, depending on adapter — so it composes with whatever the IDE
already provides rather than competing.

## Can I use momentum for non-coding agents (DevOps, research, data)?

Yes. The discipline is domain-agnostic — phases, decisions, history,
backlog, doc sync, git lifecycle, verify-before-claim apply to any agentic
AI work, not just code generation. The slash commands (`/start-phase`,
`/complete-phase`, etc.) drive the workflow regardless of what the agent
is actually shipping. The default scaffolding leans coding-flavored
because that's the most-developed concrete example today (CI hooks, npm
release helpers, `/review-code`), but the core primitives don't care.

Concrete examples worth pointing at:

- **Infrastructure / DevOps agents** — plan a Terraform refactor as a
  phase; record the `apply` runs as history entries; tag releases
  per-environment.
- **Research agents** — phases = experiments; history = "we tried X with
  results Y" decisions; backlog = follow-up questions to chase.
- **Data-pipeline agents** — phases = schema migrations / pipeline
  refactors; history = "we picked Avro over JSON because Z" decisions.

You can disable / replace the coding-specific helpers (e.g. `/review-code`)
under `## Project Extensions` in `CLAUDE.md` if they don't apply to your
domain. The 13 rules + 5 lifecycle primitives stay.

## Is momentum locked to a specific AI agent?

No. momentum is agent-agnostic. It ships adapters for Claude Code, Codex,
and Antigravity today; Cursor and Gemini CLI land in Phase 15. The
specs, rules, and commands are the same across adapters — what changes is
the instruction-file location and how hooks attach.

You can switch adapters on the same project (`momentum upgrade --agent
codex` after starting with Claude Code) and the per-project state survives.

## Does it work offline?

Yes. After install, momentum is a folder of markdown, JS, and shell
scripts. There are no API calls, no telemetry, and no required network
access. Your agent might use a remote model, but momentum itself doesn't.

## Does momentum send any data anywhere?

No. There is no telemetry, no analytics, no phone-home. The source is
[on GitHub](https://github.com/avinash-singh-io/momentum) — read the
`bin/`, `core/`, and `adapters/` directories. The install scripts and the
runtime are static; nothing connects to external services.

The only network call momentum itself makes is a background version check
(to tell you when a newer CLI is published). `momentum upgrade` does **not**
fetch from the registry — it copies the template files bundled in the CLI you
already have installed. Updating the CLI (`npm install`) and publishing from
`/complete-phase` are the only registry interactions, and both are things you
run yourself.

## How do I upgrade an existing project?

Upgrading is **two steps** — update the CLI, then re-sync the files:

```bash
npm install -g @avinash-singh-io/momentum@latest   # 1. update the CLI itself
momentum upgrade                                    # 2. re-sync this project's files
```

Why two steps? `momentum upgrade` copies files from the *installed* CLI, not
from npm — so your project files can only ever be as new as the CLI. If you
skip step 1, step 2 faithfully re-installs the same old files. (If you use
`npx`, always pin `@latest` — `npx @avinash-singh-io/momentum@latest …` —
because a bare `npx` invocation serves a cached version. `momentum upgrade`
also warns you when your installed CLI is behind the published latest.)

`momentum upgrade` is **safe and marker-aware**:

- Anything under `## Project Extensions` in your `CLAUDE.md` / `AGENTS.md` is
  preserved verbatim; only the managed section above it is replaced.
- Changed files are backed up to `.bak` before being overwritten.
- Files a newer version no longer ships are removed (also `.bak`-backed) — your
  own files are never touched.
- Preview everything first with `momentum upgrade --dry-run` (writes nothing).

For a whole multi-repo ecosystem, run `momentum ecosystem upgrade` to sweep
every member in one pass.

## How do I uninstall?

For a single project:

```bash
rm -rf specs/ .agent/ .claude/ .codex/ CLAUDE.md AGENTS.md scripts/
```

For ecosystem mode, `momentum leave` removes the pointer block from your
project's instruction file and de-registers the project from
`ecosystem.json`. The ecosystem repo itself is untouched.

## Can I use it in a monorepo?

Yes — momentum doesn't care about your repo topology. Run `momentum init`
at the workspace root and the whole monorepo gets the structure. For more
sophisticated multi-package coordination, ecosystem mode (with each
package as a member) is a better fit.

The choice between "monorepo with momentum at the root" and "ecosystem of
sibling repos" comes down to: does each package have its own release
cycle? If yes, ecosystem mode. If no, monorepo + single momentum at root.

## Can the agent skip the discipline if I tell it to?

The hooks make it harder. The brainstorm-gate PreToolUse hook on Claude
Code physically blocks Write/Edit on `specs/` paths when the sentinel
exists — the agent **cannot** write phase files mid-brainstorm even if
instructed to. That's the point of physical enforcement vs markdown
contract.

For projects on Antigravity (no hook surface today), the discipline is
trust-based. You can tell the agent to skip and it will. The recommendation
there is: don't, because the failure modes Rule 2/6/7/8/12 prevent are
exactly the ones that compound silently.

If you want to genuinely disable a rule per-project, edit
`.agent/rules/project.md` under `## Project Extensions` and document the
exception. The upgrade preserves the extension.

## What happens if `/complete-phase` is interrupted?

`/complete-phase` is designed to be safely re-runnable. If interrupted
mid-flight (network blip, accidental Ctrl-C), running it again picks up
where it left off: verification reruns from scratch, but bookkeeping
(retrospective.md, status.md, version bump) is idempotent. The PR + tag +
npm publish steps each have their own "already done?" check.

The one thing to watch: if `npm publish` succeeded but the tag didn't get
pushed, you'll have a version on npm without a matching git tag. Fix:
push the tag manually (`git push origin vX.Y.Z`).

## Can I write my own commands / skills?

Yes. Skills are plain markdown files in `core/commands/` (for cross-adapter)
or `adapters/<agent>/commands/` (for agent-specific). Each file has a
short header explaining when to use it, then the body describing the steps
the agent should follow.

`momentum upgrade` doesn't touch files that don't ship with the package
template — your custom skills are preserved. A dedicated `/specify` +
skill-authoring command is on the roadmap for Phase 16.

## Is this an MCP server?

Not yet. An MCP server is on the Phase 16 (Platform) roadmap — that would
expose momentum's primitives as MCP tools so agents that speak MCP can
invoke them without needing a slash-command surface. Until then, momentum
ships as adapters per agent (opencode, Claude Code, Codex, Antigravity, Cursor,
Gemini CLI).

## Does momentum work with private GitHub repos?

Yes. The only network operation that touches GitHub is the optional
`gh pr create` / `gh pr merge` steps in Rule 6 and `/complete-phase` —
those use your local GitHub CLI auth, which works the same way against
private repos as public.

The npm publish step (for npm-package projects) goes to the npm registry,
not GitHub.

## Where do I report bugs?

[GitHub Issues](https://github.com/avinash-singh-io/momentum/issues).
Please include your `momentum --version`, the agent you're using, and a
minimal reproduction. Bugs filed with momentum's own backlog conventions
(priority, status, context block) are appreciated but not required.

## How do I contribute?

momentum is open source. The repo is at
[github.com/avinash-singh-io/momentum](https://github.com/avinash-singh-io/momentum).

Issues, discussions, and PRs welcome. The project itself uses momentum,
so contributing means following the same workflow you'd use in your own
projects — phases, history entries, conventional commits, and
`/complete-phase` before release.

For first-time contributors: open an issue first to discuss scope before
landing a PR. The phase model means contributions are easier to land when
they slot into the current phase's plan, or into a clearly-scoped chore
branch outside the active phase.

## What's the license?

MIT. See [LICENSE](https://github.com/avinash-singh-io/momentum/blob/main/LICENSE).
