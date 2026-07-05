---
type: Task List
---

# Phase 19 — Lifecycle Hardening: Tasks

> Mirrors `plan.md`. Mark `[x]` complete, `[/]` in-progress. Verify before marking done (Rule 12).

## Group 0 — Contracts & Foundations (Sequential, blocks all) ✅
- [x] Hook-install contract: tracked `.githooks/` + `core.hooksPath`; warn-not-clobber — defined in `core/git-hooks/contract.js` (`CONTRACT.hooksPath`) + `core/lifecycle-contract.md` (install code is Group 1)
- [x] Escape-hatch contract: `MOMENTUM_SKIP_HOOKS=1` (`skipRequested`) + single-use `.momentum/merge-approved` sentinel (`CONTRACT.mergeApprovedSentinel`)
- [x] Verification-evidence marker: `## Verification Evidence` + non-empty definition (`retroHasEvidence`)
- [x] Ad-hoc record schema: `specs/adhoc/_TEMPLATE.md` + README (Current/Expected/Unchanged + Evidence); `<id>` = backlog id or `YYYY-MM-DD-<slug>`
- [x] Work-type taxonomy: `phase` / `quick-task` / `spike` (`CONTRACT.workTypes`) + ceremony table in `specs/adhoc/README.md`
- [x] Tests for contract surfaces — `tests/lifecycle-contract.test.js` (11 tests); also added dev helper `scripts/capture-fingerprints.js` (resolves the fingerprint tests' dangling "capture helper" reference)

## Group 1 — Git Lifecycle Enforcement (∥ G2) ✅
- [x] FEAT-018 `commit-msg` hook — `core/git-hooks/commit-msg` → `run-check.js`; conventional-commit validation, exit≠0, honors `MOMENTUM_SKIP_HOOKS`
- [x] FEAT-018 `pre-push` hook — blocks direct push to main/staging without `.momentum/merge-approved` (single-use, consumed on push)
- [x] FEAT-019 `pre-push` tag path — blocks release-tag push without a non-empty `## Verification Evidence` (inert when no retrospective convention exists)
- [x] Install wiring in `bin/momentum.js` (`installGitHooks` in init + upgrade): copy `core/git-hooks/*` → `.githooks/`, chmod +x, `git config core.hooksPath`, warn-not-clobber; agent-agnostic (works for all 3 adapters)
- [x] ENH-042 — guarded branch-delete (step 13) + branch-hygiene self-audit (step 14) in `/complete-phase`. Note: the audit lives in `/complete-phase` (runs when branches go stale), not the SessionStart hook (kept <100ms, git-state-dependent audits are fragile there); a session-start one-liner lands in CLAUDE.md's existing self-audit block in Group 3.
- [x] Tests: `tests/git-hooks.test.js` (9 tests) — install, warn-not-clobber, commit-msg good/bad/escape, pre-push protected/sentinel/tag-gate/escape/inert. Suite 591→600 (+9). Fingerprints re-baselined.

## Group 2 — Ad-hoc Work Lane (∥ G1) ✅
- [x] FEAT-020 `/hotfix` command — `core/commands/hotfix.md`; scaffolds branch + `specs/adhoc/<id>/record.md`, reuses Rule 12 gate. Auto-parity: claude command + codex skill + antigravity workflow (adapters enumerate all commands, no allowlist).
- [x] FEAT-020 spike mode — `/hotfix --spike`: declared, gate-exempt, records what was learned + follow-up
- [x] ENH-044 — `/log` + `/sync-docs` + `check-history-reminder.sh` phase-optional with `specs/adhoc/<id>/record.md` (or `specs/adhoc/history.md`) fallback sink
- [x] ENH-044 — "Ad-hoc / Patch Releases" section in status.md template + live; moved v0.20.1 + v0.20.3 `—` rows there
- [x] ENH-044 — `/validate` treats no-active-phase as a valid state (steps 1 + 4)
- [x] Tests: `tests/adhoc-lane.test.js` (4 tests) — 3-adapter parity, recipe steps, phase-optional recipes, status section. Suite 600→604 (+4). Fingerprints re-baselined; reminder marker `PHASE HISTORY REMINDER`→`HISTORY REMINDER` (3 assertions updated).

## Group 3 — Docs Honesty & Rules (Sequential) ✅
- [x] BUG-009 — Rule 6 retitled (dropped "(Automatic)"); table gains an "Hook enforcement" column (enforced vs advised per row); `--no-verify` red-flag now points to the real hooks + `MOMENTUM_SKIP_HOOKS`
- [x] ENH-045 — Rule 14 (work-type escalation + "lightest type that fits" principle + red flags) in CLAUDE.md, template, and condensed agent-rules
- [x] ENH-041 — forge-neutral "Optional hardening: server-side branch protection" note in Rule 6 (no GitHub-specific code; DIP preserved)
- [x] Parity: live CLAUDE.md + `core/specs-templates/CLAUDE.md` + `core/agent-rules/project.md` updated. Codex/Antigravity `AGENTS.md` need no rule edits — rules reach them via `.agent/rules/project.md`. Commit-types expanded to match the hook everywhere.
- [x] ENH-042 (carryover) — session-start branch-hygiene self-audit line added to CLAUDE.md Project Extensions
- [x] Roadmap renumber: Phase 19 = Lifecycle Hardening; Reach→20 (v0.22.0), Intelligence→21 (v0.23.0), Platform→22 (v1.0); roadmap.md Timeline + status.md Upcoming updated; Phase 18 row marked Complete (v0.20.4)

## Group 4 — Cleanup (Sequential, approval-gated) ✅
- [x] ENH-043 — `.gitignore` + template ignore `.claude/worktrees/`
- [x] TD-008 — phase-8 closed won't-do: planning doc records the closure + corrects the false "shipped v0.11.0" claim; branch deleted (local + origin)
- [x] TD-007 — deleted **14** stale origin branches (user-approved). Merge analysis corrected the naive "16": only 11 were ancestry-merged; added phase-8 (won't-do), phase-18 (squash-merged, content in main), audit/codex-runtime-gaps (superseded by v2). KEPT phase-16-adapter-parity (research record) + phase-7-subagent-engine (unreleased WIP). Local stale refs also pruned.

## Group 5 — Verification (Sequential, last) ✅
- [x] `npm test` green — **604/604** (580 baseline + 24 new)
- [x] Re-baselined all 3 install fingerprints per-group with explanatory meta
- [x] E2E smoke (temp git repo): install sets `core.hooksPath`; commit-msg bad blocked / good ok / `--no-verify` bypass; pre-push to main blocked then allowed via sentinel (consumed); `/hotfix` + adhoc template present
- [x] 3-adapter parity: parity matrix audit 4/4; added `/hotfix` row + Git-lifecycle-hooks subsection + footnote 15. No capability-boolean change (hooks are agent-agnostic), so `adapter-capabilities.md` unchanged.
- [x] `retrospective.md` written with captured Verification Evidence (gates the v0.21.0 release tag — FEAT-019 dogfood)
