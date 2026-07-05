---
type: Phase
status: complete
tags: [phase-18, swarm-parity, codex, antigravity, adapter-contract, spawn, adapter-spawn, claude-code-refactor, swarm-supervisor-toml, mcp-cwd-shim, swarm-conductor-workflow, swarm-supervisor-skill, agent-manager, parallel-subagents, session-start-hook, val-001, val-002, live-dogfood, capability-flips, multi-adapter-e2e, fingerprint-snapshot, adapter-parity-matrix, v0-20-4]
---

# Phase 18 — Swarm Parity (Codex + Antigravity)

> **Target release**: v0.20.4
> **Branch**: `phase-18-swarm-parity`
> **Brainstormed**: 2026-06-15

## Goal

Wire the platform-agnostic `core/swarm/` (Phase 17 + 17.5) into the Codex
and Antigravity adapters. Reach full swarm parity (all 13 subcommands) on
all three shipped adapters, with VAL-001 + VAL-002 closure via live
dogfood gating the v0.20.4 release.

## Key decisions (locked at brainstorm time — 2026-06-15)

| Decision                          | Choice                                                          | Why                                                                                                                  |
| --------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Surface scope                     | Full 13 subcommands (Phase 17 + 17.5)                           | Single phase to parity; `claim`/`release` are foundational and awkward to split out.                                 |
| Live dogfood (VAL-001 + VAL-002)  | **Inside phase** — release blocks on live evidence              | Synthetic-only Phase 18 would leave both adapter cells degraded indefinitely; bundle VAL closure with the release.   |
| Spawn architecture                | Add `spawn(directive)` to the adapter contract                  | Cleanest separation: `core/swarm/conductor.js` already emits a platform-agnostic spawn directive; adapters dispatch. |
| MCP cwd shim for Codex            | **Document-only** in AGENTS.md                                  | Relies on Codex's existing MCP support; no momentum-owned MCP server code. Fallback path defined if it doesn't hold. |

## Scope — in

1. **Adapter contract** — add `spawn(directive)` to the adapter interface.
2. **Claude Code refactor** — move existing Claude Code spawn from
   `bin/swarm.js` into `adapters/claude-code/adapter.js::spawn()`. Pure
   refactor, zero behavior change.
3. **Codex wiring** — `adapter.spawn()`,
   `.codex/agents/swarm-supervisor.toml`, AGENTS.md swarm section with
   MCP cwd shim docs, all 13 subcommands working through Codex spawn.
4. **Antigravity wiring** — `adapter.spawn()`,
   `.agent/workflows/swarm-conductor.md`,
   `.agents/skills/swarm-supervisor/SKILL.md`, AGENTS.md swarm section,
   all 13 subcommands working through Antigravity spawn.
5. **Synthetic e2e** — extend the Phase 17 / 17.5 harness with
   `--adapter` switch. 3 scenarios × 3 adapters = 9 evidence captures.
6. **Fingerprint snapshots** — new Codex + new Antigravity; refresh
   Claude Code if G0 changes any installed file.
7. **Live VAL-001 (Codex) + VAL-002 (Antigravity)** — one `/swarm start`
   end-to-end run per platform, evidence at `evidence/val-001-codex.txt`
   and `evidence/val-002-antigravity.txt`.
8. **Capability flips on live evidence**:
   - Codex `parallelSubagents: false → true`
   - Antigravity `sessionStartHook: false → true`
9. **Docs** — `docs/swarm.md` multi-adapter section,
   `core/adapter-parity-matrix.md` flip Codex + Antigravity swarm cells
   from `not-applicable` to `shipped`, `core/adapter-capabilities.md`
   Phase 18 section.
10. **Release v0.20.4** — full release checklist (tag + GitHub Release +
    `npm publish` + verify both surfaces).

## Scope — out (explicit non-goals)

- New core swarm features beyond Phase 17 / 17.5.
- Schema migrations — none needed; portability hooks (`owner`,
  `lease_expires_at`, `signals/`, `tokens/`) are already baked into the
  manifest schema.
- Cursor or Gemini CLI adapters — deferred to Phase 19 (Reach).
- BUG-008 (`momentum init` silently overwrites recipe/script files) —
  separate workstream.
- Cross-machine swarm portability (multi-host swarms).
- BUG-007 backlog status reconciliation — minor housekeeping, do later.

## Deliverables with verification commands

| Deliverable                                                  | Verification                                                                                                                |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `adapter.spawn(directive)` on all 3 adapters                 | `npm test -- tests/adapter-contract-spawn.test.js`                                                                          |
| Claude Code swarm tests pass byte-for-byte after refactor    | `npm test -- tests/swarm-*.test.js tests/claude-code-regression.test.js`                                                    |
| Codex swarm install lays down supervisor TOML                | `node bin/momentum.js init /tmp/c --agent codex && ls /tmp/c/.codex/agents/swarm-supervisor.toml`                            |
| Antigravity swarm install lays down workflow + skill         | `node bin/momentum.js init /tmp/a --agent antigravity && ls /tmp/a/.agent/workflows/swarm-conductor.md /tmp/a/.agents/skills/swarm-supervisor/SKILL.md` |
| Multi-adapter e2e evidence captured                          | `ls evidence/scenario-*-{codex,antigravity}.txt` returns 6 files                                                            |
| Codex + Antigravity install fingerprints                     | `ls tests/fixtures/v0.20.4-codex-fingerprint.json tests/fixtures/v0.20.4-antigravity-fingerprint.json`                       |
| VAL-001 (Codex) live evidence                                | `cat evidence/val-001-codex.txt` shows real `codex --version` output + `/swarm start` walkthrough                            |
| VAL-002 (Antigravity) live evidence                          | `cat evidence/val-002-antigravity.txt` shows real `agy --version` output + `/swarm start` walkthrough                        |
| Capability flips landed                                      | `grep -E 'parallelSubagents\|sessionStartHook' adapters/codex/adapter.js adapters/antigravity/adapter.js` returns `true`     |
| Parity matrix shows shipped for all 3 adapters               | `grep -A 3 'swarm.*Phase 17' core/adapter-parity-matrix.md` shows no `not-applicable` cells                                  |
| Release v0.20.4 on both surfaces                             | `gh release list --limit 3 \| head -1 \| grep v0.20.4`; `npm view @avinash-singh-io/momentum version` returns `0.20.4`        |

## Acceptance criteria

1. All 3 adapters export `spawn(directive)`; asserted by adapter-contract test.
2. All 13 `/swarm` subcommands work through the Codex spawn path
   (G1 unit + G3 synthetic e2e evidence).
3. All 13 `/swarm` subcommands work through the Antigravity spawn path
   (G2 unit + G3 synthetic e2e evidence).
4. VAL-001 + VAL-002 closed with live `/swarm start` evidence files.
5. Codex `parallelSubagents` and Antigravity `sessionStartHook` flipped
   to `true`, gated on the live evidence from criterion 4.
6. Claude Code zero-regression: install fingerprint matches the v0.20.3
   baseline byte-for-byte (or has explanatory meta if a G0 refactor
   path is on a momentum-installed file).
7. Test suite: 555 (v0.20.3 baseline) + ~30–40 new tests for
   G0/G1/G2/G3 paths, all green.
8. `core/adapter-parity-matrix.md` shows the `/swarm` row as `shipped`
   for all three adapters.
9. v0.20.4 live on both GitHub Releases and npm, marked `Latest`.

## Risks

| Risk                                                                          | Mitigation                                                                                                                                                |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `codex` / `agy` CLI unavailable in the dev env when G4 runs                   | G0–G3 can ship behind the phase branch without live evidence. G4 blocks v0.20.4 release until evidence in. Worst case: extend timeline.                  |
| Doc-only MCP cwd shim doesn't actually hold (Codex MCP gotchas)               | G1 escalates back to "ship momentum MCP server at `core/swarm/mcp-cwd-server.js`" with the user. Documented as scope risk; not silently downgraded.       |
| Antigravity Agent Manager edge cases (parallel spawn, signal handling)        | Lean on Phase 16 Rework's antigravity hook evidence; synthetic e2e first; spike-and-decide on anything genuinely undocumented.                            |
| G0 refactor accidentally drifts the Claude Code install fingerprint           | G0 verification gate IS the byte-for-byte fingerprint test. If it drifts, the moved file ended up on a momentum-installed path — fix in G0, don't carry forward. |
| Surface scope (13 subcommands × 2 adapters) underestimates effort             | Group plan splits Codex (G1) and Antigravity (G2) into parallel work streams. Each is independent; either can ship and verify in isolation.              |
