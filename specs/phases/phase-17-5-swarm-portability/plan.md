# Phase 17.5 — Swarm Portability: Implementation Plan

# Execution order: Group 0 → Group 1 → (Groups 2 + 3 in parallel) → Group 4 → Group 5

## Group 0 — Signal protocol + lease enforcement library

**Sequential.** Foundation for every other group. No external deps.

### Tasks
- T0.1 Create `core/swarm/signals.js` — typed message writer/reader/poller. Types: `focus-request`, `claim-request`, `absorb-proposed`, `lease-expired`. Mkdir-locked writes. Auto-regenerated `signals/INDEX.md` mirroring inbox pattern.
- T0.2 Add JSON schema `core/swarm/schema/signal.schema.json` — locked to v1.
- T0.3 Promote lease check to enforcement in `core/swarm/lib/manifest.js` write path. New helper `assertOwnership(manifest, repo, session_id)`. All existing call sites pass `session_id` (extracted from manifest's current session context).
- T0.4 Create `core/swarm/lib/tokens.js` — opaque CRUD (`writeToken`, `consumeToken`, `purgeExpired`). 16-hex random IDs.
- T0.5 Extract sessions[] CRUD to `core/swarm/lib/sessions.js` — `registerSession`, `touchSession`, `findSession`. Existing manifest writes that touch sessions[] route through this.

### Tests
- `tests/swarm-signals.test.js` — type validation, mkdir-lock under 20-way concurrent write, INDEX regen
- `tests/swarm-lease-enforcement.test.js` — owner write accepted, non-owner with valid lease rejected, non-owner after expiry accepted
- `tests/swarm-tokens-sessions.test.js` — token write/consume single-use, sessions[] append-only, last_seen update

### Commit
`feat(swarm): G0 — signal protocol + lease enforcement + tokens/sessions libs`

---

## Group 1 — `/swarm claim` + `/swarm release` CLI

**Sequential after Group 0.** Ownership-flip primitives the higher commands compose.

### Tasks
- T1.1 Add `cmdClaim(swarmId, repo, opts)` to `bin/swarm.js` — checks lease, sets `repos[repo].owner = currentSession`, writes signal, audit-log `claim`.
- T1.2 Add `cmdRelease(swarmId, repo, opts)` — clears owner to `_unclaimed`, writes signal, audit-log `release`.
- T1.3 Wire both into `bin/momentum.js` dispatch + `--help` text.
- T1.4 Extend `adapters/claude-code/commands/swarm.md` with `/swarm claim` + `/swarm release` sections.

### Tests
- `tests/swarm-claim-release.test.js` — claim succeeds when unclaimed/lease-expired; claim rejected when owner lease valid; release frees ownership; CLI exit codes correct
- Claude Code fingerprint refresh — re-snapshot for `swarm.md` overlay drift, meta points at Phase 17.5 G1

### Commit
`feat(swarm): G1 — /swarm claim + /swarm release`

---

## Group 2 — `/swarm focus <repo>` *(parallel with Group 3)*

**Parallel with Group 3.** Depends only on G1. Smallest of the three new commands.

### Tasks
- T2.1 Implement `core/swarm/focus.js` — `focus(swarmId, repo)`: validate repo exists in manifest; validate caller owns repo; flip owner to `_focusing`; write token (`kind: focus`, `target_repo: repo`, 1-hour expiry); write `focus-request` signal; emit `claude --bg --cwd <eco>` directive for the user to spawn in another terminal.
- T2.2 Add `cmdFocus(swarmId, repo)` to `bin/swarm.js`.
- T2.3 Receiving side: extend `cmdJoin` (G3) with `--token` flag — consume token; if `kind: focus`, claim only the `target_repo`.
- T2.4 Update `adapters/claude-code/commands/swarm.md` `/swarm focus` section.

### Tests
- `tests/swarm-focus.test.js` — focus by owner succeeds; focus by non-owner rejected; token written + claimable once; expired token rejected; spawn directive content
- Claim conflict: `focus → join --token` round-trip leaves manifest in `repos[target].owner = receiver_session_id`

### Commit
`feat(swarm): G2 — /swarm focus <repo>`

---

## Group 3 — `/swarm join <swarm-id>` *(parallel with Group 2)*

**Parallel with Group 2.** Depends only on G1.

### Tasks
- T3.1 Implement `core/swarm/join.js` — `join(swarmId, opts)`: validate swarm exists at `<eco>/swarms/<id>/`; register session in sessions[]; optional `--token` (focus or join token consumption); optional `--claim <repo>` shortcut.
- T3.2 Add `cmdJoin(swarmId, opts)` to `bin/swarm.js` — `--token <token>`, `--claim <repo>`, `--co-conductor` (default true).
- T3.3 Auto-renew owned-repo leases on join (existing `renewLeases` helper).
- T3.4 Update `adapters/claude-code/commands/swarm.md` `/swarm join` section.

### Tests
- `tests/swarm-join.test.js` — join valid swarm adds to sessions[]; join non-existent swarm errors cleanly; `--token` focus consumes correctly; `--token` join consumes correctly; `--claim` flips ownership when unclaimed
- Sessions[] append-only: re-joining same session updates `last_seen`, doesn't duplicate

### Commit
`feat(swarm): G3 — /swarm join <swarm-id>`

---

## Group 4 — `/swarm absorb <other-id>`

**Sequential after Groups 2 + 3.** Composes verify + manifest/board/inbox merge.

### Tasks
- T4.1 Implement `core/swarm/absorb.js`:
  - Load source + target manifests
  - Disjoint-repo check: if any repo appears in both, run `swarm-verify` contract compatibility; on mismatch → abort with diff
  - Merge `repos.*` entries (target wins on contract pinning)
  - Merge `waves.*` (re-topo-sort against ecosystem.json)
  - Merge `sessions[]` by `session_id`
  - Merge `inbox/` items (rename source items to avoid NNNN collision, regenerate INDEX)
  - Merge `audit[]` by timestamp
  - Regenerate `board.json`
  - Archive source swarm dir to `<eco>/swarms/.absorbed/<source-id>/`
- T4.2 Add `cmdAbsorb(otherSwarmId)` to `bin/swarm.js` — interactive y/N confirmation showing the merge plan unless `--yes`.
- T4.3 Update `adapters/claude-code/commands/swarm.md` `/swarm absorb` section.

### Tests
- `tests/swarm-absorb.test.js`:
  - clean merge (disjoint repos) → both swarms' repos live in target, source archived
  - shared repo + matching contract → merge proceeds
  - shared repo + diverging contract → abort with contract diff in stderr; both swarms untouched
  - inbox merge regenerates INDEX with all items
  - audit timeline interleaved correctly
  - `--yes` skips confirmation

### Commit
`feat(swarm): G4 — /swarm absorb <other-id>`

---

## Group 5 — E2E scenarios + docs + retrospective + version bump

**Sequential after Group 4.** Final integration + ship gate.

### Tasks
- T5.1 Three synthetic two-session scenarios in `tests/swarm-portability-e2e.test.js`:
  - **P-Focus** — Phase 17 linear fixture (3 repos); session A starts swarm; calls `focus backend`; session B joins via token; both progress in parallel; reunion via `/swarm absorb`
  - **P-Join** — branched fixture (4 repos); session A starts, claims root; session B joins as co-conductor and claims `mid-b`; concurrent waves
  - **P-Absorb-Conflict** — wide fixture (5 repos); two parallel swarms with overlapping contract surface; `absorb` aborts cleanly with contract diff
- T5.2 Capture evidence: `specs/phases/phase-17-5-swarm-portability/evidence/scenario-portability-{focus,join,absorb}.txt`
- T5.3 Convert `docs/swarm.md` "Future: Swarm Portability (Phase 17.5)" → "Multi-session portability" with shipped semantics, full subcommand reference, two worked examples.
- T5.4 Update `core/adapter-parity-matrix.md` footnote 14 — Phase 17.5 portability lives on the existing `/swarm` row (no new row).
- T5.5 Update `core/adapter-capabilities.md` — Phase 17.5 scope section.
- T5.6 `/sync-docs` propagation: `specs/status.md`, `specs/phases/README.md`, `specs/phases/index.json`, `specs/changelog/2026-06.md`, `specs/planning/roadmap.md`.
- T5.7 Bump `package.json` 0.20.1 → 0.20.2.
- T5.8 Retrospective at `specs/phases/phase-17-5-swarm-portability/retrospective.md` — Rule 12 verification evidence section, acceptance criteria checklist, what we deferred, surprises + lessons.
- T5.9 `npm test` final — expect ~544/544 green.

### Tests
- All prior groups' tests still green
- Three e2e scenarios pass
- `tests/claude-code-regression.test.js` green (fingerprint refreshed for new `swarm.md` overlay sections)
- `tests/docs-swarm-portability.test.js` — assert docs/swarm.md contains shipped-semantics sections

### Commit
`chore(release): v0.20.2 — Swarm Portability (Phase 17.5)`

---

## Group dependency graph

```
G0 (libs + enforcement)
  └── G1 (claim + release CLI)
        ├── G2 (focus)  ─┐
        └── G3 (join)  ──┤
                          └── G4 (absorb)
                                └── G5 (e2e + docs + retro + release)
```
