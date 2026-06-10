# Adapter Capability Matrix

> Single source of truth for what each shipped adapter declares it can
> do. Generated from the `capabilities` block on each adapter's
> `adapter.js`. Audited automatically by
> `tests/adapter-capabilities-declared.test.js`.
>
> **Phase 16 refresh** (2026-06-11): adapter contract `destinations`
> extended with `agents` + `skills`. Capability declarations re-audited
> against current vendor docs (Codex hooks/subagents/skills, Antigravity
> `.agents/` layout). Some Phase 11 roadmap entries are obsolete pending
> Group 4 live evidence — see `core/adapter-parity-matrix.md` for the
> per-feature shipping status that complements this matrix.
>
> Phase 11 (v0.14.0) unified the declared shape: every capability is
> a **uniform boolean**. "Future-planned" or caveated notes live in
> the adapter's separate `roadmap` block — they no longer pollute the
> capability values. The orchestration library's
> `core/orchestration/capability-routing.js` reads this matrix to
> decide which primitives run in parallel vs sequential per adapter.

## How to read this matrix

A capability cell is one of:
- ✅ — declared `true`
- ❌ — declared `false`

Footnotes (¹, ², …) link to roadmap entries when the declaration has
forward-looking context (e.g., "planned for a future Codex feature
drop"). The boolean itself reflects today's truth — never aspirational
behaviour.

If you add a new adapter, fill in **every** column. The audit test
asserts every adapter declares the full capability surface that
orchestration code depends on.

## Matrix (as of 2026-06-11, post-Phase-16 Group 0)

| Capability | Claude Code | Codex | Antigravity |
|---|---|---|---|
| `hooks` | ✅ | ✅ | ✅ |
| `slashCommands` | ✅ | ✅ | ❌¹ |
| `subagents` | ✅ | ✅ | ✅ |
| `parallelSubagents` | ✅ | ❌² | ✅ |
| `sessionStartHook` | ✅ | ✅ | ❌³ |
| `skills` | ❌ | ❌⁴ | ❌ |
| `browser` | ❌ | ❌⁵ | ❌ |
| `computerUse` | ❌ | ❌⁵ | ❌ |
| `artifacts` (adapter-specific) | — | — | ✅ |
| `planningMode` (adapter-specific) | — | — | ✅ |

### Roadmap footnotes

1. **Antigravity `slashCommands: false`** — `agy` ships rich built-in
   slash commands (`/tasks`, `/skills`, `/artifacts`, `/resume`, etc.)
   but custom per-project slash commands are not a documented surface
   today. Orchestration primitives reach Antigravity users via
   natural-language inference (the main agent picks the primitive from
   the user's prose) plus the `momentum` CLI floor that works on every
   adapter. If `agy` ships custom-slash-command support, flip the
   boolean and remove this note.
2. **Codex `parallelSubagents`** — per [Codex subagent docs](https://developers.openai.com/codex/subagents)
   Codex supports parallel fan-out (default `agents.max_threads = 6`,
   `agents.max_depth = 1`). Phase 16 Group 4 will exercise a 3-target
   dispatch end-to-end against a real `codex` CLI; the boolean flips
   to `true` on that evidence and this note disappears (Phase 16 Group 5.1).
3. **Antigravity `sessionStartHook: false`** — Antigravity adapter ships
   a `hooks.json` (Phase 16 Group 2) but the SessionStart event surface
   for `agy` is not yet confirmed in current vendor docs. The handoff
   inbox pickup hint surfaces via primary-instruction text in
   `AGENTS.md` instead. `/continue` and `momentum continue` still work;
   the user just doesn't get an automatic banner.
4. **Codex `skills`** — per [Codex Agent Skills docs](https://developers.openai.com/codex/skills)
   Codex now discovers `SKILL.md`-based skills from `.agents/skills/`
   (repo) and `~/.agents/skills/` (user) plus built-ins. Boolean stays
   `false` until Phase 16 Group 4 confirms the discovery flow end-to-end
   against a real `codex` CLI; Group 5.2 flips it on that evidence.
5. **Codex `browser` / `computerUse`** — declared `false` today; not
   currently a documented public surface in the Codex CLI. Revisit when
   future Codex releases ship those features.

## Adapter contract — `destinations` (Phase 16 extension)

The contract supports six overlay categories. Every adapter must declare
all six (use empty arrays / non-existent overlay paths when the surface
doesn't apply — the CLI silently skips missing source dirs).

| Subdir | Purpose | Sample path (Codex) |
|---|---|---|
| `commands` | Slash command recipes | `.codex/commands/` |
| `agent-rules` | Project rules / always-on guidance | `.agent/rules/` |
| `scripts` | Hook scripts + helpers | `scripts/` |
| `engines` | Execution-engine recipes | `.agent/engines/` |
| `agents` (new, Phase 16) | Subagent definitions (TOML / SKILL-style) | `.codex/agents/` |
| `skills` (new, Phase 16) | Skill packages (`SKILL.md` + supporting files) | `.agents/skills/` |

## ENH-023 and ENH-024 closed (Phase 11 G0)

These two open backlog items tracked the type inconsistencies in the
pre-Phase-11 matrix:

- **ENH-023** — `subagents` was bool on Claude Code and Antigravity but
  an explanatory string on Codex.
- **ENH-024** — `skills` / `browser` / `computerUse` were `false` on
  Claude Code but `'future'` sentinel strings on Codex; Antigravity did
  not declare them at all.

Phase 11 Group 0 unified all three adapters around uniform booleans and
moved every caveat into the `roadmap` field. `tests/
adapter-capabilities-declared.test.js` now enforces the uniform shape.

Phase 16 follow-up — see footnotes 2 + 4 above for Codex
`parallelSubagents` and `skills`; those boolean flips are gated on Group
4 live evidence and tracked separately from the type-shape audit.

## Read this if you are…

- **…building an orchestration primitive** (Phase 11 and onward): read
  the boolean cell; if `false`, degrade per the capability-routing
  helper. Surface degraded-mode notes from the adapter's `roadmap`
  block in the user-visible banner so they understand why.
- **…adding a new adapter**: declare *every* row above on your
  adapter's `capabilities` block as a boolean. Use the `roadmap` block
  for forward-looking notes — never embed them in the capability
  value. The audit test will fail otherwise.
- **…closing a roadmap entry**: flip the corresponding boolean to
  `true` (or remove if no longer relevant), delete the `roadmap`
  entry, and update this matrix doc in the same PR.
- **…asking "is feature X shipped on adapter Y?"**: capability matrix
  tracks adapter primitives (`hooks: true` etc.); the
  [Adapter Parity Matrix](./adapter-parity-matrix.md) tracks every
  shipped momentum feature × adapter — that's the right doc for that
  question.
