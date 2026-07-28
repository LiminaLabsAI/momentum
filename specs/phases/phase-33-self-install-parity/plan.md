---
type: Plan
status: in-progress
tags: [self-install, parity, drift]
---

# Phase 33 — Self-Install Parity — Plan

```
# Execution:  G0 → G1 → G2
```

Branch `phase-33-self-install-parity`. Target v0.44.0. Baseline **1420/1420**.

> **Governed run.** This phase is the first driven end-to-end by the 32a
> governor with the Stop hook live in this repo. Budget 40 turns,
> `release: per-phase`.

---

## Group 0 — The parity engine

1. `core/selfcheck/lib/parity.js` — pure. Given the repo root and an adapter,
   compute the surface a fresh install would produce and diff it against what is
   actually on disk. Returns `{missing, changed, extra}`.
2. **`extra` is reported, not condemned.** This repo legitimately carries dev-only
   scripts (`demo-team.sh`, `orient.js`, `capture-*.js`) that no install produces.
   A guard that flags those is a guard people silence.
3. Reuse the adapter's own `destinations` + the runtime closure rather than
   re-deriving the surface — a second derivation is the duplication ADR-0018 ends.

**Commit:** `feat(selfcheck): surface parity engine`

---

## Group 1 — The guard, proven red

1. `momentum selfcheck [--fix]` — report by default; `--fix` opt-in.
2. `tests/self-install-parity.test.js` — fails on `missing` or `changed`.
3. **Prove it red**: introduce a synthetic drift, assert the detector fires,
   revert, assert green. Today's three defects re-introduced one at a time.
4. Fix whatever real drift it finds beyond the three already repaired.

**Commit:** `test(selfcheck): parity guard, proven red`

---

## Group 2 — Wiring + close

1. Runs as part of `npm test`.
2. Added to the release checklist in `specs/project-rules.md`, beside
   `verify-published.sh` — the two are complements: one checks what users
   download, the other what momentum itself runs.
3. Retrospective + `## Verification Evidence`.

**Commit:** `test(selfcheck): wire into the suite and release checklist`
