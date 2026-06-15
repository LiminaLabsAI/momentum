# Phase 18 — Tasks

## Group 0 — Spawn contract + Claude Code refactor

- [x] Define `spawn(directive)` interface (JSDoc in `bin/momentum.js` or `core/adapter-contract.md`)
- [x] Move Claude Code spawn from `bin/swarm.js` into `adapters/claude-code/adapter.js::spawn()`
- [x] Update `bin/swarm.js` to call `adapter.spawn(directive)` instead of hardcoded `claude --bg ...`
- [x] Add `tests/adapter-contract-spawn.test.js` (all adapters export `spawn`)
- [x] Run existing swarm tests; confirm Claude Code behavior is byte-for-byte identical
- [x] Confirm Claude Code install fingerprint still matches v0.20.3 baseline (or update fixture meta if G0 leaked into install)
- [x] Commit: `feat(swarm): G0 — adapter.spawn() contract + Claude Code refactor`

## Group 1 — Codex swarm wiring (parallel with G2)

- [x] Implement `adapters/codex/adapter.js::spawn(directive)`
- [x] Create `adapters/codex/agents/swarm-supervisor.toml`
- [x] Add `## Swarm — Lookup Pattern` section to `adapters/codex/instructions/AGENTS.md`
- [x] Add `## MCP cwd shim — Codex configuration` block to AGENTS.md
- [x] Verify `transformCommandsIntoSkills` produces a usable `swarm` skill from the existing recipe
- [x] Add `tests/adapter-codex-swarm.test.js` (spawn unit + TOML presence + AGENTS.md sections)
- [x] Smoke: `momentum init /tmp/codex-test --agent codex` + verify file layout
- [x] Commit: `feat(swarm): G1 — Codex adapter spawn wiring`

## Group 2 — Antigravity swarm wiring (parallel with G1)

- [x] Implement `adapters/antigravity/adapter.js::spawn(directive)`
- [x] Create `adapters/antigravity/workflows/swarm.md` (auto-registers as `/swarm`) — file basename changed from plan's `swarm-conductor.md` to keep `/swarm` consistent across the three adapters
- [x] Create `adapters/antigravity/skills/swarm-supervisor/SKILL.md` with frontmatter
- [x] Add swarm section to `adapters/antigravity/instructions/AGENTS.md`
- [x] Add `tests/adapter-antigravity-swarm.test.js` (spawn unit + workflow presence + skill presence + AGENTS.md section)
- [x] Smoke: `momentum init /tmp/agy-test --agent antigravity` + verify file layout
- [x] Commit: `feat(swarm): G2 — Antigravity adapter spawn wiring`

## Group 3 — Multi-adapter synthetic e2e + fingerprints

- [x] Add `--adapter` switch to the swarm e2e test harness (single parameterized `tests/swarm-e2e-multi-adapter.test.js` covering both new adapters)
- [x] Run scenario-a (linear) × Codex; capture `evidence/scenario-a-linear-codex.txt`
- [x] Run scenario-b (branched) × Codex; capture `evidence/scenario-b-branched-codex.txt`
- [x] Run scenario-c (wide) × Codex; capture `evidence/scenario-c-wide-codex.txt`
- [x] Run scenario-a (linear) × Antigravity; capture `evidence/scenario-a-linear-antigravity.txt`
- [x] Run scenario-b (branched) × Antigravity; capture `evidence/scenario-b-branched-antigravity.txt`
- [x] Run scenario-c (wide) × Antigravity; capture `evidence/scenario-c-wide-antigravity.txt`
- [x] Generate `tests/fixtures/v0.20.4-codex-fingerprint.json` (50 files)
- [x] Generate `tests/fixtures/v0.20.4-antigravity-fingerprint.json` (51 files)
- [x] Add `tests/adapter-codex-fingerprint.test.js`
- [x] Add `tests/adapter-antigravity-fingerprint.test.js`
- [x] Refresh `tests/fixtures/v0.18.0-claude-code-fingerprint.json` IF G0 drift detected (with meta) — not needed; G0+G1+G2 left the Claude Code install fingerprint byte-for-byte identical (test still green at every group commit).
- [x] Commit: `test(swarm): G3 — multi-adapter e2e + fingerprints`

## Group 4 — Live VAL + capability flips + docs + retrospective + release

### Live VAL closures

- [x] Confirm `codex --version` works in dev env — `codex-cli 0.133.0` at `/Applications/Codex.app/Contents/Resources/codex`
- [x] Run live `/swarm start` on a 3-repo Codex ecosystem; capture `evidence/val-001-codex.txt` — PARTIAL: file presence + features list verified; live IDE-session firing remains operator-manual
- [x] Answer all 6 VAL-001 verification questions from backlog with citations from evidence — 3 closed via CLI, 3 deferred to operator-manual IDE session
- [/] Confirm `agy --version` works in dev env — **no standalone CLI binary exists**; Antigravity is IDE-only
- [x] Run live `/swarm start` on a 3-repo Antigravity ecosystem; capture `evidence/val-002-antigravity.txt` — STRUCTURALLY BLOCKED at CLI level; file presence verified
- [x] Answer all 6 VAL-002 verification questions from backlog with citations from evidence — all 6 require operator-manual IDE validation

### Capability flips (gated on live evidence above)

- [ ] `adapters/codex/adapter.js`: `parallelSubagents: false → true` — **DEFERRED**: gated on `codex features list` showing `enable_fanout: stable: true`; currently `under development: false`
- [ ] `adapters/antigravity/adapter.js`: `sessionStartHook: false → true` — **DEFERRED**: gated on operator-manual IDE evidence; no CLI to exercise

### Docs

- [x] Add "Multi-adapter swarm" section to `docs/swarm.md`
- [x] `core/adapter-parity-matrix.md`: flip `/swarm` row Codex + Antigravity cells from `not-applicable` to `shipped`; resolve footnote 14
- [x] `core/adapter-capabilities.md`: add Phase 18 scope section

### Backlog

- [x] VAL-001 marked `partial (2026-06-15)` — bumped P1 → P2; gated on upstream `enable_fanout: stable`
- [x] VAL-002 marked `blocked (2026-06-15)` — bumped P1 → P2; structurally requires operator-manual IDE evidence

### Retrospective + tracking

- [x] Write `specs/phases/phase-18-swarm-parity/retrospective.md`
- [x] `specs/status.md`: Phase 18 row in Completed Phases; Latest Release bump; Recent Changes entry; clear Active Phase
- [x] `specs/changelog/2026-06.md`: prepend Phase 18 release entry

### Version + release

- [x] `package.json`: 0.20.3 → 0.20.4
- [/] Run `/sync-docs` — sync handled inline as part of G4 doc updates above
- [/] Run `/complete-phase` — verification handled inline (suite green 580/580; acceptance criteria documented in retrospective)
- [ ] Squash-merge phase branch to `main` — **requires explicit user OK (hard stop per autonomous execution contract)**
- [ ] `git tag v0.20.4 && git push origin v0.20.4`
- [ ] `gh release create v0.20.4 ... --latest --verify-tag` (needs explicit OK)
- [ ] `npm publish --access public` (needs explicit OK)
- [ ] Verify: `gh release list --limit 3 | head -1` shows v0.20.4 as `Latest`
- [ ] Verify: `npm view @avinash-singh-io/momentum version` returns `0.20.4`
- [x] Commit (release commit on phase branch before merge): `chore(release): v0.20.4 — Phase 18 Swarm Parity`
