# Phase 18 — Implementation Plan

```
# Execution order
# Sequential:  G0 → (G1 + G2 in parallel) → G3 → G4
```

## Group 0 — Spawn contract + Claude Code refactor

**Sequential.** Blocks G1, G2, G3, G4.
**External deps**: none.
**Commit**: `feat(swarm): G0 — adapter.spawn() contract + Claude Code refactor`

### Tasks

1. Define `spawn(directive)` in the adapter contract.
   - Add JSDoc on the canonical shape inside `bin/momentum.js` near
     `loadAdapter()`, OR add an entry in
     `core/adapter-parity-matrix.md` / a new
     `core/adapter-contract.md` if it lives somewhere uniform.
   - Directive shape (already produced by
     `core/swarm/conductor.js` per Phase 17 design):
     `{ platform, swarmId, wave, repoId, repoPath, phaseSlug, branch,
        sessionId, recipePath, contextPath, env }`.
2. Move Claude Code spawn from `bin/swarm.js` into
   `adapters/claude-code/adapter.js::spawn()`. The existing
   `claude --bg --cwd <repoPath> ...` call lives there now.
3. Update `bin/swarm.js`: replace the hardcoded spawn site with a call
   to `adapter.spawn(directive)`, looked up via the loaded adapter.
4. Add `tests/adapter-contract-spawn.test.js` asserting every adapter
   under `adapters/*/adapter.js` exports a `spawn` function.
5. Run existing swarm tests; confirm Claude Code behavior is byte-for-byte
   identical.

### Verification

- `npm test -- tests/adapter-contract-spawn.test.js` passes.
- All existing `tests/swarm-*.test.js` files pass.
- `tests/claude-code-regression.test.js` fingerprint either matches
  v0.20.3 baseline, or refresh is documented in fixture meta (G0 should
  *not* drift installed files — if the move only touches `bin/swarm.js`
  and `adapters/claude-code/adapter.js`, neither is in the install
  fingerprint set).

---

## Group 1 — Codex swarm wiring

**Parallel with Group 2.** Depends on G0.
**External deps**: Codex's MCP support docs (read-only, no install required during this group).
**Commit**: `feat(swarm): G1 — Codex adapter spawn wiring`

### Tasks

1. Implement `adapters/codex/adapter.js::spawn(directive)`.
   - Shells out to the `codex` CLI with `--cwd <directive.repoPath>`
     and the supervisor TOML as the agent declaration.
2. Create `adapters/codex/agents/swarm-supervisor.toml` (subagent declaration).
   - `name = "swarm-supervisor"`, `description = ...`, `developer_instructions = supervise.md content`.
   - Sandbox: read-only on `swarms/<id>/manifest.json`, write on
     `swarms/<id>/saga/`, `swarms/<id>/inbox/`,
     `swarms/<id>/sessions/`.
3. Add `## Swarm — Lookup Pattern` section to
   `adapters/codex/instructions/AGENTS.md`. Mirror the recipe table
   pattern from the existing `## Recipes — Codex Skills` block.
4. Add `## MCP cwd shim — Codex configuration` block to
   `adapters/codex/instructions/AGENTS.md`. Explains how a user wires
   their Codex CLI's MCP support so each supervisor's `cwd` honors
   the directive's `repoPath`.
5. Verify the existing `transformCommandsIntoSkills` (ENH-036, v0.20.1)
   correctly transforms the swarm slash command into a Codex skill at
   `.agents/skills/swarm/SKILL.md`.
6. New tests: `tests/adapter-codex-swarm.test.js`
   - Codex `spawn()` invokes the expected `codex` command with the
     correct arguments (use spawn-shim from `_helpers.js`).
   - `.codex/agents/swarm-supervisor.toml` is laid down on
     `momentum init --agent codex`.
   - AGENTS.md contains the `## Swarm — Lookup Pattern` and `## MCP cwd shim` sections.

### Verification

- `node bin/momentum.js init /tmp/codex-test --agent codex && \
   test -f /tmp/codex-test/.codex/agents/swarm-supervisor.toml && \
   test -f /tmp/codex-test/AGENTS.md && \
   grep -q "## Swarm — Lookup Pattern" /tmp/codex-test/AGENTS.md`
- `npm test -- tests/adapter-codex-swarm.test.js` passes.

### Escalation point

If the MCP doc-only path cannot honor the `cwd` pin in real Codex
runtime, escalate back to the user with a decision request: ship a
minimal `core/swarm/mcp-cwd-server.js` instead. Do NOT silently
downgrade.

---

## Group 2 — Antigravity swarm wiring

**Parallel with Group 1.** Depends on G0.
**External deps**: none (Antigravity Agent Manager primitive is an existing CLI feature).
**Commit**: `feat(swarm): G2 — Antigravity adapter spawn wiring`

### Tasks

1. Implement `adapters/antigravity/adapter.js::spawn(directive)`.
   - Shells out to `agy` via the Agent Manager primitive. One
     supervisor per repo via the existing `parallelSubagents: true`
     pathway.
2. Create `adapters/antigravity/workflows/swarm-conductor.md`.
   - Auto-registered slash command per the Phase 16 Rework workflow
     pattern (`/swarm-conductor` registers automatically when the file
     exists at `.agent/workflows/<name>.md`).
3. Create `adapters/antigravity/skills/swarm-supervisor/SKILL.md`.
   - Skill form of `core/swarm/supervise.md`. Frontmatter: `name`,
     `description`. Body: full supervisor recipe.
4. Add swarm section to
   `adapters/antigravity/instructions/AGENTS.md` (mirror the
   Codex `## Swarm — Lookup Pattern` shape).
5. New tests: `tests/adapter-antigravity-swarm.test.js`
   - Antigravity `spawn()` invokes the expected `agy` command.
   - Workflow file present at `.agent/workflows/swarm-conductor.md`
     after install.
   - Skill SKILL.md present at
     `.agents/skills/swarm-supervisor/SKILL.md` with the expected
     frontmatter fields.
   - AGENTS.md contains the swarm section.

### Verification

- `node bin/momentum.js init /tmp/agy-test --agent antigravity && \
   test -f /tmp/agy-test/.agent/workflows/swarm-conductor.md && \
   test -f /tmp/agy-test/.agents/skills/swarm-supervisor/SKILL.md && \
   grep -q "Swarm" /tmp/agy-test/AGENTS.md`
- `npm test -- tests/adapter-antigravity-swarm.test.js` passes.

---

## Group 3 — Multi-adapter synthetic e2e + fingerprints

**Sequential.** Depends on G0, G1, G2. Gates G4.
**External deps**: none.
**Commit**: `test(swarm): G3 — multi-adapter e2e + fingerprints`

### Tasks

1. Extend the swarm e2e harness with a `--adapter` switch:
   `claude-code` (default, existing), `codex`, `antigravity`.
2. Run all three synthetic scenarios under each adapter:
   - 3-repo linear (`scenario-a-linear`)
   - 4-repo branched (`scenario-b-branched`)
   - 5-repo wide (`scenario-c-wide`)
3. Capture 6 new evidence files:
   - `evidence/scenario-a-codex.txt`
   - `evidence/scenario-b-codex.txt`
   - `evidence/scenario-c-codex.txt`
   - `evidence/scenario-a-antigravity.txt`
   - `evidence/scenario-b-antigravity.txt`
   - `evidence/scenario-c-antigravity.txt`
4. Generate install fingerprint fixtures:
   - `tests/fixtures/v0.20.4-codex-fingerprint.json` (SHA256 per file
     under a fixed `fixture-project` subdir; deterministic per the
     BUG-006 fix pattern).
   - `tests/fixtures/v0.20.4-antigravity-fingerprint.json` (same shape).
5. Refresh `tests/fixtures/v0.18.0-claude-code-fingerprint.json` if and
   only if G0 changed a momentum-installed file (it shouldn't; the
   refactor lives in `bin/swarm.js` + `adapters/claude-code/adapter.js`,
   neither of which is installed). Update with explanatory meta if needed.
6. Add fingerprint regression tests
   `tests/adapter-codex-fingerprint.test.js` and
   `tests/adapter-antigravity-fingerprint.test.js` mirroring the
   existing Claude Code regression test pattern.

### Verification

- 6 new evidence files exist at the expected paths.
- 2 new fingerprint fixtures committed.
- `npm test -- tests/adapter-codex-fingerprint.test.js
   tests/adapter-antigravity-fingerprint.test.js
   tests/claude-code-regression.test.js` all pass.

---

## Group 4 — Live VAL + capability flips + docs + retrospective + release

**Sequential.** Depends on G3. Final group; gates v0.20.4 release.
**External deps**: `codex` CLI, `agy` CLI (both must be installed on the dev machine for live runs).
**Commit**: `chore(release): v0.20.4 — Phase 18 Swarm Parity`

### Tasks

1. **Live VAL-001 (Codex)**:
   - Confirm `codex --version` works in the dev env.
   - Spin up a synthetic 3-repo ecosystem; run `/swarm start` end-to-end.
   - Capture `evidence/val-001-codex.txt` with: `codex --version`,
     ecosystem layout, wave progression, supervisor logs, conductor
     turn output (`<5KB`), success.
   - Verify all 6 VAL-001 questions from
     `specs/backlog/backlog.md` (hooks fire / `Bash` matcher /
     TOML subagents discovered / parallel fan-out / skill discovered /
     AGENTS.md lookup pattern followed).
2. **Live VAL-002 (Antigravity)**:
   - Confirm `agy --version` works in the dev env.
   - Spin up a synthetic 3-repo ecosystem; run `/swarm start` end-to-end.
   - Capture `evidence/val-002-antigravity.txt` with the same shape as
     VAL-001.
   - Verify all 6 VAL-002 questions from
     `specs/backlog/backlog.md` (singular vs plural workflow path /
     auto-register / skill discovered / hook fires on run_command /
     PostToolUse fires / SessionStart event surfaced).
3. **Capability flips** — only on the live evidence above:
   - `adapters/codex/adapter.js`: `parallelSubagents: false → true`.
   - `adapters/antigravity/adapter.js`: `sessionStartHook: false → true`.
4. **Docs**:
   - `docs/swarm.md`: add a "Multi-adapter swarm" section explaining
     that Phase 18 brought Codex + Antigravity to parity; how each
     adapter dispatches spawn.
   - `core/adapter-parity-matrix.md`: flip the `/swarm` row's Codex +
     Antigravity cells from `not-applicable` to `shipped`. Footnote 14
     (Phase 18 retarget) is now fulfilled.
   - `core/adapter-capabilities.md`: add a Phase 18 scope section
     mirroring the Phase 17/17.5 entries.
5. **Backlog**:
   - VAL-001 → `resolved` (2026-06-XX).
   - VAL-002 → `resolved` (2026-06-XX).
6. **Retrospective**:
   - Write `specs/phases/phase-18-swarm-parity/retrospective.md`.
7. **Status + changelog**:
   - `specs/status.md`: add Phase 18 row to Completed Phases; bump
     Latest Release; refresh Recent Changes with the full Phase 18
     summary; clear Active Phase.
   - `specs/changelog/2026-06.md`: prepend a Phase 18 release entry.
8. **Version bump**:
   - `package.json`: 0.20.3 → 0.20.4.
9. **Pre-release dance**:
   - Run `/sync-docs` first (per Rule 9).
   - Run `/complete-phase` to verify all acceptance criteria.
10. **Release**:
    - Squash-merge the phase branch to `main`.
    - `git tag v0.20.4` and push.
    - `gh release create v0.20.4 ... --latest --verify-tag` (requires
      explicit OK per CLAUDE.md "Project Extensions").
    - `npm publish --access public` (requires explicit OK).
    - Verify both surfaces: `gh release list --limit 3` shows v0.20.4
      as `Latest`; `npm view @avinash-singh-io/momentum version`
      returns `0.20.4`.

### Verification

- `cat evidence/val-001-codex.txt evidence/val-002-antigravity.txt`
  shows real CLI output.
- `grep parallelSubagents adapters/codex/adapter.js` returns `true`.
- `grep sessionStartHook adapters/antigravity/adapter.js` returns `true`.
- `core/adapter-parity-matrix.md` swarm row has no `not-applicable`
  cells.
- `gh release list --limit 3 | head -1` shows v0.20.4 marked `Latest`.
- `npm view @avinash-singh-io/momentum version` returns `0.20.4`.
- `specs/status.md` Last Updated reflects release date; Latest Release
  field reads `v0.20.4 — Phase 18 Swarm Parity`.

### Blockers / abort conditions

- If `codex` is not installed and cannot be installed in the dev env,
  G4 cannot close VAL-001. Options: (a) extend timeline, (b) renegotiate
  the locked decision and ship synthetic-only Phase 18 with degraded
  capability flips. Both require an explicit user decision.
- If `agy` is not installed and cannot be installed, same applies to
  VAL-002.
- If either live run surfaces a real bug in the Codex / Antigravity
  spawn path, file as `BUG-NNN`, fix on the phase branch, re-run the
  live evidence, then proceed.
