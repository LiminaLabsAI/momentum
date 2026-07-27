---
type: Tasks
status: in-progress
epic: autonomous-execution
---

# Phase 32a — Governor — Tasks

> Mirrors `plan.md`. `[x]` done · `[/]` in-progress · `[ ]` todo. Verify before
> claiming done (Rule 12). Execution: G0 → (G1 ∥ G2) → G3 → G4 → G5.
> Epic **0001 Autonomous Execution**. Target v0.43.0.
> Branch `epic-0001-autonomous-execution` — commit + push per group, **no merge
> until the epic completes**.

## Group 0 — Contracts *(blocks)* ✅
- [x] Author **ADR-0019** — Decision Authority Model (mechanical classification, park-on-ambiguity, pure function)
- [x] `core/run/schema/run.schema.json` — versioned (`schema_version` const 1), tier-agnostic, floor rules encoded as type constraints (`push: never` is unrepresentable), 32b surfaces reserved without pre-committing their shape
- [x] `core/run/CONTRACT.md` — the "next unit starts" invariant + both backends (so 32c implements against a contract, not against code); 7-branch decision order with the kill switch ranked above everything
- [x] Authority trigger table **as data** (`core/run/lib/authority-triggers.js`) — one frozen source shared by classifier and tests; covers all 5 Rule-14 triggers; guards itself via the `trust-layer` path
- [x] ADR-0019 in `specs/decisions/index.md`; 14 topic rows added to `impact-map.md`
- [x] Verify: `node --test tests/run-contracts.test.js` → **16/16 pass**
- [x] Verify: `npm test` → **1177/1177** (baseline 1161 + 16 net-new)

## Group 1 — Authority classifier *(∥ G2)*
- [ ] `core/run/lib/authority.js` — pure `(changeSet, config) → operator | agent | park`
- [ ] Rule-14 triggers as predicates: >5 production files · `specs/architecture/` · needs-ADR · public contract · config/trust paths
- [ ] Config overrides layered above the floor, never below
- [ ] Default `park` on no-match (D6)
- [ ] Classification tests: each trigger isolated, in combination, and the ambiguous fall-through
- [ ] Verify: `npm test`

## Group 2 — Park primitive *(∥ G1)*
- [ ] Extract `core/swarm/inbox.js` → `core/run/lib/inbox.js`, semantics unchanged (mkdir lock, resolve, INDEX materializer)
- [ ] Re-point `core/swarm/inbox.js` as a thin re-export — public surface byte-compatible
- [ ] Generalize record shape to tier-agnostic (`scope`, `run_id`) + back-compat reader
- [ ] Verify: **236 swarm tests green**
- [ ] Verify: `npm test`

## Group 3 — Governor + safety rails
- [ ] `core/run/lib/manifest.js` — atomic read/write/resume, schema-validated on load, forward-field tolerant
- [ ] `core/run/lib/governor.js` — the decision function, all six branches
- [ ] `core/scripts/run-governor.sh` — **one** shared interceptor script for Claude Code + Antigravity
- [ ] Wire Claude Code `Stop` hook
- [ ] Wire Antigravity `Stop` event
- [ ] Budget: turns / tokens / wall-clock
- [ ] Per-task 3-strike counter
- [ ] **External kill switch** `.momentum/run-stop`, checked FIRST (P3)
- [ ] Contract re-injection on continue — cursor + pre-authorized action list
- [ ] Verify: `npm test`

## Group 4 — Wiring
- [ ] `bin/run.js` — `start | status | continue | stop`; dispatched from `bin/momentum.js`; in `--help`
- [ ] `run status` renders decisions + parked questions **without interrupting a live run**
- [ ] `momentum config validate` — free / coupled / floor
- [ ] Coupled rule: release granularity never finer than merge granularity
- [ ] Coupled rule: `merge: per-feature` requires `tdd: strict` + per-phase evidence
- [ ] Floor rules: evidence always · push ≥ per-phase · suite green between landings · protected pushes human-authorized
- [ ] Every rejection names the violated rule
- [ ] `tdd: strict` enforcement — no `[x]` without a recorded red→green
- [ ] `governorBackend` capability flag on all 4 adapters (2 interceptor, 2 null)
- [ ] Mark swarm wave runner **deprecated** in `conductor.js` + `/swarm` recipe → BUG-031, 32d
- [ ] Re-baseline 4 adapter fingerprints (prove zero drift before use)
- [ ] Verify: `npm test`

## Group 5 — Verification
- [ ] Extend enumerative production-call-path guard over `core/run/`
- [ ] **Prove the guard works** — orphan an export, observe red, restore
- [ ] E2E: hands-off multi-group run
- [ ] E2E: kill-switch halts within one turn
- [ ] E2E: resume-after-kill, no lost work
- [ ] E2E: runaway halts at strike limit
- [ ] E2E: no `run.json` ⇒ v0.42.0 behaviour byte-unchanged (invariance gate)
- [ ] **Live dogfood** — real multi-group phase run hands-off, transcript captured
- [ ] `retrospective.md` + `## Verification Evidence` (Rule 12 Gate A)
- [ ] Verify: full suite green, net-new tests ≥ 40
