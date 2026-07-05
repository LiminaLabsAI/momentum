# Phase 22b History

> Append-only. Format per Rule 8.

### [DECISION] 2026-07-05 — Full 2.0 adoption scope (operator choice)
Topics: antigravity, adapters, scope
Affects-phases: phase-22b-antigravity-2-adoption
Affects-specs: none
Detail: Operator chose "Full 2.0 adoption" over realign-only: broken-wiring fixes PLUS native subagent definitions, `agy plugin` packaging, and global-skills opt-in, in one phase. Rationale: momentum is agent-agnostic and Antigravity is a first-class supported vendor — "fix it all."

---
### [DECISION] 2026-07-05 — Evidence-first ordering: G0 fact sheet before any adapter edit
Topics: antigravity, validation, evidence
Affects-phases: phase-22b-antigravity-2-adoption
Affects-specs: none
Detail: Phase 16 shipped documented-guesses (singular `.agent/` path, invented spawn flags) and Phase 18 could not validate them (no CLI existed). With `agy` 1.0.16 now installed and authenticated, all facts are probeable — so G0 locks a committed, version-pinned fact sheet and NO adapter code changes happen before it. Deterministic probes (hook-fire transcripts, listings, payload captures) preferred over LLM-answer probes.

---
### [DECISION] 2026-07-05 — momentum never provisions vendor software
Topics: antigravity, doctor, install-side-effects
Affects-phases: phase-22b-antigravity-2-adoption
Affects-specs: none
Detail: Confirmed as a phase constraint following the rejected VAL-002 wrapper (see `specs/adhoc/feat-VAL-002-antigravity-compatibility/record.md`): `momentum doctor` detects `agy` and advises the official installer; no venv/pip/binary writes, ever. Supersedes ENH-051 (to be closed in G4).

---
### [DISCOVERY] 2026-07-05 — Gap analysis vs the shipping Antigravity 2.x surface
Topics: antigravity, hooks, adapters, validation
Affects-phases: phase-22b-antigravity-2-adoption
Affects-specs: core/adapter-capabilities.md, core/adapter-parity-matrix.md
Detail: Session gap analysis found: hooks contract wrong ×4 (schema, absolute-path commands, stale matchers incl. Codex's `apply_patch`, exit-code semantics — Antigravity wants always-exit-0 + `{"allow_tool": false}` JSON); `.agent/` vs `.agents/` path matrix unresolved and possibly IDE-vs-CLI divergent; `spawn()` uses nonexistent `--cwd`/`--skill` flags (verified vs `agy --help` 1.0.16); SessionStart ambiguous (five-event file surface vs SDK `OnSessionStartHook`); 2.0 surfaces unadopted (subagent defs, plugins, global skills, scheduled tasks); capability/parity docs self-contradictory (`slashCommands`). agy CLI 1.0.16 installed via official installer 2026-07-05, auth shared with IDE (2.1.1), headless `-p` verified working.

---
### [DISCOVERY] 2026-07-05 — Gemini CLI sunsetted 2026-06-18; FEAT-008 targets a dead product
Topics: roadmap, gemini, adapters
Affects-phases: phase-22b-antigravity-2-adoption
Affects-specs: specs/planning/roadmap.md, specs/backlog/backlog.md
Detail: Google sunset Gemini CLI for non-Enterprise users on 2026-06-18; Antigravity CLI is its successor (`agy plugin import gemini` migrates extensions). Phase 22 Reach's planned FEAT-008 (Gemini CLI adapter) therefore targets a discontinued product — this phase effectively replaces it. Closure recommendation goes to the operator in G4; not unilaterally closed.

---
### [NOTE] 2026-07-05 — BUG-017 deliberately not folded in
Topics: lanes, hooks, git
Affects-phases: none
Affects-specs: none
Detail: BUG-017 (committed `.githooks/*` tracked non-executable → Rule 6 enforcement silently off in fresh worktrees, P1) was surfaced by the Rule 4 pre-phase bug check. It is a ~30-minute standalone fix with no dependency on this phase; routed to its own quick-task lane instead of widening this scope.

---
