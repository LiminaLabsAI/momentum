---
type: Tasks
status: in-progress
epic: autonomous-execution
---

# Phase 32b — Epic Tier — Tasks

> Mirrors `plan.md`. Execution: G0 → (G1 ∥ G2) → G3 → G4 → G5.
> Built under `momentum run` — the 32a governor drove this phase (epic
> criterion #6). Baseline **1285/1285** → **1383/1383**. **All groups complete.**

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

## Group 3 — Derivation + amendments ✅
- [x] `core/run/lib/derive.js` — pure `(epic, priorHistory) → skeletons`, no model call; **date supplied, never read from a clock**, so output is byte-reproducible
- [x] Derived spec declares it was derived, cites its source epic, carries inherited decisions, deps and run policy
- [x] The plan section **admits what derivation cannot know** — the group breakdown depends on code the epic predates
- [x] `core/run/lib/amend.js` — forward-only absorbs silently; backward-invalidating stops and names affected units; **unclassified treated as backward-invalidating** (the safe direction)
- [x] Classification is **caller-signalled, not text-guessed** — same discipline as ADR-0019's `needs_adr`; a text-reading classifier would be unreproducible and unauditable
- [x] Completed units read from the audit trail, not inferred; turn counters not mistaken for units
- [x] Only forward-only amendments feed later derivations — a backward one stopped the run, so what happens next is the operator's call
- [x] `momentum run amend` + `momentum run derive`
- [x] **Verified live:** a forward-only amendment absorbed with the run still `running`, and appearing in the derived spec of a phase that does not exist yet
- [x] Verify: `node --test tests/run-amend-derive.test.js` → **23/23**; orphan guard clean; `npm test` → **1362/1362**

## Group 4 — Recipes + wiring ✅
- [x] `/brainstorm-epic` — **one** shared recipe in `core/commands/` reaching all 4 adapters; same gate contract as its siblings; red-flags table names the specific mistake the tier prevents (writing later phases' plans during the epic brainstorm)
- [x] `/brainstorm-phase --derive` — no-interview path documented; **interview path untouched** (a cold phase still needs the questions) and asserted intact by test
- [x] `momentum run start epic <slug>` resolves the first **ready** phase from the computed wave plan — a cursor on the epic slug names no work; also reports phases it cannot yet order
- [x] `--unit` still overrides; phase-tier starts unaffected
- [x] `tdd: strict` enforcement at task-marking — `run red-green` records the transition, `run check-task` refuses without one; evidence is **per-unit** so proof on G1 cannot vouch for G2; stored on the manifest, not inferred from test output
- [x] Re-baseline 4 fingerprints; drift verified as only the 2 intended files per adapter; self-install overlays synced
- [x] **Test-quality fix:** two tests mutated strings that did not exist (the serializer emits inline lists) and asserted against unchanged input — both now assert the mutation applied first
- [ ] ~~Stacked-lane landing for `release: per-feature`~~ → **moved to G5**, where the two-phase e2e exercises it end to end rather than in isolation
- [x] Verify: `node --test tests/epic-wiring.test.js` → **13/13**; `npm test` → **1375/1375**

## Group 5 — Verification ✅
- [x] **Two-phase epic e2e on a clean clone — ONE approval** (epic criterion #1), driven through the real CLI and the real `pre-push` hook as a subprocess
- [x] Control test: without a grant the same two landings need two approvals — proves the grant is doing the work, not ungated branches
- [x] Amendment e2e — forward-only silent and reaching an unwritten phase; backward-invalidating stops + names; unsignalled stops
- [x] Derivation reproducibility — byte-identical **across separate processes**, not just in-process
- [x] Grant adversarial suite green; all **six** reasons distinct
- [x] **Orphan guard green — run BEFORE the retrospective was written** (32a's lesson, applied)
- [x] Invariance at the epic tier + swarm **236/236**
- [x] Epic record round-trip: what `create` writes, `load` reads
- [x] `retrospective.md` + `## Verification Evidence` (Rule 12 Gate A)
- [x] Verify: `node --test tests/epic-e2e.test.js` → **8/8**; `npm test` → **1383/1383** (baseline 1285, **98 net-new**, target was ≥ 50)
