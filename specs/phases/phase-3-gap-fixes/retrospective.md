---
type: Retrospective
---

# Phase 3 — Gap Fixes: Retrospective

> **Released**: v0.4.0 — 2026-04-21
> **Duration**: Single session

## What Was Delivered

- `core/specs-templates/` tree — 16 generic template files scaffolded by `momentum init`
- `--coding-agent` flag on `npx momentum init` with adapter.js DIP pattern
- `adapters/claude-code/adapter.js` — Claude Code-specific install steps extracted from `init()`
- Recursive `copyDir()` with `skipIfExists` — idempotent init
- `adapter.sh` excluded from npm package (fixed via explicit `files` glob in package.json)
- `start-phase.md` — explicit `history.md` creation note (ENH-005)
- `start-project.md` + `brainstorm-idea.md` — split and rename of `brainstorm-project` (ENH-006, plus naming improvement)
- `track.md` — explicit one-liner vs detail-file decision criteria (ENH-007)
- Success message updated — no longer suggests `/start-phase` on a fresh init (ENH-004)
- Full README rewrite — lifecycle, all commands, spec structure, Group Execution Pattern, agent rules

## What Went Well

- Group execution pattern worked cleanly: Group 0 unblocked Groups 1+2 which ran in parallel with no conflicts
- The `brainstorm-idea` / `start-project` split emerged naturally during the session — better naming than the original plan
- All smoke tests passed first time; only one fix needed (npm packaging discovery)
- The `adapter.js` DIP pattern is clean and sets up future adapters (Cursor, Gemini, etc.) correctly

## What Didn't Go Well

- TD-001 fix required a different approach than planned: `.npmignore` doesn't filter files in `files`-listed directories — had to use an explicit allowlist in `package.json files` instead. Worth documenting as a general npm packaging gotcha.
- ENH-008 (flag name) was in scope but shipped unresolved — `--coding-agent` landed without the naming question being answered. Should have been formally deferred before the phase started rather than left open.

## Lessons Learned

1. **npm `files` + `.npmignore` interaction is non-obvious** — when `files` is set, `.npmignore` only applies to the root, not subdirectories. Use explicit globs in `files` as the allowlist instead of relying on exclusions.
2. **Open questions need explicit deferred status before a phase starts** — ENH-008 was tagged to phase-3 but was never truly in scope. Leaving it "open" created ambiguity.
3. **Naming decisions that block shipped flags should be P0** — ENH-008 was P2 but it gates a flag name that's now public API. Should have been elevated or explicitly closed before TD-002 shipped.

## Open Items Carried Forward

| ID | Item | Status |
|----|------|--------|
| ENH-008 | `--coding-agent` flag name — still needs a decision | deferred, unscheduled |
| ENH-009 | Distribution strategy: npx vs native plugins vs both | open, unscheduled |
| FEAT-007–010 | Adapters: Cursor, Gemini CLI, OpenCode, VS Code Copilot | open, unscheduled |
