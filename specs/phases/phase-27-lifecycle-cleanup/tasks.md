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
- [x] G2.1 `lanes land --execute`: auto `cleanupTarget()` on terminal-branch merge; `--keep` opt-out; non-terminal → defer
- [x] G2.2 `/complete-phase` step 13: `momentum lanes cleanup` (worktree + branch + state, default-branch-safe) replaces bare delete
- [x] G2.3 Tracking-before-release Gate B in `/complete-phase` (tracking committed before merge/tag; `git status --porcelain` clean check)
- [x] G2.4 Tests: `land-autoclean.test.js` (clean/keep/defer) + `complete-phase-gates.test.js` (Gate A/B + cleanup step)
- [x] G2.5 Verify: `npm test` green — **943/943 (+6)**; 4 fingerprints re-baselined (complete-phase drift)

## Group 3 — Reconcile + human handshake + open-pr (BUG-026 / ENH-063)
- [x] G3.1 `momentum lanes reconcile` (fetch + classify landed/pending by terminal-branch containment → `cleanupTarget()`)
- [x] G3.2 Human confirm→verify→clean handshake in `/complete-phase` for non-`merge-after-yes` end_states (reconcile verifies before cleaning)
- [x] G3.3 `lanes close` routes through `cleanupTarget()` (deletes branch + state, worktree with --rm-worktree) — ENH-063
- [x] G3.4 `end_state: open-pr` added to config enum + start-phase hard-stop + complete-phase release variants
- [x] G3.5 Wired `momentum lanes reconcile` into the session-start branch-hygiene self-audit (CLAUDE.md) + complete-phase step 14
- [x] G3.6 Tests: `lanes-reconcile.test.js` (landed/pending, execute, open-pr config, ENH-063 close) + open-close assertion update
- [x] G3.7 Verify: `npm test` green — **947/947 (+4)**; 4 fingerprints re-baselined (start-phase + complete-phase drift)

## Group 4 — Upgrade / transform hygiene
- [x] G4.1 Skills transform filters `._*`/`.DS_Store` (codex:170 + opencode:176 accepted `._x.md`; + antigravity copyDirRecursive) — root cause of the `._<name>/SKILL.md` junk
- [x] G4.2 `.bak` are intentional upgrade safety-backups (kept by design); `doctor --clean` is the confined sweep that removes the litter when the user is satisfied
- [x] G4.3 `momentum doctor --clean [--execute]` sweep — stray `._*`/`.bak` + orphan `.claude/worktrees/*` + `git worktree prune`; dry-run default; advisory line in plain `doctor`
- [x] G4.4 Tests: `upgrade-hygiene.test.js` — transform skips `._*.md`; fresh install carries no AppleDouble; doctor sweep finds+removes seeded cruft
- [x] G4.5 Verify: `npm test` green — **950/950 (+3)**; no fingerprint drift (source-only changes)

## Group 5 — Verification & release (dogfood)
- [x] G5.1 Per-`end_state` e2e matrix: auto (merge-after-yes) + config-driven terminal + non-terminal defer + reconcile (out-of-band)
- [x] G5.2 Dogfood DONE: 2 stale lane worktrees + branches, orphan `.claude/worktrees/*`, 19 `._*`, 8 `.bak` all removed with the new tools; tree provably clean
- [x] G5.3 Docs: `lanes.md` reconcile/cleanup section + `specs/config.md` notes (open-pr + cleanup); 4 fingerprints re-baselined (lanes.md)
- [x] G5.4 Retrospective with `## Verification Evidence` (Rule 12) — written
- [/] G5.5 Version bumped v0.34.0; `/sync-docs` + `/complete-phase` merge/tag/release **pending operator approval** (Rule 6 hard stop)
- [x] G5.6 Verify: full `npm test` **951/951**; `git worktree list` = primary only; `doctor --clean` = "none — tree is clean"
