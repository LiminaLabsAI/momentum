---
type: Phase History
---

# Phase 11 — Dynamic Orchestration & Context Handover: Implementation History

> Append-only log. Do NOT edit existing entries.

## Entry Types

| Type | When to use |
|------|-------------|
| [DECISION] | ADR created, technology choice made |
| [SCOPE_CHANGE] | Phase deliverables added or removed |
| [DISCOVERY] | Bug, tech debt, or enhancement found |
| [FEATURE] | New planned feature |
| [ARCH_CHANGE] | Architectural pattern changed |
| [EVALUATOR] | Locked evaluator defined or evaluation set changed |
| [NOTE] | Anything else worth recording |

## Entries

### [DECISION] 2026-06-07 — Phase 11 scope locked: all three orchestration primitives ship equally weighted
Topics: phase-11, orchestration, scope, scout, dispatch, handoff
Affects-phases: phase-11-orchestration-handover
Affects-specs: specs/phases/phase-11-orchestration-handover/overview.md
Detail: User-confirmed during brainstorm: scout, dispatch, and handoff all ship in v0.14.0 with equal polish and tests. Partial set (e.g., scout-only) rejected — leaves users guessing at the larger story. Risk of going long mitigated by aggressive non-goals (no streaming dispatch, no new history entry types, no ADR auto-creation, no multi-machine handoff) and by group decomposition (G0 foundations → parallel G1/G2/G3 primitives → G4 wiring → G5 verification).

---

### [DECISION] 2026-06-07 — Three invocation doors, one shared library, identical output shape
Topics: phase-11, invocation, slash-commands, natural-language, cli, library
Affects-phases: phase-11-orchestration-handover
Affects-specs: specs/phases/phase-11-orchestration-handover/overview.md, specs/phases/phase-11-orchestration-handover/plan.md
Detail: User-confirmed: every primitive is invokable three ways — slash command, natural-language inference, CLI. The honest tradeoff: testing surface grows; we manage it by routing all three doors through one shared `core/orchestration/` library so they cannot diverge in behavior. NL inference is opt-in guidance baked into slash-command docstrings — not new infrastructure. Output shape must be identical across all three doors so users don't get surprised switching between them. User rationale: "every user has their own specific way to work."

---

### [DECISION] 2026-06-07 — Visibility model: live narration + persistent log via single event stream
Topics: phase-11, visibility, ux, narration, session-log, event-stream
Affects-phases: phase-11-orchestration-handover
Affects-specs: specs/phases/phase-11-orchestration-handover/overview.md, specs/phases/phase-11-orchestration-handover/plan.md
Detail: User explicitly emphasized: "it should look like and it should be understandable, visible for the user." Locked design: every primitive emits typed events through `core/orchestration/events.js`. Two subscribers — a renderer that prints `▸ <message>` lines to chat AND a persister that appends the same content to the ecosystem session log. Single source, two surfaces. Auditable in the moment AND after the session closes. Rejected alternatives: terse + post-hoc artifact (trust problem on long dispatches); verbose streaming with no artifact (no durable record); status bar only (black-box during execution).

---

### [DECISION] 2026-06-07 — Handoff pickup: SessionStart auto-greet PLUS explicit /continue, layered
Topics: phase-11, handoff, sessionstart, pickup, ux, auto-mode, manual-mode
Affects-phases: phase-11-orchestration-handover
Affects-specs: specs/phases/phase-11-orchestration-handover/overview.md, specs/phases/phase-11-orchestration-handover/plan.md
Detail: User initially confused about how the two mechanisms differ; after clarification confirmed both ship as complementary layers, never competing alternatives. **Auto-greet (passive notification)**: SessionStart hook detects pending `.momentum/inbox/handoff-*.md` files on new session, prints a banner naming each pending handoff, prompts `[y/skip]`. On `y`, agent invokes `/continue`. On `skip`, handoff stays in inbox. **Explicit `/continue` + `momentum continue` (active control)**: works whether or not the auto-greet fired; works on adapters without SessionStart hooks (Antigravity today, Cursor/Gemini future). **Hard constraint**: auto-greet NEVER silently reads the handoff; always a confirm prompt. Otherwise we surprise the user with context they may not want yet. One inbox file format, two ways to pick it up — never both firing at once.

---

### [DECISION] 2026-06-07 — Dispatch result shape: synthesis + collapsible per-repo + artifact; synchronous
Topics: phase-11, dispatch, synthesis, ux, result-shape, sync-mode
Affects-phases: phase-11-orchestration-handover
Affects-specs: specs/phases/phase-11-orchestration-handover/overview.md, specs/phases/phase-11-orchestration-handover/plan.md
Detail: User-confirmed: dispatch returns a top-level synthesis answering the user's actual question, followed by collapsible per-repo detail blocks, with a full trace at `.momentum/runs/dispatch-NNN.md`. Synthesis is generated by the originating agent reading structured sub-agent results — in-band, not via a separate model call. Sync mode locked: sub-agents finish, THEN synthesize. Streaming explicitly rejected — non-reproducible output order, harder to test deterministically, can feel chaotic on 7+ repos. Per-repo blocks default to collapsed; user expands them when they want detail. Full trace artifact is the durable record for later.

---

### [DECISION] 2026-06-07 — Tracking contract: cheap layer always auto, curated layer auto-if-meaningful, no new entry types
Topics: phase-11, tracking, specs-maintenance, history, backlog, session-log, meaningful-context
Affects-phases: phase-11-orchestration-handover
Affects-specs: specs/phases/phase-11-orchestration-handover/overview.md, specs/phases/phase-11-orchestration-handover/plan.md
Detail: User principle: "we do not have to overly create context, we just need to create meaningful context, context in the sense, history, log, phase, everything." Locked contract: **Cheap layer (always auto, no confirmation):** ecosystem session log line + run artifact + handoff inbox file. These are bounded, greppable, and don't bloat curated docs. **Curated layer (auto IF meaningful):** per-repo `history.md` (as `[DISCOVERY]` or `[DECISION]`) and `backlog.md` entries. Agent applies existing Rule 3 criteria — real bug, real tech debt, real enhancement, real cross-repo decision. **No new history entry types**: no `[SCOUT]` / `[DISPATCH]` / `[HANDOFF]` markers polluting history. Reuse existing `[DISCOVERY]` / `[DECISION]` / `[NOTE]`. **No confirmation prompts in happy path**: agent judges meaningfulness using same calibration as Rule 3 and writes. User can always override after the fact. Risk: agent over-judges → noise; agent under-judges → missed tracking. Mitigation: clear thresholds in slash-command docstrings; tracking-contract tests pin the boundary cases.

---

### [DECISION] 2026-06-07 — Adapter fallback: graceful degradation, CLI as universal floor, all degraded modes labeled
Topics: phase-11, adapters, capability-routing, degradation, cli-floor, fallback, antigravity, cursor, gemini
Affects-phases: phase-11-orchestration-handover
Affects-specs: specs/phases/phase-11-orchestration-handover/overview.md, specs/phases/phase-11-orchestration-handover/plan.md
Detail: User-confirmed: every adapter gets a working primitive. Slash commands where the adapter supports them (Claude Code + Codex today; Antigravity uses NL inference path via chat); CLI works on all adapters as the universal floor. Dispatch without parallel subagents runs sequentially — but the sequential mode is LABELED ("this adapter does not declare parallel subagents — running sequentially") so the user knows they're in a degraded mode, not silently slower. Capability-routing helper `core/orchestration/capability-routing.js` consults `adapter-capabilities.md` and decides. Rejected: strict capability gating (blocks Cursor/Gemini entirely from dispatch); CLI-only (loses subagent isolation, feels less native); capability-aware with hidden degradation (trust problem when dispatch takes 4× longer with no explanation).

---

### [DECISION] 2026-06-07 — ENH-023 + ENH-024 ride this phase in Group 0
Topics: phase-11, enh-023, enh-024, capability-flags, type-unification, group-0
Affects-phases: phase-11-orchestration-handover
Affects-specs: specs/backlog/backlog.md, core/adapter-capabilities.md
Detail: User-confirmed during plan presentation. The Phase 10 audit surfaced two capability-flag type inconsistencies — ENH-023 (`subagents` is bool on Claude Code/Antigravity but explanatory string on Codex) and ENH-024 (`skills`/`browser`/`computerUse` are `false` on Claude Code but `'future'` sentinel strings on Codex). Phase 11's capability-routing code consumes those flags. Resolving the type inconsistencies AT the foundation (Group 0) is cheaper than working around them in every primitive. "Future-planned" notes move to a new `roadmap` field on adapter metadata — a `false` flag plus a roadmap entry is clearer than embedding "future" in capability data. ENH-023 and ENH-024 close in `backlog.md` at the end of Group 0.

---

### [DECISION] 2026-06-07 — Defaults locked without separate questions
Topics: phase-11, defaults, scoping, failure-handling, artifacts, sync-vs-stream
Affects-phases: phase-11-orchestration-handover
Affects-specs: specs/phases/phase-11-orchestration-handover/overview.md, specs/phases/phase-11-orchestration-handover/plan.md
Detail: After locking the seven major UX decisions, several remaining open questions from the stub (`specs/planning/phase-11-orchestration-handover.md`) were resolved as reasonable defaults without separate question rounds — the user's pattern throughout brainstorm had been "do the right thing" answers. **Sub-agent prompt scoping**: agent auto-tailors per-repo prompts from user's high-level intent; sub-agent receives `{ user_intent, target_repo, target_repo_state_summary }`. **Sync vs stream**: synchronous only (subsumes the dispatch-result decision). **Failure handling**: sub-agent crashes captured in `failures[]`, never thrown; partial synthesis proceeds with explicit per-failure callouts; user decides retry vs proceed. **Artifact locations**: `.momentum/runs/scout-NNN.md`, `.momentum/runs/dispatch-NNN.md`, `.momentum/inbox/handoff-NNN.md` (NNN = monotonic per primitive). **Run-id scope**: per primitive, per repo (so `scout-001` and `dispatch-001` are independent counters).

---

### [SCOPE_CHANGE] 2026-06-07 — User confirmed single-phase scope despite size
Topics: phase-11, scope, sizing, no-split
Affects-phases: phase-11-orchestration-handover
Affects-specs: specs/phases/phase-11-orchestration-handover/overview.md
Detail: After presenting the design with six groups (G0–G5) and ~30 testable units of work, asked the user whether to consider splitting into 11a (scout + handoff) and 11b (dispatch) for a smaller v0.14.0. User declined: "we should be able to complete into its single phase". Phase ships as one unit targeting v0.14.0. Non-goals and group decomposition are the levers we hold to keep the size manageable; explicit non-goals listed in overview.md scope-out section.

---

### [NOTE] 2026-06-07 — Phase 11 supersedes planning stub
Topics: phase-11, planning-stub, brainstorm-output
Affects-phases: phase-11-orchestration-handover
Affects-specs: specs/planning/phase-11-orchestration-handover.md, specs/status.md
Detail: The planning stub at `specs/planning/phase-11-orchestration-handover.md` was the input to this brainstorm. Its open questions (handoff inbox location, receiving-agent learn mechanism, sub-agent scoping, multi-repo test fixtures, dispatch sync-vs-stream, failure reconciliation) have all been answered above. The stub remains in place as a historical record of how the phase was scoped pre-brainstorm but is no longer the source-of-truth — that's now overview.md + plan.md. status.md updated to reflect Phase 11 = Planned (was: Planning pending).

---

### [DISCOVERY] 2026-06-07 — Capability research conclusions (Codex + Antigravity)
Topics: phase-11, group-0, capability-research, codex, antigravity, parallel-subagents
Affects-phases: phase-11-orchestration-handover
Affects-specs: core/adapter-capabilities.md
Detail: G0 capability-research outcome — without live testing against the latest Codex parallel subagent surface, the conservative declaration is `subagents: true, parallelSubagents: false` for Codex with a roadmap note "promote to true once dispatch parallel mode is exercised against Codex in CI." Antigravity's previously-declared `subagents: true` + the new `parallelSubagents: true` is taken at face value. Antigravity has no SessionStart hook surface today, so `sessionStartHook: false` lands with a roadmap note that handoff auto-greet ships via primary-instruction text for Antigravity. The router consults these uniform booleans and labels degraded modes up front.

---

### [FEATURE] 2026-06-07 — Group 0 landed: orchestration library skeleton + ENH-023/024
Topics: phase-11, group-0, library-skeleton, capability-flag-unification, enh-023, enh-024
Affects-phases: phase-11-orchestration-handover
Affects-specs: core/orchestration/index.js, core/orchestration/events.js, core/orchestration/types.js, core/orchestration/capability-routing.js, core/orchestration/session-log.js, core/orchestration/run-artifact.js, adapters/claude-code/adapter.js, adapters/codex/adapter.js, adapters/antigravity/adapter.js, core/adapter-capabilities.md, specs/backlog/backlog.md, tests/orchestration-events.test.js, tests/orchestration-capability-routing.test.js, tests/adapter-capabilities-declared.test.js
Detail: G0 landed. ENH-023 + ENH-024 closed: every capability declaration is now a uniform boolean across all three adapters; forward-looking notes moved to per-adapter `roadmap` blocks. New capability `parallelSubagents` distinguishes "has any subagent surface" from "can fan out in parallel"; new `sessionStartHook` flag drives the handoff auto-greet routing. `core/orchestration/` library skeleton lives at `index.js` (lazy primitive exports) + `events.js` (typed emitter with default renderer and persister subscribers) + `types.js` (runtime validators for ScoutResult / DispatchResult / HandoffBlock / Finding / PerRepoResult) + `capability-routing.js` (chooseMode returns `{ mode, notes[] }` with roadmap text in the user-visible note) + `session-log.js` (Node wrapper over the BUG-004 mkdir-lock pattern) + `run-artifact.js` (monotonic per-primitive run ids). 165 → 189 tests green (+24).

---

### [FEATURE] 2026-06-07 — Group 1 landed: scout primitive
Topics: phase-11, group-1, scout, slash-command, cli, in-process, record-api
Affects-phases: phase-11-orchestration-handover
Affects-specs: core/orchestration/scout.js, adapters/claude-code/commands/scout.md, adapters/codex/commands/scout.md, bin/orchestration-commands.js, bin/momentum.js, tests/orchestration-scout-unit.test.js, tests/orchestration-scout-cli.test.js
Detail: G1 landed. `core/orchestration/scout.js` ships in-process file-walking scout (default-scan files + dirs, keyword tokenization with stopword filtering, snippet extraction) plus `record()` API for agent-driven scouts. Cheap-layer writes: scout-NNN.md run artifact in ORIGINATING repo and one ecosystem session log line. Slash commands `/scout` for Claude Code + Codex with natural-language inference guidance baked in. CLI verb `momentum scout <repo> "<prompt>"` resolves repo by member-id (manifest) or path. Tests cover walk, artifact, monotonic ids, session log, no-match summary, record API, tokenization, snippet extraction. 189 → 202 tests green (+13).

---

### [FEATURE] 2026-06-07 — Group 2 landed: dispatch primitive
Topics: phase-11, group-2, dispatch, parallel, sequential, synthesis, failure-handling
Affects-phases: phase-11-orchestration-handover
Affects-specs: core/orchestration/dispatch.js, adapters/claude-code/commands/dispatch.md, adapters/codex/commands/dispatch.md, bin/orchestration-commands.js, bin/momentum.js, tests/orchestration-dispatch-unit.test.js, tests/orchestration-dispatch-cli.test.js
Detail: G2 landed. Parallel and sequential modes chosen by capability-routing (override via `forceSequential` / `--sequential` for testing). Sub-agents run via Promise.all in parallel, serially in sequential. Sub-agent failures captured in failures[] without throwing — partial synthesis proceeds with explicit per-failure callouts. Synthesis is in-process (concatenation) for CLI, agent-driven in slash mode (record() API). Run artifact format: user intent, mode + notes, per-repo blocks with prompt/duration/files/findings/summary, failure manifest, top-level synthesis. parseFlags extended to support both value flags and bool flags. 202 → 216 tests green (+14).

---

### [FEATURE] 2026-06-07 — Group 3 landed: handoff primitive + SessionStart hook
Topics: phase-11, group-3, handoff, continue, sessionstart-hook, inbox, decision-entry
Affects-phases: phase-11-orchestration-handover
Affects-specs: core/orchestration/handoff.js, core/orchestration/continue.js, core/scripts/sessionstart-handoff.sh, adapters/claude-code/settings.json, adapters/codex/hooks.json, adapters/claude-code/commands/handoff.md, adapters/claude-code/commands/continue.md, adapters/codex/commands/handoff.md, adapters/codex/commands/continue.md, tests/orchestration-handoff-roundtrip.test.js, tests/orchestration-handoff-sessionstart.test.js, tests/orchestration-handoff-cli.test.js
Detail: G3 landed. `core/orchestration/handoff.js` writes sentinel-fenced inbox files at `<toRepo>/.momentum/inbox/handoff-NNN.md` with structured sections (summary / decisions / files touched / verification commands / open questions). Handoff IS a cross-repo decision, so it auto-emits a `[DECISION]` in the originating active phase history. `core/orchestration/continue.js` parses the inbox, moves the file to `.momentum/inbox/read/`, and appends a `[NOTE]` in the receiving phase history. `core/scripts/sessionstart-handoff.sh` prints a one-line banner per pending handoff and prompts `[y/skip]` with a 5s timeout — exit 10 on `y` signals adapters to invoke `/continue`. Wired into Claude Code `.claude/settings.json` and Codex `.codex/hooks.json` SessionStart hook surfaces. Slash commands `/handoff` + `/continue` + CLI verbs `momentum handoff` + `momentum continue` round out the three doors. Three sneaky bug fixes uncovered during testing: extract() regex consumed newlines via `\s*`, extractSection lookahead failed for the LAST section before END sentinel, and bash `set -e` killed the script on `[ ] && echo` with count=1. 216 → 234 tests green (+18).

---

### [FEATURE] 2026-06-07 — Group 4 landed: tracking contract integration
Topics: phase-11, group-4, tracking, meaningful-only, rule-3, history-entries
Affects-phases: phase-11-orchestration-handover
Affects-specs: core/orchestration/tracking.js, core/orchestration/scout.js, core/orchestration/dispatch.js, tests/orchestration-tracking.test.js
Detail: G4 landed. `core/orchestration/tracking.js` is the meaningful-only gate. `proposeDiscovery` applies Rule 3 criteria (real bug, real tech debt, real enhancement) — anything else returns `shouldWrite: false` with a reason. `proposeHistoryNote` writes `[NOTE]` for dispatch syntheses. `isMeaningfulFinding` is exposed as a pure predicate. Wired into `scout.record()` (per-finding [DISCOVERY] in scouted repo) and `dispatch.record()` (per-repo [DISCOVERY] + originating [NOTE]). Tests assert the boundary: no Rule-3 metadata → no curated-layer write; meaningful → write; full integration scout + dispatch + handoff produces NO `[SCOUT]` / `[DISPATCH]` / `[HANDOFF]` entries anywhere. 234 → 243 tests green (+9).

---

### [FEATURE] 2026-06-07 — Group 5 landed: per-adapter smoke matrix + README + release prep
Topics: phase-11, group-5, smoke-matrix, readme, ecosystem-doc, tarball, version-bump
Affects-phases: phase-11-orchestration-handover
Affects-specs: tests/helpers/adapter-smoke.js, tests/adapter-smoke-claude-code.test.js, tests/adapter-smoke-codex.test.js, tests/adapter-smoke-antigravity.test.js, tests/tarball.test.js, tests/readme-examples.test.js, README.md, core/specs-templates/specs/architecture/ecosystem.md, package.json
Detail: G5 landed. `runOrchestrationSmoke(agent, env)` exercises all three primitives end-to-end via the CLI floor on a 3-member fixture ecosystem; asserts each adapter's slash-command overlay files exist (Claude Code + Codex) and skips that assertion for Antigravity (chat-driven UI). Per-adapter tests wire the new smoke at 3 × 1 = 3 new tests (9 covered orchestration combinations across the matrix). Tarball test extended with all new `core/orchestration/` files, hook script, CLI bin, and per-adapter slash command overlays. README rewritten with an "Orchestration (ecosystem mode)" section: three-primitive table, end-to-end CLI examples, "pick your door" subsection, capability-routing matrix, tracking contract paragraph; CLI reference section extended with all four new verbs. Architecture template doc `core/specs-templates/specs/architecture/ecosystem.md` gains an "Orchestration (Phase 11, v0.14.0+)" subsection with the primitives table, three-doors block, tracking contract paragraph, and capability-routing note — this ships into every momentum-installed project from v0.14.0 onward. readme-examples test extended to accept the four new orchestration verbs. Package version bumped to 0.14.0. 243 → 246 tests green (+3 smoke).

---

### [NOTE] 2026-06-07 — All phase 11 acceptance criteria met
Topics: phase-11, completion, acceptance, all-tests-green, ready-for-complete-phase
Affects-phases: phase-11-orchestration-handover
Affects-specs: specs/phases/phase-11-orchestration-handover/overview.md
Detail: All 11 acceptance criteria from overview.md verified by test runs: scout works on every shipped adapter via CLI floor + slash overlays on Claude/Codex; dispatch parallelism on Claude Code (no label), labeled sequential on Codex; dispatch synthesis + per-repo + artifact present; handoff round-trip writes inbox + [DECISION] + can be picked up via /continue or `momentum continue`; tracking contract proven by tests (no [SCOUT]/[DISPATCH]/[HANDOFF] markers); per-adapter smoke matrix green on all 3 adapters (3 × 3 = 9 combinations); ENH-023 + ENH-024 closed; README orchestration section + ecosystem.md template updated; hard invariants preserved (Phase 10 tests all still green); 165 → 246 tests (+81); tarball check confirms new files present. Pending: `/sync-docs`, `/complete-phase`, merge approvals, release tag, npm publish.
