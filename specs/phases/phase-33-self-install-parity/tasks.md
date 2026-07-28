---
type: Tasks
status: in-progress
---

# Phase 33 — Self-Install Parity — Tasks

> Execution G0 → G1 → G2. Baseline **1420/1420**. Governed run, 40-turn budget.

## Group 0 — The parity engine
- [x] `core/selfcheck/lib/parity.js` — pure `(root, adapter) → {missing, changed, extra}`
- [x] `extra` reported, never condemned — dev-only scripts are legitimate
- [x] Surface derived from the adapter's own `destinations` + the runtime closure, not re-derived
- [x] Verify: `npm test` — **1427/1427** (1420 baseline + 7 new)

## Group 1 — The guard, proven red
- [x] `momentum selfcheck [--fix]` — report by default, `--fix` opt-in
- [x] `tests/self-install-parity.test.js` fails on `missing` or `changed`
- [x] **Proven red** on a synthetic drift, then green when reverted
- [x] Catches all three of today's defects when re-introduced — verified concretely in a sandbox: Stop hook stripped from `settings.json` → CAUGHT (changed); `run-governor.sh` deleted → CAUGHT (missing); `cross-repo-gate.sh` staled → CAUGHT (changed); clean before and after each
- [x] Fix any further real drift found
- [x] Verify: `npm test` — **1427/1427** (1420 baseline + 7 new)

## Group 2 — Wiring + close
- [ ] Runs in `npm test`
- [ ] Release checklist entry beside `verify-published.sh`
- [ ] `retrospective.md` + `## Verification Evidence`
- [ ] Verify: full suite green
