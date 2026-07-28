---
type: Tasks
status: in-progress
---

# Phase 33 — Self-Install Parity — Tasks

> Execution G0 → G1 → G2. Baseline **1420/1420**. Governed run, 40-turn budget.

## Group 0 — The parity engine
- [ ] `core/selfcheck/lib/parity.js` — pure `(root, adapter) → {missing, changed, extra}`
- [ ] `extra` reported, never condemned — dev-only scripts are legitimate
- [ ] Surface derived from the adapter's own `destinations` + the runtime closure, not re-derived
- [ ] Verify: `npm test`

## Group 1 — The guard, proven red
- [ ] `momentum selfcheck [--fix]` — report by default, `--fix` opt-in
- [ ] `tests/self-install-parity.test.js` fails on `missing` or `changed`
- [ ] **Proven red** on a synthetic drift, then green when reverted
- [ ] Catches all three of today's defects when re-introduced
- [ ] Fix any further real drift found
- [ ] Verify: `npm test`

## Group 2 — Wiring + close
- [ ] Runs in `npm test`
- [ ] Release checklist entry beside `verify-published.sh`
- [ ] `retrospective.md` + `## Verification Evidence`
- [ ] Verify: full suite green
