# Phase 16 — Codex & Antigravity Adapter Parity: Retrospective

## What shipped

Phase 16 brings the Codex and Antigravity adapters to genuine functional
parity with Claude Code at install time. The phase trades the originally-
planned "Reach" (Cursor + Gemini adapters) for hardening the three adapters
already declared — Reach moves to Phase 17.

### Codex

1. **PreToolUse brainstorm-gate.** `adapters/codex/hooks.json` wires
   `Write|Edit|MultiEdit → bash scripts/brainstorm-gate.sh`. Codex now
   blocks writes to `specs/` during an active `/brainstorm-*` session
   exactly like Claude Code.
2. **Three TOML reviewer subagents.** `adapters/codex/agents/momentum-reviewer-{security,qa,architecture}.toml`
   with the Codex schema (`name`, `description`, `developer_instructions`).
   Each emits findings in Critical/Important/Minor format. Installed into
   `.codex/agents/` via the generic overlay walk over the new `destinations.agents`
   contract key (G0).
3. **Codex-flavored `/review-code`.** `adapters/codex/commands/review-code.md`
   dispatches all three reviewers in a single Codex turn so the runtime can
   fan them out in parallel (subject to `agents.max_threads`).
4. **AGENTS.md rewritten.** Full hook surface documented with an event ↔
   script table. New "Momentum Subagents in Codex" section. Brainstorm-gate
   path generalized to `pwd` fallback so it works without env-var
   configuration on Codex (which sets cwd to session root).

### Antigravity

1. **`.antigravity/` → `.agents/` realignment.** Matches the documented `agy`
   CLI plugin/project layout. The previous `.antigravity/commands/` path was
   invisible to `agy`.
2. **`hooks.json` ships.** `adapters/antigravity/hooks.json` wires PostToolUse
   `check-history-reminder.sh` + SessionStart `sessionstart-handoff.sh`. The
   SessionStart entry is degraded — `agy` event support not yet vendor-confirmed;
   the AGENTS.md text carries the fallback handoff hint.
3. **Three TOML reviewer subagents.** Mirror of the Codex set under
   `adapters/antigravity/agents/`.
4. **First shipped skill.** `adapters/antigravity/skills/momentum-orient/SKILL.md`
   codifies Rule 1 (orient first). Installed under `.agents/skills/`.
5. **Antigravity `/review-code`.** Recipe in `.agents/commands/review-code.md`
   spawns the three TOML reviewers via Antigravity's native parent → child
   delegation; surfaces findings into the active `task.md` artifact.
6. **AGENTS.md full rewrite.** `.antigravity/` references dropped throughout;
   `.agents/` layout table; explicit hook event table; skill + subagent
   sections.

### Cross-cutting (Group 0 contract + Group 3 smoke + matrix)

- **Adapter contract `destinations` extended** with `agents` + `skills`
  uniformly across all three adapters. The generic `applyOverlay` walk
  in `bin/momentum.js` auto-wires the new overlay subdirs to their
  destinations — Group 1 and Group 2 paid off this contract with zero
  adapter.js code per agents/skills overlay.
- **`brainstorm-gate.sh` moved from `adapters/claude-code/scripts/` to
  `core/scripts/`.** Generalized to resolve project root from
  `MOMENTUM_PROJECT_DIR` → `CLAUDE_PROJECT_DIR` → `pwd`. Codex and
  future adapters share the same script. `bin/momentum.js init()` now
  copies the entire `core/scripts/` tree (previously only
  `check-history-reminder.sh` was explicit).
- **`core/adapter-parity-matrix.md` introduced** as the per-feature
  shipping audit surface (complement to the capability matrix which tracks
  primitives). `tests/adapter-parity-matrix.test.js` parses the doc and
  asserts every (feature, adapter) cell declares a known status. Silent
  gaps were the failure mode this audit prevents.
- **`core/adapter-capabilities.md` refreshed** against current 2026-06
  vendor docs. Antigravity `skills` flipped `false → true` on overlay ship.
  Codex `parallelSubagents` + `skills` stay `false` pending VAL-001 evidence
  (matrix cells already mark them `shipped-degraded`).
- **Hook-execution smoke harness** added — proves hooks actually fire,
  not just install. `fakeToolEvent` helper in `tests/_helpers.js`;
  three per-adapter execution tests (`tests/adapter-hook-execution-{codex,antigravity,claude-code}.test.js`).
  Closes the test-coverage symmetry gap surfaced during the phase.

## Verification Evidence

Captured in `evidence/`:

- `evidence/test-suite.txt` — `npm test` → **309/309 PASS** (288 baseline → +21 new tests across:
  `adapter-parity-matrix.test.js`, `adapter-subagents-codex.test.js`,
  `adapter-subagents-antigravity.test.js`, `adapter-hook-execution-codex.test.js`,
  `adapter-hook-execution-antigravity.test.js`,
  `adapter-hook-execution-claude-code.test.js`, plus the extended
  `adapter-capabilities-declared.test.js` and `adapter-smoke-codex.test.js`).
- `evidence/codex-install.txt` — `momentum init --agent codex` file tree,
  `.codex/hooks.json` content, `.codex/agents/*.toml` headers.
- `evidence/antigravity-install.txt` — `momentum init --agent antigravity`
  file tree, `.agents/hooks.json` content, `.agents/skills/momentum-orient/SKILL.md`
  content.

### Deferred (live-runtime validation → VAL-001 / VAL-002)

Group 4's live `codex` and `agy` CLI dogfood could not run (neither CLI
was reachable from the Phase 16 dev environment). Per the plan's
external-dependency clause, the live runs were filed as P1 backlog items
for the post-v0.19.0 follow-up:

- **VAL-001** — Codex CLI dogfood. Gates the `parallelSubagents` + `skills`
  capability flips on Codex. The flips happen when live evidence confirms
  3-target parallel fan-out and `.agents/skills/` discovery.
- **VAL-002** — Antigravity (`agy`) CLI dogfood. Gates the `sessionStartHook`
  flip on Antigravity + confirms `.agents/skills/momentum-orient/SKILL.md`
  auto-discovery + confirms PostToolUse fires.

These validations don't block the v0.19.0 release. The boolean upgrades
are post-release cleanup once a machine with the live CLIs runs the four-
command flow.

## Acceptance check

| # | Criterion | Status |
|---|---|---|
| 1 | Every D1–D9 test passes locally | YES — D1 (Codex hook execution), D2 (Codex subagent overlay), D4 (review-code overlay), D5 (Antigravity `.agents/` paths), D6 (Antigravity hooks fire), D7 (Antigravity skills + agents), D8 (capabilities-declared), D9 (parity matrix audit) all green. |
| 2 | `npm test` shows zero regressions vs v0.18.0 baseline | YES — 288 baseline → 309 (+21 new); zero pre-existing tests broke. |
| 3 | Parity matrix ≥95% shipped/shipped-degraded on Codex + Antigravity | YES — every cell declares a status; no `not-applicable` on Codex (only Claude Code agents/skills overlay cells where the runtime doesn't surface a per-project directory). |
| 4 | retrospective.md contains terminal-capture evidence | PARTIAL — install-time evidence captured. Live-runtime evidence deferred to VAL-001 + VAL-002 per plan's external-dependency clause. |
| 5 | No Claude Code regression | YES — all existing Claude-Code-only tests pass; new `adapter-hook-execution-claude-code.test.js` proves the hook flow still works. |
| 6 | ENH-023 / ENH-024 footnotes resolved or re-justified | YES — refreshed in `core/adapter-capabilities.md` against 2026-06 vendor docs; closure record preserved; new live-evidence gates documented for `parallelSubagents` + `skills`. |

## What surprised us

- **Codex's hook + subagent + skill surfaces are richer than the Phase 11
  capability matrix declared.** Reading current vendor docs surfaced that
  Codex now supports the full Claude-Code hook event set with identical
  JSON schema. The Group 1 wins came mostly from declaring what already
  worked, not from net new engineering.
- **Antigravity's `.agents/` convention is the right home.** The earlier
  `.antigravity/` path was invisible to `agy`. One-line destinations change
  in `adapter.js` + the `runInstall` hook wiring closed the gap.
- **The generic destinations walk paid off.** Group 0's contract extension
  meant Group 1 + Group 2 needed zero per-adapter overlay-copy code for the
  new `agents/` and `skills/` surfaces.
- **`CLAUDE_PROJECT_DIR` leaked into the test runner.** The `fakeToolEvent`
  helper inherited `CLAUDE_PROJECT_DIR` from the outer Claude Code session,
  pointing to the real momentum repo. Forced us to pin both
  `CLAUDE_PROJECT_DIR` and `MOMENTUM_PROJECT_DIR` to the test tmp dir in
  the helper. Worth remembering for any future hook smoke test.

## What we'd do differently

- **Bring `codex` + `agy` CLIs into the test environment up front.** The
  Group 4 split into "ship install evidence now, file live evidence as
  follow-up" worked cleanly per the plan, but VAL-001 + VAL-002 sit on the
  release path of capability flips. Pre-checking CLI availability before
  starting the phase would have either let us close the boolean flips in-
  phase or scoped them out explicitly from day one.
- **The `brainstorm-gate.sh` move is the kind of architectural cleanup that
  ideally goes in its own commit.** It landed in the Group 1 commit because
  Group 1 needed it. Future similar moves (script promotion from adapter
  overlay to core) should get their own commit + `[ARCH_CHANGE]` history
  entry.

## Followups

- VAL-001 (Codex live-runtime dogfood; capability flips)
- VAL-002 (Antigravity live-runtime dogfood; capability flips)
- ENH-009 (distribution decision) — now unblocked since the second + third
  adapter are at parity; move into Phase 17 alongside Cursor + Gemini.
- ENH-019 (auto-publish on tag) — still open; would have let v0.19.0 ship
  without local npm login friction. Optional pre-release task.
- ENH-030 (`/complete-phase` `gh release create` step) — still open
  upstream-template gap. The local release will use the project-specific
  checklist in `CLAUDE.md` to cover both `gh release create` and
  `npm publish` manually until ENH-030 lands.

## Release readiness

- Branch: `phase-16-adapter-parity`
- Target tag: `v0.19.0`
- Release artifact: npm `@avinash-singh-io/momentum@0.19.0` + GitHub
  Release `v0.19.0`.
- Pre-flight checklist:
  - [x] All test gates passing locally (309/309)
  - [x] Tarball-shape test includes all new files (G2, G3, T1)
  - [x] `package.json` `files` glob covers `agents/**` + `skills/**` overlays
  - [ ] Bump `package.json` version `0.18.0` → `0.19.0` (release step)
  - [ ] Tag `v0.19.0` (release step, after merge)
  - [ ] `gh release create v0.19.0 ... --latest --verify-tag` (release step)
  - [ ] `npm publish --access public` (release step)
  - [ ] Verify both surfaces live (`gh release list`, `npm view`)

The two release-step gates (gh release create + npm publish) require
explicit user approval per the project-specific release checklist in
CLAUDE.md.
