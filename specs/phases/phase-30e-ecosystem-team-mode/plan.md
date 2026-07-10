---
type: Plan
status: planned
---

# Phase 30e — Ecosystem Team Mode — Implementation Plan

```
Execution order:  Group 0 → (Group 1 ∥ Group 2) → Group 3 → Group 4 → Group 5
```

- **Group 0** blocks (ADR-0015 + schemas).
- **Groups 1 & 2** — remote-URL members vs ecosystem-state fragments — are
  independent, parallel.
- **Group 3** — the swarm leases-as-source-of-truth — is the one risky group,
  sequential; single-machine path must stay byte-unchanged (231 swarm tests green).
- **Group 4** — reader + docs + demo + tidy + fingerprints.
- **Group 5** — verification + release.

Lane `phase-30e-ecosystem-team-mode` (isolated worktree). Verification: `npm test`.

## Group 0 — Contracts & ADR-0015 *(Sequential — blocks)*
**Commit:** `feat(ecosystem): team-mode contracts + ADR-0015`
- [ ] **ADR-0015** — ecosystem (multi-repo) team mode: git-native via the ecosystem repo (fragments) + `refs/momentum/*` (leases); **leases-as-source-of-truth** for swarm ownership; single-machine invariance.
- [ ] Remote-URL member schema — optional `remote` (git URL) on `ecosystem.json` members; back-compat with `path`.
- [ ] Ecosystem fragment views — `active-phase`-style views for `active-initiative` / `initiatives` / `presence`, reusing `core/team/lib/fragments` in the ecosystem repo.

## Group 1 — Remote-URL members *(∥ Group 2)*
**Commit:** `feat(ecosystem): remote-URL members`
- [ ] `ecosystem.json` members accept `remote` (git URL); validation accepts `path` and/or `remote`.
- [ ] Discovery (`core/ecosystem/lib`) + `ecosystem status` resolve remote-identified members (fetch/inspect by URL where needed); `../relative` still resolves for co-located use.
- [ ] Tests: two-clone ecosystem with URL members resolves on both; relative paths unaffected.

## Group 2 — Ecosystem-state → fragments *(∥ Group 1)*
**Commit:** `feat(ecosystem): active-initiative/initiatives/presence as team fragments`
- [ ] `active-initiative` (today per-machine `.state/`) → per-actor fragment in the ecosystem repo + compile; `momentum ecosystem` reads the compiled value.
- [ ] Initiatives + session-presence → fragments; `ecosystem status` shows shared, attributed state.
- [ ] `momentum team sync` works at the ecosystem-root level (fetch + recompile).
- [ ] Tests (two-clone ecosystem): concurrent `active-initiative` set + merge → zero conflict; compiled view consistent + attributed.

## Group 3 — Swarm leases-as-source-of-truth *(Sequential — RISKY)*
**Commit:** `feat(swarm): ref-CAS leases as the default cross-machine ownership`
- [ ] Promote the 30d fence: when the ecosystem root has a **remote**, `refs/momentum/leases/*` CAS is the **source of truth** for repo ownership (acquire/renew/release); the manifest `owner`/`lease_*` fields become a **local projection** of the ref state.
- [ ] Renewals = cheap ref refresh; takeover requires winning the CAS (30d fence, now default-on-with-remote).
- [ ] **Single-machine invariance:** no remote → the existing wall-clock lease path is byte-unchanged. Guarded so the **231 swarm tests stay green**.
- [ ] Tests (two-clone swarm): ownership via CAS; skew can't double-own; audit keyed by durable actor; single-machine unchanged.

## Group 4 — Reader + docs + demo + tidy *(Sequential)*
**Commit:** `docs(team): sample contract reader + team-across-repos docs; gitignore log tidy`
- [ ] Sample third-party **contract reader** (reads `core/team/contract` fragments/refs → prints the board).
- [ ] Docs — site "Team across repos" + developer-guide (remote members, ecosystem fragments, swarm ownership); README.
- [ ] Extend `scripts/demo-team.sh` — ecosystem coordination + relay.
- [ ] `.gitignore` template: keep `!.momentum/team/` but add `.momentum/team/*.log` (local audit — deferred from 30d).
- [ ] Re-baseline 4 adapter fingerprints (`scripts/rebaseline-fingerprints.js`, verify zero-drift first).

## Group 5 — Verify + release *(Sequential — last)*
**Commit:** `test(ecosystem): two-clone multi-repo team e2e` → then release
- [ ] **Two-clone ecosystem-team e2e** (`tests/ecosystem-team-e2e.test.js`): remote-URL members + shared active-initiative + swarm ownership via CAS across two clones.
- [ ] Full suite green (`npm test`); **231 swarm tests green**; retrospective `## Verification Evidence`.
- [ ] **Tracking BEFORE tag (Gate B):** tasks.md, roadmap, status reconciled; ENH-065 → resolved.
- [ ] Release **v0.39.0** (merge → main → staging, tag, GH release, npm); verify all surfaces; close lane; only `main` + `staging` remain.
