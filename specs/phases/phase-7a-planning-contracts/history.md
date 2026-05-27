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
