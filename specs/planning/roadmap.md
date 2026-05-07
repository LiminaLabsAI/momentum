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
| 5 | Rules & Upgrade Safety | **Complete (v0.6.0)** | Rules 10/11, persuasion-hardening (Rules 2/6/8/10/11), `## Project Extensions` marker, marker-aware `momentum upgrade`, `--coding-agent` → `--agent` rename (breaking) |
| 6 | Adapter Overlay & Verification | **Complete (v0.7.0)** | Adapter Contract v2 (per-agent commands/rules/scripts overlays, conflict = error); Rule 12 verify-before-claim; `/complete-phase` evidence rigor; `/review-code` (Claude Code, subagent-driven); ENH-014 cross-repo Rule 9; `tests/` for momentum CLI (24 tests via node:test) |
| 7 | Execution Excellence | Not Started (target v0.8.0) | Subagent execution engine (Claude Code overlay); systematic-debugging skill (3-strikes); TDD rule (Rule 13, opt-in); SessionStart auto-activation (Claude Code); persuasion-hardening Rules 1/3/4/5/7/9 (evidence-permitting) |
| 8 | Reach | Not Started (target v0.9.0) | Adapter: Cursor (FEAT-007); Adapter: Gemini CLI (FEAT-008); ENH-009 distribution decision; adapter contract refinements from second/third adapters |
| 9 | Intelligence | Not Started (target v0.10.0) | Self-learning hooks (`specs/learnings.md`); retrospective-driven rule evolution; self-healing (recurring failure → ADR proposal); context-window-aware task sizing |
| 10 | Platform | Not Started (target v1.0) | MCP server; `/specify` auto-spec generation; `/decide` (ADR creation); skill/command authoring command; dependency-aware task ordering; bidirectional spec sync (experimental) |

## Phase Dependencies

```
Phase 0 (Bootstrap)
  └── Phase 1 (Tool-Agnostic Architecture)
       └── Phase 2 (npx CLI Distribution)
            └── Phase 3 (Gap Fixes)
                 └── Phase 4 (Enhanced Commands)
                      └── Phase 5 (Rules & Upgrade Safety) ✓
                           └── Phase 6 (Adapter Overlay & Verification — assumes hardened rules)
                                └── Phase 7 (Execution Excellence — assumes overlay structure)
                                     └── Phase 8 (Reach — assumes hardened execution)
                                          └── Phase 9 (Intelligence — assumes multi-agent base)
                                               └── Phase 10 (Platform — assumes the rest)
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
| v0.7.0 — Adapter Overlay & Verification | 6 | Adapter Contract v2 (overlays); Rule 12 verify-before-claim; /complete-phase evidence rigor; /review-code (Claude Code); cross-repo Rule 9; tests/ for CLI |
| v0.8.0 — Execution Excellence | 7 | Subagent execution engine; systematic-debugging; TDD opt-in; SessionStart auto-activation |
| v0.9.0 — Reach | 8 | Cursor + Gemini adapters; distribution decision |
| v0.10.0 — Intelligence | 9 | Self-learning, retrospective-driven rule evolution, self-healing, context-aware sizing |
| v1.0.0 — Platform | 10 | MCP server, /specify, /decide, skill authoring, dependency-aware tasks |
