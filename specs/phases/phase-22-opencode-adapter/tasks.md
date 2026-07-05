# Phase 22 — Reach: opencode Adapter — Tasks

> Execution: `G0 → (G1 + G2 + G3 in parallel) → G4 → G5`
> Mark `[/]` in-progress, `[x]` complete (only with fresh verification output — Rule 12).

## Group 0 — Adapter skeleton + contracts (sequential)

- [ ] Install `opencode-ai` CLI; capture `opencode --version` → `evidence/g0-opencode-version.txt`
- [ ] `adapters/opencode/adapter.js`: destinations, marker-aware primaryInstruction, configFiles (plugin), capabilities + roadmap blocks
- [ ] `adapters/opencode/instructions/header.md`
- [ ] `adapters/opencode/instructions/vars.json`
- [ ] `adapters/opencode/instructions/surfaces.md`
- [ ] Wire into `scripts/generate-instructions.js`; generate `AGENTS.md`; drift-guard green
- [ ] tmp-dir `init --agent opencode` smoke passes
- [ ] Commit G0

## Group 1 — Native commands + skills (parallel)

- [ ] ~20 core recipes → `.opencode/commands/*.md` with `description` frontmatter + `$ARGUMENTS`
- [ ] Momentum skills → `.opencode/skills/<name>/SKILL.md` (name-regex compliant)
- [ ] `tests/adapter-opencode-commands.test.js` (command + skill shape)
- [ ] Commit G1

## Group 2 — Enforcement plugin (parallel)

- [ ] `.opencode/plugins/momentum.js`: `tool.execute.before` brainstorm gate
- [ ] `tool.execute.after` history reminder
- [ ] `session.created` handoff banner
- [ ] `tests/adapter-opencode-plugin.test.js` (node-only unit tests)
- [ ] Commit G2

## Group 3 — Agents + spawn (parallel)

- [ ] 3 reviewer subagents (`mode: subagent`, `permission: edit: deny`)
- [ ] `swarm-supervisor.md` agent
- [ ] `adapter.spawn(directive)` → `opencode run --dir --agent swarm-supervisor`
- [ ] Spawn contract + agent shape tests
- [ ] Commit G3

## Group 4 — Wiring + regression (sequential)

- [ ] `runInstall` / `runUpgrade` with managed-file records
- [ ] opencode install fingerprint snapshot test
- [ ] Existing-adapter fingerprints byte-identical
- [ ] Tarball-shape globs + test (`adapters/opencode/**`)
- [ ] Capability-audit row; synthetic swarm e2e opencode fixture
- [ ] Upgrade idempotence test
- [ ] Full suite green (baseline 733)
- [ ] Commit G4

## Group 5 — Live validation + docs + release prep (sequential)

- [ ] Live check 1: `/command` discovery in TUI
- [ ] Live check 2: gate blocks `specs/` write under `brainstorm-active`
- [ ] Live check 3: history reminder fires
- [ ] Live check 4: `session.created` banner
- [ ] Live check 5: reviewer subagent invocation
- [ ] Live check 6: `opencode run --dir --agent` spawn
- [ ] Live check 7: multi-adapter skills coexistence
- [ ] Finalize `parallelSubagents` / `sessionStartHook` / `skills` booleans from evidence
- [ ] `core/adapter-capabilities.md` + `core/adapter-parity-matrix.md` columns
- [ ] README + site adapter mention
- [ ] Roadmap repair (Rules Unification row; Reach = opencode v0.27.0; Intelligence → v0.28.0)
- [ ] Retrospective with Verification Evidence; version bump → 0.27.0
- [ ] Commit G5; `lanes done`; land + release per Rule 6 gates
