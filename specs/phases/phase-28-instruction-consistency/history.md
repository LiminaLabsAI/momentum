---
type: History
---

# Phase 28 — History

| Type | Meaning |
|---|---|
| [DECISION] / [SCOPE_CHANGE] / [DISCOVERY] / [FEATURE] / [ARCH_CHANGE] / [EVALUATOR] / [NOTE] | per Rule 8 |

---

### [DISCOVERY] 2026-07-09 — CLAUDE.md vs AGENTS.md diverge for four distinct reasons
Topics: instructions, divergence, upgrade, ecosystem-pointer, project-extensions
Affects-phases: phase-28-instruction-consistency
Affects-specs: bin/momentum.js, core/ecosystem/lib/pointer.js
Detail: Operator asked why the self-repo's CLAUDE.md (535 lines) and AGENTS.md (619) differ so much (claude-code was installed first, opencode added later). Investigation found FOUR causes, two of them bugs: (1) STALENESS — `upgrade()` writes only `state.agents[agent]`, never iterating all installed agents, so upgrading claude-code left opencode's AGENTS.md behind (missing the Phase-25 "Not founded" para + Phase-26 config nav row); (2) ECOSYSTEM POINTER GAP — `pointer.js` PRIMARY_INSTRUCTION_CANDIDATES injects into only ONE file (prefers CLAUDE.md), so AGENTS.md never gets the ecosystem block; (3) PROJECT EXTENSIONS DIVERGENCE — per-file preserved prose edited independently (CLAUDE.md grew a full release checklist + self-audits; AGENTS.md stayed a stub); (4) INTENTIONAL per-adapter differences (TodoWrite→task tool, adapter surface sections) — correct, not drift.

---

### [DECISION] 2026-07-09 — ADR-0010: the instruction file is a projection of specs/, never authored
Topics: architecture, projection, single-source, project-rules
Affects-phases: phase-28-instruction-consistency
Affects-specs: specs/decisions/0010-*.md, core/specs-templates/CLAUDE.md, specs/project-rules.md
Detail: The design principle that closes the divergence at its root — CLAUDE.md/AGENTS.md carry NO hand-authored content; they are 100% generated (managed rules + pointers). Every project-specific thing lives once in specs/: structured facts in config.md (read by recipes), prose in a new shared project-rules.md (pointed to), ecosystem context in the injected pointer. Consistency becomes structural, not maintained. Natural endpoint of Phase 23 (single-source rules) + Phase 26 (config-not-core). Decisional change to the upgrade-preservation contract → ADR required (Rule 10/14).

---

### [DECISION] 2026-07-09 — Reference model = pointer (not injection); Project Extensions retired as an authoring surface
Topics: project-rules, pointer, project-extensions, migration
Affects-phases: phase-28-instruction-consistency
Affects-specs: specs/project-rules.md, core/specs-templates/CLAUDE.md
Detail: Operator chose the POINTER model — each instruction file's `## Project Extensions` becomes a tiny managed "see specs/project-rules.md" block (identical everywhere), NOT full-content injection (which reintroduces the sync-can-miss-an-agent risk). Recommendation adopted: the shared file is the ONLY home — no per-file free zone (a free zone is a drift surface by construction; genuinely agent-specific rules use a "(Claude Code only)" annotation in project-rules.md, the same way "monorepo only" qualifiers already work). Non-negotiable safety: upgrade MIGRATES existing Project-Extensions prose into project-rules.md (dropping config-covered release commands), never drops it — a one-time content-preserving migration like Phase 24 (OKF) / Phase 25 (placeholder removal).

---

### [DECISION] 2026-07-09 — Two mechanism fixes: upgrade-all-agents + pointer-into-all-files
Topics: upgrade, ecosystem-pointer, consistency
Affects-phases: phase-28-instruction-consistency
Affects-specs: bin/momentum.js, core/ecosystem/lib/pointer.js
Detail: (1) `momentum upgrade` (no --agent) iterates every agent in installed.json.agents so no agent's instruction file silently drifts (kills cause #1); --agent X still targets one; per-agent orphan cleanup (ADR-0007) preserved. (2) `pointer.js` injects/refreshes the ecosystem block into EVERY present primary-instruction file, not just the preferred one (kills cause #2), preserving BUG-022 upgrade re-injection. Install-new-agent then starts consistent by construction (kills cause #3): current managed rules + same ecosystem pointer + same project-rules pointer, nothing project-specific per-file.

---

### [DECISION] 2026-07-09 — Finish the Phase-26 config move: /complete-phase release runs fully from config
Topics: config, release, complete-phase
Affects-phases: phase-28-instruction-consistency
Affects-specs: core/commands/complete-phase.md, specs/config.md
Detail: Most of CLAUDE.md's release checklist (gh release create, npm publish) is REDUNDANT with Phase-26 config (release_command, publish_target, release_flow). `/complete-phase` should execute the release fully from config, so the prose checklist is deleted (not migrated). Only genuinely-prose project rules (session-start self-audits, the "template files must be generic" meta-constraint) move to project-rules.md.

---

### [FEATURE] 2026-07-09 — G1: upgrade refreshes every installed agent (cause #1)
Topics: upgrade, multi-agent, drift
Affects-phases: phase-28-instruction-consistency
Affects-specs: bin/momentum.js
Detail: The staleness root cause: `agent` defaults to 'claude-code' and `upgrade()` writes only that one agent → a project with claude-code + opencode only ever refreshed claude-code, leaving AGENTS.md behind. Fix at the dispatch layer (not inside `upgrade()`, which stays cleanly single-agent + keeps per-agent orphan cleanup, ADR-0007): with no explicit `--agent`, read `installed.json.agents` and call `upgrade()` once per installed agent (autostash wraps the whole loop once); `--agent X` still targets one. 2 tests; 956 → 958.

---

### [FEATURE] 2026-07-09 — G0: ADR-0010 + project-rules.js migration core + BUG-027
Topics: project-rules, migration, okf-type, BUG-027, ADR-0010
Affects-phases: phase-28-instruction-consistency
Affects-specs: specs/decisions/0010-instruction-file-is-a-projection.md, core/lib/project-rules.js, core/lib/okf-types.js
Detail: ADR-0010 accepted. `Project Rules` OKF type registered (okf-types.js: `project-rules.md`). `core/lib/project-rules.js` ships `migrateProjectExtensions()` + `renderPointerBlock`/`renderProjectRules`/`extractAuthoredProse`/`pointerizeContent`. **G0 refinement (safer than the drafted contract):** migration moves ALL authored prose verbatim into project-rules.md — it does NOT auto-drop config-covered release prose. Rationale: reliably identifying "config-covered" from prose is fragile; migrate-ALL is unambiguously lossless, and the config-covered redundancy is neutralized by making `/complete-phase` config-driven (G3), leaving the migrated release checklist as harmless documentation the user can trim. BUG-027 fixed in all 4 adapter templates. 5 tests; 927→956 baseline note: suite 956/956 (was 951 at Phase-27 release; +5 G0). codex+opencode fingerprints re-baselined (BUG-027 AGENTS.md).

---

### [SCOPE_CHANGE] 2026-07-09 — Fold BUG-027 + flip stale backlog statuses
Topics: BUG-027, backlog-hygiene, scope
Affects-phases: phase-28-instruction-consistency
Affects-specs: adapters/opencode/instructions, adapters/codex/instructions, specs/backlog/backlog.md
Detail: BUG-027 (sync-config recipe row missing trailing `|` in 4 adapter templates) folds into G0 — it re-baselines the same AGENTS.md fingerprints this phase touches. Pre-phase check found backlog-status drift: BUG-024/025/026 + ENH-061 still show open/in-progress though Phases 26–27 shipped and closed them (complete-phase didn't flip them) — G4 flips them to resolved. Renumber at /start-phase: Intelligence → 29, Platform → 30.

---
