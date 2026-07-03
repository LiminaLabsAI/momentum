# Phase 23 — Rules Unification: History

### [DISCOVERY] 2026-07-03 — Two-tier rule architecture is the root cause of live rule violations
Topics: agent-rules, instructions, adapters, codex, antigravity
Affects-phases: phase-23-rules-unification
Affects-specs: none
Detail: Codex/Antigravity auto-load only a reference-only AGENTS.md (167–248 lines) that defers to `.agent/rules/project.md`, which no agent auto-loads; only Claude Code gets the full 468-line rulebook. A live Antigravity session (2026-07-03) edited files directly on `main` (Rule 6), skipped verification on its VAL-002 closure (Rule 12), and updated no tracking (Rule 2) — all rules that exist only in the surfaces it never loaded. RCA supplied by that session's operator; verified against the source tree.

---

### [DECISION] 2026-07-03 — Build-time generation over install-time assembly or mirrored copies
Topics: instructions, generation, templates, fingerprints
Affects-phases: phase-23-rules-unification, phase-22-reach
Affects-specs: none (ADR to be written in G0)
Detail: One canonical `core/instructions/rules-body.md` + per-adapter headers; a repo script regenerates the three committed instruction templates; a drift-guard test asserts committed == generated. Chosen over install-time assembly (keeps shipped artifacts static/fingerprintable) and over three mirrored copies (eliminates permanent sync-drift risk). Operator-approved 2026-07-03.

---

### [DECISION] 2026-07-03 — Migration: delete-if-pristine, keep+warn if customized
Topics: upgrade, migration, agent-rules, orphan-cleanup
Affects-phases: phase-23-rules-unification
Affects-specs: none
Detail: On upgrade, an installed `.agent/rules/project.md` whose content hash matches any shipped historical revision (committed manifest harvested from git history) is removed via the orphan path; anything else is user-customized — kept, with a deprecation warning pointing at `## Project Extensions`. Safe failure direction: an unknown-but-pristine copy merely warns, never destroys. Operator-approved 2026-07-03.

---

### [DECISION] 2026-07-03 — Phase 23 runs BEFORE Phase 22 (Reach)
Topics: roadmap, sequencing, adapters
Affects-phases: phase-22-reach
Affects-specs: specs/planning/roadmap.md#phase-22
Detail: Reach adds new adapters; unifying the instruction architecture first means they are born single-source instead of inheriting the two-tier pattern and immediately becoming migration debt. Operator-approved 2026-07-03.

---
