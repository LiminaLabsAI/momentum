# Phase 7a — Planning Contracts: Implementation History

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

### [DECISION] 2026-05-27 — Split original Phase 7 into 7a / 7b / 7c
Topics: phase-7, split, scope
Affects-phases: phase-7a-planning-contracts, phase-7b (future), phase-7c (future)
Affects-specs: specs/planning/roadmap.md (will update in Group 5)
Detail: Original Phase 7 plan bundled subagent execution engine, systematic-debugging, TDD opt-in, SessionStart, and Rules 1/3/4/5/7/9 hardening. The user added three new themes (brainstorm write-gate, start-phase autonomy contract, parallel worktree orchestration). All seven items together is 2-3× any prior phase. Decision: split into 7a (planning contracts — write-gate + autonomy contract spec), 7b (autonomous execution engine + TDD Rule 13 + retry budget), 7c (parallel worktree orchestration). Deferred items (systematic-debugging skill, SessionStart, Rules 1/3/4/5/7/9 hardening) move to Phase 8 candidacy. Reach (Cursor + Gemini adapters) shifts from Phase 8 → Phase 9.

---

### [DECISION] 2026-05-27 — Phase 7a scope: three brainstorm commands + /start-phase contract
Topics: phase-7a, scope
Affects-phases: phase-7a-planning-contracts
Affects-specs: specs/phases/phase-7a-planning-contracts/overview.md
Detail: Write-gate drift isn't unique to `/brainstorm-phase` — `/brainstorm-idea` and `/start-project` share the same "draft directly then write on approval" pattern. Hardening all three keeps the discipline consistent. `/start-phase` autonomy contract ships in 7a (spec only, no engine) so that 7b has a fixed target. Implementation of the engine is deliberately deferred to keep 7a small.

---

### [DECISION] 2026-05-27 — Write-gate enforcement: markdown discipline + Claude Code PreToolUse hook
Topics: brainstorm, gate, hook, write-discipline
Affects-phases: phase-7a-planning-contracts
Affects-specs: specs/phases/phase-7a-planning-contracts/overview.md
Detail: Considered three options — markdown-only, hook-only, both. Markdown-only drifts (same failure mode as Phase 6 dogfood). Hook-only divorces intent from enforcement (a future markdown edit could silently lose the contract). Both layers: command files declare the gate in human-readable form, hook enforces mechanically. Sentinel = `.momentum/brainstorm-active` (touch on entry, rm on approval). Hook = `adapters/claude-code/scripts/brainstorm-gate.sh` blocks `Write`/`Edit`/`MultiEdit` on `specs/**` when sentinel exists. Non-Claude adapters can ship equivalents later — not in 7a scope.

---

### [DECISION] 2026-05-27 — Autonomy contract: one hard stop, judgment elsewhere
Topics: start-phase, autonomy, contract
Affects-phases: phase-7a-planning-contracts, phase-7b (downstream)
Affects-specs: core/commands/start-phase.md (will update in Group 3)
Detail: User explicitly rejected a fixed checklist of stop points: "it is not hard and fast but most of the time it should work flawless." Contract: hard stop only on merge to staging/main + release. Discretionary stop when continuing would cause real harm or a wrong result that's hard to undo. Pre-authorized actions (commits, pushes to feature branch, tests, tracking updates, ADR-from-discovery, branch creation) proceed silently. The future engine (Phase 7b) reads this contract as its operating rules.

---

### [SCOPE_CHANGE] 2026-05-27 — Defer to Phase 8: systematic-debugging skill, SessionStart auto-activation, Rules 1/3/4/5/7/9 hardening
Topics: phase-8, deferrals
Affects-phases: phase-7a-planning-contracts, phase-8
Affects-specs: specs/planning/roadmap.md (will update in Group 5)
Detail: Original Phase 7 wishlist items not adopted into 7a / 7b / 7c. Reach (Cursor + Gemini adapters) shifts from Phase 8 → Phase 9. Justification: the user's three themes are the more urgent friction; new adapters are valuable but the workflow gaps slow every existing user, while adapter gaps slow only non-Claude-Code users.

---

### [DECISION] 2026-05-27 — Phase shortname `phase-7a-planning-contracts`
Topics: phase-7a, naming
Affects-phases: phase-7a-planning-contracts
Affects-specs: specs/planning/roadmap.md
Detail: Considered `phase-7a-workflow-gates`, `phase-7a-brainstorm-discipline`, `phase-7a-planning-contracts`. Chose `planning-contracts` because it accurately covers both pillars (brainstorm write-gate AND start-phase autonomy contract). Other names emphasized only one side.

---

### [DISCOVERY] 2026-05-27 — Repo on external drive: `core.fileMode=true` causes every file to show as modified
Topics: git, environment, T7-shield, file-mode
Affects-phases: phase-7a-planning-contracts
Affects-specs: none
Detail: On entering the brainstorm, `git status` reported ~140 files as modified (`old mode 100644, new mode 100755`). Root cause: the T7 Shield external drive filesystem doesn't preserve POSIX permissions, so git sees the executable bit flip on every file. Fixed locally with `git config core.fileMode false`. Also surfaced ~168 untracked `._*` AppleDouble metadata files. Both are environment artifacts, not real changes. Resolution: the `core.fileMode false` setting is per-clone (not committed). Adding `._*` to `.gitignore` is in scope for Group 2. Consider documenting both in developer-guide.md as part of `/sync-docs` at phase completion.

---

### [DISCOVERY] 2026-05-27 — Prior `phase-7-subagent-engine` branch supersedes
Topics: phase-7, prior-work, branches
Affects-phases: phase-7a-planning-contracts
Affects-specs: none
Detail: An earlier `phase-7-subagent-engine` branch exists with 2 commits ahead of main (`fdc3d1d docs: brainstorm Phase 7 — Subagent Execution Engine` and `476a0e2 docs: start Phase 7 — Subagent Execution Engine`). It contains a full brainstorm for the original single-Phase-7 plan plus start-phase scaffolding (specs/phases/phase-7-subagent-engine/{overview,plan,tasks,history}.md, plus status/index/changelog updates). Today's brainstorm supersedes that plan with the 7a/7b/7c split. The old branch is being left intact — not deleted — so the user can inspect or reference it. The 7b roadmap entry (Autonomous Execution Engine) is the spiritual successor; some of the old plan.md content may be useful when brainstorming 7b. No merge conflict risk: phase-7a-planning-contracts uses a different directory and status.md baseline (main, not the old branch's tip).

---

### [NOTE] 2026-05-27 — Phase 7a brainstorm complete; ready for execution
Topics: phase-7a, brainstorm, execution
Affects-phases: phase-7a-planning-contracts
Affects-specs: none
Detail: User approved the brainstorm with "let's start the execution" and granted authority to proceed end-to-end per the autonomy contract being authored in this phase (eating the dog food in advance). Tasks #7-#13 cover phase-branch bootstrap (start-phase ops), Groups 0-4 (implementation + tests), and Group 5 (stop at merge gate).

---

### [DISCOVERY] 2026-05-27 — T7 Shield filesystem: spurious mode flips + AppleDouble noise
Topics: git, environment, T7-shield, file-mode, appledouble, gitignore
Affects-phases: phase-7a-planning-contracts
Affects-specs: none
Detail: Surfaced at the start of execution. (1) `git status` reported ~140 files modified with `100644 → 100755` mode flips — root cause: T7 Shield filesystem doesn't preserve POSIX permissions. Fixed locally with `git config core.fileMode false` (per-clone setting, not committed). (2) Hundreds of macOS AppleDouble `._*` sidecar files appeared as untracked — root cause: same non-POSIX filesystem. The first commit (brainstorm) accidentally swept 4 `._*` files into git via `git add specs/phases/.../` glob. Mitigations: a `.gitignore` was authored (commit `3943d3a`) with `._*`, `.DS_Store`, `.momentum/`, `node_modules/`, `*.log` at both repo root and `core/specs-templates/`; the 4 already-tracked `._*` files were untracked via `git rm --cached`. Both the gitignore work AND the test-glob fix below were pulled forward from Group 2 / Group 4 respectively because they were blocking the workflow.

---

### [DISCOVERY] 2026-05-27 — node:test loads AppleDouble files as tests
Topics: tests, node-test, appledouble, glob
Affects-phases: phase-7a-planning-contracts
Affects-specs: package.json
Detail: First `npm test` run reported 65 tests, 58 pass, 7 fail. The 7 failures were node:test attempting to load `tests/._*.test.js` AppleDouble metadata files as test modules. Root cause: `node --test --test-concurrency=1 tests/` scans the directory recursively and treats every `*.test.js` match as a test file, including dot-prefixed siblings. Fix: tighten the glob to `tests/*.test.js` — bash `*` does NOT match leading dots, so AppleDouble files are excluded by shell expansion before node sees them. With the fix: 58/58 pass, 0 fail. This fix is general (not T7-specific) — any contributor on macOS using Time Machine or external drives could hit the same issue.

---

### [DISCOVERY] 2026-05-27 — Prior `phase-7-subagent-engine` branch supersedes
Topics: phase-7, prior-work, branches
Affects-phases: phase-7a-planning-contracts
Affects-specs: none
Detail: An earlier `phase-7-subagent-engine` branch exists with 2 commits ahead of main (`fdc3d1d docs: brainstorm Phase 7 — Subagent Execution Engine` and `476a0e2 docs: start Phase 7 — Subagent Execution Engine`). It contains a full brainstorm for the original single-Phase-7 plan plus start-phase scaffolding. Today's brainstorm supersedes that plan with the 7a/7b/7c split. The old branch is being left intact — not deleted — so the user can inspect or reference it. The 7b roadmap entry (Autonomous Execution Engine) is the spiritual successor; some of the old plan.md content may be useful when brainstorming 7b.

---

### [NOTE] 2026-05-27 — Group 0 complete (contracts authored)
Topics: phase-7a, group-0, contracts
Affects-phases: phase-7a-planning-contracts
Affects-specs: specs/phases/phase-7a-planning-contracts/contracts.md
Detail: Canonical text for all three contracts (Brainstorm Gate, Autonomous Execution, PreToolUse Hook) authored into `contracts.md`. This file is the source of truth that downstream groups embed verbatim. Group 4 tests will detect drift. Commit `1058592`.

---

### [NOTE] 2026-05-27 — Group 1 complete (brainstorm command hardening)
Topics: phase-7a, group-1, brainstorm-commands
Affects-phases: phase-7a-planning-contracts
Affects-specs: core/commands/brainstorm-phase.md, core/commands/brainstorm-idea.md, core/commands/start-project.md
Detail: All three brainstorm command files updated with the Brainstorm Gate Contract section, sentinel-create step (Step 0), in-conversation-only drafting instructions, sentinel-removal step at approval, red-flag table, and anti-rationalization counters. `start-project.md` got the most structural change — a new "plan the scaffold in conversation only" step (Step 3) and an explicit pre-scaffold approval gate (Step 4). Verified no overlay duplicates in `adapters/claude-code/commands/` (only `review-code.md` lives there, untouched). Commit `a64ff0f`.

---

### [NOTE] 2026-05-27 — Group 2 complete (hook + sentinel)
Topics: phase-7a, group-2, hook, sentinel, claude-code
Affects-phases: phase-7a-planning-contracts
Affects-specs: adapters/claude-code/scripts/brainstorm-gate.sh, adapters/claude-code/settings.json
Detail: PreToolUse hook script `brainstorm-gate.sh` implemented in bash with: jq-when-available + pure-bash regex fallback for JSON parsing; fail-open on missing `CLAUDE_PROJECT_DIR`, missing sentinel, or malformed JSON; blocks only `Write`/`Edit`/`MultiEdit` whose target lies under `specs/`; exits 2 with structured stderr message when blocking. settings.json updated to register the PreToolUse hook with matcher `Write|Edit|MultiEdit`; existing PostToolUse `check-history-reminder.sh` preserved. Manual smoke test passed all 6 scenarios. Commit `65151fd`.

---

### [NOTE] 2026-05-27 — Group 3 complete (start-phase autonomy contract)
Topics: phase-7a, group-3, start-phase, autonomy
Affects-phases: phase-7a-planning-contracts, phase-7b (downstream — engine implements this)
Affects-specs: core/commands/start-phase.md
Detail: `start-phase.md` rewritten with: (1) Setup Steps 1–10 (unchanged content) under a clear "Setup Steps (run once at phase start)" heading; (2) new "After Setup: Execute the Plan Autonomously" section with an 8-step per-group execution loop; (3) full "Autonomous Execution Contract" section embedded verbatim from contracts.md, including hard stop (merge+release), discretionary stop guidance, pre-authorized actions list, anti-patterns table, and cross-references to Rules 6/8/12. Spec-only — engine implementation deferred to Phase 7b. Commit `3c556fc`.

---

### [NOTE] 2026-05-27 — Group 4 complete (tests + verification)
Topics: phase-7a, group-4, tests, verification, npm-test, evidence
Affects-phases: phase-7a-planning-contracts
Affects-specs: tests/brainstorm-gate.test.js, tests/start-phase-contract.test.js, tests/command-gates.test.js, package.json
Detail: 34 new tests across three files. `brainstorm-gate.test.js` (10) covers Scenarios A–D plus Edit/MultiEdit symmetry plus fail-open paths plus sentinel-removal workflow — invokes the actual hook binary via `spawnSync` with synthetic Claude Code JSON stdin. `start-phase-contract.test.js` (7) asserts each required contract section exists in `core/commands/start-phase.md`. `command-gates.test.js` (17) asserts the gate sections in all three brainstorm commands plus settings.json sanity. `package.json` test script glob changed from `tests/` to `tests/*.test.js` to filter AppleDouble noise (see prior discovery). **Verification evidence: `npm test` → 58/58 pass, 0 fail.** Commit `b46cb51`.

---

### [NOTE] 2026-05-27 — Group 5 complete; STOPPING at merge/release gate
Topics: phase-7a, group-5, roadmap, merge-gate
Affects-phases: phase-7a-planning-contracts, phase-7b, phase-7c, phase-8, phase-9, phase-10, phase-11
Affects-specs: specs/planning/roadmap.md, specs/phases/phase-7a-planning-contracts/tasks.md
Detail: Roadmap updated — Phase 7 row split into 7a (this phase, v0.8.0), 7b (autonomous execution + TDD, v0.9.0), 7c (parallel worktree orchestration, v0.10.0). Hardening & Activation inserted as Phase 8 (v0.11.0); Reach renumbered to Phase 9 (v0.12.0); Intelligence to 10 (v0.13.0); Platform to 11 (v1.0.0). Dependencies graph + Milestones table reflect the new sequence. tasks.md marks Groups 0–5 complete. **Per the autonomy contract authored in this phase: this is the single hard-stop. STOPPING to ask user for merge + release approval before `/complete-phase`, merge → staging → main, tag `v0.8.0`, and `npm publish`.**

---
