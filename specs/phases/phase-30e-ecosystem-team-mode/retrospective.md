---
type: Retrospective
---

# Phase 30e — Ecosystem (Multi-Repo) Team Mode — Retrospective

## Outcome

Extended the git-native Team-mode plane from single-repo (v0.37/0.38) up to the
**ecosystem / multi-repo layer** (closes **ENH-065**, ADR-0015). A distributed team
now coordinates across *many repos at once*: remote-URL members, a shared attributed
active-initiative + presence, and cross-machine-safe swarm ownership — all via the
ecosystem repo's own git (`.momentum/team/` fragments + `refs/momentum/*`), no server,
no daemon. Released as **v0.39.0**.

## What shipped

- **G1 — Remote-URL members.** `ecosystem.json` members take an optional `remote`
  git URL alongside `path` (validation requires ≥1; path-only back-compat kept).
  `resolveMemberLocation` classifies local / remote / both; `ecosystem status`
  resolves remote members by URL with a best-effort reachability probe;
  `ecosystem add --remote`.
- **G2 — Ecosystem-state → fragments.** `active-initiative` (was per-machine `.state/`)
  and session-presence become per-actor fragments in the ecosystem repo
  (`core/ecosystem/lib/team-state.js`), compiled to a shared last-writer-wins value,
  **attributed**; two clones set it concurrently → **zero-conflict merge**. Legacy
  `.state/` kept as a per-machine cache + fallback.
- **G3 (risky) — Swarm leases-as-source-of-truth.** The 30d opt-in lease fence becomes
  the **default when the ecosystem root has a remote**; the CAS key includes the
  **superseded lease generation**, giving both single-winner arbitration (no
  double-own) and liveness (a crashed owner's stale ref can't wedge the next
  takeover). Single-machine (no remote) is byte-unchanged. Escape hatch
  `MOMENTUM_SWARM_LEASE_CAS=0`.
- **G4 — Reader + docs + demo + tidy.** Sample third-party contract reader
  (`scripts/read-team-board.js`, Node + git only); site "Team mode" page +
  developer-guide + README; extended `scripts/demo-team.sh` (ecosystem + reader);
  `.gitignore` ignores `.momentum/team/**/*.log`; 4 adapter fingerprints re-baselined.

## Decisions

- **Leases-as-source-of-truth via generation-keyed ref-CAS** (ADR-0015). Only the
  contended thing — repo ownership — is shared, via the mechanism already proven in
  30d, made default-on-with-remote. Rejected shared-manifest-via-fragments (heavier
  new transport) and relay-primary (weakens no-required-server).
- **Single-machine invariance as a hard gate** — the swarm test suite is the gate;
  the no-remote path is byte-unchanged.

## Lessons

- The 30d fence's fixed CAS key had a latent liveness gap (a crashed owner would
  hold the ref forever). Making it default-on surfaced it; keying by the superseded
  lease generation resolves it cleanly without new state.
- Reusing the existing fragment/refcas/lease/presence libraries at the ecosystem
  root (rather than new transport) kept the new surface minimal and the risk low.

## Verification Evidence

> Captured 2026-07-10 on lane `phase-30e-ecosystem-team-mode`. `test_command = npm test`.

**Full suite: 1028 / 1028 pass, 0 fail** (up from the 1008 G0 baseline; +20 net-new).
**Swarm invariance gate: 236 / 236 pass** (the 233 baseline + 3 new two-clone cases) —
single-machine (no-remote) swarm behavior byte-unchanged with the default-on CAS path
present. **Site build: 13 pages** incl. `/team/`, content gate green.

| Deliverable | Evidence |
|---|---|
| D1 — Remote-URL members | `tests/ecosystem-remote-members.test.js` — schema (path\|remote), `resolveMemberLocation`, `ecosystem status` resolves a remote member by URL (reachable via a local bare), relative paths intact, `add --remote`. |
| D2 — Ecosystem-state → fragments | `tests/ecosystem-team-state.test.js` — two clones set `active-initiative` concurrently → zero-conflict merge; global last-writer-wins, attributed; legacy `.state/` fallback; CLI attribution. |
| D3 — Swarm leases-as-source-of-truth | `tests/swarm-lease-cas-ecosystem.test.js` — two clones, default-on (no env var): ref-CAS arbitrates ownership, skew can't double-own; fresh-generation liveness; single-machine wall-clock path. |
| D4 — Contract reader + docs + demo | `tests/team-contract-reader.test.js`; site builds 13pp incl. `/team/`; `scripts/demo-team.sh` runs the whole plane across two clones + two repos. |
| D5 — `.gitignore` + fingerprints | `.momentum/team/**/*.log` ignored; 4 fingerprints re-baselined (drift = only `.gitignore`); `tests/*-fingerprint.test.js` + `tests/claude-code-regression.test.js` green. |
| Whole-plane e2e | `tests/ecosystem-team-e2e.test.js` — one two-clone scenario covering D1+D2+D3. |

Commands run this session (fresh output observed):

```
npm test                                            → tests 1028, pass 1028, fail 0
node --test tests/swarm-*.test.js                   → tests 236,  pass 236,  fail 0
cd site && npm run build                            → 13 pages; content gate: all bodies non-empty
node scripts/rebaseline-fingerprints.js --check     → drift = only .gitignore (×4 adapters)
bash scripts/demo-team.sh                           → whole plane green across 2 clones + 2 repos
```
