---
type: Plan
---

# Phase 27 — Plan

```
# Sequential:  Group 0 → Group 1 → Group 2 → Group 3 → Group 4 → Group 5
```

All groups are sequential: G0 defines the shared cleanup contract every later
group calls; the default-branch precondition (G1) must hold before any cleanup
deletes remote branches; synchronous cleanup (G2) is the simplest consumer and
seeds the e2e harness reused by the reconcile/handshake paths (G3); hygiene (G4)
depends on nothing but is verified together with everything else in G5.

Standard verification per group: `npm test` (config `test_command`), reading
actual output per Rule 12. New tests are added in the same group as the code.

---

## Group 0 — Cleanup contract + shared action (Sequential; blocks all)

**Sequential.** No external dependencies. Commit: `refactor(lanes): shared cleanup action + remote-default helper`

- Define `cleanupTarget({ repoRoot, branch, worktree, laneId, deleteRemote, defaultBranchSafe })` in a shared module (candidate: `core/lanes/lib/cleanup.js`, reused by land/close/reconcile and referenced by the complete-phase recipe via a thin CLI surface). Git-only, forge-neutral. Order of operations:
  1. If a `worktree` is bound and is not the current cwd → `git worktree remove <path>` (`--force` only when the tree is clean-or-confirmed); prune stale entries.
  2. `git branch -d <branch>` (never `-D` implicitly — refuses if unmerged; surfaces to caller).
  3. If `deleteRemote` and the branch exists on `origin` **and is not the remote default** → `git push origin --delete <branch>`.
  4. Clear lane state: remove `<git-common-dir>/momentum/lanes/<laneId>` manifest + inbox + processed + signals (keep a minimal `landed`/`cleaned` tombstone so the board can still show history).
- Add `remoteDefaultBranch(cwd)` + `ensureTerminalBranchIsRemoteDefault(cwd, terminalBranch)` helpers (pure git: `symbolic-ref refs/remotes/origin/HEAD`; push terminal branch first when the remote has no default yet; resilient when the branch is unborn on the remote).
- Unit tests: `tests/lane-cleanup.test.js` — worktree removal, unmerged-branch refusal, default-branch-safe remote skip, state teardown + tombstone, idempotent re-run.

Verify: `npm test` — new cleanup suite green; no regression in existing lane suites.

---

## Group 1 — Default-branch protection (BUG-025) (Sequential)

**Sequential.** Depends on G0's `ensureTerminalBranchIsRemoteDefault`. Commit: `fix(git): terminal branch is remote default; never hijacked by phase branch`

- `/start-project` (`core/commands/start-project.md`) founding step: after the founding commit, when a remote exists, push the terminal `branch_flow` branch FIRST so the forge adopts it as default (recipe step + helper call). Document the "first push must be the integration branch" invariant.
- `/start-phase` (`core/commands/start-phase.md`): make `git checkout main && git pull origin main` resilient when `main` is unborn on the remote (skip the pull, don't error); ensure the terminal branch is established on origin before the first phase-branch push.
- Optional, config-gated hardening (recipe-level, `git_forge=github`, non-fatal if `gh` absent): `gh repo edit --default-branch <terminal>` to repair a repo whose default is already hijacked. Kept in the recipe (agent-run), NOT shipped as forge code.
- Regenerate the affected adapter command/skill copies (claude-code / codex / antigravity / opencode) and re-baseline fingerprints for the drifted recipe paths.

Verify: bare-remote fixture test — init → found → start-phase phase-0 → assert `symbolic-ref refs/remotes/origin/HEAD` resolves to the terminal branch, not phase-0. `npm test` green.

---

## Group 2 — Synchronous cleanup + tracking-before-release gate (BUG-026) (Sequential)

**Sequential.** Depends on G0 + G1. Commit: `feat(lifecycle): auto-clean on land; gate release on committed tracking`

- `momentum lanes land --execute` (`core/lanes/lib/land.js`): after a successful merge into the terminal branch, call `cleanupTarget()` (auto) with a `--keep` flag to opt out. Only runs when `into` is the terminal branch (a mid-flow merge, e.g. into staging under `staging-promotion`, does NOT clean — that defers to reconcile).
- `/complete-phase` (`core/commands/complete-phase.md`) step 13: replace the bare `git branch -d` + remote delete with a `cleanupTarget()` call (worktree + branch + lane state, default-branch-safe). Handle the "phase ran in a lane worktree" case.
- **Tracking-before-release gate:** add an explicit ordering contract + refusal to `complete-phase` — do NOT enter Release until `status.md` (header "Latest Release", Completed Phases row), `roadmap.md`, `README`/changelog updates are written AND committed on the phase branch. Mirror the wording/structure of the existing `## Verification Evidence` gate.
- Tests: land-then-assert-clean; complete-phase cleanup; tracking-gate refusal when tracking is dirty/uncommitted.

Verify: `npm test` green; land e2e shows a clean tree post-land.

---

## Group 3 — Reconcile + human handshake + open-pr (BUG-026 / ENH-063) (Sequential)

**Sequential.** Depends on G0–G2. Commit: `feat(lanes): reconcile + confirm-then-clean handshake + open-pr end_state`

- `momentum lanes reconcile`: `git fetch --prune`; for each open/landed-not-cleaned lane (or tracked feature branch), if it is now contained in the terminal branch upstream (`git merge-base --is-ancestor <branch> origin/<terminal>`) — or, `git_forge=github`, `gh pr view` reports merged — run `cleanupTarget()`. Report (don't touch) branches not yet merged.
- Human confirm→verify→clean handshake: for `end_state` in {`staging-promotion`, `feature-branch-only`, `open-pr`}, at end-of-phase the recipe (`complete-phase` / `start-phase` hard-stop) tells the human exactly which manual step to perform, asks them to confirm when done, then **verifies** the merge actually landed (the reconcile ancestor/PR-state check) before cleaning. Never cleans on the bare "yes".
- `lanes close` (`bin/lanes.js`): route through `cleanupTarget()` so it deletes the branch and clears state, not just the worktree (ENH-063).
- Add `end_state: open-pr` to the config enum (`core/config.js` `ALLOWED.end_state`, `core/config-templates.js` if needed) + the recipe branches that read `end_state` (start-phase hard-stop, complete-phase release plan): agent pushes the branch + opens a PR (config-gated `gh`/`glab`), stops; reconcile cleans post-merge.
- Wire `lanes reconcile` into the session-start branch-hygiene self-audit (promote the CLAUDE.md ENH-042 prose audit into a real command invocation that sweeps, not just reports).
- Tests: reconcile-after-upstream-merge cleans; reconcile leaves unmerged branches alone; `open-pr` config round-trips; `lanes close` deletes branch + state; handshake verify-gate rejects an unlanded "done".

Verify: `npm test` green; per-`end_state` e2e matrix drafted here, run in G5.

---

## Group 4 — Upgrade / transform hygiene (Sequential)

**Sequential.** Depends on G0 (uses worktree-prune helper). Commit: `fix(upgrade): stop leaking ._*/.bak; doctor sweep for stray artifacts`

- Skills transform (`transformCommandsIntoSkills` in `bin/momentum.js`): filter `._*` AppleDouble and `.DS_Store` inputs so it never generates `._<name>/SKILL.md` junk skill dirs (root cause of the 19 `._*` dirs under `.agents/skills/`).
- Upgrade/backup path: ensure `.bak` files created during upgrade/edit are cleaned or confined (not left littering `.claude/commands/` + `CLAUDE.md.bak`); add/confirm a `.gitignore` rule pattern where appropriate (consistent with the BUG-017 `.githooks/*.bak` precedent).
- `momentum doctor` (or `momentum cleanup`): a sweep that removes stray `._*`, orphan `.bak`, and prunes orphan worktrees (`git worktree prune` + report/remove `.claude/worktrees/*` dirs not in `git worktree list`), approval-gated for anything destructive, dry-run by default.
- Tests: upgrade fixture asserts zero `._*`/`.bak` post-run; `doctor` removes seeded cruft; skills transform ignores `._*` inputs.

Verify: `npm test` green.

---

## Group 5 — Verification & release (dogfood) (Sequential)

**Sequential.** Depends on G0–G4. Commit: `docs: Phase 27 retrospective + v0.34.0`

- Per-`end_state` e2e cleanup matrix: one scenario each proving a clean tree after the terminal landing (auto for `merge-after-yes`; reconcile for the other three).
- **Self-repo dogfood** — clean this repo's real accumulated cruft using the new mechanisms (honoring protected-branch + branch-delete approvals): remove the two stale lane worktrees for released work (`momentum.lanes/feat-open-knowledge-format`, `momentum.lanes/feat-site-redesign`) + their branches, the orphan `.claude/worktrees/thirsty-euler-781615`, the 19 `._*` skill dirs, and the 8 `.bak` files. Commit `.claude/commands/sync-config.md` (legit generated copy) rather than deleting it.
- Docs: update the recipes touched, `specs/config.md` notes (document `open-pr` + the cleanup behavior), site/README if a user-facing surface changed. Re-baseline any drifted adapter fingerprints.
- Retrospective `specs/phases/phase-27-lifecycle-cleanup/retrospective.md` with a `## Verification Evidence` section (Rule 12).
- Version bump v0.34.0; run `/sync-docs` before `/complete-phase`.

Verify: full `npm test` green; `git worktree list` clean; no `._*`/`.bak` in the tree; evidence captured in the retrospective.
