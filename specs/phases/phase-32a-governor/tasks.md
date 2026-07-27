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

## Group 1 — Authority classifier *(∥ G2)* ✅
- [x] `core/run/lib/authority.js` — pure `(changeSet, config) → operator | agent | park`
- [x] Rule-14 triggers as predicates: >5 production files · `specs/architecture/` · needs-ADR · public contract · config/trust paths · dependency change · displaces planned work
- [x] Config overrides layered above the floor, never below — a raised file threshold is **clamped**, not honoured; floor triggers have no disable path
- [x] Default `park` on an unassessable change set (D6); an *assessable* change with no trigger firing is the agent's
- [x] Path normalization (`./`, leading `/`, backslashes) so a floor trigger cannot be slipped past
- [x] Audit record carries the **negative** evidence (`triggersEvaluated`) — "why did it decide that alone?"
- [x] Classification tests: each trigger isolated, in combination, precedence, purity, malformed overrides, ambiguous fall-through, self-guarding
- [x] Verify: `node --test tests/run-authority.test.js` → **21/21 pass**
- [x] Verify: `npm test` → **1198/1198** (1177 + 21 net-new)

## Group 2 — Park primitive *(∥ G1)* ✅
- [x] Extract `core/swarm/inbox.js` → `core/run/lib/inbox.js`, semantics unchanged (mkdir lock, resolve, INDEX materializer)
- [x] Extract the mkdir lock to `core/run/lib/lock.js` — **one** implementation; swarm delegates with a parametrized label so its timeout message stays byte-identical (ADR-0003's technique)
- [x] Re-point `core/swarm/inbox.js` as a thin adapter — public surface byte-compatible, including its error vocabulary (`writeInboxItem: invalid repo`)
- [x] Generalize record shape to tier-agnostic (`scope`) + parametrized field label so swarm keeps writing `- Repo:` + back-compat reader accepting both
- [x] Optional `- Reason:` line carrying the ADR-0019 classification; omitted entirely when absent so swarm items are unchanged
- [x] Verify: `node --test tests/swarm-*.test.js` → **236/236 swarm tests green**
- [x] Verify: `node --test tests/run-inbox.test.js` → **15/15 pass**

## Group 3 — Governor + safety rails ✅
- [x] `core/run/lib/manifest.js` — write-then-rename under lock, schema-validated on load, `loadSafe` for the hook path, unknown `schema_version` **refused** not guessed
- [x] `core/run/lib/governor.js` — `decide()` pure, all 7 branches in the contract's order
- [x] `core/scripts/run-governor.sh` — **one** shared interceptor script for Claude Code + Antigravity; no-run guard precedes any node invocation
- [x] `core/run/lib/hook.js` — node side; **every** failure path exits 0 (fail-open)
- [x] Wire Claude Code `Stop` hook (`adapters/claude-code/settings.json`)
- [x] Wire Antigravity `Stop` event (`adapters/antigravity/hooks.json`)
- [x] Budget: turns / tokens / wall-clock
- [x] Per-unit 3-strike counter (limit configurable per run)
- [x] **External kill switch** `.momentum/run-stop`, checked before every other branch (P3); rank asserted by test
- [x] `recordTurn` split from `advance` — advance is idempotent by cursor, so a counter inside it would no-op on repeat and a loop would never reach its budget
- [x] Contract re-injection on continue — cursor + pre-authorized action list + parked units named as off-limits
- [x] `governorBackend` capability flag on all 4 adapters (2 `interceptor`, 2 `null` pending 32c) *(pulled forward from G4 — same concern as the hook wiring)*
- [x] 4 adapter fingerprints re-baselined; drift verified as **only** the intended files before rewriting
- [x] Verify: `node --test tests/run-governor.test.js` → **37/37**, incl. **4 real subprocess tests of the production call path** (no-run → 0, live → 2 + continuation, kill switch → 0 + status recorded, corrupt manifest → 0)
- [x] Verify: `npm test` → **1250/1250** (1213 + 37 net-new)

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
