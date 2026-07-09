---
type: Tasks
status: planned
---

# Phase 30a — Team-Walk — Tasks

> Mirrors `plan.md`. Mark `[x]` complete, `[/]` in-progress. Verify before
> claiming done (Rule 12). Execution: G0 → (G1 ∥ G2) → G3 → G4.

> **Progress — 2026-07-10 (lane `phase-30a-team-walk-impl`, isolated worktree):**
> **G0 ✅ / G1 ✅ / G2 ✅ / G4 ✅ (core)** built + verified; **suite 981/981**.
> Commits: `75d62f6` (G0 identity+fragments+refcas+ADR-0012), `876f423` (G1
> `momentum claim`, ENH-057 mechanism), `1e604d8` (G2 compile+board + G4 e2e).
> **G3 DEFERRED** — its wiring (reword Rule 15 in the rules body, re-baseline
> adapter fingerprints, `bin/momentum.js` gitignore-refresh) overlaps files the
> live **Phase 29** lane is rewriting; land Phase 29 first, then wire (Rule 6
> Landing Order). Still open within scope: ENH-056 self-merge guard (G1);
> changelog→fragments + status.md marker wiring (G2); more e2e scenarios + smoke
> + fingerprints (G4). The git-native core is proven; the remainder is integration.

## Group 0 — Contracts & identity *(blocks all)*
- [ ] Author **ADR-0012** (git-native multiplayer: identity + fragments + ref-CAS; eventual consistency accepted; fragment-vs-CAS split rationale)
- [ ] `core/identity/` — `resolveActor(cwd)` from `git config`; `MOMENTUM_ACTOR` override; deterministic fallback + warning
- [ ] `core/identity/` unit tests (email→actor, override, missing-config fallback)
- [ ] `core/team/lib/fragments.js` — per-actor append-only format + collision-free path invariant + deterministic `compile(view)`
- [ ] `core/team/lib/refcas.js` — `claim(namespace,key)` create-only push CAS + `installRefspec()`
- [ ] `.gitignore` refresh — `!.momentum/team/` negation survives a directory-level `.momentum/` rule (BUG-014-aware)
- [ ] Commit G0

## Group 1 — Collision-free claims *(∥ G2)*
- [ ] `bin/team.js` + `core/team/lib/claim.js` — `momentum claim <phase|id|version>` with read-max → candidate → CAS → deflect/retry
- [ ] **ENH-057** — `momentum claim version` reserves next version pre-release; stale bump refused
- [ ] **ENH-056** — refuse `land --execute` self-merge (current branch == lane branch / own worktree) with integration-branch hint
- [ ] Bare-remote fixture tests: race → one winner; loser re-picks; refspec round-trip on fetch
- [ ] Commit G1

## Group 2 — Fragment-compiled shared state *(∥ G1)*
- [ ] Active Phase table → per-actor fragments + `compile('active-phase')` between managed markers in `status.md`
- [ ] `changelog/` → per-actor fragments + compile (attributed, append-only)
- [ ] `momentum team sync` — fetch coordination refs + branch, recompile views, report changes
- [ ] `lanes board` reads compiled shared state (post-sync cross-machine visibility)
- [ ] Tests: concurrent append + merge → zero conflict; deterministic + attribution-correct + idempotent recompile
- [ ] Commit G2

## Group 3 — Wiring *(sequential)*
- [ ] Wire `core/identity` into lane signal `from`, swarm actor, ecosystem session line, `merge-approved` approver record
- [ ] `/brainstorm-phase` + `/start-phase` + `/hotfix` claim next number via `momentum claim`; `/complete-phase` reserves version (ENH-057)
- [ ] Reword **Rule 15** (rules body + all adapter surfaces) to reference the fragment/CAS mechanism
- [ ] Docs — site team section, README, developer-guide (`claim`, `team sync`)
- [ ] Re-baseline adapter fingerprints (intended drift only)
- [ ] Commit G3

## Group 4 — Verification *(last)*
- [ ] `tests/team-distributed.e2e.test.js` — two-clone bare-remote: (a) claim race, (b) zero-conflict fragments, (c) ENH-057 release race, (d) sync visibility
- [ ] Full suite green (`npm test`); record counts in retrospective `## Verification Evidence`
- [ ] Smoke: `claim`, `team sync`, `lanes board` on the fixture
- [ ] Commit G4 + retrospective

## Phase-exit
- [ ] `/sync-docs` from history → specs
- [ ] `/complete-phase` (verify + release gate; version reserved via `momentum claim version`)
