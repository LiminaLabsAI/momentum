---
type: Task List
---

# Phase 11 — Dynamic Orchestration & Context Handover: Tasks

> Granular checklist mirroring `plan.md`. Mark `[x]` complete, `[/]` in progress, `[ ]` not started.

## Group 0 — Foundations: orchestration library skeleton + capability cleanup (Sequential)

- [x] Capability research: read Codex docs; confirm parallel subagent reality vs sequential. Log finding as `[DISCOVERY]` in history.
- [x] Capability research: read Antigravity docs; confirm parallel subagent reality. Log finding as `[DISCOVERY]` in history.
- [x] ENH-023: convert `subagents` to uniform boolean across Claude Code, Codex, Antigravity.
- [x] ENH-024: convert `skills` / `browser` / `computerUse` to uniform booleans; move "future" notes to new `roadmap` field on adapter metadata.
- [x] Update `core/adapter-capabilities.md` matrix — uniform ✅ / ❌ / — cells; roadmap notes in footnote section.
- [x] Update `tests/adapter-capabilities-declared.test.js` to assert uniform boolean shape.
- [x] Close ENH-023 + ENH-024 in `backlog.md`.
- [x] Create `core/orchestration/index.js` entry point.
- [x] Create `core/orchestration/events.js` typed emitter (started/step/subagent-started/finished/finding/synthesized/finished/failed).
- [x] Default renderer subscriber — print `▸ <message>` to stdout.
- [x] Default persister subscriber — append to ecosystem session log.
- [x] Create `core/orchestration/types.js` with `ScoutResult`, `DispatchResult`, `HandoffBlock` shapes.
- [x] Create `core/orchestration/capability-routing.js` with `chooseMode(adapter, primitive)` returning `{ mode, notes[] }`.
- [x] Create `core/orchestration/session-log.js` — Node wrapper over existing `session-append.sh` lock pattern.
- [x] Create `core/orchestration/run-artifact.js` — writes `.momentum/runs/<primitive>-NNN.md` with monotonic run-id per primitive.
- [x] Write `tests/orchestration-events.test.js` — emit/subscribe end-to-end.
- [x] Write `tests/orchestration-capability-routing.test.js` — `chooseMode` per adapter.
- [x] Regression: all 165 Phase 10 tests still green.
- [x] Commit: `feat(orchestration): library skeleton + capability flag unification`.

## Group 1 — Scout primitive (Parallel with G2, G3)

- [x] Create `core/orchestration/scout.js` with `scout({ repo, prompt, adapter, mode })` → `ScoutResult`.
- [x] Implement `mode='subagent'` — spawn sub-agent in target repo with read-only system prompt; collect structured return.
- [x] Implement `mode='in-process'` — walk repo specs + history; return summary (read-only).
- [x] Wire scout to emit `started` / `step` / `finding` / `finished` events via `core/orchestration/events.js`.
- [x] Wire scout to write `scout-NNN.md` via `core/orchestration/run-artifact.js`.
- [x] Wire scout to append session log line via `core/orchestration/session-log.js`.
- [x] Create `adapters/claude-code/commands/scout.md` — `/scout` slash command for Claude Code.
- [x] Create `adapters/codex/commands/scout.md` — `/scout` slash command for Codex.
- [x] Both slash commands include "natural-language inference guidance" block.
- [x] Add `momentum scout <repo> "<prompt>"` CLI verb in `bin/momentum.js`.
- [x] Add `--via-agent` flag (no-op for now; reserved for future MCP).
- [x] Stream `▸` lines to stdout.
- [x] Write `tests/orchestration-scout-unit.test.js` — `scout()` library API with mocked adapter.
- [x] Write `tests/orchestration-scout-cli.test.js` — CLI end-to-end against fixture ecosystem.
- [x] Commit: `feat(orchestration): scout primitive — read-only single-repo context fetch`.

## Group 2 — Dispatch primitive (Parallel with G1, G3)

- [x] Create `core/orchestration/dispatch.js` with `dispatch({ repos, userIntent, adapter, mode })` → `DispatchResult`.
- [x] Implement `mode='parallel'` — fan out one sub-agent per repo with auto-tailored prompts; wait for all.
- [x] Implement `mode='sequential'` — same serially; emit `started` event with degraded-mode label.
- [x] Implement failure handling: crashed sub-agents captured in `failures[]`; never throws; partial synthesis proceeds.
- [x] Implement synthesizer for in-agent mode (originating agent reads results + produces synthesis in-band).
- [x] Implement synthesizer for CLI mode (concatenates per-repo summaries with header; labels "no LLM synthesis available").
- [x] Create `adapters/claude-code/commands/dispatch.md`.
- [x] Create `adapters/codex/commands/dispatch.md`.
- [x] Both slash commands include NL inference block.
- [x] Add `momentum dispatch <repos…> --prompt "<text>"` CLI verb.
- [x] Add `--sequential` flag (testing aid).
- [x] Stream per-repo progress + final synthesis to stdout.
- [x] Define `dispatch-NNN.md` run artifact format (header + per-repo + failures + synthesis).
- [x] Write `tests/orchestration-dispatch-unit.test.js` — library API with mocked adapter + seeded failures.
- [x] Write `tests/orchestration-dispatch-cli.test.js` — CLI end-to-end with 3 fixture members + seeded failure; assert partial synthesis + callout + artifact.
- [x] Write `tests/orchestration-dispatch-sequential-label.test.js` — sequential mode emits degraded-mode note.
- [x] Commit: `feat(orchestration): dispatch primitive — parallel multi-repo fan-out + synthesis`.

## Group 3 — Handoff primitive + SessionStart auto-greet (Parallel with G1, G2)

- [x] Create `core/orchestration/handoff.js` with `handoff({ fromRepo, toRepo, summary, decisions, filesTouched, verificationCommands, openQuestions, adapter })`.
- [x] Auto-collect context from originating session (recent edits, last session log lines, active phase ID).
- [x] Write `<toRepo>/.momentum/inbox/handoff-NNN.md` with sentinel-fenced sections.
- [x] Emit `[DECISION]` entry call (via Group 4 tracking helper — for now stub the call).
- [x] Append session log line.
- [x] Create `core/orchestration/continue.js` with `continueHandoff({ repo, inboxFile? })` → `HandoffBlock`.
- [x] Implement inbox file move to `.momentum/inbox/read/handoff-NNN.md` after pickup.
- [x] Implement multi-pending listing + "all" selection.
- [x] Create `core/orchestration/scripts/sessionstart-handoff.sh`.
- [x] Hook detects pending inbox files in CWD or walked-up member root.
- [x] Hook prints one-line banner per pending handoff.
- [x] Hook reads single char; exit 10 on `y`, exit 0 on skip.
- [x] Wire `SessionStart` entry into `adapters/claude-code/.claude/hooks.json` (or equivalent overlay).
- [x] Wire `SessionStart` entry into `adapters/codex/.codex/hooks.json`.
- [x] Verify Antigravity prints banner via its hook surface (no slash command path on Antigravity).
- [x] Create `adapters/claude-code/commands/handoff.md` (`/handoff`).
- [x] Create `adapters/codex/commands/handoff.md`.
- [x] Create `adapters/claude-code/commands/continue.md` (`/continue`).
- [x] Create `adapters/codex/commands/continue.md`.
- [x] Add `momentum handoff <repo> [--summary "<text>"]` CLI verb.
- [x] Add `momentum continue [--handoff <id>]` CLI verb.
- [x] Write `tests/orchestration-handoff-roundtrip.test.js`.
- [x] Write `tests/orchestration-handoff-sessionstart.test.js`.
- [x] Write `tests/orchestration-handoff-cli.test.js`.
- [x] Write `tests/orchestration-handoff-multiple-pending.test.js`.
- [x] Commit: `feat(orchestration): handoff primitive + sessionstart auto-greet`.

## Group 4 — Tracking contract integration (Sequential, depends on G1+G2+G3)

- [x] Create `core/orchestration/tracking.js` with `appendSessionLog`, `proposeDiscovery`, `proposeHistoryDecision` APIs.
- [x] Implement Rule-3-aligned criteria in `proposeDiscovery` (real bug, real tech debt, real enhancement).
- [x] Implement direct-write path on `shouldWrite=true`; no-op (session log only) on `shouldWrite=false`.
- [x] Wire scout to call `proposeDiscovery` per finding; meaningful → `[DISCOVERY]` in scouted repo's active phase history.
- [x] Wire dispatch to call `proposeDiscovery` per repo per finding individually; meaningful → per-repo `[DISCOVERY]` in each repo.
- [x] Wire dispatch synthesis to `[NOTE]` in originating repo's active phase history (references run artifact).
- [x] Wire handoff to ALWAYS call `proposeHistoryDecision` → `[DECISION]` in originating active phase history.
- [x] Wire continue (receiving) to write `[NOTE]` in receiving active phase history referencing handoff ID.
- [x] Write `tests/orchestration-tracking-scout-no-finding.test.js`.
- [x] Write `tests/orchestration-tracking-scout-finds-bug.test.js`.
- [x] Write `tests/orchestration-tracking-dispatch-mixed.test.js`.
- [x] Write `tests/orchestration-tracking-handoff-always-decision.test.js`.
- [x] Write `tests/orchestration-tracking-no-new-entry-types.test.js` — assert no `[SCOUT]` / `[DISPATCH]` / `[HANDOFF]` markers anywhere.
- [x] Commit: `feat(orchestration): tracking contract — meaningful-only history/backlog writes`.

## Group 5 — Verification: per-adapter smoke matrix + docs + release prep (Sequential, depends on G4)

- [x] Extend `tests/helpers/adapter-smoke.js` with `scoutSingle(adapter)`.
- [x] Extend with `dispatchFanout(adapter)`.
- [x] Extend with `handoffRoundtrip(adapter)`.
- [x] Extend `tests/adapter-smoke-claude-code.test.js` to run all three new scenarios via `/scout`, `/dispatch`, `/handoff`.
- [x] Extend `tests/adapter-smoke-codex.test.js` to run all three via Codex slash commands.
- [x] Extend `tests/adapter-smoke-antigravity.test.js` to run all three (NL inference for slash door, CLI as canonical).
- [x] Verify 9 covered combinations green (3 primitives × 3 adapters).
- [x] Add README "Orchestration" section: primitives table; three end-to-end examples; "Pick your door"; tracking-contract paragraph; capability-routing paragraph.
- [x] Add "Orchestration" subsection to `core/specs-templates/specs/architecture/ecosystem.md`.
- [x] Add `--help` text for `momentum scout` in `bin/momentum.js`.
- [x] Add `--help` text for `momentum dispatch`.
- [x] Add `--help` text for `momentum handoff`.
- [x] Add `--help` text for `momentum continue`.
- [x] Extend `tests/readme-examples.test.js` to verify every new orchestration CLI/slash invocation in README dispatches correctly.
- [x] Extend `tests/tarball.test.js` to assert all new files present in published tarball.
- [x] Run `/sync-docs` to propagate any additive `Affects-specs:` from history into architecture docs.
- [x] Run `/complete-phase` to produce retrospective with verification evidence (Rule 12 + ENH-016).
- [x] `npm test` green — target ~195 tests (165 baseline + ~25–30 new).
- [x] `npm pack --dry-run` shape check passes.
- [x] User approval gate before merge to staging.
- [x] User approval gate before merge to main.
- [x] User approval gate before `npm publish --access public`.
- [x] Tag v0.14.0 after publish.
- [x] Commit: `test+docs: per-adapter orchestration smoke + README + ecosystem doc`.
