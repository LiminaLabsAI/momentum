---
title: About
description: Why momentum exists, the principles behind it, and where to find the source.
---

## Why momentum exists

AI-assisted coding raised the floor on individual productivity. Anyone can
generate code now. What didn't scale was **coherent project state**:
phases that drift, decisions that disappear into chat transcripts,
backlogs that exist only in someone's head, history that lives between
two engineers' Slack DMs.

momentum is the missing layer. Specs, decisions, history, backlog — all as
first-class files your AI agent reads and writes automatically. The
*project itself* becomes durable, not just the code.

## Design principles

**Agent-agnostic.** momentum runs on Claude Code, Codex, Antigravity today
— Cursor and Gemini CLI next. Same commands, same workflow, every adapter.

**Additive ecosystem mode.** Single-project usage is the default and
sees zero overhead from ecosystem features. Reach for ecosystem mode only
when you need cross-repo coordination — and even then, every per-project
command works the same.

**No telemetry, no lock-in.** Static markdown, vanilla JS, shell scripts.
Nothing phones home. Uninstall is `rm -rf` a few directories.

**Discipline through markdown, not magic.** The rules are written in
markdown the agent reads. The history is markdown anyone can audit. Hooks
exist where physical enforcement matters (the brainstorm gate, history
reminders) but the contract is always visible.

**Spec-driven, not vibe-driven.** Every phase has a plan before
implementation. Every decision lands in history at the moment it's made.
Every release ships with a verified retrospective. The cost is one
brainstorm; the return is six-months-from-now you understanding why.

## Where to find it

- **Source**: [github.com/avinash-singh-io/momentum](https://github.com/avinash-singh-io/momentum)
- **Package**: [`@avinash-singh-io/momentum` on npm](https://www.npmjs.com/package/@avinash-singh-io/momentum)
- **License**: [MIT](https://github.com/avinash-singh-io/momentum/blob/main/LICENSE)

## A note on the name

"momentum" = movement that's already in motion. Spec-driven discipline
gives your projects that property. Each phase is a delta; the work
accumulates; the project never starts cold. The mark — a swooping arc
ending in a forward arrowhead — is that idea in one shape.

---

Built with [Astro Starlight](https://starlight.astro.build/), the
[Inter Variable](https://rsms.me/inter/) font, and a lot of opinions about
how AI-assisted coding should work.
