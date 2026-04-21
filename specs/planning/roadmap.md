# Roadmap

> **Start Date**: 2026-04-21

## Timeline

| Phase | Name | Status | Key Deliverables |
|-------|------|--------|-----------------|
| 0 | Bootstrap | **Complete (v0.1.0)** | template files, install.sh, README, project spec structure |
| 1 | Tool-Agnostic Architecture | Not Started | `core/` + `adapters/` DIP restructure, adapters for Claude Code, Cursor, Gemini CLI, OpenCode, VS Code Copilot |
| 2 | npx CLI Distribution | Not Started | `npx momentum init`, auto-detects tool, npm publish |
| 3 | Enhanced Commands | Not Started | `/migrate` command, `/validate` command, status dashboard |

## Phase Dependencies

```
Phase 0 (Bootstrap)
  └── Phase 1 (Tool-Agnostic Architecture)
       └── Phase 2 (npx CLI Distribution)
            └── Phase 3 (Enhanced Commands)
```

## Milestones

| Milestone | Phase | Description |
|-----------|-------|-------------|
| v0.1.0 — Installable | 0 | Template + install.sh working end-to-end (Claude Code only) |
| v0.2.0 — Tool-Agnostic | 1 | core/ + adapters/ — works for any supported AI tool |
| v0.3.0 — npx CLI | 2 | `npx momentum init` auto-detects tool, zero-friction install |
| v0.4.0 — Full CLI | 3 | Enhanced commands shipped |
