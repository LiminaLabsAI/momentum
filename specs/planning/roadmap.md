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
| 6 | Adapter Overlay & Verification | **Complete (v0.7.0 / hotfix v0.7.1)** | Adapter Contract v2 (per-agent commands/rules/scripts overlays, conflict = error); Rule 12 verify-before-claim; `/complete-phase` evidence rigor; `/review-code` (Claude Code, subagent-driven); ENH-014 cross-repo Rule 9; `tests/` for momentum CLI (24 tests via node:test) |
| 7a | Planning Contracts | **Complete (v0.8.0)** | Brainstorm Gate Contract (markdown discipline + Claude Code PreToolUse hook + `.momentum/brainstorm-active` sentinel) across `/brainstorm-phase`, `/brainstorm-idea`, `/start-project`; `/start-phase` Autonomous Execution Contract (spec only — engine ships in 7b); `.gitignore` hygiene for `._*` + `.momentum/`; test glob fix for macOS AppleDouble |
| 7b | Agent Runtime Compatibility | Ready to Release (target v0.9.0) | Adapter Contract v3; Codex adapter MVP (`AGENTS.md`, `.codex/hooks.json`, Codex command recipes); Claude regression coverage; ENH-018 tarball-shape test |
| 7c | Autonomous Execution & TDD | Not Started (target v0.10.0) | Subagent/autonomous execution engine implementing the autonomy contract from 7a on Adapter Contract v3; TDD opt-in (Rule 13); retry budget per-task |
| 8 | Parallel Worktree Orchestration | Not Started (target v0.11.0) | Multiple concurrent streams via git worktrees; `momentum worktree-manager` command; branch-per-stream conventions; conflict avoidance; cross-stream status visibility |
| 9 | Hardening & Activation | Not Started (target v0.12.0) | Full systematic-debugging skill; SessionStart auto-activation (Claude Code); persuasion-hardening Rules 1/3/4/5/7/9 (evidence-permitting); ENH-017 project-name preservation across upgrade |
| 10 | Reach | Not Started (target v0.13.0) | Adapter: Cursor (FEAT-007); Adapter: Gemini CLI (FEAT-008); ENH-009 distribution decision; adapter contract refinements from additional adapters |
| 11 | Intelligence | Not Started (target v0.14.0) | Self-learning hooks (`specs/learnings.md`); retrospective-driven rule evolution; self-healing (recurring failure → ADR proposal); context-window-aware task sizing |
| 12 | Platform | Not Started (target v1.0) | MCP server; `/specify` auto-spec generation; `/decide` (ADR creation); skill/command authoring command; dependency-aware task ordering; bidirectional spec sync (experimental) |

## Phase Dependencies

```
Phase 0 (Bootstrap)
  └── Phase 1 (Tool-Agnostic Architecture)
       └── Phase 2 (npx CLI Distribution)
            └── Phase 3 (Gap Fixes)
                 └── Phase 4 (Enhanced Commands)
                      └── Phase 5 (Rules & Upgrade Safety) ✓
                           └── Phase 6 (Adapter Overlay & Verification — assumes hardened rules)
                                └── Phase 7a (Planning Contracts — assumes overlay structure)
                                     └── Phase 7b (Agent Runtime Compatibility — proves multi-agent adapter boundary)
                                          └── Phase 7c (Autonomous Execution & TDD — assumes Adapter Contract v3)
                                               └── Phase 8 (Parallel Worktree Orchestration — assumes autonomous execution)
                                                    └── Phase 9 (Hardening & Activation — assumes execution maturity)
                                                         └── Phase 10 (Reach — assumes hardened execution)
                                                              └── Phase 11 (Intelligence — assumes multi-agent base)
                                                                   └── Phase 12 (Platform — assumes the rest)
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
| v0.7.1 — BUG-002 hotfix | 6 | Patched npm tarball `files` glob (`adapters/**/commands/**`) so overlay files actually ship |
| v0.8.0 — Planning Contracts | 7a | Brainstorm Gate Contract (3 commands + Claude Code PreToolUse hook + sentinel); /start-phase Autonomous Execution Contract (spec only); .gitignore hygiene; test glob fix |
| v0.9.0 — Agent Runtime Compatibility | 7b | Adapter Contract v3; Codex adapter MVP; Claude regression coverage; tarball-shape test |
| v0.10.0 — Autonomous Execution & TDD | 7c | Autonomous execution engine; TDD opt-in Rule 13; retry budget per-task |
| v0.11.0 — Parallel Worktree Orchestration | 8 | Multi-stream concurrent development via git worktrees; worktree-manager command; branch-per-stream conventions |
| v0.12.0 — Hardening & Activation | 9 | systematic-debugging skill (full); SessionStart auto-activation; Rules 1/3/4/5/7/9 hardening; ENH-017 |
| v0.13.0 — Reach | 10 | Cursor + Gemini adapters; ENH-009 distribution decision |
| v0.14.0 — Intelligence | 11 | Self-learning, retrospective-driven rule evolution, self-healing, context-aware sizing |
| v1.0.0 — Platform | 12 | MCP server, /specify, /decide, skill authoring, dependency-aware tasks |
