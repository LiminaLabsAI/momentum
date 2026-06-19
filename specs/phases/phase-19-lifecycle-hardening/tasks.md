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

## Group 3 — Docs Honesty & Rules (Sequential)
- [ ] BUG-009 — relabel Rule 6 (enforced vs advised); fix `--no-verify` line
- [ ] ENH-045 — Rule 14 escalation criteria + "lightest work type" principle
- [ ] ENH-041 — forge-neutral server-side branch-protection docs section (no GitHub-specific code)
- [ ] Parity: CLAUDE.md + template + `.agent/rules/project.md` + codex/antigravity AGENTS.md
- [ ] Roadmap renumber: Phase 19 slotted; Reach→20, Intelligence→21, Platform→22

## Group 4 — Cleanup (Sequential, approval-gated)
- [ ] ENH-043 — gitignore `.claude/worktrees/` (repo + template)
- [ ] TD-008 — fix phase-8 false retrospective, delete branch (record won't-do)
- [ ] TD-007 — confirm-merged then delete the 16 stale origin branches (**user OK required**)

## Group 5 — Verification (Sequential, last)
- [ ] `npm test` green
- [ ] Re-baseline Claude Code install fingerprint (with meta)
- [ ] Smoke test temp install: hooks fire, escape hatch, tag gate, `/hotfix`, `validate` no-phase
- [ ] 3-adapter parity check; update parity + capability matrices
- [ ] `retrospective.md` with captured Verification Evidence
