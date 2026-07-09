---
type: Tasks
status: complete
---

# Phase 30a — Team-Walk — Tasks

> **RELEASED v0.37.0 (2026-07-10).** Core mechanisms built + tested; integration
> wiring deferred to **ENH-064** (additive, non-blocking). `[x]` done · `[~]`
> partial · `[ ]` deferred→ENH-064. Suite 1002/1002.

## Group 0 — Contracts & identity ✅
- [x] Author **ADR-0012** (git-native multiplayer)
- [x] `core/identity/` — `resolveActor` (git config / MOMENTUM_ACTOR / fallback)
- [x] `core/identity/` unit tests
- [x] `core/team/lib/fragments.js` — per-actor append-only + `compile`
- [x] `core/team/lib/refcas.js` — `claim` + `installRefspec`
- [~] `.gitignore` `!.momentum/team/` (self-repo done) — downstream `refreshGitignore` template → ENH-064
- [x] Commit G0 (`75d62f6`)

## Group 1 — Collision-free claims ✅
- [x] `momentum claim <namespace> <key>` (deflect/exit-2 on loss)
- [x] **ENH-057** — version reserved via claim before tag
- [x] **ENH-056** — self-merge already refused by the ENH-050 `into===lane.branch` guard
- [x] Bare-remote two-clone tests
- [x] Commit G1 (`876f423`)

## Group 2 — Fragment-compiled shared state ✅ (mostly)
- [x] Active Phase table → fragments + `compileStatusFile` into status.md (managed markers)
- [ ] `changelog/` → fragments → **ENH-064**
- [x] `momentum team sync` (fetch + recompile)
- [x] `momentum team board` reads compiled shared state
- [x] Tests (compile, foldLatest, applyManaged idempotent, CLI)
- [x] Commit G2 (`1e604d8`, `29b0e13`)

## Group 3 — Wiring ⏸ DEFERRED → ENH-064 (overlaps Phase-29 instruction surfaces)
- [ ] Wire `core/identity` into lane signal `from` / swarm actor / session line / merge-approved
- [ ] `/brainstorm-phase` + `/start-phase` + `/hotfix` claim next number; `/complete-phase` reserves version
- [ ] Reword **Rule 15** to cite the fragment/CAS mechanism
- [ ] Docs — site team section, README, developer-guide
- [ ] Re-baseline adapter fingerprints

## Group 4 — Verification ✅
- [x] `tests/team-e2e.test.js` — two-clone conflict-free fragments + one-winner claim
- [x] `tests/team-family-e2e.test.js` — whole-plane two-clone (added at family level)
- [x] Full suite green (1002/1002)
- [x] Retrospective with `## Verification Evidence`
- [ ] Adapter fingerprint re-baseline → ENH-064
- [x] Commit G4 (`1e604d8`)

## Phase-exit
- [x] Tracking reconciled (this pass)
- [x] Released v0.37.0 (merge → main → staging, tag, GH release, npm)
