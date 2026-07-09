---
type: Tasks
status: complete
---

# Phase 30c — Team-Fly — Tasks

> **RELEASED v0.37.0 (2026-07-10).** Relay + lease-CAS primitive + published
> contract built + tested; **ecosystem team mode deferred to ENH-064** (only its
> lease-CAS primitive shipped). `[x]` done · `[~]` partial · `[ ]` deferred→ENH-064.

## Group 0 — Contracts & schema ✅
- [x] Author **ADR-0014**
- [x] Relay protocol (in `core/team/relay/server.js` docstring + PROTOCOL_VERSION)
- [x] `core/team/contract/` — versioned coordination schema

## Group 1 — Optional relay ✅
- [x] `core/team/relay/server.js` — self-hostable store-and-poll
- [x] `core/team/relay/client.js` — publish/poll
- [x] Graceful absence (no/unreachable url → skipped, never throws)
- [x] Authority-free invariant (no gate/land endpoint) + test
- [x] `momentum team relay` / `contract`; tests

## Group 2 — Ecosystem team mode ⏸ MOSTLY DEFERRED → ENH-064
- [ ] Remote-URL members in `ecosystem.json` → **ENH-064**
- [ ] `active-initiative`/initiatives/session presence → fragments → **ENH-064**
- [~] Swarm lease → `refs/momentum/leases/*` CAS: `core/team/lib/lease.js` **primitive shipped + tested**; NOT yet wired into `core/swarm/lib/manifest.js` → **ENH-064**
- [x] Lease two-clone tests (single-owner; skew cannot double-own)

## Group 3 — Publish contract + docs ✅ (contract) / ⏸ (docs)
- [ ] Sample third-party reader script → **ENH-064**
- [x] Contract test pins `CONTRACT_VERSION`
- [ ] Docs — site "Team across repos" + relay setup → **ENH-064**

## Group 4 — Verification ✅
- [x] `tests/team-fly.test.js` — lease-CAS, relay publish/poll, graceful absence, authority-free, contract
- [ ] Ecosystem-team e2e → **ENH-064**
- [x] Full suite green (1002/1002)
- [ ] Adapter fingerprint re-baseline → **ENH-064**
- [x] Committed (Fly commit)

## Phase-exit (family)
- [x] `tests/team-family-e2e.test.js` — whole-plane two-clone end-to-end
- [x] Released v0.37.0; tracking reconciled (this pass)
