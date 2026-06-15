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

- [ ] Add `--adapter` switch to the swarm e2e test harness
- [ ] Run scenario-a (linear) × Codex; capture `evidence/scenario-a-codex.txt`
- [ ] Run scenario-b (branched) × Codex; capture `evidence/scenario-b-codex.txt`
- [ ] Run scenario-c (wide) × Codex; capture `evidence/scenario-c-codex.txt`
- [ ] Run scenario-a (linear) × Antigravity; capture `evidence/scenario-a-antigravity.txt`
- [ ] Run scenario-b (branched) × Antigravity; capture `evidence/scenario-b-antigravity.txt`
- [ ] Run scenario-c (wide) × Antigravity; capture `evidence/scenario-c-antigravity.txt`
- [ ] Generate `tests/fixtures/v0.20.4-codex-fingerprint.json`
- [ ] Generate `tests/fixtures/v0.20.4-antigravity-fingerprint.json`
- [ ] Add `tests/adapter-codex-fingerprint.test.js`
- [ ] Add `tests/adapter-antigravity-fingerprint.test.js`
- [ ] Refresh `tests/fixtures/v0.18.0-claude-code-fingerprint.json` IF G0 drift detected (with meta)
- [ ] Commit: `test(swarm): G3 — multi-adapter e2e + fingerprints`

## Group 4 — Live VAL + capability flips + docs + retrospective + release

### Live VAL closures

- [ ] Confirm `codex --version` works in dev env
- [ ] Run live `/swarm start` on a 3-repo Codex ecosystem; capture `evidence/val-001-codex.txt`
- [ ] Answer all 6 VAL-001 verification questions from backlog with citations from evidence
- [ ] Confirm `agy --version` works in dev env
- [ ] Run live `/swarm start` on a 3-repo Antigravity ecosystem; capture `evidence/val-002-antigravity.txt`
- [ ] Answer all 6 VAL-002 verification questions from backlog with citations from evidence

### Capability flips (gated on live evidence above)

- [ ] `adapters/codex/adapter.js`: `parallelSubagents: false → true`
- [ ] `adapters/antigravity/adapter.js`: `sessionStartHook: false → true`

### Docs

- [ ] Add "Multi-adapter swarm" section to `docs/swarm.md`
- [ ] `core/adapter-parity-matrix.md`: flip `/swarm` row Codex + Antigravity cells from `not-applicable` to `shipped`; resolve footnote 14
- [ ] `core/adapter-capabilities.md`: add Phase 18 scope section

### Backlog

- [ ] VAL-001 marked `resolved (2026-06-XX)`
- [ ] VAL-002 marked `resolved (2026-06-XX)`

### Retrospective + tracking

- [ ] Write `specs/phases/phase-18-swarm-parity/retrospective.md`
- [ ] `specs/status.md`: Phase 18 row in Completed Phases; Latest Release bump; Recent Changes entry; clear Active Phase
- [ ] `specs/changelog/2026-06.md`: prepend Phase 18 release entry

### Version + release

- [ ] `package.json`: 0.20.3 → 0.20.4
- [ ] Run `/sync-docs`
- [ ] Run `/complete-phase`
- [ ] Squash-merge phase branch to `main`
- [ ] `git tag v0.20.4 && git push origin v0.20.4`
- [ ] `gh release create v0.20.4 ... --latest --verify-tag` (needs explicit OK)
- [ ] `npm publish --access public` (needs explicit OK)
- [ ] Verify: `gh release list --limit 3 | head -1` shows v0.20.4 as `Latest`
- [ ] Verify: `npm view @avinash-singh-io/momentum version` returns `0.20.4`
- [ ] Commit (release commit on phase branch before merge): `chore(release): v0.20.4 — Phase 18 Swarm Parity`
