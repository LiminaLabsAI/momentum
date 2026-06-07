---
title: FAQ
description: Common questions about installing, using, and contributing to momentum.
---

## Why momentum vs. a plain `CLAUDE.md`?

A plain `CLAUDE.md` tells your agent how you want it to behave. momentum
gives the *project itself* a structured workflow: phases with explicit
plans, a backlog with priorities, an append-only history of decisions,
and hooks that enforce the discipline. The instruction file is one piece;
the rest is what keeps state coherent across sessions, branches, and team
members.

## Is momentum locked to a specific AI agent?

No. momentum is agent-agnostic. It ships adapters for Claude Code, Codex,
and Antigravity today; Cursor and Gemini CLI are landing in Phase 13. The
specs, rules, and commands are the same across adapters — what changes is
the instruction-file location and how hooks attach.

## Does it work offline?

Yes. After install, momentum is a folder of markdown, JS, and shell
scripts. There are no API calls and no telemetry. Your agent might use a
remote model, but momentum itself doesn't.

## Does momentum send any data anywhere?

No. There is no telemetry, no analytics, no phone-home. Read
[`package.json`](https://github.com/avinash-singh-io/momentum/blob/main/package.json)
and the install scripts — momentum is a static template plus a thin Node
CLI.

## How do I upgrade an existing project?

```bash
npm install -g @avinash-singh-io/momentum   # or use npx
momentum upgrade
```

`momentum upgrade` is **marker-aware**: anything under `## Project
Extensions` in your `CLAUDE.md` / `AGENTS.md` is preserved across the
upgrade. Default commands and rules update from the published templates.

## How do I uninstall?

For a single project:

```bash
rm -rf specs/ .agent/ .claude/ .codex/ CLAUDE.md AGENTS.md scripts/
```

For ecosystem mode, `momentum leave` removes the pointer block from your
project's instruction file.

## Can I use it in a monorepo?

Yes — momentum doesn't care about your repo topology. Run `momentum init`
at the workspace root and the whole monorepo gets the structure. For more
sophisticated multi-package coordination, ecosystem mode (with each
package as a member) is a better fit.

## What's the license?

MIT. See [LICENSE](https://github.com/avinash-singh-io/momentum/blob/main/LICENSE).

## How do I contribute?

momentum is open source. The repo is at
[github.com/avinash-singh-io/momentum](https://github.com/avinash-singh-io/momentum).

Issues, discussions, and PRs welcome. The project itself uses momentum,
so contributing means following the same workflow you'd use in your own
projects — phases, history entries, conventional commits, and `/complete-phase`
before release.

## Where do I report bugs?

[GitHub Issues](https://github.com/avinash-singh-io/momentum/issues).
Please include your `momentum --version`, the agent you're using, and a
minimal reproduction.
