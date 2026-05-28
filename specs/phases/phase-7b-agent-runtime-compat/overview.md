# Phase 7b — Agent Runtime Compatibility: Overview

> **Goal**: Ship v0.9.0 — prove momentum is genuinely agent-agnostic by hardening the adapter contract and adding Codex as the first non-Claude adapter.
> **Phase shortname**: `phase-7b-agent-runtime-compat`

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Phase shape | Compatibility first | Building autonomous execution before a second adapter would risk making the engine accidentally Claude-shaped. |
| Core boundary | Core defines generic workflow contracts only | Agent-specific instruction files, commands, hooks, skills, subagents, and config belong in `adapters/<agent>/`. |
| Claude Code handling | Read, classify, and regression-test; do not rewrite | Claude Code is already supported. Codex compatibility must not dilute Claude-specific capabilities like `.claude/commands/` or Task-based `/review-code`. |
| Codex support | First-class adapter MVP | Codex uses `AGENTS.md` as primary instructions and `.codex/hooks.json` for hook wiring. Command recipes land in a Codex-owned command surface. |
| Original 7b scope | Deferred one phase | Autonomous execution, TDD Rule 13, and retry budget move to the next phase once the multi-agent foundation exists. |
| ENH-018 | Keep in 7b | Tarball-shape testing now protects multi-adapter packaging and prevents another BUG-002-class release. |

## Scope

### In

| ID | Item |
|----|------|
| FEAT-015 | Adapter Contract v3 — adapters declare primary instruction files, command surfaces, config/hook surfaces, and capabilities |
| FEAT-016 | Codex adapter MVP — `momentum init/upgrade --agent codex`, `AGENTS.md`, `.codex/hooks.json`, Codex command recipes |
| FEAT-017 | Cross-agent install/upgrade tests — Claude regression coverage + Codex behavior coverage |
| ENH-018 | Tarball-shape test — assert both adapters ship and repo-local/test artifacts do not leak |

### Out

- Autonomous execution engine
- TDD Rule 13
- Per-task retry budget / 3-strikes policy
- Parallel worktree orchestration
- Cursor, Gemini, OpenCode, Copilot adapters
- Rewriting Claude Code-specific files for Codex compatibility

## Deliverables + Verification

| Deliverable | Verification |
|-------------|--------------|
| Adapter Contract v3 documented | Contract section exists in README; adapter metadata describes root files, commands, config, capabilities |
| Codex adapter exists | `adapters/codex/adapter.js`, `AGENTS.md`, `.codex/hooks.json`, and command recipe surface installed by CLI |
| CLI supports dynamic agents | `momentum --help` lists `claude-code, codex`; unknown-agent error lists available adapters dynamically |
| Claude behavior preserved | Install tests assert `.claude/commands/`, `.claude/settings.json`, and `/review-code` still install |
| Codex install/upgrade works | Tests assert `AGENTS.md`, `.codex/hooks.json`, specs, scripts, and command recipes install/upgrade |
| Tarball-shape protected | `npm pack --dry-run --json` test asserts required adapter paths and excludes leaked paths |
| Release readiness | `npm test` passes and package version is bumped to `0.9.0` |

## Acceptance Criteria

1. `node bin/momentum.js init <tmp> --agent claude-code` keeps the current Claude Code output shape.
2. `node bin/momentum.js init <tmp> --agent codex` installs Codex-specific instructions, commands, hooks, generic specs, and reusable scripts.
3. `node bin/momentum.js upgrade <tmp> --agent codex` preserves Codex project extensions where marker-aware files apply.
4. Overlay conflict detection still catches duplicates before writes.
5. `npm test` passes, including tarball-shape coverage.
6. Roadmap/status/backlog/changelog reflect 7b as Agent Runtime Compatibility and move original 7b/7c deliverables forward.
