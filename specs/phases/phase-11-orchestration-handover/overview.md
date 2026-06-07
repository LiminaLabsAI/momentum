# Phase 11 — Dynamic Orchestration & Context Handover: Overview

## Vision

Phase 9 (v0.12.0) introduced the ecosystem layer as a **passive observer** — it records cross-repo activity but never directs it. Phase 10 (v0.13.0) made the ecosystem easy to adopt, transition into and out of, and tested across every shipped adapter. Phase 11 takes the final step from "shipped + tested" to **active orchestration**: one agent session works across multiple member repos while preserving momentum's tracking discipline at every cross-repo boundary.

Three primitives the main agent composes per task:

- `scout <repo>` — read-only context fetch from one member repo; returns a structured summary.
- `dispatch <repo1> <repo2> …` — parallel fan-out: one sub-agent per listed repo with a scoped prompt; synthesized result.
- `handoff <repo>` — control transfer with a structured context block; the receiving agent's session reads it first.

The framework's job is to provide **primitives the main agent composes** — not to dictate a pipeline. The same user task sometimes calls for a single scout, sometimes for parallel fan-out, sometimes for a scout followed by a handoff. Capability-driven routing decides which mechanism backs each primitive on each adapter; CLI is the universal floor so every shipped and future adapter has a working path.

**Hard invariant — orchestration wraps momentum's discipline, never bypasses it.** Every scout, dispatch, and handoff lands in the ecosystem session log. Findings worth a future reader's time land in the relevant repo's `backlog.md` or `history.md` — but only when meaningful. Orchestration metadata never pollutes curated docs. This invariant is non-negotiable.

**Hard invariant — single-project and current-ecosystem usage stay identical.** A user running `momentum init` (no flags) in a non-ecosystem dir sees zero change from v0.13.0. A user running ecosystem commands without orchestration sees zero change. The orchestration primitives are additive — they appear only when invoked.

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope ceiling | All three primitives ship equally weighted in v0.14.0 | One coherent story in README; partial set leaves users guessing. User explicitly chose "all three, equally weighted" during brainstorm. |
| Invocation | Three doors over one shared library — slash command + natural-language inference + CLI; identical output shape across all three | Every user has their own workflow. Cost is mostly testing surface; the library is one. Inference is opt-in guidance baked into slash-command docstrings, not new infrastructure. |
| Visibility | Live narration (`▸` lines) printed to chat AND appended to ecosystem session log; single event stream feeds both surfaces | User explicitly emphasized "it should look like and it should be understandable, visible for the user." Auditable in the moment and after. |
| Handoff pickup | SessionStart hook auto-greet with `[y/skip]` confirm (where adapter supports it) PLUS `/continue` slash command + `momentum continue` CLI; never both fire at once, never silent context injection | Auto-mode for ease, explicit-mode for adapters without hooks, never surprise the user with context they didn't ask for. |
| Dispatch result | Synthesis + collapsible per-repo blocks + full trace artifact; synchronous (sub-agents finish, then synthesize) | Synthesis answers the question; per-repo detail earns trust; artifact is the durable record. Streaming rejected — non-reproducible and harder to test. |
| Tracking contract | Cheap layer (session log + run artifact + handoff inbox) auto every time; curated layer (`history.md` + `backlog.md`) auto only when AGENT JUDGES finding meaningful; no new entry types — reuse `[DISCOVERY]` / `[DECISION]` / `[NOTE]` | User principle: "only meaningful context, no orchestration noise." Plugs into existing Rules 3 and 8 rather than inventing parallel surfaces. |
| Adapter fallback | Graceful degradation with CLI as universal floor; degraded modes always labeled | Agent-agnostic without blocking low-capability adapters. Users see "sequential mode" up front, never silently slower. |
| Capability flag cleanup | ENH-023 (subagents type) + ENH-024 (skills/browser/computerUse type) ride this phase in Group 0 | Orchestration code consumes these flags; cleaning them at the foundation is cheaper than working around them. |

## Key Deliverables

1. **`core/orchestration/` library** — the single backend slash commands, NL inference, and CLI all dispatch to.
   - Event stream (typed `▸` emit / subscribe surface).
   - Structured result types: `ScoutResult`, `DispatchResult`, `HandoffBlock`.
   - Capability-routing helper that consults `adapter-capabilities.md` and decides parallel vs sequential.
   - Shared session-log + run-artifact writer used by every primitive.

2. **`scout` primitive — read-only context fetch.**
   - `core/orchestration/scout.js` — spawns one sub-agent (on capable adapters) or runs in-process (CLI-direct) against the target repo with a scoped read-only prompt.
   - `/scout` slash command for Claude Code + Codex.
   - `momentum scout <repo> "<prompt>"` CLI verb.
   - Per-repo `scout-NNN.md` run artifact under originating repo's `.momentum/runs/`.
   - Session log line every time; `[DISCOVERY]` in scouted repo's history ONLY when the finding meets the existing Rule 3 threshold.

3. **`dispatch` primitive — parallel multi-repo fan-out.**
   - `core/orchestration/dispatch.js` — parallel mode on capable adapters; explicit sequential fallback on `subagents=false` adapters (label up front, identical output shape).
   - Auto-tailored per-repo prompts derived from user's high-level intent.
   - Synchronous synthesis after all sub-agents complete.
   - `/dispatch` slash command + `momentum dispatch <repos…> --prompt "<text>"` CLI.
   - Failure handling: any sub-agent that crashes surfaces as a `[DISCOVERY]` in originating session log; partial synthesis with explicit "<repo> failed" callouts; user decides retry vs proceed.
   - `dispatch-NNN.md` run artifact with per-repo blocks + synthesis + failure manifest.

4. **`handoff` primitive — cross-session control transfer.**
   - `core/orchestration/handoff.js` — packages context block with: what changed, key decisions, files touched, suggested verification commands.
   - Writes `.momentum/inbox/handoff-NNN.md` in the receiving repo.
   - Emits a `[DECISION]` in the originating repo's active phase history — handoff IS a cross-repo decision.
   - `/handoff <repo>` + `momentum handoff <repo>` from originating; `/continue` + `momentum continue` from receiving.
   - **SessionStart auto-greet hook** (Claude Code + Codex): on new session, detects pending inbox files and prints a one-line banner naming each handoff + "read now? [y/skip]" confirm prompt.
   - Adapters without SessionStart hook surface (Antigravity today, Cursor/Gemini future): banner missing, `/continue` / CLI still work.

5. **Tracking contract integration.**
   - Single source-of-truth helper `core/orchestration/tracking.js` consumed by every primitive.
   - "Is this finding meaningful?" gate uses existing Rule 3 criteria (real bug, real tech debt, real enhancement, real cross-repo decision).
   - End-to-end tracking-contract tests prove: scout that finds nothing meaningful writes session log ONLY; dispatch that surfaces a bug across two repos writes `[DISCOVERY]` in those two repos only; handoff always writes inbox + originating `[DECISION]`.

6. **Capability flag type unification (ENH-023 + ENH-024).**
   - All capability declarations uniform booleans across every adapter.
   - "Future-planned" notes move from the capability flag value (a `'future'` string) to a separate `roadmap` field on the adapter's metadata block.
   - `core/adapter-capabilities.md` and `tests/adapter-capabilities-declared.test.js` updated.
   - ENH-023 and ENH-024 closed in `backlog.md`.

7. **Per-adapter smoke matrix extension.**
   - Extend `tests/helpers/adapter-smoke.js` with three new scenarios: scout-single, dispatch-fanout, handoff-roundtrip.
   - Per-adapter test files (`tests/adapter-smoke-claude-code.test.js`, `tests/adapter-smoke-codex.test.js`, `tests/adapter-smoke-antigravity.test.js`) exercise all three primitives via the appropriate door per adapter (slash where supported, CLI where not).
   - 9 covered combinations (3 primitives × 3 adapters).

8. **User-facing docs.**
   - README gains an "Orchestration" section with end-to-end examples of all three primitives (scout-before-change, parallel align, handoff-after-change).
   - `core/specs-templates/specs/architecture/ecosystem.md` gains an "Orchestration" page explaining the primitives, the three doors, the tracking contract, and the capability matrix.
   - CLI `--help` for `scout`, `dispatch`, `handoff`, `continue` shipped and tested by `tests/readme-examples.test.js` extension.

## Scope

### In scope

- The eight deliverables above.
- New `core/orchestration/` library with primitives + event stream + tracking helper.
- New slash commands: `/scout`, `/dispatch`, `/handoff`, `/continue` for Claude Code + Codex via adapter overlay.
- New CLI verbs: `momentum scout`, `momentum dispatch`, `momentum handoff`, `momentum continue`.
- SessionStart hook for handoff auto-greet on Claude Code + Codex.
- Natural-language inference guidance in slash-command docstrings (no separate NL infrastructure).
- Capability-driven routing with explicit degraded-mode labeling.
- Capability flag type unification (ENH-023, ENH-024).
- Per-adapter smoke matrix extension to 9 scenarios.
- README + ecosystem-architecture doc updates.

### Out of scope — deferred to Phase 12 (Reach)

- Cursor adapter wiring (FEAT-007). CLI floor means orchestration will work via terminal on Cursor when the adapter lands; no slash commands shipped here.
- Gemini CLI adapter wiring (FEAT-008). Same as above.
- ENH-009 distribution decision.

### Out of scope — deferred to Phase 13 / Phase 14

- Self-learning hooks; retrospective-driven rule evolution (Phase 13).
- MCP server; `/specify`; `/decide` (Phase 14).
- Bidirectional spec sync (Phase 14).

### Out of scope — explicit non-goals

- **Streaming dispatch.** Sub-agents finish, THEN synthesize. Streaming rejected — non-reproducible, harder to test.
- **New history entry types.** No `[SCOUT]` / `[DISPATCH]` / `[HANDOFF]` markers. Reuse `[DISCOVERY]` / `[DECISION]` / `[NOTE]`. Keeps history.md curated.
- **Auto-creation of ADRs from orchestration.** ADR creation is always user-driven, never primitive-driven.
- **Multi-machine handoff.** Inbox files live in `.momentum/inbox/` on the local filesystem. Cross-machine sync is out of scope.
- **Confirmation prompts in the happy path.** Tracking contract auto-writes whatever the agent judges meaningful; user can always override after the fact, but the default is non-interactive.

## Acceptance Criteria

1. **Scout works on every shipped adapter.** `/scout sapience "<prompt>"` and `momentum scout sapience "<prompt>"` produce a structured result + session log line on Claude Code, Codex, and Antigravity. Antigravity uses NL inference for slash invocation; CLI works directly.
2. **Dispatch parallelism on capable adapters; labeled sequential fallback on others.** `/dispatch sapience frontend py cli "<prompt>"` runs sub-agents in parallel on Claude Code + Codex; sequential mode banner displays on any adapter with `subagents=false`; output shape identical in both modes.
3. **Dispatch synthesis + per-repo detail + artifact.** Result includes top-level synthesis answering the user's question, collapsible per-repo blocks, and a full trace at `.momentum/runs/dispatch-NNN.md`.
4. **Handoff round-trip works.** `/handoff frontend` writes `.momentum/inbox/handoff-NNN.md` AND emits a `[DECISION]` in originating phase history. On new session in receiving repo, SessionStart hook prints "1 pending handoff — read now? [y/skip]" on Claude Code + Codex; `[y]` reads + acts; `[skip]` leaves it in inbox. `/continue` and `momentum continue` work regardless of hook firing.
5. **Tracking contract proven by tests.** Tests confirm: scout returning "current state" writes session log only; scout that surfaces a real bug writes `[DISCOVERY]` in the scouted repo; dispatch finding nothing meaningful writes session log + run artifact only; handoff always writes inbox + `[DECISION]`. No `[SCOUT]` / `[DISPATCH]` / `[HANDOFF]` entries appear anywhere.
6. **Per-adapter smoke matrix — 9 scenarios green.** Three primitives × three shipped adapters; all pass.
7. **ENH-023 and ENH-024 closed.** Capability declarations uniform booleans; `roadmap` field carries future-planned notes; `core/adapter-capabilities.md` matrix simplified; `tests/adapter-capabilities-declared.test.js` updated and passing.
8. **README orchestration section** renders all three primitives end-to-end; `tests/readme-examples.test.js` confirms every CLI/slash invocation in the new section corresponds to a real command.
9. **Hard invariants preserved.** `momentum init` (no flags) byte-identical to v0.13.0. Non-orchestrated ecosystem flows (`init --ecosystem`, `join`, `leave`, `doctor`, `ecosystem add/remove/status`) byte-identical to v0.13.0. Tests prove no regressions.
10. **All 165 existing tests still green** + new orchestration tests added (estimated +25–30 tests).
11. **Tarball check** — `npm pack --dry-run` includes all new `core/orchestration/` files, new slash commands under each adapter overlay, and the SessionStart hook scripts.

## Risks

| Risk | Mitigation |
|---|---|
| Capability research on Codex / Antigravity surfaces a deal-breaker (e.g., parallel subagents don't actually work the way the matrix claims) | Group 0 runs research as the first task. Findings logged as `[DISCOVERY]` in history; if a primitive is impossible on an adapter, that adapter goes through CLI-only path (still functional) with a labeled note. |
| Tracking-contract "meaningful or not" judgment is fuzzy | Lean on the existing Rule 3 criteria — they're already proven in practice. Tracking helper gates writes on the same gate Rule 3 uses; agents already calibrated. Tests pin the boundary cases. |
| Six groups is a lot for one phase | Groups 1/2/3 (primitives) are independent — fanout helps. Group 0 is small (foundations). Group 4 is wiring, not invention. Group 5 is verification. Scope held by aggressive non-goals (no streaming, no new entry types, no ADR auto-creation). |
| SessionStart hook diverges in behavior across Claude Code vs Codex | Single shell script `core/orchestration/scripts/sessionstart-handoff.sh` invoked by both adapters' hooks.json; hooks.json files are thin wrappers. |
| Adding a new adapter post-Phase-11 breaks orchestration | Adapter capability audit test enforces every adapter declare every relevant capability; new adapter without `subagents` declaration fails the test. Routing helper degrades to CLI floor. |
| User confusion: "which door should I use?" | README orchestration section has a "Pick your door" subsection: slash for in-session quick action; NL when you don't remember the verb; CLI from terminal or in scripts. |

## Dependencies

### Upstream

- Phase 10 (v0.13.0) — capability matrix, adapter smoke harness, ecosystem entry/exit commands, session log infrastructure. All landed.
- Phase 9 (v0.12.0) — ecosystem manifest, session log, initiative structure. All landed.

### Downstream

- Phase 12 (Reach) — Cursor + Gemini CLI adapters will inherit orchestration via CLI floor; slash command authoring is per-adapter overlay.
- Phase 13 (Intelligence) — self-learning hooks may consume orchestration events.
- Phase 14 (Platform) — MCP server may expose orchestration primitives as tool calls.

## Release

- **Target version**: v0.14.0.
- **Branch**: `phase-11-orchestration-handover`.
- **Publish step**: `npm publish --access public` after `/complete-phase` validation passes (project-specific extension in CLAUDE.md).
- **No tag until acceptance**: every criterion above must be satisfied before release.
