---
type: Phase History
---

# Phase 6 — Adapter Overlay & Verification: Implementation History

> Append-only log. Do NOT edit existing entries.

## Entry Types

| Type | When to use |
|------|------------|
| [DECISION] | ADR created, technology choice made |
| [SCOPE_CHANGE] | Phase deliverables added or removed |
| [DISCOVERY] | Bug, tech debt, or enhancement found |
| [FEATURE] | New planned feature |
| [ARCH_CHANGE] | Architectural pattern changed |
| [EVALUATOR] | Locked evaluator defined or evaluation set changed |
| [NOTE] | Anything else worth recording |

## Entries

### [DECISION] 2026-05-08 — Phase 6 scope: two pillars (adapter overlay + verification rigor)
Topics: phase-6, scope, adapter, verification
Affects-phases: phase-6-overlay-and-verify, phase-7 (downstream — execution engine assumes overlay)
Affects-specs: specs/phases/phase-6-overlay-and-verify/overview.md
Detail: Phase 5 hardened rules. Phase 6 evolves the adapter contract to allow per-agent commands/rules/scripts (overlays) AND adds verification rigor (Rule 12 + /complete-phase evidence). Original "Execution Engine" framing pulled apart — the subagent runner moved to Phase 7 because it's a Claude-Code-specific feature that should land on top of a proven overlay structure, not the other way round.

---

### [DECISION] 2026-05-08 — Adapter overlay: additive-only, conflict = error
Topics: adapter, contract, FEAT-012
Affects-phases: phase-6-overlay-and-verify
Affects-specs: specs/phases/phase-6-overlay-and-verify/plan.md (Group 0)
Detail: Considered three models — adapter overrides core (Rails-like), conflict = error, additive-only with no shared filenames. Chose additive-only with conflict detection. Rationale: (1) zero precedence logic to remember; (2) matches the existing "templates must be generic; per-agent in adapters/" project rule; (3) duplicate filenames almost always indicate a mistake about which one is canonical. Generic things go in `core/`, agent-specific in `adapters/<name>/`, and the CLI errors out if both exist before any writes.

---

### [DECISION] 2026-05-08 — /review-code is Claude-Code-specific, not generic
Topics: FEAT-013, /review-code, adapter-overlay
Affects-phases: phase-6-overlay-and-verify
Affects-specs: specs/phases/phase-6-overlay-and-verify/plan.md (Group 2)
Detail: A generic /review-code in `core/` would be prompt-only — useful but loses the value of role-based subagent reviews (security/QA/architecture). Subagent dispatch is a Claude Code Task-tool capability; Cursor/Gemini lack it. Placing /review-code in `adapters/claude-code/commands/` proves the overlay structure end-to-end and ships the high-value version. Other agents can ship their own /review-code variant in their own overlay later.

---

### [DECISION] 2026-05-08 — Rule 12 is "Verify before claim" (universal), not TDD
Topics: rules, ENH-015, verification, TDD
Affects-phases: phase-6-overlay-and-verify, phase-7
Affects-specs: specs/phases/phase-6-overlay-and-verify/overview.md, specs/planning/roadmap.md
Detail: The original v2 wishlist had TDD as Rule 12. Rejected for Phase 6: TDD applicability is project-class-dependent (docs/infra/design projects don't TDD), so making it a default rule penalizes those projects. "Verify before claim" is universal — any agent, any project, any task. TDD ships in Phase 7 as Rule 13 with opt-in framing.

---

### [DECISION] 2026-05-08 — Defer subagent execution engine, TDD, systematic-debugging, SessionStart to Phase 7
Topics: phase-6, scope, deferrals, phase-7
Affects-phases: phase-6-overlay-and-verify, phase-7
Affects-specs: specs/planning/roadmap.md
Detail: Original Phase 6 wishlist (per `docs/research/v2-improvement-ideas.md`) included subagent execution engine, TDD enforcement, systematic-debugging skill, /review-code, verification rigor, SessionStart auto-activation, and remaining persuasion-hardening. That bundle would not fit a focused phase. Cut to two pillars: adapter overlay (foundation) + verification rigor (universal generic value), plus /review-code as the proof-of-concept for the overlay. Subagent engine, TDD, systematic-debugging, SessionStart, and remaining persuasion-hardening shift to Phase 7 (Execution Excellence).

---

### [NOTE] 2026-05-08 — Phase 7+ roadmap committed
Topics: roadmap, phase-7, phase-8, phase-9, phase-10
Affects-phases: phase-7, phase-8, phase-9, phase-10 (future)
Affects-specs: specs/planning/roadmap.md
Detail: Sequenced based on `docs/research/v2-improvement-ideas.md` and competitive analysis. Phase 7 — Execution Excellence (subagent runner, systematic-debugging, TDD opt-in, SessionStart, hardening Rules 1/3/4/5/7/9 if evidence emerges). Phase 8 — Reach (Cursor + Gemini adapters, ENH-009 distribution decision, contract refinements from second/third adapters). Phase 9 — Intelligence (self-learning hooks, retrospective-driven rule evolution, self-healing, context-window-aware sizing). Phase 10+ — Platform (MCP server, /specify, /decide ADR command, skill authoring, dependency-aware ordering, bidirectional spec sync experimental). Sequencing principle: structural foundations before features that exploit them.

---

### [DECISION] 2026-05-08 — Phase shortname `phase-6-overlay-and-verify`
Topics: phase-6, naming
Affects-phases: phase-6-overlay-and-verify
Affects-specs: specs/planning/roadmap.md
Detail: Considered `execution-engine` (original placeholder), `extensibility-and-verification`, `adapter-v2`. Chose `overlay-and-verify` — captures both pillars accurately and is short. "Execution-engine" was misleading once the subagent runner moved to Phase 7. "Overlay" describes the structural change, "verify" describes the functional change.

---

### [DISCOVERY] 2026-05-08 — Project name customization in CLAUDE.md is lost on upgrade
Topics: claude-md, upgrade, marker, project-name, ENH-017
Affects-phases: phase-6-overlay-and-verify, phase-7 (candidate fix)
Affects-specs: none
Detail: Phase 6 dogfood revealed that `# Project Rules: <Project Name>` (and the subtitle line) live in the managed section above the `## Project Extensions` marker. So the user's customization (e.g., "momentum") gets reset to the template placeholder on every `momentum upgrade`. Logged as ENH-017 (P2) for Phase 7 consideration — options include a one-time placeholder substitution at install, or moving the title below the marker. Workaround today is re-editing the title manually post-upgrade.

---

### [DISCOVERY] 2026-05-08 — momentum's own .agent/rules/project.md was pre-marker and stale
Topics: dogfood, agent-rules, marker, migration
Affects-phases: phase-6-overlay-and-verify
Affects-specs: none
Detail: The repo's `.agent/rules/project.md` predated the marker convention AND was a stale pre-Phase-5 version (Rules 1–10 with old wording, no Rule 11). The Phase 6 upgrade migrated it correctly via `upgradeMarkedFile` ("migrated" path with .bak), then the dogfood manually de-duped the appended legacy content under `## Project Extensions`. No code change required — the migration behaved as designed; the file was just historically stale.

---

### [DISCOVERY] 2026-05-08 — Stale `brainstorm-project.md` left over in `.claude/commands/`
Topics: dogfood, commands, cleanup
Affects-phases: phase-6-overlay-and-verify
Affects-specs: none
Detail: `.claude/commands/brainstorm-project.md` was still present in the repo's local install. It was renamed to `start-project.md` in Phase 3 (ENH-006), but `momentum upgrade` never deletes commands — it only adds/updates. Removed manually as part of Phase 6 dogfood. Logged for awareness; no rule change. A future enhancement could add an "orphan command sweep" but it risks deleting user-created commands and is not pursued now.

---

### [NOTE] 2026-05-08 — Phase 6 implementation: groups 0-4 landed
Topics: phase-6, execution, overlay, verification
Affects-phases: phase-6-overlay-and-verify
Affects-specs: none
Detail: All five execution commits landed on `phase-6-overlay-and-verify`: Group 0 (adapter overlay + conflict detection in CLI), Group 1 (Rule 12 + /complete-phase evidence + cross-repo Rule 9 + /sync-docs), Group 2 (/review-code Claude-Code overlay), Group 3 (24 tests via node:test), Group 4 (dogfood — momentum upgrade on self, with manual de-dupe of stale agent-rules content and title restore). All 24 tests pass. Ready for Group 5 (release prep).

---
