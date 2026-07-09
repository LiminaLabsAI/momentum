---
type: Phase
status: in-progress
tags: [lifecycle, cleanup, default-branch, worktree, lanes, release-gate, upgrade-hygiene]
---

# Phase 27 — Lifecycle Cleanup & Default-Branch Hardening

## Goal

Make the momentum lifecycle **leave the repo clean and correct under every
release configuration**. Today a fresh project's phase-0 branch hijacks the
forge default branch, landed phases/lanes leave orphan worktrees + branches +
state, tracking can lag the release, and there is no handshake for the configs
where a human (not the agent) performs the terminal merge. This phase fixes all
of that with **one reusable, forge-neutral, default-branch-safe cleanup action**
whose *trigger* is driven by `specs/config.md` (`end_state`).

Closes: BUG-025, BUG-026. Ships: ENH-063. Pairs with ADR-0009 (trust layer
invariant / mechanisms-as-config) — cleanup is a *mechanism*; the protected-branch
push-approval trust layer is untouched.

## Core model

> A phase/lane branch is **"spent"** once its work has landed on the **terminal
> integration branch** (last entry of `branch_flow`, e.g. `main`). Cleanup —
> remove worktree, delete branch (local + remote), clear lane/temp state,
> *default-branch-safe* — is **one reusable action**. What differs per config is
> only **who performs the merge**, which decides **when "spent" is observable**
> and **which command fires the cleanup**.

| `end_state` | Who merges to terminal | When branch is "spent" | Cleanup fires |
|---|---|---|---|
| `merge-after-yes` (default) | Agent, locally, in-session | right after the terminal push succeeds | **Synchronous** — auto at end of `complete-phase` / `lanes land` (`--keep` opts out) |
| `staging-promotion` | Agent → staging; human promotes staging→main | only once it reaches terminal `main` | **Deferred** — swept by `lanes reconcile` once contained in `main` |
| `feature-branch-only` | Human, out-of-band | not observable in-session | **Reconcile** — agent never auto-cleans; sweep detects "merged upstream" then cleans |
| `open-pr` *(new)* | Forge, on human PR merge | when the PR merges upstream | **Reconcile** — sweep detects the merge, cleans local worktree + branch + state |

## Key decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Cleanup is **one reusable git-only action**; only its *trigger* is config-driven | Avoids four divergent cleanup code paths; forge-neutral (ships no forge code) |
| 2 | **Two entry points**: synchronous (agent merges) + `momentum lanes reconcile` (human/forge merges) | Matches who owns the terminal merge per `end_state` |
| 3 | **Push the terminal branch to origin first** at founding | Forge adopts `main` (not phase-0) as default — the load-bearing BUG-025 fix; optional config-gated `gh` assertion repairs already-hijacked repos |
| 4 | **Human handshake for non-auto `end_state`s**: ask → human confirms → agent **verifies** (Rule 12) it actually landed → agent cleans | Agent never cleans on trust alone; honors verify-before-claim even for a human's action |
| 5 | **Tracking-before-release gate**: refuse to enter Release until status/roadmap/changelog are updated **and committed** | Release must never precede tracking; mirrors the existing Verification-Evidence gate |
| 6 | Add **`end_state: open-pr`** + **fix the `._*`/`.bak` transform+upgrade leaks** | First-class PR-review flow + kill the cruft at its source |

## Scope

### In
- `cleanupTarget()` shared action (worktree → local branch → remote branch-if-not-default → lane state), default-branch-safe, git-only
- Default-branch protection: push-terminal-first at founding; fresh-repo-resilient `start-phase`; optional config-gated `gh repo edit --default-branch` assertion
- Synchronous cleanup wired into `lanes land --execute` (auto; `--keep`) and `complete-phase`
- `momentum lanes reconcile` + human confirm→verify→clean handshake + full-cleanup `lanes close` (ENH-063) + `end_state: open-pr`
- Tracking-before-release ordering gate in `complete-phase`
- Upgrade/transform hygiene: skills transform filters `._*`; upgrade leaves no `.bak`; `momentum doctor` sweep for stray files + orphan worktrees
- **Dogfood/verification:** clean this repo's real accumulated cruft with the new mechanisms

### Out (non-goals)
- No forge-integration layer / no `gh`/`glab` code shipped in `bin`/`core` (recipe-level, config-gated only — momentum ships no forge code)
- No change to the trust layer (protected-branch push approval stays invariant, ADR-0009)
- No new orchestration primitives; Intelligence-phase work stays in Phase 28
- No change to `branch_flow` semantics beyond adding the `open-pr` terminal option

## Deliverables & verification

Default verification command (`specs/config.md`): `test_command = npm test`; `build_command = none`.

| Deliverable | Verification |
|---|---|
| `cleanupTarget()` + shared helper unit tests | `npm test` (new cleanup suite green) |
| Default-branch protection (BUG-025) | Bare-remote fixture: founding→phase-0 → assert `git symbolic-ref refs/remotes/origin/HEAD` == `main` |
| Synchronous cleanup in land/complete (BUG-026) | e2e: post-land tree has no lane worktree, no branch (local+remote), no lane state |
| Reconcile + handshake + `open-pr` (BUG-026/ENH-063) | Per-`end_state` e2e matrix; reconcile-after-upstream-merge cleans; `lanes close` deletes branch |
| Tracking-before-release gate | complete-phase refuses Release with stale/uncommitted tracking (test) |
| Transform/upgrade hygiene | Upgrade fixture leaves zero `._*`/`.bak`; `momentum doctor` removes seeded cruft |
| Self-repo dogfood | 2 stale lane worktrees + orphan worktree + 19 `._*` + 8 `.bak` gone; full suite green |

## Acceptance criteria

1. Fresh project: `main` is the forge default after founding — the phase-0 branch never becomes default.
2. After an agent-merge landing (`merge-after-yes`), the worktree, branch (local+remote), and lane state are all gone automatically.
3. For `staging-promotion` / `feature-branch-only` / `open-pr`, the agent asks the human to do the manual step and cleans **only after verifying** the merge actually landed.
4. `complete-phase` will not release until tracking is updated and committed.
5. `momentum upgrade` leaves no `._*` or `.bak`; `momentum doctor` cleans a dirty repo.
6. Full suite green; this repo's accumulated cruft is gone.
