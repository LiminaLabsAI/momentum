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
### [DECISION] 2026-07-04 — G0: ADR-0004 accepted; assembly order and vars placement fixed
Topics: instructions, agent-rules, generation, adapters
Affects-phases: phase-23-rules-unification
Affects-specs: specs/decisions/0004-single-source-instruction-generation.md
Detail: ADR-0004 (single-source instruction generation) written and accepted. Assembly order fixed as header → navigation → surfaces → rules-body → Project Extensions tail, with `core/instructions/navigation.md` split out as a shared fragment so the nav table stays near the top of every output. Placeholder values live in `adapters/<agent>/instructions/vars.json` (JSON, not frontmatter — zero-dependency parsing); only two vars needed: TASK_TOOL, TASK_TOOL_NAME. Inventory of agent-specific wording in the old template: exactly the two TodoWrite mentions (Rule 2) — everything else was already agent-neutral.

---

### [NOTE] 2026-07-04 — G0: Antigravity layout table drops the .agent/rules/ row
Topics: antigravity, agent-rules, surfaces
Affects-phases: phase-23-rules-unification
Affects-specs: none
Detail: The antigravity surfaces fragment omits the `.agent/rules/` row from the native-layout table — that surface is retired this phase, and its claimed "auto-loaded by agy" behavior is exactly what the 2026-07-03 live failure disproved. No other content edits were made during extraction (non-goal: no rule rewrites).

---
### [NOTE] 2026-07-04 — G1: generation live; outputs verified surgically clean
Topics: instructions, generation, tests
Affects-phases: phase-23-rules-unification
Affects-specs: none
Detail: Generator + drift guard shipped. Regenerated CLAUDE.md diff vs the previous hand-maintained template contains exactly the intended changes (marker comment added, two `.agent/rules/project.md` pointer lines removed, Rule 13 expanded) — zero other churn, proving the extraction was lossless. Codex AGENTS.md 248 → 691 lines, Antigravity 167 → 608: the full rulebook now rides every auto-loaded surface. Targeted tests 4/4.

---
### [DECISION] 2026-07-04 — G2: destinations['agent-rules'] contract key stays reserved
Topics: adapters, contract, agent-rules
Affects-phases: phase-23-rules-unification
Affects-specs: core/adapter-parity-matrix.md#overlay
Detail: No adapter ships an `agent-rules/` overlay directory (verified by glob), so retiring the shipped file requires no contract change — the `destinations['agent-rules']` key stays reserved for future per-adapter rule overlays, matching the "declared but unused" pattern already used for workflows/skills on some adapters. Parity matrix row updated to "retired".

---

### [DISCOVERY] 2026-07-04 — G3 sweep found 6 unplanned reference sites
Topics: agent-rules, cleanup, adapters
Affects-phases: phase-23-rules-unification
Affects-specs: none
Detail: Beyond the ~8 planned files, the repo-wide sweep surfaced: `adapters/claude-code/adapter.sh` (the shell installer also installed project.md — install block retired), two codex subagent TOMLs (`momentum-reviewer-architecture`, `swarm-supervisor`), the antigravity swarm-supervisor SKILL.md, `adapters/antigravity/workflows/scout.md`, and `docs/developer-guide.md`. All repointed to the primary instruction file. Live migration smoke: fresh install ships no `.agent/rules/`; pristine historical copy removed; customized copy kept with warning — all three paths verified against the real CLI.

---
### [DISCOVERY] 2026-07-04 — Lane was silently based on an unlanded branch; rebased mid-phase (ENH-050 filed)
Topics: lanes, rebase, contamination, instructions
Affects-phases: phase-23-rules-unification
Affects-specs: none
Detail: `momentum lanes open` branched this lane from the primary worktree's HEAD, which was sitting on the rejected VAL-002 branch — the lane inherited its full diff, 5 failing environment-dependent tests, and one contaminated line in the extracted antigravity surfaces fragment (the unearned "Fully supported via the agy CLI wrapper" SessionStart claim). Fixed by `git rebase --onto main <bad-base>` (single changelog conflict), restoring the truthful SessionStart row + fallback subsection in surfaces.md, and regenerating — drift guard green. Filed ENH-050 (P1): lanes open should default `--from` to the default branch. Suite failures attributable to the foreign base (agy wrapper ×3, doctor, antigravity fingerprint) disappeared with the rebase.

---
