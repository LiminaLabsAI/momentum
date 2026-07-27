---
type: Tasks
status: in-progress
epic: autonomous-execution
---

# Phase 32b — Epic Tier — Tasks

> Mirrors `plan.md`. Execution: G0 → (G1 ∥ G2) → G3 → G4 → G5.
> Built under `momentum run` — the 32a governor drives this phase (epic
> criterion #6). Baseline **1285/1285**.

## Group 0 — ADR-0020 + schemas *(blocks)* ✅
- [x] **ADR-0020** — scope-grant authorization; argues the counter-case rather than asserting it away (one approval now covers unread code · a single mistaken yes costs an epic not a merge · the window is time not action); mitigations described as **compensating controls, not equivalents**
- [x] `core/run/schema/epic.schema.json` — execution order deliberately NOT encoded in `phases`
- [x] Grant shape closed into `run.schema.json`'s reserved field; bounded on scope + time + count, all three required
- [x] 32a's contract test updated to assert the **handoff** rather than freeze its own placeholder
- [x] Verify: `node --test tests/epic-contracts.test.js` → **12/12**; `npm test` → **1297/1297**

## Group 1 — Epic library + CLI *(∥ G2)* ✅
- [x] `core/run/lib/epic.js` — read/write/validate; phase graph **delegated to `core/waves`** (no second topo-sort)
- [x] `momentum epic create|status|list|close`
- [x] Round-trips the hand-authored `0001-autonomous-execution.md` — **but only after flattening its nested `policy:` map**, which momentum's own OKF reader (ADR-0005) returns `data: null` for. Widening the subset is an ADR-0005 decision; flattening four keys is not
- [x] `waves()` **reports** unscaffolded phases instead of placing them in wave 1 — a phase with no `overview.md` has no *recorded* deps, which is not the same as having none
- [x] `validate()` permits empty `phases` while `planned` — an epic is created during the brainstorm, before its phases are decided
- [x] Orphan guard caught 5 test-only exports; all unexported
- [x] Verify: `node --test tests/epic-library.test.js` → **16/16**; `npm test` → **1313/1313**

## Group 2 — Scope grant *(∥ G1)* ✅
- [x] `core/run/lib/grant.js` — mint / verify / consume / revoke; `verify` pure; every consumption audited **before** the push proceeds
- [x] **Six** distinct refusal reasons: `no-grant` · `expired` · `branch-out-of-scope` · `epic-mismatch` · `revoked` · `exhausted` *(the plan said five; `no-grant` is its own case and an operator needs to tell it apart)*
- [x] All three bounds **required at mint** — an unbounded axis is an unbounded grant
- [x] `mint` **refuses** to write into a git-trackable path — a grant is a credential; downstream repos carry stale `.gitignore`s, so this is checked not documented
- [x] A refused consumption never decrements the budget; expiry never slides
- [x] `pre-push` accepts a valid in-scope grant **alongside** the sentinel (sentinel tried first); every error path in `tryScopeGrant` returns false — **fail-closed**, so a broken grant subsystem can only make the hook stricter
- [x] Adversarial tests written **before** the implementation (confirmed red on a missing module)
- [x] **11 integration tests drive the real `run-check.js` as a subprocess** with git's stdin format — testing `consume()` directly would prove nothing about the hook a real push fires
- [x] `run/lib/grant.js` added explicitly to the **runtime closure** — `run-check.js` resolves it through a computed path the walker cannot follow; without it the grant works here and silently does nothing in every installed project
- [x] `.githooks/` synced (ADR-0018 dual-maintenance fence caught the drift); 4 fingerprints re-baselined
- [x] `momentum run grant [mint|status|revoke]` CLI
- [x] Verify: `node --test tests/run-grant.test.js` → **15/15**; `tests/run-grant-prepush.test.js` → **11/11**; `npm test` → **1339/1339**

## Group 3 — Derivation + amendments
- [ ] `core/run/lib/derive.js` — pure `(epic, priorHistory) → skeletons`, no model call
- [ ] `core/run/lib/amend.js` — forward-only absorbs silently; backward-invalidating stops and names affected units; unclassified treated as backward-invalidating
- [ ] `momentum run amend` + `momentum epic amend`
- [ ] Verify: `npm test`

## Group 4 — Recipes + wiring
- [ ] `/brainstorm-epic` recipe (core + 4 adapters)
- [ ] `/brainstorm-phase --derive` — no-interview path; interview path untouched
- [ ] `momentum run start epic <slug>` walks the phase graph
- [ ] `tdd: strict` enforcement at task-marking
- [ ] Stacked-lane landing for `release: per-feature`
- [ ] Re-baseline 4 fingerprints; drift verified as only the intended files
- [ ] Verify: `npm test`

## Group 5 — Verification
- [ ] Two-phase epic e2e on a clean clone — **one approval**
- [ ] Amendment e2e — forward-only silent, backward-invalidating stops + names
- [ ] Derivation reproducibility — byte-identical on identical inputs
- [ ] Grant adversarial suite green, all five reasons distinct
- [ ] **Orphan guard green** — run BEFORE the retrospective is written
- [ ] Invariance + swarm **236/236**
- [ ] `retrospective.md` + `## Verification Evidence` (Rule 12 Gate A)
- [ ] Verify: full suite green, net-new ≥ 50
