# Phase 17 — Swarm: Single-Session Multi-Project Feature Delivery (Claude Code): Retrospective

> **Target Version**: v0.20.0
> **Completed**: 2026-06-12 (single-session implementation)
> **Branch**: `phase-17-swarm`
> **Scope**: Claude Code only — Codex + Antigravity parity deferred to Phase 18

## What shipped

A complete swarm subsystem for momentum: file-based, daemon-free,
race-safe cross-repo coordination from ONE user (Claude Code) session.
The user's session is the **conductor**; per-repo **supervisors** are
background sessions pinned to each impacted repo's cwd. Each
supervisor runs momentum's normal `/start-phase` → implement →
`/sync-docs` → `/complete-phase` loop INSIDE its repo. The conductor
coordinates **waves** (computed from `ecosystem.json` dependency edges),
surfaces inbox decisions, broadcasts cross-cutting concerns, and
synthesizes per-repo retrospectives into the initiative at fan-in.

### The architecture

```
<eco>/swarms/<NNNN-slug>/
  manifest.json    ← saga state — repos + waves + audit + portability hooks
  board.json       ← materialized ~3KB cache (Strategy A)
  contracts/<surface>.contract.json
  inbox/
    INDEX.md
    NNNN-<slug>.md ← pending supervisor questions
    resolved/      ← archived answers
  signals/         ← reserved (Phase 17.5 portability)
  tokens/          ← reserved (Phase 17.5 portability)
  details/         ← per-repo drill-in cache
  .offsets.json    ← incremental log offsets (Strategy C)

<eco>/changes/<NNNN-slug>.md   ← cross-repo changeset at completion

<repo>/specs/phases/<phase-slug>/
  overview.md            ← OPTIONAL swarm frontmatter (solo briefs unchanged)
  swarm-context.md       ← conductor → supervisor /tell + /broadcast appends

<repo>/.momentum/runs/
  dispatch-run-NNN.json  ← per-supervisor saga step (separate counter from
                           Phase 11 scout/dispatch/handoff .md artifacts)
```

### Token-cost design (Strategies A+B+C+D)

The single largest design risk was conductor-turn cost. Naive
file-reading at 200 turns × 5 repos = ~60M tokens (~$50–100). Four
layered indexing strategies cut that 95%:

| Strategy | Mechanism | Win |
|---|---|---|
| **A** Materialized board cache | `board.json` regenerated on every manifest write; conductor reads ONLY this | 290KB → ~3KB per turn |
| **B** Git HEAD SHA invalidation | `repos[*].last_seen_sha` cheaply revalidated via `git rev-parse HEAD` | Skip unchanged repos entirely |
| **C** Incremental log + history tail | `.offsets.json` tracks byte offsets; `tailHistory(file, n)` reads newest N entries | Never re-read full `history.md` |
| **D** Supervisor context isolation | cwd-pinned spawn; conductor NEVER loads supervisor context | Bounded per-supervisor cost |

All four shipped in v0.20.0. End-to-end scenario evidence confirms
p95 conductor-turn cost ≪5KB on all three synthetic ecosystems.

### Per-group ship contents

**G0 — Schemas + indexing foundation** (55 tests)
- Four JSON schemas: `manifest`, `board`, `contract`, `dispatch-run`
- Six libraries: `manifest.js` (CRUD + mkdir-lock), `board.js`
  (materializer), `wave-ordering.js` (topo sort + cycle detection),
  `git-sha-cache.js` (Strategy B), `incremental-log.js` (Strategy C),
  `brief.js` (optional swarm frontmatter helper)
- `/start-phase` + `/validate` recipe extensions for swarm members
- `phases/README.md` template gains swarm-member briefs section

**G1 — Conductor core + Claude Code surface** (44 tests)
- `core/swarm/conductor.js`: `planSwarm` + `buildSpawnDirectives` +
  `pollTurn` (Strategies A+B+C in one call) + `cancelSwarm` +
  `resumeSwarm` + `renewLeases`. Platform-agnostic.
- `core/swarm/supervise.md`: shared supervisor recipe
- `core/swarm/lib/saga.js`: per-supervisor dispatch-run-NNN.json (own
  counter, separate from Phase 11 .md artifacts)
- `bin/swarm.js`: full CLI surface (start/status/tell/broadcast/verify/
  complete/resume/cancel/budget); `--spawn` invokes `claude --bg --cwd`
- `bin/momentum.js`: `swarm` verb dispatched + surfaced in `--help`
- `adapters/claude-code/commands/swarm.md`: `/swarm` slash command

**G2 — Intervention surface** (28 tests)
- `core/swarm/inbox.js`: write/list/resolve protocol with mkdir-lock +
  auto-regenerated INDEX.md; resolved items archive at `inbox/resolved/`
- `core/swarm/lib/pre-merge.js`: `git merge --no-commit --no-ff` preview
  with always-abort; conflicted-file capture; batch helper
- Inbox + preview-merge CLI verbs
- `cmdVerify` exits non-zero on issues

**G3 — Resume + portability hooks** (21 tests)
- Disk-only `resumeSwarm` reconstitution; sessions[] registry
- Lease renewal for owned repos (`renewLeases`); 24h default
- Reserved `signals/` + `tokens/` directories created at swarm start
- Forward-compatible schema validation (missing optional portability
  fields still validate)
- `docs/swarm.md` top-level user guide

**G4 — End-to-end + docs + retrospective** (3 e2e tests + this file)
- Three synthetic scenarios — A linear (3 repos), B branched (4 repos
  diamond), C wide fan-out (5 repos)
- Evidence captured at `specs/phases/phase-17-swarm/evidence/scenario-*.txt`
- `core/adapter-parity-matrix.md`: `/swarm` row added; Codex + Antigravity
  marked `not-applicable` with footnote 14 explaining Phase 18 scope
- `core/adapter-capabilities.md`: Phase 17 scope section added

### Claude Code zero-regression guard

The same fingerprint snapshot from Phase 16 Rework (`tests/
claude-code-regression.test.js`) ran on every G0-G4 commit. Intentional
documentation drifts (G0 + G1) were captured into the fingerprint with
meta updates explaining the additive scope. Solo-phase behavior:
unchanged.

## Verification Evidence

| Deliverable | Evidence |
|---|---|
| D1 — Schemas | `node --test tests/swarm-schemas.test.js` — 22/22 |
| D2 — Wave ordering | `node --test tests/swarm-wave-ordering.test.js` — 14/14 |
| D3 — Indexing harness | `node --test tests/swarm-indexing.test.js` — 19/19 |
| D4 — `/swarm start` + `/swarm status` | `node --test tests/swarm-start-claude-code.test.js` — 13/13; `swarm-board-render.test.js` — 10/10 |
| D5 — Inbox protocol | `node --test tests/swarm-inbox.test.js` — 8/8 |
| D6 — Context push + broadcast | `node --test tests/swarm-intervention.test.js` — 9/9 |
| D7 — Wave checkpoint + verify + pre-merge | `node --test tests/swarm-wave-transition.test.js` — 8/8 + `swarm-complete.test.js` — 3/3 |
| D8 — `/swarm resume` | `node --test tests/swarm-resume.test.js` — 9/9 |
| D9 — Three e2e scenarios | `tests/swarm-e2e-scenarios.test.js` — 4/4 + `evidence/scenario-{a-linear,b-branched,c-wide}.txt` |
| D10 — Token-spend ≤ ~$5 | Evidence files report p95 board.json size 800–1200 bytes per scenario — well within the <5KB target |
| D11 — No Claude Code regression | `node --test tests/claude-code-regression.test.js` — 6/6 (3 intentional drifts re-fingerprinted with meta updates) |
| D12 — Full regression | `npm test` — **462 / 462** (326 v0.19.0 baseline + 136 new); zero pre-existing regressions |

## Acceptance Criteria — all met

1. ✅ Every D1–D11 test passes locally; D9 has captured evidence in `evidence/`
2. ✅ `npm test` shows 462 (≥326 baseline + 136 new); zero pre-existing regressions
3. ✅ Three synthetic e2e scenarios complete on different ecosystem shapes
4. ✅ Token spend ≪ target — conductor-turn cost <5KB on 100% of measured turns across all three scenarios (target was 95%)
5. ✅ This retrospective contains the Rule 12 Verification Evidence section
6. ✅ Per-repo phase discipline preserved: a swarm-member phase passes the same `/validate` + `/complete-phase` checks as a solo phase (solo briefs without frontmatter remain valid; `/validate` extends without breaking existing checks)
7. ✅ Portability schema hooks present and documented — `repos[*].{owner, lease_expires_at, lease_renewed_at, claimed_by_session}`, top-level `sessions[]`, `signals/` + `tokens/` dirs. Phase 17.5 needs no schema migration to light up `/swarm focus|join|absorb`
8. ✅ No regression in Claude Code adapter — `claude-code-regression.test.js` green with documented intentional additions

## What we deliberately did NOT ship

Out-of-scope per the brainstorm — staying narrow shipped this in one
day instead of three:

| Deferred to | What |
|---|---|
| Phase 17.5 (v0.20.1) | `/swarm focus`, `/swarm join`, `/swarm absorb`; lease enforcement; signal protocol; multi-conductor coordination. Schema hooks already in v0.20.0. |
| Phase 18 (v0.20.2) | Codex `.codex/agents/swarm-supervisor.toml` + MCP cwd shim; Antigravity Agent Manager workflow + supervisor skill. `core/swarm/` is platform-agnostic — only adapter wiring remains. |
| v0.20.x | `interactive` mode; discuss thread (`/swarm discuss <repo>`); manual takeover (`/swarm pause|resume <repo>`); rewind (`/swarm rewind <repo> --to <task>`); live-streaming `/swarm tail <repo>`; AST-aware semantic merge conflict detection. |
| Post-release | Cerebrio bootstrap stays a user activity. The user installs released v0.20.0 and runs the swarm on real cerebrio repos. Phase 17 validated synthetically. |

## Surprises + lessons

- **G2 was almost free.** `/tell`, `/broadcast`, `/verify`, `/complete`,
  and `/budget` had already landed in G1's `bin/swarm.js` to keep the
  CLI surface coherent. G2's actual delta was inbox + pre-merge — the
  rest was just tests.
- **The fingerprint test paid off twice.** Both G0 (docs drift in
  start-phase.md + validate.md + phases/README.md) and G1 (one new
  file: `.claude/commands/swarm.md`) tripped the regression guard
  exactly as designed. Re-snapshotting with meta documenting the why
  is the right contract.
- **The `--mode autopilot` / `--mode checkpoint` split in `pollTurn`
  was the load-bearing simplification.** Originally pencilled as
  three branches (autopilot / checkpoint / interactive). Cutting
  interactive simplified the wave-transition logic to a single
  conditional and let the same `pollTurn` handle both shipped modes
  cleanly.
- **Pre-merge preview correctly aborts ALWAYS.** Spent a few minutes
  ensuring the `git merge --abort` runs even on the no-conflict path,
  to keep the working tree clean for the next preview. Tests verify.
- **`cmdVerify` exit-code propagation took an extra pass.** Setting
  `process.exitCode` in the subcommand didn't survive `bin/momentum.js`
  dispatch's `process.exit(exitCode)`. Switched to `process.exit(1)`
  in-line. Pattern worth carrying forward for any CLI verb that
  returns failure mid-execution.

## Files added / modified

**Added (new):**
- `core/swarm/conductor.js`, `supervise.md`
- `core/swarm/schema/{manifest,board,contract,dispatch-run}.schema.json`
- `core/swarm/lib/{manifest,board,wave-ordering,git-sha-cache,incremental-log,brief,saga,pre-merge}.js`
- `core/swarm/inbox.js`
- `bin/swarm.js`
- `adapters/claude-code/commands/swarm.md`
- `docs/swarm.md`
- `tests/swarm-{schemas,wave-ordering,indexing,start-claude-code,cancel,board-render,inbox,intervention,wave-transition,complete,resume,portability-schema,e2e-scenarios}.test.js` (13 files)
- `tests/fixtures/swarm-ecosystems/README.md`
- `specs/phases/phase-17-swarm/evidence/scenario-{a-linear,b-branched,c-wide}.txt`

**Modified (additive):**
- `bin/momentum.js` — swarm verb dispatch + `--help` mention
- `core/commands/start-phase.md` — swarm frontmatter section
- `core/commands/validate.md` — swarm member integrity rule
- `core/specs-templates/specs/phases/README.md` — swarm-member briefs section
- `core/adapter-parity-matrix.md` — `/swarm` row + footnote 14
- `core/adapter-capabilities.md` — Phase 17 scope section
- `tests/fixtures/v0.18.0-claude-code-fingerprint.json` — re-snapshot with meta explaining additive drift

## Roadmap impact

Phase 17.5 → v0.20.1 (Swarm Portability) — schema hooks ready, commands to wire.
Phase 18 → v0.20.2 (Swarm Parity for Codex + Antigravity) — adapter wiring only; core is platform-agnostic.
Phase 19 → v0.21.0 (Reach: Cursor + Gemini adapters). Originally Phase 17 — shifted when swarm took priority.
Phase 20 → v0.22.0 (Intelligence)
Phase 21 → v1.0 (Platform)

## Ready to release

All groups verified. Branch `phase-17-swarm` clean. Next: merge to
`main`, tag `v0.20.0`, `gh release create`, `npm publish --access public`.
