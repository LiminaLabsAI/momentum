# Phase 22 — Reach: opencode Adapter — Tasks

> Execution: `G0 → (G1 + G2 + G3 in parallel) → G4 → G5`
> Mark `[/]` in-progress, `[x]` complete (only with fresh verification output — Rule 12).
>
> **Re-slice note (2026-07-05, G0):** the suite's contract-audit tests
> (spawn contract, capability audit, parity-matrix column coverage) couple
> ALL adapter surfaces to the existence of `adapter.js` — so G0 grew to ship
> every file surface (commands, skills, agents, plugin, spawn, doc columns)
> to keep the suite green at the G0 commit. G1–G3 retain their *test/transform*
> work. Logged as `[NOTE]` in history.md.

## Group 0 — Adapter skeleton + contracts + surfaces (sequential)

- [x] Install `opencode-ai` CLI (1.17.13); evidence at `evidence/g0-opencode-version.txt`
- [x] `adapters/opencode/adapter.js`: destinations, marker-aware primaryInstruction, configFiles (plugin), capabilities + roadmap blocks, runInstall/runUpgrade, spawn()
- [x] `adapters/opencode/instructions/{header.md,vars.json,surfaces.md}`
- [x] Wired into `scripts/generate-instructions.js`; `AGENTS.md` generated; drift-guard green
- [x] Overlay commands ported (continue/dispatch/handoff/scout/swarm from codex + review-code from claude-code, opencode-idiom adapted)
- [x] `.opencode/plugins/momentum.js` (gate + reminder + banner) — shipped; unit tests in G2
- [x] `momentum-orient` skill + 4 agents (3 read-only reviewers + swarm-supervisor) — shipped; shape tests in G1/G3
- [x] Command frontmatter transform (`ensureCommandFrontmatter`) in runInstall/runUpgrade
- [x] `package.json` files += `adapters/**/plugins/**`
- [x] Capability matrix + parity matrix opencode columns (footnotes 17–19; booleans evidence-gated per capability discipline)
- [x] Verification: full suite 734/734; tmp-dir `init --agent opencode` smoke (23 commands w/ frontmatter, 4 agents, plugin, skill, AGENTS.md substituted)
- [ ] Commit G0

## Group 1 — Command + skill shape tests (parallel)

- [ ] `tests/adapter-opencode-commands.test.js`: every installed command has description frontmatter; skill name-regex + frontmatter validation; 23-command count pin
- [ ] Commit G1

## Group 2 — Plugin unit tests (parallel)

- [ ] `tests/adapter-opencode-plugin.test.js` (node-only, dynamic import): gate blocks specs/ write while sentinel exists; allows without sentinel; allows non-specs writes; bash heuristic; reminder throttle + stamp; banner detects pending handoffs
- [ ] Commit G2

## Group 3 — Agents + spawn tests (parallel)

- [ ] Agent shape tests: frontmatter (description, mode, permission edit deny on reviewers)
- [ ] Spawn arg-shape test: OPENCODE_BIN override → `run --dir <path> --agent swarm-supervisor` args, canonical -1 on missing binary
- [ ] Commit G3

## Group 4 — Wiring + regression (sequential)

- [ ] opencode install fingerprint snapshot test
- [ ] Existing-adapter fingerprints byte-identical (verify against suite)
- [ ] Tarball-shape test covers `adapters/opencode/**` (npm pack dry-run)
- [ ] Synthetic swarm e2e opencode fixture
- [ ] Upgrade idempotence test on an opencode fixture
- [ ] Full suite green
- [ ] Commit G4

## Group 5 — Live validation + docs + release prep (sequential)

- [ ] Live check 1: `/command` discovery in TUI
- [ ] Live check 2: gate blocks `specs/` write under `brainstorm-active`
- [ ] Live check 3: history reminder fires
- [ ] Live check 4: `session.created` banner
- [ ] Live check 5: reviewer subagent invocation
- [ ] Live check 6: `opencode run --dir --agent` spawn
- [ ] Live check 7: multi-adapter skills coexistence
- [ ] Finalize `parallelSubagents` / `sessionStartHook` / `skills` booleans from evidence (+ parity cells 17/19 gated→shipped as earned)
- [ ] README + site adapter mention
- [ ] Roadmap repair (Rules Unification row; Reach = opencode v0.27.0; Intelligence → v0.28.0)
- [ ] Retrospective with Verification Evidence; version bump → 0.27.0
- [ ] Commit G5; `lanes done`; land + release per Rule 6 gates
