# Phase 1: Tool-Agnostic Architecture

> **Status**: Complete (2026-04-21)
> **Version Target**: v0.2.0
> **Depends On**: Phase 0 — Bootstrap (complete, v0.1.0)

## Goal

Restructure momentum into a DIP architecture — tool-agnostic workflow logic in `core/`, coding-agent-specific wiring in `adapters/`. Ships Claude Code adapter only. Other agents are added to backlog for future phases.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Adapter scope | Claude Code only | Ship focused v0.2.0; other agents tracked in backlog |
| Structure | Full restructure — `template/` removed | `core/` + `adapters/claude-code/`, clean DIP boundary |
| Adapter mechanism | `adapters/<agent>/adapter.sh` sourced by `install.sh` | Idiomatic bash; no JSON parsing; each adapter owns its install logic |
| install.sh flag | `--coding-agent <name>` (default: `claude-code`) | Forward-looking; Phase 2 npx CLI inherits the concept |
| BUG-001 fix | Yes — fix while touching install.sh | Trivial fix, opportunistic |

## Directory Structure (After Phase 1)

```
momentum/
  core/
    commands/           ← 8 command .md files (tool-agnostic content)
    scripts/            ← check-history-reminder.sh (logic, not wiring)
    agent-rules/        ← project.md template
  adapters/
    claude-code/
      adapter.sh        ← install logic: maps core/ → .claude/ paths
      settings.json     ← Claude Code hook config
  install.sh            ← updated: --coding-agent flag, sources adapter.sh
  template/             ← REMOVED
```

## Scope

### In Scope
- Move all files from `template/` into `core/` and `adapters/claude-code/`
- Delete `template/` directory
- Create `adapters/claude-code/adapter.sh` with `run_install()` function
- Update `install.sh`: `--coding-agent` flag, fix BUG-001, source adapter
- Update README install instructions
- Add Cursor, Gemini CLI, OpenCode, VS Code Copilot to backlog (P2)
- Mark BUG-001 resolved in backlog

### Out of Scope
- Cursor, Gemini CLI, OpenCode, VS Code Copilot adapters (backlog)
- `npx momentum init` CLI (Phase 2)
- Changes to command content or workflow logic

## Deliverables & Verification

| Deliverable | Verification |
|-------------|-------------|
| `core/` directory with all tool-agnostic files | `ls core/commands/ core/scripts/ core/agent-rules/` |
| `adapters/claude-code/` with adapter.sh + settings.json | `ls adapters/claude-code/` |
| `template/` removed | `[ ! -d template ] && echo ok` |
| install.sh with `--coding-agent` flag | `./install.sh --help` or inspect source |
| Default install works | `./install.sh /tmp/test-p1` |
| Explicit flag works | `./install.sh /tmp/test-p1b --coding-agent claude-code` |
| Unknown agent errors cleanly | `./install.sh /tmp/x --coding-agent unknown` → non-zero exit |
| BUG-001 fixed | No blank line in install output for new target dir |

## Acceptance Criteria

- [x] `./install.sh /tmp/test-p1` completes without errors (default agent)
- [x] `./install.sh /tmp/test-p1b --coding-agent claude-code` completes without errors
- [x] All 8 commands present in `/tmp/test-p1/.claude/commands/`
- [x] Hook wiring correct — `.claude/settings.json` present with hook config
- [x] `./install.sh /tmp/x --coding-agent unknown` exits non-zero with clear error message
- [x] `template/` no longer exists in the repo
- [x] `core/` contains all tool-agnostic content
- [x] `adapters/claude-code/` contains only Claude Code-specific files
- [x] BUG-001 resolved — no blank line in install output
