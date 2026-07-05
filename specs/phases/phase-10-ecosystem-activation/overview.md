---
type: Phase
status: complete
tags: [phase-10, ecosystem-activation, dual-mode, entry-exit, join, leave, doctor, init-ecosystem, auto-detect, single-project-invariant, phase-9-followup, session-log-race, location-agnostic, max-parent-walk, sibling-walk, readme-rewrite, product-positioning, decision-tree, supported-agents-matrix, adapter-smoke-matrix, capability-flag-audit, adapter-capabilities, realpath-normalization]
---

# Phase 10 — Ecosystem Activation & Polish: Overview

## Vision

Phase 9 (v0.12.0) shipped the ecosystem layer — manifest, initiatives, auto session log, `momentum ecosystem` CLI. Phase 10 takes that layer from "shipped" to "production-ready": easy to adopt, easy to transition between modes, clearly understood by users, and tested across every supported agent.

Three things this phase fixes:

1. Joining or leaving an ecosystem today requires multi-step CLI choreography executed from the ecosystem root — not from where the user actually is.
2. The README still tells the v0.4-era story (single project + Claude Code only). It does not reflect that momentum is now an agent-agnostic, two-scale framework (single project OR ecosystem) with three shipped adapters.
3. The Phase 9 ecosystem commands were exercised on Claude Code but were not systematically verified on Codex or Antigravity, despite all three adapters shipping.

Phase 10 lands ecosystem entry/exit commands runnable from anywhere, fixes Phase 9 follow-ups surfaced in review, rewrites the README around momentum's actual product story, scripts adapter coverage tests, and dogfoods the whole thing on the cerebrio constellation.

**Hard invariant — single-project usage is identical to today.** A user running `momentum init` with no flags experiences zero difference from v0.12.0. No prompts, no extra files, no ecosystem mentions anywhere. This invariant is inherited from Phase 9 and remains non-negotiable.

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Single-project usage stays trivial | `momentum init` (no flags) → identical to today | Hard invariant from Phase 9. Single-project users must not pay for ecosystem-mode complexity. |
| Entry/exit at top-level CLI | `momentum init --ecosystem`, `momentum join`, `momentum leave`, `momentum doctor` | Verbs are user actions, not operator actions. More discoverable than `momentum ecosystem add/remove/status`. The `momentum ecosystem` subcommand stays as the operator toolkit. |
| README is product positioning, not feature dump | Full rewrite around a two-scale model + supported-agents matrix + per-scale quickstarts | README has not kept pace with momentum's evolution since v0.4. A new user reading only the top should pick the right mode without scrolling. |
| Agent-agnostic is tested, not asserted | Scripted smoke tests per adapter + capability flag audit | Adapter Contract v3 declared capabilities; Phase 10 verifies them. Also lays foundation for Phase 11 orchestration. |
| Dynamic orchestration deferred to Phase 11 | New Phase 11 — Dynamic Orchestration & Context Handover (target v0.14.0); planning stub at `specs/planning/phase-11-orchestration-handover.md` | Needs Codex / Antigravity capability research first. The right shape is `scout` / `dispatch` / `handoff` primitives the main agent composes per task — not a fixed pipeline. |
| Hardening & Activation un-slotted | Moved to "Unscheduled Future Work" in roadmap | Pickable any time but no committed slot. Includes: full systematic-debugging skill, SessionStart auto-activation (Claude Code), persuasion-hardening Rules 1/3/4/5/7/9 (evidence-permitting), ENH-017. |
| cerebrio dogfood in-phase | Workstream 5 produces `cerebrio-ecosystem/` as validation artifact | Dogfooding catches usability issues while the implementation is hot. Pointer-block updates to cerebrio member repos happen via separate PRs in those repos (Rule 9 multi-repo discipline). |

## Key Deliverables

1. **Ecosystem entry/exit commands**
   - `momentum init --ecosystem <name>` — scaffold ecosystem in a sibling directory and register this repo as the first member, in one command.
   - `momentum join <ecosystem-path>` — register the current repo as a member from inside the repo. Idempotent.
   - `momentum leave` — reverse `join` (strip pointer + remove from manifest). Idempotent.
   - `momentum doctor` — report current state (Standalone / Member / Leader / Leader+Member / Broken-*) and list available transitions in plain English. Reads as teaching, not jargon.
   - `momentum init` auto-detect — when run inside a directory whose siblings contain an `ecosystem.json`, prompt once: "register as member of `<name>`?". Declining is permanent (records `.momentum/skip-ecosystem-prompt`). `--no-ecosystem` flag bypasses prompt entirely.

2. **Phase 9 follow-up fixes** (tracked as BUG-004 / ENH-021 / ENH-022)
   - **BUG-004 — session-log concurrent-commit race.** `core/ecosystem/scripts/session-append.sh` currently appends with plain `>>`; two concurrent commits in different members can interleave or lose lines. Fix: file lock via `flock` on POSIX or atomic-rename pattern. Verify two simultaneous commits produce two clean entries.
   - **ENH-021 — `momentum ecosystem add` runnable from any directory.** Today it must run from the ecosystem root. Fix: auto-walk-up to find ecosystem root, or accept `--ecosystem <path>` flag. Apply symmetrically to `remove` and `status`.
   - **ENH-022 — bounded-walk parent count = 5 is a magic number.** Fix: export `MAX_PARENT_WALK` constant from `core/ecosystem/lib/index.js`; honor `MOMENTUM_MAX_PARENT_WALK` env override; document in `core/ecosystem/layout.md`.

3. **Product positioning & onboarding clarity**
   - **README rewrite.** New structure: tagline → what momentum does → who it's for → "Which scale are you?" decision tree → supported-agents matrix → single-project quickstart → ecosystem quickstart → architecture one-pager → commands organized by purpose.
   - **`core/specs-templates/specs/architecture/ecosystem.md`** — add "When to use" decision tree at the top, mirroring the README structure for installed projects.
   - **`momentum doctor` output formatting** — teaches the user what state they are in and what commands they can run next. Output reviewed for accessibility to first-time users.

4. **Adapter coverage verification**
   - Scripted smoke tests for the full ecosystem CLI surface on each of Claude Code, Codex, Antigravity:
     `momentum init`, `momentum init --ecosystem`, `momentum join`, `momentum leave`, `momentum doctor`, `momentum ecosystem add/remove/status`, plus the `/ecosystem`, `/initiative`, `/session` slash command recipes.
   - Audit each adapter's declared capability flags (Adapter Contract v3). Document a per-adapter capability matrix in `core/ecosystem/layout.md` (or a new `core/adapter-capabilities.md`). This is the foundation Phase 11 orchestration will lean on.

5. **Dogfood: bootstrap `cerebrio-ecosystem/`**
   - Create the actual `cerebrio-ecosystem/` git repo as a sibling of the cerebrio constellation.
   - Use `momentum init --ecosystem cerebrio` then `momentum join` from each member repo: sapience, frontend, py, cli, open-guard, open-shield, bench.
   - Retroactively create initiative `0001-memory-module` capturing the 2026-06-05/06 Memory module v1 work.
   - Small issues fixed in-phase; structural issues filed to backlog. Pointer-block updates to cerebrio member repos happen via separate PRs in those repos.

## Scope

### In scope

- The five workstreams above.
- New top-level CLI commands: `init --ecosystem`, `join`, `leave`, `doctor`.
- Auto-detect prompt in `init`.
- Refactor of `bin/ecosystem.js` so pointer inject/strip is reusable from `join`/`leave` (new `core/ecosystem/lib/pointer.js`).
- New `core/ecosystem/lib/state.js` exposing `detectState(repoPath)` and `availableTransitions(state)`.
- Phase 9 follow-up fixes (BUG-004, ENH-021, ENH-022).
- README rewrite + architecture doc decision tree.
- Per-adapter smoke test matrix + capability flag audit doc.
- `cerebrio-ecosystem/` repo created and seeded with `0001-memory-module`.

### Out of scope — deferred to Phase 11

- Dynamic orchestration primitives (`scout`, `dispatch`, `handoff`).
- Context handover artifacts.
- Codex / Antigravity capability research beyond auditing existing declared flags.
- Specs-maintenance contract for orchestrated work.

### Out of scope — Unscheduled Future Work

- Full systematic-debugging skill.
- SessionStart auto-activation (Claude Code).
- Persuasion-hardening Rules 1/3/4/5/7/9.
- ENH-017 project-name preservation across upgrade.

### Explicitly NOT in scope ever

- Anything from `specs/planning/future-context-economy.md` — trigger-gated, not on shelf.
- Single-project workflow changes (hard invariant).
- Writing into member repos' `specs/` (Phase 9 invariant).
- Phase 8 (Parallel Worktree Orchestration) merge/release decision — separate workstream.
- Cursor / Gemini CLI adapter work (FEAT-007 / FEAT-008 belong to Phase 12 — Reach).

## Acceptance Criteria

- [ ] `momentum init --ecosystem <name>` in a standalone repo scaffolds the ecosystem in a sibling dir, registers this repo as a member, and is reversible via `momentum leave`.
- [ ] `momentum join <ecosystem-path>` from inside any repo idempotently registers it.
- [ ] `momentum leave` from a member repo idempotently un-registers it (strips pointer + removes manifest entry).
- [ ] `momentum doctor` accurately reports all five states (Standalone, Member, Leader, Leader+Member, Broken-*) and lists exact next-step commands.
- [ ] `momentum init` (no flags) in a non-ecosystem dir behaves identically to v0.12.0 — no prompts, no extra files.
- [ ] `momentum init` (no flags) in a dir whose sibling has `ecosystem.json` prompts once; declining proceeds standalone and records skip preference.
- [ ] BUG-004 fixed: two concurrent commits in two different member repos produce two clean entries in today's session file. Stress test runs 10 concurrent commits and produces 10 clean entries.
- [ ] ENH-021 fixed: `momentum ecosystem add ../target` works from any directory; `remove` and `status` also location-agnostic.
- [ ] ENH-022 fixed: `MAX_PARENT_WALK` is exported; `MOMENTUM_MAX_PARENT_WALK=10` raises the walk limit; documented in `layout.md`.
- [ ] README quickstart lets a new user pick single-project or ecosystem mode without scrolling past the decision tree.
- [ ] `momentum doctor` output reads as teaching — a user new to ecosystems understands their state and what to do next.
- [ ] Per-adapter smoke tests pass on Claude Code, Codex, Antigravity. Every ecosystem CLI command + the three ecosystem slash commands verified per adapter.
- [ ] Adapter capability matrix documented; every shipped adapter has explicit capability flags declared.
- [ ] `cerebrio-ecosystem/` repo created; `0001-memory-module` initiative present; momentum cleanly handles 7+ members.
- [ ] `npm test` exits 0. Test count grows 101 → ~130+ with no flakiness.
- [ ] Single-project session behavior unchanged when no ecosystem root is present (Phase 9 invariant verified via regression test).

## Verification

- `npm test` — all tests including per-adapter smoke matrix, state machine, entry/exit roundtrip, BUG-004 concurrency, ENH-021/022 fix coverage.
- `node bin/momentum.js doctor` in each of: a standalone repo, a member repo, an ecosystem root, a leader+member combo. Snapshot each output to confirm teaching quality.
- `node bin/momentum.js init --ecosystem demo` in a tmpdir → assert sibling `demo/` exists with valid manifest, this repo registered, pointer block injected.
- `node bin/momentum.js join ../demo` from a fresh standalone tmpdir → assert idempotency on second run (no duplicate manifest entry, no duplicate pointer block).
- `node bin/momentum.js leave` reverses the above; second run is a clean no-op.
- Per-adapter smoke: `tests/adapter-smoke-{claude-code,codex,antigravity}.test.js` each run a full end-to-end scenario from install to ecosystem teardown.
- BUG-004 concurrency smoke: background jobs trigger 10 parallel commits in different members; assert 10 clean entries.
- README readability check: stop at the decision tree, trace the next step, confirm it leads to a working repo.
- cerebrio-ecosystem bootstrap: completed locally; manifest validates against schema; `/track` cross-repo aggregation shows all 7+ members; `0001-memory-module` initiative renders correctly.

## Risks

| Risk | Mitigation |
|---|---|
| `momentum doctor` over-promises and reports "healthy" on a corrupted manifest or dangling pointer. | State machine includes explicit `broken-manifest`, `broken-pointer`, `broken-orphan` states with clear remediation messages. Tests cover each broken-state branch. |
| Auto-detect prompt is annoying for users who deliberately want a standalone repo near an ecosystem. | Single prompt only; declining is permanent (records `.momentum/skip-ecosystem-prompt`). `--no-ecosystem` flag bypasses entirely. |
| Per-adapter smoke tests are flaky on CI (different shells, missing tools per adapter). | Adapter-specific test setup encapsulated in `tests/helpers/adapter-env.js`. CI matrix runs each adapter in isolation. Tests are deterministic and tmpdir-scoped. |
| cerebrio-ecosystem dogfood reveals a structural issue too large for in-phase fix. | Surfaced issues immediately filed to backlog with priority. Dogfood validates the flow; structural fixes acceptable at phase tail or in Phase 11. |
| BUG-004 concurrent-commit fix degrades single-write performance. | Lock acquisition is microsecond-scale; benchmark target <1% overhead on single writes. Atomic-rename fallback if lock approach regresses. |
| README rewrite ships outdated examples. | Every code block in README extracted and exercised via `tests/readme-examples.test.js`. CI fails if any example breaks. |
| `momentum join` writes a pointer block into a CLAUDE.md that's already managed by other tooling. | Pointer block sentinel-fenced (same convention as Phase 9 `ecosystem add`); inject only if sentinel not present; refuse if file is read-only or sentinel detected from a different tool. |
| Adapter capability flag audit reveals inconsistent declarations across adapters. | This is the desired outcome — flagging the inconsistency now lets Phase 11 orchestration design around it. Inconsistencies tracked as backlog ENHs, not Phase 10 blockers. |

## Dependencies on prior phases

- **Phase 7b** — Adapter Contract v3: new commands flow through the adapter overlay; capability-flag audit reads adapter metadata.
- **Phase 9** — Ecosystem manifest + `momentum ecosystem` CLI: this phase composes new commands on top of those primitives. State machine extends Phase 9 lib helpers.
- **Phase 6** — `/review-code` and overlay pattern: per-adapter smoke tests follow the same per-overlay model.

## Roadmap context

Phase 10 replaces what was previously planned as Phase 10 (Hardening & Activation). The roadmap shifts:

| Old slot | New slot | Name | Target |
|---|---|---|---|
| Phase 10 | Phase 10 | Ecosystem Activation & Polish (this phase) | v0.13.0 |
| (unplanned) | Phase 11 | Dynamic Orchestration & Context Handover | v0.14.0 |
| Phase 10 | (unscheduled) | Hardening & Activation | TBD |
| Phase 11 | Phase 12 | Reach | v0.15.0 |
| Phase 12 | Phase 13 | Intelligence | v0.16.0 |
| Phase 13 | Phase 14 | Platform | v1.0 |

v1.0 target unchanged. Hardening & Activation's planning stub remains in `specs/planning/` for pickup when scheduled.
