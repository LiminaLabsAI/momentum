# Roadmap

> **Start Date**: 2026-04-21

## Timeline

| Phase | Name | Status | Key Deliverables |
|-------|------|--------|-----------------|
| 0 | Bootstrap | **Complete (v0.1.0)** | template files, install.sh, README, project spec structure |
| 1 | Tool-Agnostic Architecture | **Complete (v0.2.0)** | `core/` + `adapters/claude-code/` DIP restructure; `--coding-agent` flag on install.sh; other agents deferred to Phase 2 |
| 2 | npx CLI Distribution | **Complete (v0.3.0)** | `@avinash-singh-io/momentum` on npm; `momentum init` CLI; Claude Code only |
| 3 | Gap Fixes | **Complete (v0.4.0)** | Full specs/ scaffold, `--coding-agent` flag + adapter.js DIP, command fixes (ENH-003–007, TD-001–002), `brainstorm-idea` + `start-project` commands |
| 4 | Enhanced Commands | **Complete (v0.5.0)** | `momentum upgrade` CLI, `/validate` command, `/migrate` command |
| 5 | Rules & Upgrade Safety | **Planned (v0.6.0)** | Rules 10/11, persuasion-hardening (Rules 2/6/8/10/11), `## Project Extensions` marker, marker-aware `momentum upgrade`, `--coding-agent` → `--agent` rename (breaking) |
| 6 | Execution Engine | **Future (v0.7.0)** | Subagent execution engine, TDD enforcement rule, `/complete-phase` verification rigor, systematic-debugging skill, `/review-code` command |

## Phase Dependencies

```
Phase 0 (Bootstrap)
  └── Phase 1 (Tool-Agnostic Architecture)
       └── Phase 2 (npx CLI Distribution)
            └── Phase 3 (Gap Fixes)
                 └── Phase 4 (Enhanced Commands)
                      └── Phase 5 (Rules & Upgrade Safety)
                           └── Phase 6 (Execution Engine — assumes hardened rules)
```

## Open Questions

| ID | Question | Status |
|----|----------|--------|
| ENH-008 | What should `--coding-agent` be called? | **Resolved (Phase 5)** — renaming to `--agent` (hard rename, breaking) |
| ENH-009 | Distribution: stay with npx, add native agent plugins, or both? | Deferred — blocked on ≥1 additional adapter shipping first |

---

## Milestones

| Milestone | Phase | Description |
|-----------|-------|-------------|
| v0.1.0 — Installable | 0 | Template + install.sh working end-to-end (Claude Code only) |
| v0.2.0 — Tool-Agnostic | 1 | core/ + adapters/ — works for any supported AI tool |
| v0.3.0 — npx CLI | 2 | `@avinash-singh-io/momentum` on npm; `momentum init` CLI (Claude Code only) |
| v0.4.0 — Gap Fixes | 3 | `momentum init` fully scaffolds a project; command content complete |
| v0.5.0 — Enhanced Commands | 4 | `momentum upgrade` CLI; `/validate` + `/migrate` commands |
| v0.6.0 — Rules & Upgrade Safety | 5 | Rules 10/11, persuasion-hardening, marker-based upgrade, `--agent` rename (breaking) |
