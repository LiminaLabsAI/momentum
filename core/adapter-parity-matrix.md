# Adapter Parity Matrix

> Feature × adapter shipping status. Complement to
> `core/adapter-capabilities.md` (which tracks adapter PRIMITIVES like
> "hooks: true").
>
> This matrix answers: "is feature X actually shipped on adapter Y, and
> if degraded, how?" Audited by
> `tests/adapter-parity-matrix.test.js` — every cell must declare a
> status. Silent gaps were the failure mode Phase 16 exists to fix.
>
> Introduced Phase 16 (2026-06-11).

## Status legend

| Status | Meaning |
|---|---|
| `shipped` | Feature is wired and verified on this adapter. |
| `shipped-degraded` | Feature is wired but runs in a documented degraded mode (e.g. sequential instead of parallel; in-process instead of subagent). Cell's footnote explains. |
| `not-applicable` | The adapter's runtime model doesn't surface this feature, by design. Cell's footnote explains. |

If you add a feature OR a new adapter, every (feature, adapter) cell
must be one of the three above. The audit test fails on blank cells.

## Matrix

### Slash commands (core)

| Command | Claude Code | Codex | Antigravity |
|---|---|---|---|
| `/brainstorm-idea` | shipped | shipped | shipped¹ |
| `/brainstorm-phase` | shipped | shipped | shipped¹ |
| `/start-project` | shipped | shipped | shipped¹ |
| `/start-phase` | shipped | shipped | shipped¹ |
| `/complete-phase` | shipped | shipped | shipped¹ |
| `/sync-docs` | shipped | shipped | shipped¹ |
| `/track` | shipped | shipped | shipped¹ |
| `/review` | shipped | shipped | shipped¹ |
| `/log` | shipped | shipped | shipped¹ |
| `/migrate` | shipped | shipped | shipped¹ |
| `/validate` | shipped | shipped | shipped¹ |
| `/ecosystem` | shipped | shipped | shipped¹ |
| `/initiative` | shipped | shipped | shipped¹ |
| `/session` | shipped | shipped | shipped¹ |
| `/systematic-debug` | shipped | shipped | shipped¹ |

### Slash commands (overlay)

| Command | Claude Code | Codex | Antigravity |
|---|---|---|---|
| `/scout` | shipped | shipped | shipped¹ |
| `/dispatch` | shipped | shipped² | shipped¹ |
| `/handoff` | shipped | shipped | shipped¹ |
| `/continue` | shipped | shipped | shipped¹ |
| `/review-code` | shipped | shipped (Phase 16 G1) | shipped¹ (Phase 16 G2) |

### Hook events

| Hook | Claude Code | Codex | Antigravity |
|---|---|---|---|
| `PreToolUse` (brainstorm-gate) | shipped | shipped (Phase 16 G1.1) | shipped-degraded³ |
| `PostToolUse` (history reminder) | shipped | shipped | shipped (Phase 16 G2.2) |
| `SessionStart` (handoff + ecosystem banner) | shipped | shipped | shipped-degraded⁴ |

### Overlay surfaces

| Surface | Claude Code | Codex | Antigravity |
|---|---|---|---|
| `commands/` overlay | shipped | shipped | shipped (Phase 16 G2.1) |
| `agent-rules/` overlay | shipped | shipped | shipped |
| `scripts/` overlay | shipped | shipped | shipped |
| `engines/` overlay | shipped | shipped | shipped |
| `agents/` overlay (Phase 16) | not-applicable⁵ | shipped (Phase 16 G1.5) | shipped (Phase 16 G2.4) |
| `skills/` overlay (Phase 16) | not-applicable⁵ | shipped-degraded⁶ | shipped (Phase 16 G2.5) |

### Orchestration primitives

| Primitive | Claude Code | Codex | Antigravity |
|---|---|---|---|
| `scout` (single-target read) | shipped | shipped | shipped |
| `dispatch` (parallel fan-out) | shipped | shipped-degraded² | shipped |
| `handoff` (control transfer) | shipped | shipped | shipped |
| `continue` (handoff pickup) | shipped | shipped | shipped-degraded⁴ |

### Ecosystem features

| Feature | Claude Code | Codex | Antigravity |
|---|---|---|---|
| `momentum init/upgrade` install | shipped | shipped | shipped |
| Ecosystem manifest awareness (`ecosystem.json`) | shipped | shipped | shipped |
| SessionStart ecosystem banner | shipped | shipped | shipped-degraded⁴ |
| Auto session log (PostToolUse) | shipped | shipped | shipped (Phase 16 G2.2) |
| Managed `CLAUDE.md` / `AGENTS.md` on `ecosystem init` | shipped | shipped | shipped (Phase 16 G2.6) |

## Footnotes

1. **Antigravity slash commands** — `agy` ships rich built-in slash
   commands but custom per-project slash commands are not a documented
   public surface today. Momentum slash command recipes for Antigravity
   are referenced from `AGENTS.md` and invoked by name in natural
   language. The user types `/brainstorm-phase`, the agent reads the
   matching `.agents/commands/brainstorm-phase.md` recipe, and follows
   it. The recipe content is identical to other adapters; the
   invocation path differs.
2. **Codex parallel dispatch** — Codex declares `parallelSubagents: false`
   pending Phase 16 Group 4 live evidence. The orchestration
   capability-routing helper sequences `/dispatch` targets serially
   until the flip in Phase 16 Group 5.1.
3. **Antigravity PreToolUse brainstorm-gate** — `agy` accepts `hooks.json`
   PreToolUse entries. Momentum wires `brainstorm-gate.sh` (same script
   as Claude Code + Codex). If `agy`'s PreToolUse event doesn't fire on
   markdown writes (vendor docs ambiguous), the gate falls back to the
   markdown-discipline contract in `brainstorm-phase.md` itself —
   degraded but not broken. Group 4 verifies.
4. **Antigravity SessionStart** — `agy` SessionStart event support is
   not yet confirmed in vendor docs. The momentum adapter ships the hook
   wiring (in `hooks.json`) but the handoff pickup hint also lives in
   `AGENTS.md` primary-instruction text as a fallback. `/continue` and
   `momentum continue` still work explicitly; the auto-greet banner may
   or may not fire depending on the `agy` runtime.
5. **Claude Code `agents/` and `skills/` overlays** — Claude Code has no
   per-project subagent or skill file-discovery surface today; agents
   are spawned via the Task tool from the main session, and skills are
   user-level. Momentum declares the destinations for contract
   uniformity but ships no overlay content.
6. **Codex skills overlay** — Codex's `.agents/skills/` discovery is
   live per vendor docs. Momentum ships one example skill stub via the
   Antigravity overlay (which Codex would also discover from
   `.agents/skills/`). A first-class Codex-owned `skills/` overlay
   ships in a follow-up phase once Group 4 evidence confirms the
   discovery flow.

## Read this if you are…

- **…asking "is feature X on adapter Y today?"** — find the row, read
  the cell. If `shipped-degraded`, the footnote tells you how it's
  degraded.
- **…adding a new feature** — add a row; declare every cell. The audit
  test will fail otherwise.
- **…adding a new adapter** — add a column; declare every cell. Same
  audit-test rule.
- **…upgrading a degraded cell to `shipped`** — confirm via test, flip
  the cell, drop the matching footnote in the same PR. Also update
  `core/adapter-capabilities.md` if the underlying capability boolean
  changed.

## How the audit test parses this matrix

`tests/adapter-parity-matrix.test.js` reads this file and asserts:

1. Every row's cell count matches the column header count.
2. Every cell is one of: `shipped`, `shipped-degraded`, `not-applicable`,
   or one of those plus a parenthetical note (e.g. `shipped (Phase 16 G1.5)`).
3. Cells with `shipped-degraded` or `not-applicable` reference a
   footnote (any superscript digit or unicode footnote marker).

Rows in non-table prose are ignored. Tables under any `###` heading
in this file are audited.
