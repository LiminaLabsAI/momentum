# Phase 19 — Lifecycle Hardening: Tasks

> Mirrors `plan.md`. Mark `[x]` complete, `[/]` in-progress. Verify before marking done (Rule 12).

## Group 0 — Contracts & Foundations (Sequential, blocks all) ✅
- [x] Hook-install contract: tracked `.githooks/` + `core.hooksPath`; warn-not-clobber — defined in `core/git-hooks/contract.js` (`CONTRACT.hooksPath`) + `core/lifecycle-contract.md` (install code is Group 1)
- [x] Escape-hatch contract: `MOMENTUM_SKIP_HOOKS=1` (`skipRequested`) + single-use `.momentum/merge-approved` sentinel (`CONTRACT.mergeApprovedSentinel`)
- [x] Verification-evidence marker: `## Verification Evidence` + non-empty definition (`retroHasEvidence`)
- [x] Ad-hoc record schema: `specs/adhoc/_TEMPLATE.md` + README (Current/Expected/Unchanged + Evidence); `<id>` = backlog id or `YYYY-MM-DD-<slug>`
- [x] Work-type taxonomy: `phase` / `quick-task` / `spike` (`CONTRACT.workTypes`) + ceremony table in `specs/adhoc/README.md`
- [x] Tests for contract surfaces — `tests/lifecycle-contract.test.js` (11 tests); also added dev helper `scripts/capture-fingerprints.js` (resolves the fingerprint tests' dangling "capture helper" reference)

## Group 1 — Git Lifecycle Enforcement (∥ G2)
- [ ] FEAT-018 `commit-msg` hook — conventional-commit validation, exit≠0, honors escape hatch
- [ ] FEAT-018 `pre-push` hook — block direct push to main/staging without sentinel
- [ ] FEAT-019 `pre-push` tag path — block release tag without `## Verification Evidence`
- [ ] Install wiring in `bin/momentum.js` (init + upgrade), `chmod +x`, warn-not-clobber, 3-adapter parity
- [ ] ENH-042 — guarded branch-delete in `/complete-phase` + session-start branch-hygiene self-audit
- [ ] Tests: commit-msg, pre-push, tag gate, escape hatch, warn-not-clobber

## Group 2 — Ad-hoc Work Lane (∥ G1)
- [ ] FEAT-020 `/hotfix` command — scaffold branch + `specs/adhoc/<id>/record.md`, reuse Rule 12 gate (3-adapter parity)
- [ ] FEAT-020 spike mode — declared, gate-exempt, recorded as such
- [ ] ENH-044 — `/log` + `/sync-docs` + history hook phase-optional with fallback sink
- [ ] ENH-044 — "Ad-hoc / Patch Releases" section in status.md template; move v0.20.1 / v0.20.3 rows
- [ ] ENH-044 — `/validate` treats no-active-phase as valid
- [ ] Tests: hotfix scaffold, phase-optional fallback, validate no-phase

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
