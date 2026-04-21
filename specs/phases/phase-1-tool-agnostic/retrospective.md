# Phase 1 Retrospective — Tool-Agnostic Architecture

> **Completed**: 2026-04-21
> **Version Released**: v0.2.0

## What Was Delivered

- `core/` directory containing all tool-agnostic content: 8 command files, `check-history-reminder.sh`, `project.md` agent rules
- `adapters/claude-code/` with `adapter.sh` (defines `run_install()`) and `settings.json`
- `template/` directory removed — clean break from Phase 0 structure
- `install.sh` rewritten: `--coding-agent <name>` flag (default: `claude-code`), adapter validation, adapter sourcing
- BUG-001 fixed: `mkdir -p` now runs before `realpath`
- Backlog updated: FEAT-001 resolved, FEAT-002–005 deferred, FEAT-007–010 added (P2, phase-2)
- Smoke tests passed: default install, explicit flag, unknown agent error path

## What Went Well

- **Tight scope paid off** — deciding Claude Code-only for Phase 1 kept the phase completable in a single session. The architecture is clearly extensible; other adapters can be added without touching `core/` or `install.sh`.
- **`adapter.sh` pattern is clean** — sourcing a bash file with `run_install()` is idiomatic, avoids `jq` dependency, and gives each adapter full control over its install logic. No regrets vs. JSON manifest.
- **BUG-001 fixed opportunistically** — trivial fix while touching `install.sh` anyway. Zero extra cost.
- **Brainstorm → start → implement → complete in one flow** — the three-question brainstorm was efficient. All decisions made upfront held through implementation with no rework.
- **Tasks.md updated in real time** — improvement over Phase 0 where checklist stayed at 0% throughout.

## What Didn't Go Well

- **FEAT-002–005 left open in backlog** — originally P1 items for phase-1, they were scope-cut during brainstorm but not immediately marked `deferred`. Required a cleanup step during `/complete-phase`. Future brainstorms should mark deferred items immediately when scope is cut.
- **overview.md acceptance criteria left as `[ ]`** — the acceptance criteria were verified in practice (smoke tests) but the `[ ]` checkboxes weren't updated to `[x]` during the phase. Caught and fixed during `/complete-phase`.

## Lessons Learned

1. When scope is cut during brainstorm, mark displaced backlog items `deferred` before writing the phase files — not as a cleanup step at the end.
2. Acceptance criteria checkboxes in `overview.md` should be ticked during the phase alongside `tasks.md`, not left for `/complete-phase` to catch.
3. The `adapter.sh` pattern will scale cleanly to Phase 2 (npx CLI can call the same adapter but from Node.js via `child_process.execSync`).

## Bugs Found

| ID | Title | Priority |
|----|-------|----------|
| _(none)_ | | |
