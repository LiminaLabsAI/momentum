---
type: History
---

# Phase 27 — History

| Type | Meaning |
|---|---|
| [DECISION] / [SCOPE_CHANGE] / [DISCOVERY] / [FEATURE] / [ARCH_CHANGE] / [EVALUATOR] / [NOTE] | per Rule 8 |

---

### [DISCOVERY] 2026-07-09 — BUG-025: phase-0 branch hijacks the forge default branch
Topics: default-branch, first-push, founding, start-phase
Affects-phases: phase-27-lifecycle-cleanup
Affects-specs: specs/backlog/backlog.md, core/commands/start-project.md, core/commands/start-phase.md
Detail: Operator new-project dogfood — after init → /start-project → phase-0 → /complete-phase, the GitHub default branch was phase-0, not main. Root cause is emergent git behavior: /start-project commits the founding to main locally only (start-project.md:92-95); the first push the remote sees is /start-phase's `git push -u origin phase-N` (start-phase.md:94), and a fresh forge repo adopts the first pushed branch as default. No `gh repo edit --default-branch` exists anywhere. Also the direct cause of "can't delete the branch" for the first phase (a forge refuses to delete its default branch).

---

### [DISCOVERY] 2026-07-09 — BUG-026: no worktree/branch/lane-state cleanup after landing/release
Topics: cleanup, worktree, lanes, complete-phase
Affects-phases: phase-27-lifecycle-cleanup
Affects-specs: specs/backlog/backlog.md, core/commands/complete-phase.md, core/lanes/lib/land.js
Detail: complete-phase deletes the branch (complete-phase.md:133-138) but has ZERO worktree handling (grep: 0 hits); `lanes land --execute` (land.js:271-298) merges + marks landed + signals, then stops — never removes worktree, deletes branch, or clears `<git-common-dir>/momentum/lanes/<id>` state. Live evidence in this repo: two stale lane worktrees for already-released work (feat-open-knowledge-format = v0.27.0; feat-site-redesign = landed) + an orphan `.claude/worktrees/thirsty-euler-781615` not in `git worktree list`.

---

### [DISCOVERY] 2026-07-09 — ENH-063: `lanes close` removes only the worktree
Topics: lanes, close, cleanup
Affects-phases: phase-27-lifecycle-cleanup
Affects-specs: specs/backlog/backlog.md, bin/lanes.js
Detail: `cmdClose` (bin/lanes.js:197-212) flips status to closed and, only with --rm-worktree, removes the worktree — it never `git branch -d`s the lane branch nor clears manifest/inbox/signals. Even the explicit cleanup path leaves a dangling branch + state. Fold into the shared cleanupTarget().

---

### [DISCOVERY] 2026-07-09 — Skills transform ingests `._*` AppleDouble → junk skill dirs
Topics: upgrade-hygiene, skills-transform, appledouble
Affects-phases: phase-27-lifecycle-cleanup
Affects-specs: bin/momentum.js
Detail: `.agents/skills/` carries 19 `._*` dirs including `._complete-phase/SKILL.md`, `._start-project/SKILL.md` — meaning transformCommandsIntoSkills processed `._*` inputs and generated junk skill dirs (not just macOS litter). TD-005 removed 23k `._*` once; they regenerated because the transform never filtered them. Plus 8 stray `.bak` files from an upgrade/sync process. Root-cause hygiene is Phase 27 G4.

---

### [DECISION] 2026-07-09 — Escalate to a phase (Rule 14); insert as Phase 27, Intelligence→28, Platform→29
Topics: scope, numbering, rule-14
Affects-phases: phase-27-lifecycle-cleanup
Affects-specs: specs/planning/roadmap.md, specs/status.md
Detail: /hotfix stopped at the Rule 14 gate — this is a lifecycle CONTRACT change (what land/complete-phase clean, first-push semantics), cross-cutting (founding + start-phase + complete-phase + lanes), ~4 files + tests. Operator chose to escalate to a numbered phase (Phase 19 "Lifecycle Hardening" precedent) and insert as Phase 27; Intelligence slides to 28, Platform to 29. Renumber sweep executes at /start-phase.

---

### [DECISION] 2026-07-09 — One reusable cleanup action; trigger is config-driven by end_state
Topics: cleanup-model, config, end_state, forge-neutral
Affects-phases: phase-27-lifecycle-cleanup
Affects-specs: core/lanes/lib/land.js, core/commands/complete-phase.md, specs/config.md
Detail: A branch is "spent" once landed on the terminal branch_flow entry. Cleanup = one git-only, default-branch-safe action; only its TRIGGER differs by who merges. merge-after-yes → synchronous (agent merges in-session); staging-promotion/feature-branch-only/open-pr → reconcile (human/forge merges). Two entry points: land/complete (sync) + `momentum lanes reconcile`. Avoids four divergent cleanup paths; ships no forge code.

---

### [DECISION] 2026-07-09 — Default-branch fix: push-terminal-first + optional gh guard
Topics: default-branch, forge-neutral, gh
Affects-phases: phase-27-lifecycle-cleanup
Affects-specs: core/commands/start-project.md, core/commands/start-phase.md
Detail: Operator chose push-first + optional gh guard. Load-bearing fix = push the terminal branch to origin first at founding (pure git, all forges) so the forge adopts it as default. PLUS a config-gated `gh repo edit --default-branch main` assertion (git_forge=github, gh present, non-fatal) to repair already-hijacked repos. The gh assertion stays recipe-level (agent-run), never shipped as forge code.

---

### [DECISION] 2026-07-09 — Human confirm→verify→clean handshake for non-auto end_states
Topics: handshake, human-in-the-loop, rule-12, cleanup
Affects-phases: phase-27-lifecycle-cleanup
Affects-specs: core/commands/complete-phase.md, core/commands/start-phase.md, core/lanes/lib
Detail: Operator requirement — whatever the config, at end of implementation the agent must ask the human to perform any manual step and confirm when done; on confirmation the agent VERIFIES (Rule 12) the merge actually landed (reconcile ancestor / PR-state check) BEFORE cleaning. The agent never cleans on the bare "yes".

---

### [DECISION] 2026-07-09 — Tracking-before-release ordering gate
Topics: complete-phase, release-gate, tracking-order
Affects-phases: phase-27-lifecycle-cleanup
Affects-specs: core/commands/complete-phase.md
Detail: Operator requirement — status/roadmap/changelog must be updated AND committed BEFORE the version is released, not after. Add an explicit ordering contract + refusal to complete-phase (mirrors the existing "## Verification Evidence" gate): do not enter Release until tracking is committed.

---

### [SCOPE_CHANGE] 2026-07-09 — Add end_state: open-pr; include upgrade/transform hygiene (6 groups); dogfood in G5
Topics: scope, open-pr, upgrade-hygiene, dogfood
Affects-phases: phase-27-lifecycle-cleanup
Affects-specs: core/config.js, bin/momentum.js, specs/config.md
Detail: Operator raised a PR-review release flow (agent pushes + opens PR, human reviews+merges) → add first-class `end_state: open-pr` (G3). Operator chose to keep all 6 groups in one phase (add G4 upgrade/transform hygiene for the ._*/.bak leaks + a doctor sweep) and to clean this repo's real cruft as the G5 dogfood rather than a pre-phase hygiene commit.

---

### [FEATURE] 2026-07-09 — G2: synchronous cleanup on land + tracking-before-release gate
Topics: cleanup, lanes-land, complete-phase, release-gate, tracking-order
Affects-phases: phase-27-lifecycle-cleanup
Affects-specs: core/lanes/lib/land.js, core/commands/complete-phase.md
Detail: `lanes land --execute` now auto-runs cleanupTarget() when the lane lands on the TERMINAL branch (branch_flow last entry, read from config; default main) — worktree + branch + lane-state tombstone; `--keep` opts out; landing on a non-terminal branch (e.g. staging) prints a deferral notice pointing at `lanes reconcile`. `/complete-phase` step 13 replaced its bare `git branch -d` + `git push --delete` with `momentum lanes cleanup` (default-branch-safe; surfaces the BUG-025 hijack instead of failing) and its self-audit now also checks `git worktree list`. Added **Gate B (tracking-before-release)**: tracking (status Latest-Release + Completed-Phases row, README, roadmap, changelog) must be committed before the merge/tag — the release can never precede tracking. 6 tests (land-autoclean ×3, complete-phase-gates ×3); 937 → 943; 4 fingerprints re-baselined (complete-phase drift).

---

### [ARCH_CHANGE] 2026-07-09 — G1: default-branch protection moved to start-phase (the actual first-push site)
Topics: default-branch, start-phase, start-project, founding, antigravity-size-limit
Affects-phases: phase-27-lifecycle-cleanup
Affects-specs: core/commands/start-phase.md, core/commands/start-project.md
Detail: BUG-025's fix lives in `/start-phase`, not `/start-project` — founding COMMITS to main but pushes nothing; the first push momentum makes is the phase branch in start-phase, so that is where the terminal branch must be established on origin first (resilient unborn-remote pull; bootstrap-push main via the single-use merge-approved sentinel; optional git_forge=github `gh repo edit --default-branch` idempotent repair). start-project keeps only a one-line pointer because its Antigravity workflow render was already at the 12,000-char ceiling — any addition busts the vendor size limit (trimmed to fit). 4 adapter fingerprints re-baselined (start-phase/start-project drift only).

---

### [FEATURE] 2026-07-09 — G0: shared cleanupTarget() + default-branch helpers landed
Topics: cleanup, default-branch, lanes
Affects-phases: phase-27-lifecycle-cleanup
Affects-specs: core/lanes/lib/cleanup.js, bin/lanes.js, tests/lane-cleanup.test.js
Detail: `core/lanes/lib/cleanup.js` ships `cleanupTarget()` (worktree → local branch → remote-if-not-default → lane-state tombstone; idempotent, forge-neutral, default-branch-safe) + `remoteDefaultBranch()` / `ensureTerminalBranchIsRemoteDefault()` (BUG-025 push-terminal-first) + `momentum lanes cleanup` CLI. The remote-default guard is load-bearing — a hijacked default branch can never be deleted. macOS /var→/private/var symlink required realpath-based self-worktree detection. 8 new tests; suite 927 → 935.

---
