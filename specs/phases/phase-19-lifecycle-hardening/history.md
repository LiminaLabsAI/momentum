# Phase 19 — Lifecycle Hardening: History

> Append-only. See CLAUDE.md Rule 8 for entry format.

### [NOTE] 2026-06-19 — Phase brainstormed from the git/lifecycle review
Topics: lifecycle, git-enforcement, ad-hoc-work
Affects-phases: phase-19-lifecycle-hardening
Affects-specs: specs/phases/phase-19-lifecycle-hardening/overview.md
Detail: Phase created via `/brainstorm-phase` off the 2026-06-19 multi-agent git-lifecycle + lifecycle-model review. Single phase, two workstreams (git enforcement + ad-hoc lane). Covers BUG-009, FEAT-018/019/020, ENH-041/042/043/044/045, TD-007/008.

---

### [DECISION] 2026-06-19 — Single phase, hard-block enforcement, escape hatch
Topics: scope, enforcement
Affects-phases: phase-19-lifecycle-hardening
Affects-specs: specs/phases/phase-19-lifecycle-hardening/overview.md#key-decisions
Detail: User chose a single phase over a split, and hard-block (exit≠0) enforcement over soft-warn, because soft-warn reproduces the exact "advice masquerading as enforcement" problem the phase exists to fix. Escape hatch = `MOMENTUM_SKIP_HOOKS=1` + single-use `.momentum/merge-approved` sentinel.

---

### [DECISION] 2026-06-19 — ENH-041 reframed forge-neutral (vendor-agnostic / DIP)
Topics: vendor-agnostic, dependency-inversion, git-enforcement
Affects-phases: phase-19-lifecycle-hardening
Affects-specs: specs/backlog/backlog.md, specs/phases/phase-19-lifecycle-hardening/overview.md
Detail: User rejected shipping a GitHub-specific `gh api` Ruleset template into core — momentum is forge-agnostic by the same DIP that gives it per-agent adapters. Resolution: real enforcement stays in vendor-neutral git hooks (work on any forge, under any agent); server-side branch protection becomes forge-neutral docs (GitHub Rulesets / GitLab protected branches / Bitbucket permissions). Forge-specific scaffolding, if ever wanted, belongs behind a future "forge adapter," out of scope here.

---

### [DECISION] 2026-06-19 — Hook delivery via core.hooksPath → tracked .githooks/
Topics: git-enforcement, zero-dependency
Affects-phases: phase-19-lifecycle-hardening
Affects-specs: specs/phases/phase-19-lifecycle-hardening/plan.md#group-0
Detail: Hooks ship as plain `.sh` in a tracked `.githooks/` dir; `bin/momentum.js` wires them via `git config core.hooksPath`. Chosen over copying into `.git/hooks/` (versioned, survives clone) and over husky/lefthook (preserves the zero-dependency posture). Must warn-not-clobber when a target already sets `core.hooksPath` or uses husky (BUG-008 lesson).

---

### [DECISION] 2026-06-19 — phase-8 to be closed and deleted (TD-008)
Topics: worktrees, phase-8, cleanup
Affects-phases: phase-19-lifecycle-hardening, phase-8-parallel-worktrees
Affects-specs: specs/planning/unscheduled-parallel-streams.md
Detail: Resolve phase-8 limbo by closing it won't-do: native Claude Code `--worktree` + the swarm now cover the parallel-isolation need, and the 546-LOC `worktree-manager.js` predates the Phase 10 state machine. Fix the branch's false "shipped v0.11.0" retrospective first, then delete the branch.

---

### [SCOPE_CHANGE] 2026-06-19 — Phase 19 inserted; roadmap renumbered
Topics: roadmap
Affects-phases: phase-19-lifecycle-hardening
Affects-specs: specs/planning/roadmap.md, specs/status.md
Detail: Lifecycle Hardening slots in as Phase 19, pushing Reach → 20, Intelligence → 21, Platform → 22. Rationale: foundational — should land before shipping more coding-agent adapters that would propagate the "(Automatic)" overstatement to more installs. The renumber itself is a Group 3 deliverable.

---
