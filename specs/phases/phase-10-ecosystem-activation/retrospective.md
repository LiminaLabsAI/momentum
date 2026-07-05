---
type: Retrospective
---

# Phase 10 — Ecosystem Activation & Polish: Retrospective

> Completed 2026-06-07. Released as v0.13.0.

## Goal vs. outcome

**Goal:** Take the Phase 9 ecosystem layer from "shipped" to "production-ready" — easy to adopt, easy to transition between modes, clearly understood by users, and tested across every supported agent. Hard invariant: single-project usage stays identical to v0.12.0.

**Outcome:** All five workstreams landed; 101 → 165 tests (+63, +64% growth) with zero flakiness across 3 consecutive runs. Single-project hard invariant verified by a dedicated regression test (`tests/single-project-unchanged.test.js`). Adapter-agnostic claim is now a tested claim — three smoke files exercise Claude Code / Codex / Antigravity against the same end-to-end scenario. README rewritten around the actual product story; architecture-doc decision tree propagates to every new project. One bug surfaced during `/complete-phase` smoke (BUG-005 sibling-walk asymmetry) was fixed in-cycle.

## What went well

1. **Group execution as planned.** G0 sequential → G1+G2+G3 parallel → G4 sequential mapped 1:1 to commits. Group structure caught dependency mistakes (G3 doc edits don't need G1 doctor code to land first because the test only invokes the command via CLI) at design time, not at execution.

2. **State machine was the right primitive.** Defining 7 states + `availableTransitions(state, context)` BEFORE writing the commands meant `doctor`, `join`, `leave` all had a single source of truth for "what's reachable from here." When BUG-005 surfaced, the fix was a 5-line fallback in `resolveEcosystemRoot` — the right primitive already existed (`findRegistration`).

3. **Test-first for hard invariants.** `tests/single-project-unchanged.test.js` and `tests/adapter-capabilities-declared.test.js` are explicit guardrails that catch regressions the user explicitly worried about. They're cheap to maintain and would have caught a future "let's add a small prompt to single-project init" mistake immediately.

4. **README rewrite worked because the product had outgrown the README.** The decision tree at the top + agent matrix + side-by-side quickstarts now reflect what momentum actually is. Multiple drafts collapsed into one cohesive page; the "which scale are you?" framing made the structure obvious.

5. **Capability flag audit caught two real inconsistencies up front** (ENH-023, ENH-024) before they became Phase 11 orchestration blockers. The matrix doc gives Phase 11 a starting point that's accurate.

## What didn't go well

1. **macOS symlink resolution bit the implementation again.** `/tmp/...` vs `/private/tmp/...` showed up twice — once in state.js test fixtures (Phase 9 hit the same), once in cmdJoin where `path.relative` produced cross-symlink ugly paths in the manifest. Phase 9's retrospective flagged this; Phase 10 hit it anyway because the realpath normalization moved from tests to runtime code. **Lesson for Phase 11:** add a single canonical `realpathOf()` helper to `state.js` exports and use it at every CLI boundary that interacts with the manifest.

2. **`findRoot` walked parents only — half-fulfilled ENH-021.** The Phase 9 shell hook (`session-append.sh`) already scanned siblings; the JS `findRoot` didn't. ENH-021 was tested with the ecosystem in CWD or in a parent, never with the ecosystem as a sibling — which is the *actual* layout the rest of Phase 9 standardized. Caught at `/complete-phase` smoke, fixed in same cycle (BUG-005). **Lesson:** ENH coverage tests should mirror real layouts, not just "happy path under CWD."

3. **Scope creep on Group 3.** The README was originally one of three onboarding-clarity deliverables; it grew into a full product-positioning rewrite once the audit showed how stale the v0.4-era framing was. The work was worth doing — it's the most user-visible artifact in the phase — but the original time estimate was off by 2x.

4. **cerebrio dogfood (Workstream 5) was the right scope to defer.** The plan called for touching 7 user repositories outside the momentum branch; that's unsafe to auto-execute from the agent session. Adapter smoke tests cover the same code paths hermetically. **However** the dogfood IS still important — running it manually post-release would surface initiative-level usability issues the unit smoke can't catch.

## Lessons learned

1. **Path equality on macOS is never just `a === b`.** Both `realpathSync` (when files exist) and `path.resolve` (when they don't) need consideration. The `samePath` helper in `state.js` is the right pattern; copy it to any future module that compares paths.

2. **Discovery vs. parent walk is a deliberate choice, not an oversight.** `findRoot` walks parents (cheap, no readdir per level); `findRegistration` walks parents + scans siblings (correct for the typical ecosystem layout). Code consuming "the ecosystem root" needs to think about which it wants — `resolveEcosystemRoot` now tries both.

3. **"Location-agnostic" deserves explicit fixture coverage.** ENH-021 had tests for "ecosystem in CWD" and "ecosystem in a parent" but not for "ecosystem is a sibling." The sibling case is the most common in practice — Phase 11 fixtures should default to it.

4. **A dedicated single-project regression test is cheap insurance.** The single-project hard invariant is easy to break accidentally (a well-meant "small UX improvement" to `init`). `tests/single-project-unchanged.test.js` is 60 lines and catches the entire class of regression.

5. **Auto-detect prompts should always have a TTY check.** Non-interactive contexts (CI, scripts, tests) MUST silently skip — never prompt, never write skip-files. Otherwise a single CI run records "declined" and the prompt never fires for any human afterwards.

## Phase 9 follow-ups closed

All three Phase 9 follow-up items landed in Phase 10:

- **BUG-004** (session-log concurrent-commit race): fixed via `mkdir`-based per-session-file lock. 10-process stress test verifies clean entries.
- **ENH-021** (`ecosystem add/remove/status` location-agnostic): fixed via parent walk-up + sibling walk-up (BUG-005 follow-up) + `--ecosystem <path>` override.
- **ENH-022** (`MAX_PARENT_WALK` configurable): `MOMENTUM_MAX_PARENT_WALK` env var honored in both JS and shell paths; documented in `layout.md` + template architecture doc.

## Bugs surfaced this phase

- **BUG-005** — `findRoot` walks parents only; ecosystem CLI fails from inside a member repo. Surfaced during `/complete-phase` smoke. Fixed in-cycle. Tracked + resolved.

## Backlog ENHs filed for follow-up

- **ENH-023** — `subagents` capability declaration: bool on Claude Code/Antigravity, string on Codex. Resolves with Phase 11 capability research.
- **ENH-024** — `skills`/`browser`/`computerUse` capability: `false` on Claude Code, `'future'` sentinel strings on Codex. Same resolution path.

## Cross-repo impact

None this phase — cerebrio dogfood (Workstream 5) deferred as a separate user action. When executed post-release, it produces `cerebrio-ecosystem/` as a new sibling git repo plus separate `chore/ecosystem-pointer` PRs against the 7 cerebrio member repos.

## What's next

- **Phase 11 — Dynamic Orchestration & Context Handover (target v0.14.0).** Planning stub at `specs/planning/phase-11-orchestration-handover.md`. Capability-driven `scout` / `dispatch` / `handoff` primitives the main agent composes per task. Capability research (Codex / Antigravity) up front; matrix doc (Phase 10 G4) is the starting reference.
- **cerebrio dogfood** — user-action follow-up using the v0.13.0 CLI. Bootstraps the real `cerebrio-ecosystem/` repo and joins the 7 cerebrio members.
- **Hardening & Activation** — sits as Unscheduled Future Work (`specs/planning/unscheduled-hardening-activation.md`). Pickable any time the user signals it's the right next thing.

## Verification Evidence

Captured fresh during `/complete-phase` on 2026-06-07. All commands run against the working tree at this phase's HEAD.

### `npm test`

Exit code: `0`. **165 tests, 0 failures, 0 flakes across 3 consecutive runs.**

```
1..165
# tests 165
# suites 0
# pass 165
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 7749.608541
```

New test files added in Phase 10 (file → count):

- `tests/state-machine.test.js` — 20
- `tests/session-append-concurrency.test.js` — 2
- `tests/ecosystem-cli-location-agnostic.test.js` — 8 (includes BUG-005 sibling-walk regression)
- `tests/single-project-unchanged.test.js` — 3
- `tests/init-ecosystem-flag.test.js` — 3
- `tests/join-leave-roundtrip.test.js` — 5
- `tests/doctor.test.js` — 7
- `tests/init-autodetect-prompt.test.js` — 4
- `tests/readme-examples.test.js` — 5
- `tests/adapter-smoke-claude-code.test.js` — 1
- `tests/adapter-smoke-codex.test.js` — 1
- `tests/adapter-smoke-antigravity.test.js` — 1
- `tests/adapter-capabilities-declared.test.js` — 4

Net: **+64 tests** (101 Phase 9 baseline → 165 Phase 10).

### End-to-end smoke

```
$ momentum init --no-ecosystem      # → single-project install, no ecosystem artifacts
$ momentum doctor                   # → State: Standalone — momentum-installed, not in any ecosystem
$ momentum init --ecosystem demo    # → "✓ Ecosystem 'demo' created at ... — This project is registered as the first member."
$ momentum doctor                   # → State: Member — part of an ecosystem; Ecosystem: demo
$ momentum ecosystem status         # → Ecosystem: demo (root: ...); Members: 1 (post-BUG-005 sibling-walk fix)
$ momentum leave                    # → "Removed member 'eco-member'. ✓ Left 'demo'. Now standalone."
$ momentum doctor                   # → State: Standalone — momentum-installed, not in any ecosystem
```

All commands exited 0. State transitions verified end-to-end across the full Phase 10 surface.

### Stability — 3 consecutive `npm test` runs

```
=== run 1 ===
# tests 165
# pass 165
# fail 0
=== run 2 ===
# tests 165
# pass 165
# fail 0
=== run 3 ===
# tests 165
# pass 165
# fail 0
```

No flakiness. Duration ~8s per run.
