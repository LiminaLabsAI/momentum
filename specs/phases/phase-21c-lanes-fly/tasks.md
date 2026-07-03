# Phase 21c — Lanes Fly — Tasks

> Mirrors plan (in overview.md scope). Execution: G0 → G1 → G2 → G3 → G4.

## Group 0 — Scaffold + ADR-0003
- [ ] Phase files + tracking (status row, changelog, index.json, README)
- [ ] ADR-0003 `specs/decisions/0003-recursive-wave-planner.md`

## Group 1 — Core engine + swarm rewire
- [ ] `core/waves/lib/waves.js` (Kahn layering, stable order, cycle errors, label-compatible)
- [ ] `core/swarm/lib/wave-ordering.js` → thin adapter; byte-stable
- [ ] `tests/waves-engine.test.js` green (incl. swarm-parity pin); full swarm test files green unchanged

## Group 2 — Annotations + `momentum waves` CLI
- [ ] tasks.md `(deps: …)` heading parser + index.json phase `deps`
- [ ] `bin/waves.js` + dispatch: task scale (branch-bound default) + phase scale + wave-1 lane suggestions + `--json`
- [ ] `tests/waves-cli.test.js` green

## Group 3 — 3-ideas e2e demo + contract decision
- [ ] `tests/waves-e2e-demo.test.js` green (waves → lanes → queue landings)
- [ ] `evidence/three-ideas-demo.txt` captured via one-shot script (not rewritten by npm test)
- [ ] Lane-state contract decision recorded (history + ADR-0003)

## Group 4 — Docs + verification + release prep
- [ ] Site parallel-work Fly section → shipped; lanes recipe waves mention; fingerprints re-baselined
- [ ] Full suite + 3-adapter smoke + site build green
- [ ] Retrospective + version bump 0.25.0 + parked release runbook
