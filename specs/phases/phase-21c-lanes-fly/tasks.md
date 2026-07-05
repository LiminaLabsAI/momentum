---
type: Task List
---

# Phase 21c — Lanes Fly — Tasks

> Mirrors plan (in overview.md scope). Execution: G0 → G1 → G2 → G3 → G4.

## Group 0 — Scaffold + ADR-0003
- [x] Phase files + tracking (status row, changelog, index.json, README) — commit 5f9a5f6
- [x] ADR-0003 `specs/decisions/0003-recursive-wave-planner.md`

## Group 1 — Core engine + swarm rewire
- [x] `core/waves/lib/waves.js` (Kahn layering, stable order, cycle errors, label-compatible)
- [x] `core/swarm/lib/wave-ordering.js` → thin adapter; byte-stable ({index, repos} shape + error strings pinned)
- [x] `tests/waves-engine.test.js` green (7/7 incl. swarm-parity pin); swarm e2e scenarios 8/8 unchanged

## Group 2 — Annotations + `momentum waves` CLI
- [x] tasks.md `(deps: …)` heading parser + index.json phase `deps` (`core/waves/lib/plan-graph.js`; all-[x] groups + complete phases = satisfied)
- [x] `bin/waves.js` + dispatch: task scale (branch-bound default per Rule 15, status.md fallback) + phase scale + wave-1 lane suggestions + `--json` unstable
- [x] `tests/waves-cli.test.js` green (5/5)

## Group 3 — 3-ideas e2e demo + contract decision
- [x] `tests/waves-e2e-demo.test.js` green (1/1: waves → lanes → stale-refusal → rebase → sequenced landings → next wave unblocks)
- [x] `evidence/three-ideas-demo.txt` captured via `scripts/capture-three-ideas-demo.sh` (env-gated sink; npm test never rewrites it)
- [x] Lane-state contract decision recorded: stays INTERNAL, publication handed to the operator (history + ADR-0003 §5)

## Group 4 — Docs + verification + release prep
- [x] Site parallel-work Fly section → shipped (`momentum waves` ×3 in dist); lanes recipe waves section (+self mirror); fingerprints re-baselined ×3 (recipe drift only)
- [x] Full suite 697/697; 3-adapter smoke exit 0 (55/59/60); site build exit 0 (13 pages)
- [x] Retrospective (with Verification Evidence) + version bump 0.25.0 + parked release runbook (status.md Next Actions #1); plan.md pointer added for structure canonicality
