# Adapter Capability Matrix

> Single source of truth for what each shipped adapter declares it can
> do. Generated from the `capabilities` block on each adapter's
> `adapter.js`. Audited automatically by
> `tests/adapter-capabilities-declared.test.js`.
>
> Phase 10 (v0.13.0) made these capability flags a tested claim instead
> of an asserted one. Phase 11 (Dynamic Orchestration & Context
> Handover) will read this matrix to decide which orchestration
> primitives are available per adapter.

## How to read this matrix

A capability cell is one of:
- ✅ — declared `true`
- ❌ — declared `false`
- 📝 *(note)* — declared as a string explaining caveats (treated as
  "supported with caveats" by capability-aware code)
- — *(dash)* — not declared

If you add a new adapter, fill in **every** column. Inconsistencies
(one adapter declares a capability the others don't) are tracked as
backlog ENHs and resolved before they become Phase 11 blockers.

## Matrix (as of 2026-06-07)

| Capability | Claude Code | Codex | Antigravity |
|---|---|---|---|
| `hooks` | ✅ | ✅ | ✅ |
| `slashCommands` | ✅ | ✅ | ❌ *(chat-driven UI)* |
| `subagents` | ✅ | 📝 *(codex-specific; not used by momentum v0.9.0)* | ✅ |
| `skills` | ❌ | 📝 *(future)* | — |
| `browser` | ❌ | 📝 *(future)* | — |
| `computerUse` | ❌ | 📝 *(future)* | — |
| `artifacts` | — | — | ✅ |
| `planningMode` | — | — | ✅ |

## Notes on inconsistencies (tracked as Phase 10 audit findings)

These are *documentation deltas*, not implementation deltas. They get
ENH IDs in backlog and a small follow-up phase or PR resolves the
type / wording inconsistencies.

1. **`subagents` type inconsistency.** Claude Code and Antigravity
   declare booleans; Codex declares an explanatory string. Phase 11
   orchestration code will treat truthy/string as "supported with
   caveats" but a uniform shape is cleaner. → tracked as ENH-023.

2. **Antigravity declares `artifacts` and `planningMode` which the
   other adapters don't have a column for.** Likely fine — they are
   genuinely Antigravity-specific — but capability-aware code needs
   to handle absent keys gracefully. → backstopped by
   `adapter-capabilities-declared.test.js`.

3. **Codex declares `skills`/`browser`/`computerUse` as `'future'`
   strings; Claude Code declares them as `false`.** Convergence: a
   `false` + a roadmap entry is clearer than a sentinel string. →
   tracked as ENH-024.

## Read this if you are…

- **…building an orchestration primitive** (Phase 11): read the
  capability for the user's adapter and degrade gracefully when it is
  `false`, missing, or a string.
- **…adding a new adapter**: declare *every* row above on your
  adapter's `capabilities` block. If a capability genuinely does not
  apply, declare `false` (not omitted) so the audit test passes.
- **…fixing a documentation inconsistency** flagged in the "Notes"
  section: update the matrix here AND the adapter's `capabilities`
  block in lockstep. Tests will catch drift.
