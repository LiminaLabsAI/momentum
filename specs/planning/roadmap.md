# Roadmap

> **Start Date**: 2026-04-21

## Timeline

| Phase | Name | Status | Key Deliverables |
|-------|------|--------|-----------------|
| 0 | Bootstrap | **Complete (v0.1.0)** | template files, install.sh, README, project spec structure |
| 1 | Tool-Agnostic Architecture | **Complete (v0.2.0)** | `core/` + `adapters/claude-code/` DIP restructure; `--coding-agent` flag on install.sh; other agents deferred to Phase 2 |
| 2 | npx CLI Distribution | **Complete (v0.3.0)** | `@avinash-singh-io/momentum` on npm; `momentum init` CLI; Claude Code only |
| 3 | Gap Fixes | Not Started | Full specs/ scaffold in `momentum init`, command content fixes, CLI flag (ENH-003–007, TD-001–002) |
| 4 | Enhanced Commands | Not Started | `/migrate` command, `/validate` command; adapters unscheduled |

## Phase Dependencies

```
Phase 0 (Bootstrap)
  └── Phase 1 (Tool-Agnostic Architecture)
       └── Phase 2 (npx CLI Distribution)
            └── Phase 3 (Gap Fixes)
                 └── Phase 4 (Enhanced Commands)
```

## Open Questions (Pre-Phase 4)

Resolve these before planning Phase 4+:

| ID | Question | Detail |
|----|----------|--------|
| ENH-008 | What should the project be called? "momentum" is taken on npm (scoped). Alternatives: "salvit", "poly", others. | [→](../backlog/details/ENH-008.md) |
| ENH-009 | Distribution: stay with npx, add native agent plugins, or both? Claude Code extension, Cursor Rule Pack, etc. | [→](../backlog/details/ENH-009.md) |

---

## Milestones

| Milestone | Phase | Description |
|-----------|-------|-------------|
| v0.1.0 — Installable | 0 | Template + install.sh working end-to-end (Claude Code only) |
| v0.2.0 — Tool-Agnostic | 1 | core/ + adapters/ — works for any supported AI tool |
| v0.3.0 — npx CLI | 2 | `@avinash-singh-io/momentum` on npm; `momentum init` CLI (Claude Code only) |
| v0.4.0 — Gap Fixes | 3 | `momentum init` fully scaffolds a project; command content complete |
| v0.5.0 — Enhanced Commands | 4 | `/migrate`, `/validate` shipped |
