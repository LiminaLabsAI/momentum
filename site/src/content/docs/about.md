---
title: About
description: Why momentum exists, the design principles behind it, the name's origin, and where to find the source.
---

## Why momentum exists

Agentic AI raised the floor on individual productivity. Anyone can spawn an
agent to write code, manage infrastructure, run research, or operate a
data pipeline now. What didn't scale was **coherent project state**:
phases that drift, decisions that disappear into chat transcripts,
backlogs that exist only in someone's head, history that lives between
two engineers' Slack DMs.

momentum is the missing layer. Specs, decisions, history, backlog — all as
first-class files your agent reads and writes automatically. The
*project itself* becomes durable, not just whatever the agent shipped
this session.

The thesis is narrow: **state that outlives any single session**. Every
primitive (phases, backlog, history, ADRs, ecosystem mode, orchestration)
exists to honor that thesis. The discipline (the 13 rules) exists to
enforce it.

## Design principles

Five principles, locked at Phase 12 and refined at Phase 13:

### 1. Agent-agnostic

momentum runs on opencode, Claude Code, Codex, Antigravity today — Cursor and Gemini
CLI next. Same commands, same workflow, every adapter. The adapter
contract handles per-agent wiring (where instruction files live, how
hooks attach, which command surface to use). The shared `specs/`,
`.agent/rules/`, and `core/commands/` are agent-independent.

This isn't just for portability — it's so a team using mixed agents
doesn't have to choose. CLAUDE.md and AGENTS.md can coexist in the same
project, both referencing the same rules and the same state.

### 2. Additive ecosystem mode

Single-project usage is the default and sees zero overhead from ecosystem
features. Reach for ecosystem mode only when you genuinely have related
projects that need to coordinate — and even then, every per-project
command works the same. The ecosystem layer is **additive, never
replacing**.

The hard invariant: a project running `momentum init` (no `--ecosystem`)
sees zero difference from before ecosystem mode existed. The CLI is the
same. The slash commands are the same. The hooks are the same. Nothing
about the ecosystem layer leaks into single-project usage.

### 3. No telemetry, no lock-in

Static markdown, vanilla JS, shell scripts. Nothing phones home. Uninstall
is `rm -rf` a few directories.

The CLI is zero-dependency at the npm level — no `commander`, no `chalk`,
no `inquirer`. Built on Node's stdlib. Every external dependency is a
visible, audited choice (currently: zero runtime deps; npm pack ships only
markdown + JS).

### 4. Discipline through markdown, not magic

The rules are written in markdown the agent reads. The history is markdown
anyone can audit. Hooks exist where physical enforcement matters (the
brainstorm gate, history reminders, SessionStart handoff greet) but the
contract is always visible.

When something goes wrong, the failure mode is debuggable: the markdown is
right there. There's no opaque state machine, no encoded protocol, no
"trust us" runtime. The agent's behavior is predictable because the rules
it follows are written down in a place you can read.

### 5. Spec-driven, not vibe-driven

Every phase has a plan before implementation. Every decision lands in
history at the moment it's made. Every release ships with a verified
retrospective. The cost is one brainstorm; the return is six-months-from-now
you understanding why.

"Vibe coding" is fine for prototypes; it falls apart when projects need to
survive the engineer who started them. momentum's discipline is the
opposite: every choice is logged, every phase is scoped, every release has
receipts. The cost is real (a brainstorm step, a history entry, a
verification rerun) — and so is the payoff (auditable state across months
of work).

## Where to find it

- **Source**: [github.com/LiminaLabsAI/momentum](https://github.com/LiminaLabsAI/momentum)
- **Package**: [`@limina-labs/momentum` on npm](https://www.npmjs.com/package/@limina-labs/momentum)
- **License**: [MIT](https://github.com/LiminaLabsAI/momentum/blob/main/LICENSE)
- **Issues**: [GitHub Issues](https://github.com/LiminaLabsAI/momentum/issues)

## A note on the name

"momentum" = movement that's already in motion. Spec-driven discipline
gives your projects that property. Each phase is a delta; the work
accumulates; the project never starts cold.

The mark — a forward chevron (»), the fast-forward glyph — is that idea in
one shape: the eye is already moving right. Acceleration that's been
earned, not assumed, set in a cobalt tile.

The wordmark pairs it with the Geist typeface; the chevron alone works as
the favicon.

## A note on positioning

momentum is **spec-driven development for agentic AI**. The category is
deliberate: not "an AI coding tool," not "a project template," not "a CLI."
What's new about agentic AI is that the agent acts; what's old is that
acts without context disappear into noise.

Spec-driven development gives the agent context that outlives any single
session. The agent reads `status.md` at session start (Rule 1). The agent
records why it chose path A over path B (Rule 8). The agent verifies before
claiming done (Rule 12). The agent doesn't pollute curated docs with
orchestration noise (Rule 9). The agent works across projects when the task
genuinely spans them, and not when it doesn't (orchestration primitives).

The discipline is the differentiator. The toolkit is the implementation.
The positioning is the umbrella that lets every distinct feature
(single-project workflow, ecosystem mode, orchestration, autonomous
rules, slash commands, multi-IDE support) tell one coherent story.

## What's next

The public roadmap lives in [`specs/planning/roadmap.md`](https://github.com/LiminaLabsAI/momentum/blob/main/specs/planning/roadmap.md).
Near-term phases:

| Phase | Theme |
|---|---|
| **15** | Reach — Cursor + Gemini CLI adapters; distribution decision |
| **16** | Intelligence — self-learning hooks; retrospective-driven rule evolution; self-healing |
| **17** | Platform — MCP server; `/specify` auto-spec; `/decide` ADR creation; skill authoring; ecosystem Tier 2 |

The build is incremental on purpose. Every phase ships a release; every
release is a coherent story; every story builds on what shipped before.
Momentum, applied to the toolkit's own development.

---

Built with [Astro](https://astro.build/), the
[Geist](https://vercel.com/font) typeface, and the conviction that
the project's state matters as much as its code.
