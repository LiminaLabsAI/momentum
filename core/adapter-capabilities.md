# Adapter Capability Matrix

> Single source of truth for what each shipped adapter declares it can
> do. Generated from the `capabilities` block on each adapter's
> `adapter.js`. Audited automatically by
> `tests/adapter-capabilities-declared.test.js`.
>
> Phase 11 (v0.14.0) unified the declared shape: every capability is
> now a **uniform boolean**. "Future-planned" or caveated notes live in
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

## Matrix (as of 2026-06-07, post-ENH-023 + ENH-024)

| Capability | Claude Code | Codex | Antigravity |
|---|---|---|---|
| `hooks` | ✅ | ✅ | ✅ |
| `slashCommands` | ✅ | ✅ | ❌¹ |
| `subagents` | ✅ | ✅² | ✅ |
| `parallelSubagents` | ✅ | ❌² | ✅ |
| `sessionStartHook` | ✅ | ✅ | ❌³ |
| `skills` | ❌ | ❌⁴ | ❌ |
| `browser` | ❌ | ❌⁴ | ❌ |
| `computerUse` | ❌ | ❌⁴ | ❌ |
| `artifacts` (adapter-specific) | — | — | ✅ |
| `planningMode` (adapter-specific) | — | — | ✅ |

### Roadmap footnotes

1. **Antigravity `slashCommands: false`** — chat-driven UI. Orchestration primitives reach Antigravity users via natural-language inference (the main agent picks the primitive from the user's prose) plus the `momentum` CLI floor that works on every adapter.
2. **Codex `subagents` / `parallelSubagents`** — Codex declares a subagent surface, but parallel fan-out has not yet been validated by momentum smoke tests. The capability-routing helper treats Codex as sequential for `dispatch` until a future release proves parallel viability in CI. Subagent existence is `true`; parallel fan-out is `false`. Promote `parallelSubagents` to `true` once Codex parallel dispatch is exercised end-to-end.
3. **Antigravity `sessionStartHook: false`** — Antigravity has no SessionStart hook surface today. The handoff inbox pickup hint surfaces via primary-instruction text in `AGENTS.md` instead. `/continue` and `momentum continue` still work; the user just doesn't get an automatic banner.
4. **Codex `skills` / `browser` / `computerUse`** — declared `false` today; planned for a future Codex feature drop. When Codex ships those features, flip the boolean and remove the corresponding `roadmap` entry in the same PR.

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
