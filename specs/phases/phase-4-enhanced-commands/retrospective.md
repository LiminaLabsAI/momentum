# Phase 4 — Enhanced Commands: Retrospective

> **Completed**: 2026-04-21
> **Released**: v0.5.0

## What Went Well

- **Scope was tight and well-defined** — three deliverables, clear acceptance criteria, no scope creep
- **Upgrade implementation was clean** — reusing `copyDir` with a new `upgradeMode` flag kept the change minimal and consistent with existing patterns
- **Smoke tests caught a real UX issue** — the relative path display was ugly when upgrading a directory outside CWD; caught before commit and fixed with a `root` option
- **No regressions** — `init` behavior unchanged; `upgradeMode` is a separate opt-in flag

## What Didn't Go Well

- **Plan had incorrect registration step** — both command tasks included "Register in settings.json" steps that turned out to be N/A. The settings.json architecture wasn't re-verified before writing the plan. Minor, but added noise to tasks.md.

## Lessons Learned

- Before writing implementation steps for adapter-level wiring, re-read the adapter to confirm the actual pattern — don't assume from memory
- `copyDir` is a clean extension point: mode flags (`skipIfExists`, `upgradeMode`) make it versatile without duplication

## Scope Carried Forward

| ID | Item | Why deferred |
|----|------|-------------|
| ENH-008 | Flag naming (`--coding-agent`) | Needs decision before any rename touches public API |
| ENH-009 | Distribution strategy (npx vs native plugins) | Requires research into Claude Code extension ecosystem |
| FEAT-007–010 | Additional adapters (Cursor, Gemini, OpenCode, Copilot) | Independent of Phase 4; unscheduled |
