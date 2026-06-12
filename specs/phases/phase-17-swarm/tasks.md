# Phase 17 Swarm — Tasks

> Granular checklist mirroring `plan.md`. Mark `[x]` complete, `[/]` in progress.

## Group 0 — Schemas, Contracts, Indexing Foundation

- [x] G0.1 manifest.schema.json
- [x] G0.2 board.schema.json
- [x] G0.3 contract.schema.json
- [x] G0.4 dispatch-run.schema.json (extend with swarm fields)
- [x] G0.5 core/swarm/lib/manifest.js (CRUD + mkdir-lock)
- [x] G0.6 core/swarm/lib/board.js (materializer)
- [x] G0.7 core/swarm/lib/wave-ordering.js (topo sort + cycle detection)
- [x] G0.8 core/swarm/lib/git-sha-cache.js
- [x] G0.9 core/swarm/lib/incremental-log.js
- [x] G0.10 Brief frontmatter extension + /start-phase recipe update
- [x] G0.11 /validate extension for swarm member integrity
- [x] G0.12 Tests: schemas + wave-ordering + indexing

## Group 1 — Conductor Core (Claude Code)

- [x] G1.1 core/swarm/conductor.js
- [x] G1.2 core/swarm/supervise.md (shared supervisor recipe)
- [x] G1.3 Claude Code background-session spawn wrapper + fallback
- [x] G1.4 bin/swarm.js (CLI surface)
- [x] G1.5 /swarm start recipe
- [x] G1.6 /swarm status recipe
- [x] G1.7 /swarm cancel recipe
- [x] G1.8 Saga record extension (dispatch-run with swarm fields)
- [x] G1.9 Conductor polling loop
- [x] G1.10 Tests: start + cancel + board render

## Group 2 — Intervention Surface

- [x] G2.1 core/swarm/inbox.js (CRUD + locks)
- [x] G2.2 inbox/INDEX.md materializer
- [x] G2.3 /swarm tell recipe
- [x] G2.4 /swarm broadcast recipe
- [x] G2.5 /swarm verify recipe
- [x] G2.6 Wave checkpoint flow
- [x] G2.7 Pre-merge preview at fan-in
- [x] G2.8 /swarm complete recipe
- [x] G2.9 /swarm budget recipe
- [x] G2.10 Tests: inbox + intervention + wave transition + complete

## Group 3 — Resume + Portability Hooks

- [x] G3.1 /swarm resume (disk-only state reconstitution)
- [x] G3.2 Portability schema fields (owner / lease / sessions[])
- [x] G3.3 Reserved directories (signals/, tokens/)
- [x] G3.4 Lease renewal on conductor turn
- [x] G3.5 Future: Swarm Portability doc section (docs/swarm.md)
- [x] G3.6 Tests: resume + portability schema

## Group 4 — End-to-End Scenarios + Docs + Retrospective

- [x] G4.1 Scenario A — 3-repo linear synthetic fixture
- [x] G4.2 Scenario B — 4-repo branched synthetic fixture
- [x] G4.3 Scenario C — 5-repo wide synthetic fixture
- [x] G4.4 Token-spend retrospective (p95 board.json size 800–1200B across all 3 — target was <5KB)
- [x] G4.5 docs/swarm.md (landed in G3)
- [x] G4.6 core/adapter-parity-matrix.md extension (`/swarm` row + footnote 14)
- [x] G4.7 core/adapter-capabilities.md update (Phase 17 scope section)
- [x] G4.8 retrospective.md
- [x] G4.9 /sync-docs propagation (status, README, index.json, changelog, roadmap, version bump)
- [x] G4.10 Full regression npm test (462/462)
- [ ] G4.11 Prompt for /complete-phase + merge/release approval
