---
type: Tasks
---

# Phase 27 — Tasks

## Group 0 — Cleanup contract + shared action
- [x] G0.1 `cleanupTarget()` shared module (worktree → local branch → remote-if-not-default → lane state + tombstone)
- [x] G0.2 `remoteDefaultBranch()` + `ensureTerminalBranchIsRemoteDefault()` git helpers (unborn-remote resilient)
- [x] G0.3 `tests/lane-cleanup.test.js` — removal, unmerged refusal, default-safe remote skip, teardown, idempotency
- [x] G0.4 Verify: `npm test` green, no lane-suite regression — **935/935 (was 927; +8)**

## Group 1 — Default-branch protection (BUG-025)
- [x] G1.1 `/start-project` founding: pointer to the terminal-first invariant (founding pushes nothing; size-capped file)
- [x] G1.2 `/start-phase`: resilient pull when `main` unborn; establish terminal branch on origin before phase-branch push
- [x] G1.3 Optional config-gated `gh repo edit --default-branch` recipe hardening (`git_forge=github`, non-fatal, idempotent)
- [x] G1.4 Re-baselined 4 adapter fingerprints (start-phase/start-project only); Antigravity 12k-char limit respected (trimmed start-project)
- [x] G1.5 `tests/default-branch-protection.test.js` — terminal-first keeps default; phase branch never hijacks; guard refuses main
- [x] G1.6 Verify: `npm test` green — **937/937 (+2)**

## Group 2 — Synchronous cleanup + tracking-before-release gate (BUG-026)
- [ ] G2.1 `lanes land --execute`: auto `cleanupTarget()` on terminal-branch merge; `--keep` opt-out
- [ ] G2.2 `/complete-phase` step 13: replace bare delete with `cleanupTarget()` (worktree + branch + state)
- [ ] G2.3 Tracking-before-release gate in `/complete-phase` (refuse Release until tracking committed)
- [ ] G2.4 Tests: land-then-clean; complete cleanup; tracking-gate refusal
- [ ] G2.5 Verify: `npm test` green; land e2e clean tree

## Group 3 — Reconcile + human handshake + open-pr (BUG-026 / ENH-063)
- [ ] G3.1 `momentum lanes reconcile` (fetch + detect-merged-upstream → `cleanupTarget()`; report unmerged)
- [ ] G3.2 Human confirm→verify→clean handshake for `staging-promotion` / `feature-branch-only` / `open-pr`
- [ ] G3.3 `lanes close` routes through `cleanupTarget()` (deletes branch + state) — ENH-063
- [ ] G3.4 Add `end_state: open-pr` to config enum + recipe branches (agent pushes + opens PR, stops)
- [ ] G3.5 Wire `lanes reconcile` into the session-start branch-hygiene self-audit
- [ ] G3.6 Tests: reconcile cleans/leaves; open-pr round-trip; close deletes branch; handshake verify-gate
- [ ] G3.7 Verify: `npm test` green

## Group 4 — Upgrade / transform hygiene
- [ ] G4.1 Skills transform filters `._*`/`.DS_Store` inputs (no `._<name>/SKILL.md` junk)
- [ ] G4.2 Upgrade `.bak` artifacts cleaned/confined; `.gitignore` rule as needed
- [ ] G4.3 `momentum doctor` sweep — stray `._*`/`.bak` + orphan-worktree prune (dry-run default, approval-gated)
- [ ] G4.4 Tests: upgrade leaves zero `._*`/`.bak`; doctor removes seeded cruft; transform ignores `._*`
- [ ] G4.5 Verify: `npm test` green

## Group 5 — Verification & release (dogfood)
- [ ] G5.1 Per-`end_state` e2e cleanup matrix (auto + reconcile paths)
- [ ] G5.2 Dogfood: remove 2 stale lane worktrees + branches, orphan `.claude/worktrees/*`, 19 `._*`, 8 `.bak`; commit `sync-config.md`
- [ ] G5.3 Docs: recipes, `specs/config.md` notes (open-pr + cleanup), site/README; re-baseline fingerprints
- [ ] G5.4 Retrospective with `## Verification Evidence` (Rule 12)
- [ ] G5.5 `/sync-docs` → version bump v0.34.0 → `/complete-phase`
- [ ] G5.6 Verify: full `npm test` green; `git worktree list` clean; no `._*`/`.bak` in tree
