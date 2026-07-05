---
type: Task List
---

# Phase 17.5 — Swarm Portability: Tasks

## Group 0 — Signal protocol + lease enforcement library
- [x] T0.1 `core/swarm/signals.js` — typed writer/reader/poller + INDEX
- [x] T0.2 `core/swarm/schema/signal.schema.json` — v1 schema
- [x] T0.3 Lease enforcement at `core/swarm/lib/manifest.js` write path
- [x] T0.4 `core/swarm/lib/tokens.js` — opaque CRUD
- [x] T0.5 `core/swarm/lib/sessions.js` — sessions[] CRUD
- [x] T0.6 `tests/swarm-signals.test.js`
- [x] T0.7 `tests/swarm-lease-enforcement.test.js`
- [x] T0.8 `tests/swarm-tokens-sessions.test.js`
- [x] T0.9 Commit G0

## Group 1 — claim + release CLI
- [x] T1.1 `cmdClaim` in `bin/swarm.js`
- [x] T1.2 `cmdRelease` in `bin/swarm.js`
- [x] T1.3 `bin/momentum.js` dispatch + `--help`
- [x] T1.4 `adapters/claude-code/commands/swarm.md` claim/release sections
- [x] T1.5 `tests/swarm-claim-release.test.js`
- [x] T1.6 Claude Code fingerprint refresh
- [x] T1.7 Commit G1

## Group 2 — /swarm focus <repo>   (parallel with G3)
- [x] T2.1 `core/swarm/focus.js`
- [x] T2.2 `cmdFocus` in `bin/swarm.js`
- [x] T2.3 `--token` consumption hook (provided to G3)
- [x] T2.4 `swarm.md` /swarm focus section
- [x] T2.5 `tests/swarm-focus.test.js`
- [x] T2.6 Commit G2

## Group 3 — /swarm join <swarm-id>   (parallel with G2)
- [x] T3.1 `core/swarm/join.js`
- [x] T3.2 `cmdJoin` in `bin/swarm.js` with `--token`/`--claim`
- [x] T3.3 Auto-renew owned leases on join
- [x] T3.4 `swarm.md` /swarm join section
- [x] T3.5 `tests/swarm-join.test.js`
- [x] T3.6 Commit G3

## Group 4 — /swarm absorb <other-id>
- [x] T4.1 `core/swarm/absorb.js` — verify + manifest/board/inbox/audit merge + archive
- [x] T4.2 `cmdAbsorb` in `bin/swarm.js` with interactive confirm
- [x] T4.3 `swarm.md` /swarm absorb section
- [x] T4.4 `tests/swarm-absorb.test.js` (clean + contract-match + contract-conflict abort + inbox merge + audit timeline)
- [x] T4.5 Commit G4

## Group 5 — e2e + docs + retrospective + release
- [x] T5.1 `tests/swarm-portability-e2e.test.js` (P-Focus, P-Join, P-Absorb-Conflict)
- [x] T5.2 Evidence files `evidence/scenario-portability-{focus,join,absorb}.txt`
- [x] T5.3 `docs/swarm.md` Phase 17.5 section → shipped
- [x] T5.4 `core/adapter-parity-matrix.md` footnote update
- [x] T5.5 `core/adapter-capabilities.md` Phase 17.5 section
- [x] T5.6 `/sync-docs` propagation
- [x] T5.7 `package.json` → 0.20.2
- [x] T5.8 `retrospective.md`
- [x] T5.9 `npm test` final — 550/550 green
- [x] T5.10 Release commit `chore(release): v0.20.2 — Swarm Portability`
