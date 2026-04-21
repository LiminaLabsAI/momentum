# Roadmap

> **Start Date**: 2026-04-21

## Timeline

| Phase | Name | Status | Key Deliverables |
|-------|------|--------|-----------------|
| 0 | Bootstrap | In Progress | template files, install.sh, README, project spec structure |
| 1 | Plugin & Distribution | Not Started | `npx momentum` CLI, npm publish, versioning |
| 2 | Enhanced Commands | Not Started | `/migrate` command, `/validate` command, status dashboard |

## Phase Dependencies

```
Phase 0 (Bootstrap)
  └── Phase 1 (Plugin & Distribution)
       └── Phase 2 (Enhanced Commands)
```

## Milestones

| Milestone | Phase | Description |
|-----------|-------|-------------|
| v0.1.0 — Installable | 0 | Template + install.sh working end-to-end |
| v0.2.0 — npx CLI | 1 | `npx momentum init` works end-to-end |
| v0.3.0 — Full CLI | 2 | Enhanced commands shipped |
