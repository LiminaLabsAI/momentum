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
### [EVALUATOR] 2026-07-05 — G0 fact sheet locked: the vendor-truth reference for all groups
Topics: antigravity, evidence, hooks, val-002
Affects-phases: phase-22b-antigravity-2-adoption
Affects-specs: none
Detail: `evidence/fact-sheet.md` locks the Antigravity 2.x contract against agy 1.0.16: four accepted customization roots (.agents/.agent/_agents/_agent); AGENTS.md hierarchical auto-load (confirmed in-context); workflows register as slash commands; skills = <name>/SKILL.md dirs; hooks = named groups over EXACTLY five events (no SessionStart — PreInvocation invocationNum==0 + injectSteps/ephemeralMessage is the session-start mechanism); PreToolUse decision contract (allow/deny/ask/force_ask); camelCase payloads captured verbatim (hook-captures/); real tool names run_command/write_to_file/view_file/list_dir/list_permissions; plugins = plugins/<name>/plugin.json bundles; CLI flag surface locked (no --cwd/--skill — Phase 18 spawn contract fictional; --new-project REQUIRED for headless isolation). Vendor reference docs archived verbatim under evidence/vendor-docs/. All six VAL-002 questions answered (fact-sheet §8).

---
### [DISCOVERY] 2026-07-05 — Intermittent indefinite hang in headless agy runs WITH hooks.json present (vendor bug candidate)
Topics: antigravity, hooks, spawn, reliability
Affects-phases: phase-22b-antigravity-2-adoption
Affects-specs: none
Detail: During the probe battery, hook-ful headless runs hung indefinitely 6/10 times — ignoring --print-timeout, writing ZERO log lines — while hook-less runs passed 3/3 and the same configs passed minutes before/after (fact-sheet §9–10). Not attributable to config shape; working hypothesis is an intermittent hook-runner stdin/deadlock in agy 1.0.16. Consequences: momentum's shipped hooks.json shape stays UNVERIFIED (moot — G1 adopts the documented vendor schema); deny semantics remain doc-sourced pending a stable re-probe; every headless integration (spawn(), CI probes) MUST wrap agy in an external watchdog with pacing. Filed as ENH-052; upstream report drafted in G4.

---
### [ARCH_CHANGE] 2026-07-05 — G1: adapter realigned to the locked 2.x contract (ADR-0005)
Topics: antigravity, adapters, hooks, instructions
Affects-phases: phase-22b-antigravity-2-adoption
Affects-specs: specs/decisions/0005-antigravity-canonical-root-and-hook-shim.md
Detail: All destinations consolidated to the canonical `.agents/` root (legacy `.agent/` orphan-cleaned on upgrade by Phase 20 machinery); hooks.json rewritten to the vendor named-group schema over the real five events; NEW boundary shim adapters/antigravity/scripts/antigravity-hook-adapter.sh translates camelCase payloads → shared scripts and maps responses (deny decisions, notice queue for PostToolUse, PreInvocation ephemeralMessage injection for handoff banner + queued reminders at invocationNum 0). Core scripts byte-identical to main — capture tool reports claude-code/codex "no change"; antigravity fingerprint re-baselined once (58→59 files). Suite 733 → 739 green.

---
### [FEATURE] 2026-07-05 — G2: spawn() rewritten on the real agy surface; live smoke green
Topics: antigravity, spawn, swarm
Affects-phases: phase-22b-antigravity-2-adoption
Affects-specs: none
Detail: adapter.spawn(directive) now launches a DETACHED `agy --new-project --dangerously-skip-permissions --print-timeout <bound> -p <boot prompt>` from directive.repoPath (spawnSync cwd replaces the fictional --cwd; skill engagement by name replaces the fictional --skill), logs to .momentum/swarm-supervisor-<swarm>-w<wave>.log, and returns the contract tuple synchronously (missing binary detected up front with the official-installer hint). Detached-async replaces claude-code's 5s spawnSync shape because agy print runs take minutes and can hang past their own timeout (ENH-052) — the conductor must never block. Live smoke: real agy launched, log captured BOOT-OK (evidence/spawn-smoke.md). Suite 740/740.

---
### [SCOPE_CHANGE] 2026-07-05 — G3: reviewer subagent definitions dropped (no such vendor surface); plugin packaging shipped
Topics: antigravity, subagents, plugins, doctor
Affects-phases: phase-22b-antigravity-2-adoption
Affects-specs: none
Detail: G0 evidence (fact-sheet §7) found no documented or observed project-level subagent-definition surface in agy 1.0.16 — the planned "reviewers as native subagent defs" deliverable would have been Phase-18-style fiction, so it is dropped; reviewers stay skills (semantic activation IS the vendor mechanism). Shipped instead: `momentum antigravity plugin-pack [--global]` (plugin.json + 5 skills; live-validated with `agy plugin validate` → [ok]) and the `momentum doctor` advisory (lock-file-gated, official installer, never provisions — the ENH-051 supersession made real). Bonus discovery: the plugin validator recognizes undocumented `agents`/`commands` plugin subdirs — future surfaces. Suite 740 → 745.

---
