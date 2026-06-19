# Phase 19 — Lifecycle Hardening: Implementation Plan

## Execution Order

```
Mixed:  Group 0 → (Group 1 ∥ Group 2) → Group 3 → Group 4 → Group 5
```

- **Group 0** establishes shared contracts and blocks everything.
- **Groups 1 and 2** are independent feature areas and run in parallel.
- **Group 3** (docs/rules) is sequential — wording must match the mechanisms that Groups 1–2 just made real.
- **Group 4** (destructive cleanup, approval-gated) is sequential.
- **Group 5** (verification) is sequential and last.

---

## Group 0 — Contracts & Foundations
**Sequential. Blocks all other groups.**
External deps: none (zero-dependency `fs`/`path`/`process`).
Commit: `feat(core): lifecycle-hardening contracts (git-hook install, adhoc schema, work types)`

- [ ] **Hook-install contract.** Decide + document: hooks live in a tracked `.githooks/` dir; `bin/momentum.js init/upgrade` runs `git config core.hooksPath .githooks` and writes the hook scripts there. Detect a pre-existing `core.hooksPath` or husky setup and **warn-not-clobber** (apply the BUG-008 lesson — no silent overwrite).
- [ ] **Escape-hatch contract.** `MOMENTUM_SKIP_HOOKS=1` env var bypasses all momentum hooks (emergency); a single-use `.momentum/merge-approved` sentinel authorizes one push to `main`/`staging` and is consumed on use. Mirrors `.momentum/brainstorm-active`.
- [ ] **Verification-evidence marker.** Canonical `## Verification Evidence` heading in `retrospective.md`; define "non-empty" precisely (≥1 non-whitespace line of captured command output) so a hook can grep it.
- [ ] **Ad-hoc record schema.** `specs/adhoc/<id>/record.md` template: Current Behavior / Expected Behavior / Unchanged Behavior + Verification Evidence. Define the `<id>` scheme (e.g. `BUG-NNN` or a timestamp slug).
- [ ] **Work-type taxonomy.** Define `phase` / `quick-task` / `spike`, where each is recorded, and which gates each must pass (phase = full; quick-task = Rule 12 gate, no phase scaffold; spike = exempt, must be declared).
- [ ] Tests for the contract surfaces (schema/template presence, taxonomy doc).

## Group 1 — Git Lifecycle Enforcement
**Parallel with Group 2.** Depends on Group 0.
External deps: a temp git repo for hook smoke tests.
Commit: `feat(git): vendor-neutral git-lifecycle enforcement hooks (FEAT-018/019, ENH-042)`

- [ ] **FEAT-018 `commit-msg` hook** (`core/scripts/git-hooks/commit-msg`): validate the conventional-commit prefix (`feat|fix|docs|refactor|chore|infra` + optional scope); exit non-zero on violation; honor `MOMENTUM_SKIP_HOOKS`.
- [ ] **FEAT-018 `pre-push` hook** (`core/scripts/git-hooks/pre-push`): block pushes whose target ref is `main`/`staging` unless `.momentum/merge-approved` exists (consume it) or `MOMENTUM_SKIP_HOOKS=1`.
- [ ] **FEAT-019 verify-evidence gate**: in `pre-push`, when the push includes a `refs/tags/v*` ref, require the relevant `retrospective.md` to contain a non-empty `## Verification Evidence`; else block.
- [ ] **Install wiring** in `bin/momentum.js` (`init` + `upgrade`): set `core.hooksPath`, copy `core/scripts/git-hooks/*`, `chmod +x`; warn-not-clobber on pre-existing config. Parity across all three adapters (the hooks are agent-agnostic; only the install path is shared).
- [ ] **ENH-042**: add a guarded `git push origin --delete <phase-branch>` step to `complete-phase.md` (gated on confirmed merge + clean release); add a session-start branch-hygiene self-audit (extend `sessionstart-handoff.sh` or a `/validate` check) that compares released phases in `status.md` against live origin branches.
- [ ] Tests: hook behavior (good/bad commit msg, blocked/allowed push, tag-evidence gate, escape hatch, warn-not-clobber).

## Group 2 — Ad-hoc Work Lane
**Parallel with Group 1.** Depends on Group 0.
External deps: none.
Commit: `feat(lifecycle): first-class ad-hoc work types + phase-optional plumbing (FEAT-020/ENH-044)`

- [ ] **FEAT-020 `/hotfix` command**: scaffold a `fix/BUG-NNN` (or `chore/*`) branch + a `specs/adhoc/<id>/record.md` from the Group-0 schema; route the work through the Rule 12 evidence gate without a full phase scaffold. Ship to all three adapters (claude-code command, codex skill, antigravity workflow) + parity.
- [ ] **FEAT-020 spike mode**: a declared exploratory mode (e.g. `/hotfix --spike` or a `/spike` recipe) exempt from acceptance gates but recorded as such.
- [ ] **ENH-044 phase-optional plumbing**: make `/log`, `/sync-docs`, and `check-history-reminder.sh` fall back to a non-phase sink (`specs/adhoc/<id>/history.md` or a global log) when no phase is active.
- [ ] **ENH-044 status surface**: add an "Ad-hoc / Patch Releases" section to `core/specs-templates/specs/status.md` (and the live `status.md`); retroactively move the v0.20.1 / v0.20.3 `—` rows there.
- [ ] **ENH-044 `/validate`**: treat "no active phase" as a valid state, not an error (`validate.md` + any validation script).
- [ ] Tests: `/hotfix` scaffolding, phase-optional log/sync fallback, `validate` no-phase passes.

## Group 3 — Docs Honesty & Rules
**Sequential.** Depends on Groups 1 + 2 (wording must reflect the now-real mechanisms).
External deps: none.
Commit: `docs(rules): Rule 6 honesty + Rule 14 escalation + forge-neutral protection guidance`

- [ ] **BUG-009**: relabel Rule 6 — rows now backed by hooks marked enforced; prose-only rows marked "advised"; drop "(Automatic)" overstatement; fix the `--no-verify` line so it references the real `commit-msg` hook.
- [ ] **ENH-045**: add **Rule 14** (escalation criteria: > N files, touches `specs/architecture/`, needs an ADR, changes a public contract, or displaces a planned phase) + the "select the lightest work type that fits" governing principle with red-flag counters.
- [ ] **ENH-041 (reframed)**: add a forge-neutral "Optional hardening: server-side branch protection" docs section (GitHub Rulesets / GitLab protected branches / Bitbucket permissions). No forge-specific code.
- [ ] **Parity**: apply all rule/doc changes to `CLAUDE.md`, `core/specs-templates/CLAUDE.md`, `.agent/rules/project.md`, and codex/antigravity `AGENTS.md`.
- [ ] **Roadmap renumber**: slot this as Phase 19; bump Reach → 20, Intelligence → 21, Platform → 22 in `roadmap.md` + `status.md` Upcoming Phases.

## Group 4 — Cleanup (approval-gated)
**Sequential.** Depends on Group 3.
External deps: push access to origin; **explicit user approval** before any branch deletion.
Commit: `chore(git): gitignore agent worktrees; prune 16 stale branches; close phase-8`

- [ ] **ENH-043**: add `.claude/worktrees/` (and other agent-worktree paths) to `.gitignore` + the template `.gitignore`.
- [ ] **TD-008**: fix the false "shipped v0.11.0" claim in the phase-8 retrospective (on-branch), then delete `phase-8-parallel-worktrees` (local + origin). Record the won't-do decision.
- [ ] **TD-007**: confirm each of the 16 stale branches is fully merged into `main`, then `git push origin --delete` them. **Get user OK before deleting.**

## Group 5 — Verification
**Sequential. Last.**
External deps: temp dir for install smoke test.
Commit: `test(phase-19): verification evidence + fingerprint + parity`

- [ ] `npm test` — full suite green.
- [ ] Re-baseline the Claude Code install fingerprint snapshot for template/command/hook changes (with explanatory meta).
- [ ] Smoke test in a temp install: hooks installed (`core.hooksPath`), bad commit msg rejected, push-to-main blocked then allowed via sentinel, escape hatch works, tag-without-evidence blocked, `/hotfix` scaffolds a record, `validate` exits 0 with no active phase.
- [ ] 3-adapter parity check; update `core/adapter-parity-matrix.md` + `core/adapter-capabilities.md`.
- [ ] Write `retrospective.md` with captured Verification Evidence (stdout/exit codes).
