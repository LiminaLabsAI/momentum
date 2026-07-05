---
type: Plan
---

# Phase 17 Swarm — Implementation Plan

# Sequential:  Group 0 → (Groups 1 + 2 in parallel) → Group 3 → Group 4

External dependencies:

- Synthetic ecosystem fixtures (created in Group 4; built into the repo)
- macOS/Linux for shell scripts
- Claude Code CLI for live conductor smoke (manual)

Per-group acceptance gate: `npm test` green, Claude Code regression intact,
group-specific tests pass.

---

## Group 0 — Schemas, Contracts, Indexing Foundation

**Sequential.** Blocks Groups 1, 2.

Commit: `feat(swarm): schemas + indexing harness foundation (Phase 17 G0)`

- [ ] G0.1 Author `core/swarm/schema/manifest.schema.json` — full JSON schema for manifest.json
- [ ] G0.2 Author `core/swarm/schema/board.schema.json` — schema for materialized board cache
- [ ] G0.3 Author `core/swarm/schema/contract.schema.json` — Pact-style shape declarations
- [ ] G0.4 Author `core/swarm/schema/dispatch-run.schema.json` — extends existing dispatch-run records with swarm fields (`swarm_id`, `wave`, `step_n`, `done`)
- [ ] G0.5 Author `core/swarm/lib/manifest.js` — CRUD + mkdir-lock for race-safe writes
- [ ] G0.6 Author `core/swarm/lib/board.js` — board materializer (input: manifest + dispatch-runs; output: board.json)
- [ ] G0.7 Author `core/swarm/lib/wave-ordering.js` — topological sort from ecosystem.json dependency edges; cycle detection with clear error
- [ ] G0.8 Author `core/swarm/lib/git-sha-cache.js` — track per-repo `last_seen_sha`; cheap revalidation via `git rev-parse HEAD`
- [ ] G0.9 Author `core/swarm/lib/incremental-log.js` — read session log from `last_read_offset`; persist offset per session
- [ ] G0.10 Extend `<repo>/specs/phases/phase-N-<slug>/brief.md` template with optional `swarm:`/`wave:`/`initiative:`/`claimed_by_session:` frontmatter fields. Update `/start-phase` recipe to populate when invoked from a swarm context.
- [ ] G0.11 Extend `/validate` recipe + CLI checks for swarm member integrity (manifest ↔ brief back-references; initiative ↔ swarm member set)
- [ ] G0.12 Author tests for D1, D2, D3: `tests/swarm-schemas.test.js`, `tests/swarm-wave-ordering.test.js`, `tests/swarm-indexing.test.js`

Verification: D1 + D2 + D3 pass. Full `npm test` ≥326 + new tests.

---

## Group 1 — Conductor Core (Claude Code)

**Parallel with Group 2.**

External: none.

Commit: `feat(swarm): conductor core + claude-code background-session supervisors (Phase 17 G1)`

- [ ] G1.1 Author `core/swarm/conductor.js` — manifest CRUD + supervisor spawn orchestration
- [ ] G1.2 Author `core/swarm/supervise.md` — shared per-repo supervisor recipe (runs `/start-phase` → implement → `/sync-docs` → `/complete-phase` inside its cwd)
- [ ] G1.3 Author Claude Code adapter spawn: `claude --bg --cwd <repo> --resume <session-id>` invocation wrapper. Test `--bg` availability and behavior on first install; fallback path documented if unavailable.
- [ ] G1.4 Author `bin/swarm.js` — CLI surface for `momentum swarm start|status|tell|broadcast|verify|complete|resume|cancel|budget`
- [ ] G1.5 Author `/swarm start` Claude Code recipe — wraps CLI; handles plan presentation + user approval; writes initiative if needed; writes manifest + per-repo briefs; spawns Wave 1 supervisors
- [ ] G1.6 Author `/swarm status` recipe — reads board.json + inbox/INDEX.md; renders the ANSI board (foreground-conductor in chat)
- [ ] G1.7 Author `/swarm cancel` — graceful halt: halts all supervisors, writes cancellation to manifest, preserves all artifacts for forensics
- [ ] G1.8 Saga record extension — supervisors write to `<repo>/.momentum/runs/dispatch-run-<id>.json` with `swarm_id` + `wave` + `step_n` + `done` fields
- [ ] G1.9 Conductor-side polling loop — every conductor turn: check git SHAs, read updated dispatch-run records, re-render board if any change
- [ ] G1.10 Tests: `tests/swarm-start-claude-code.test.js`, `tests/swarm-cancel.test.js`, `tests/swarm-board-render.test.js`

Verification: D4 passes; manual smoke spawning a 2-repo synthetic swarm completes Wave 1.

---

## Group 2 — Intervention Surface

**Parallel with Group 1.**

External: none.

Commit: `feat(swarm): inbox + tell + broadcast + wave checkpoint (Phase 17 G2)`

- [ ] G2.1 Author `core/swarm/inbox.js` — inbox CRUD: write item, list pending, resolve, archive. Supervisor side: `writeInboxItem(swarm_id, repo, question, options)`. Conductor side: `listPendingInboxItems(swarm_id)`, `resolveInboxItem(swarm_id, id, answer)`. Both with mkdir-lock.
- [ ] G2.2 `inbox/INDEX.md` materializer — one-line summary per pending item; regenerated on any inbox change
- [ ] G2.3 Author `/swarm tell <repo> "<text>"` recipe — appends to `<repo>/specs/phases/phase-N-<slug>/swarm-context.md` (supervisor reads on next planning turn). Writes to manifest's audit field.
- [ ] G2.4 Author `/swarm broadcast "<text>"` recipe — fans out to every active supervisor's `swarm-context.md`. Writes to manifest's audit field. Confirmation prompt.
- [ ] G2.5 Author `/swarm verify` — runs contract verifier (Pact-style shape check on declared contracts) + scout TTL revalidation + intent-drift check (initiative ↔ brief back-refs)
- [ ] G2.6 Wave checkpoint flow in conductor: when last supervisor in wave N completes, conductor halts and presents (a) contract diff (if any contract bump occurred), (b) per-repo retrospective summaries, (c) next wave's plan, (d) approval prompt. User confirms → Wave N+1 spawns. Edit/cancel options available.
- [ ] G2.7 Pre-merge preview at fan-in: conductor runs `git merge --no-commit --no-ff` between each sibling branch and its merge target; surfaces semantic conflicts as inbox items
- [ ] G2.8 `/swarm complete` recipe — runs verify, synthesizes per-repo retrospectives into initiative's `Per-repo contributions` section, writes cross-repo changeset to `<eco>/changes/<id>.md`, posts final approval
- [ ] G2.9 `/swarm budget <repo> +N` recipe — extends per-supervisor token budget; logged in manifest
- [ ] G2.10 Tests: `tests/swarm-inbox.test.js`, `tests/swarm-intervention.test.js`, `tests/swarm-wave-transition.test.js`, `tests/swarm-complete.test.js`

Verification: D5 + D6 + D7 pass. Full `npm test` green.

---

## Group 3 — Resume + Portability Hooks

**Sequential.** Runs after Groups 1 + 2.

External: none.

Commit: `feat(swarm): resume from disk + portability schema hooks (Phase 17 G3)`

- [ ] G3.1 Author `/swarm resume <id>` — reads manifest + dispatch-run records + brief frontmatter; reconstitutes board; resumes from last wave boundary or recovers a mid-wave supervisor. No in-memory state — pure disk reconstruction.
- [ ] G3.2 Add portability schema fields to manifest:
  - `repos[name].owner` (session UUID; default current session)
  - `repos[name].lease_expires_at` (default current_time + 24h)
  - `repos[name].lease_renewed_at` (updated each conductor turn)
  - Top-level `sessions[]` array (registry of who has touched this swarm)
- [ ] G3.3 Create reserved directories: `<eco>/swarms/<id>/signals/`, `<eco>/swarms/<id>/tokens/`. Empty in v0.20.0 — semantics deferred to Phase 17.5.
- [ ] G3.4 Each conductor turn: write `lease_renewed_at` for repos this session owns. (No enforcement yet — purely audit.)
- [ ] G3.5 Doc section in retrospective + `docs/swarm.md`: "Future: Swarm Portability (Phase 17.5)" with the three scenarios sketched (focus / join / absorb)
- [ ] G3.6 Tests: `tests/swarm-resume.test.js`, `tests/swarm-portability-schema.test.js`

Verification: D8 passes. Resume works against a swarm that was killed mid-wave.

---

## Group 4 — End-to-End Scenarios + Docs + Retrospective

**Sequential.** Runs after Group 3.

External: bash + git (for fixture management); Claude Code for manual smoke.

Commit: `docs(phase-17): swarm end-to-end scenarios + retrospective`

- [ ] G4.1 Scenario A — 3-repo linear synthetic fixture (shared-types → backend → frontend) under `tests/fixtures/swarm-ecosystems/linear-3repo/`. Implement a small feature end-to-end via `/swarm start`. Capture transcript + manifest + final changeset to `evidence/scenario-a-linear.txt`. Measure tokens.
- [ ] G4.2 Scenario B — 4-repo branched synthetic fixture (one root → two parallel → one merge) under `tests/fixtures/swarm-ecosystems/branched-4repo/`. Same flow. Capture to `evidence/scenario-b-branched.txt`. Measure tokens.
- [ ] G4.3 Scenario C — 5-repo wide fan-out under `tests/fixtures/swarm-ecosystems/wide-5repo/`. Same flow. Capture to `evidence/scenario-c-wide.txt`. Measure tokens.
- [ ] G4.4 Token-spend retrospective — confirm conductor-turn cost ≤ 5KB on 95% of turns; document outliers; verify ≤ ~$5/scenario (D10)
- [ ] G4.5 Author `docs/swarm.md` — top-level user-facing guide: three intervention modes, the eight intervention patterns (5 shipped + 3 marked "coming in v0.20.x"), portability sketch, troubleshooting, examples
- [ ] G4.6 Update `core/adapter-parity-matrix.md` — new rows for `/swarm` commands per adapter (Claude Code: shipped; Codex + Antigravity: not-applicable¹ with footnote pointing to follow-up phase)
- [ ] G4.7 Update `core/adapter-capabilities.md` — note Phase 17 v0.20.0 is Claude-Code-only; Codex + Antigravity swarm parity in subsequent phase
- [ ] G4.8 Author `retrospective.md` per Rule 12 — Verification Evidence section pointing at `evidence/scenario-*.txt`
- [ ] G4.9 `/sync-docs` propagation: status.md, README.md, phases/index.json, changelog/2026-06.md, roadmap.md (Reach shifts to Phase 18+; Phase 17.5 = Swarm Portability)
- [ ] G4.10 Full regression `npm test` ≥326 v0.19.0 baseline + new tests; zero pre-existing regressions (D12)
- [ ] G4.11 Prompt user for `/complete-phase` + merge/release approval

Verification: D9 + D10 + D12 pass. Retrospective complete.

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| `claude --bg --cwd <repo>` doesn't work as documented or has hidden limits | Medium | Test on real Claude Code in Week 1; fallback documented: foreground session spawns subagent that re-shells into target repo via tool call |
| Token budget projection (95% saving) is wrong | Low | Indexed-cost test in Group 0; if board cache doesn't deliver, revisit before committing to v0.20.0 |
| Wave ordering edge cases (cycles, missing deps in ecosystem.json) | Low | Cycle detection + fail-loudly; ecosystem.json validation in G0.7 |
| Resume after kill-9 leaves inconsistent state | Medium | Append-only writes + saga records make this idempotent; test in G3 explicitly |
| Pre-merge preview at fan-in catches conflicts but user doesn't know how to resolve | Medium | Conflict surfaced as inbox item with the exact conflict markers; user resolves before merge |
| Synthetic fixture scenarios don't surface real-world issues | Medium | Fixtures designed with realistic shapes (linear/branched/wide); real cerebrio dogfood happens post-release per user direction |
| Scope creep — intervention patterns 6/7/8 demanded mid-phase | Low | Out-of-scope list is explicit; pull-back is a discussion not a default |
