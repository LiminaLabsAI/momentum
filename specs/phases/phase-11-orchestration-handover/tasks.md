# Phase 11 — Dynamic Orchestration & Context Handover: Tasks

> Granular checklist mirroring `plan.md`. Mark `[x]` complete, `[/]` in progress, `[ ]` not started.

## Group 0 — Foundations: orchestration library skeleton + capability cleanup (Sequential)

- [ ] Capability research: read Codex docs; confirm parallel subagent reality vs sequential. Log finding as `[DISCOVERY]` in history.
- [ ] Capability research: read Antigravity docs; confirm parallel subagent reality. Log finding as `[DISCOVERY]` in history.
- [ ] ENH-023: convert `subagents` to uniform boolean across Claude Code, Codex, Antigravity.
- [ ] ENH-024: convert `skills` / `browser` / `computerUse` to uniform booleans; move "future" notes to new `roadmap` field on adapter metadata.
- [ ] Update `core/adapter-capabilities.md` matrix — uniform ✅ / ❌ / — cells; roadmap notes in footnote section.
- [ ] Update `tests/adapter-capabilities-declared.test.js` to assert uniform boolean shape.
- [ ] Close ENH-023 + ENH-024 in `backlog.md`.
- [ ] Create `core/orchestration/index.js` entry point.
- [ ] Create `core/orchestration/events.js` typed emitter (started/step/subagent-started/finished/finding/synthesized/finished/failed).
- [ ] Default renderer subscriber — print `▸ <message>` to stdout.
- [ ] Default persister subscriber — append to ecosystem session log.
- [ ] Create `core/orchestration/types.js` with `ScoutResult`, `DispatchResult`, `HandoffBlock` shapes.
- [ ] Create `core/orchestration/capability-routing.js` with `chooseMode(adapter, primitive)` returning `{ mode, notes[] }`.
- [ ] Create `core/orchestration/session-log.js` — Node wrapper over existing `session-append.sh` lock pattern.
- [ ] Create `core/orchestration/run-artifact.js` — writes `.momentum/runs/<primitive>-NNN.md` with monotonic run-id per primitive.
- [ ] Write `tests/orchestration-events.test.js` — emit/subscribe end-to-end.
- [ ] Write `tests/orchestration-capability-routing.test.js` — `chooseMode` per adapter.
- [ ] Regression: all 165 Phase 10 tests still green.
- [ ] Commit: `feat(orchestration): library skeleton + capability flag unification`.

## Group 1 — Scout primitive (Parallel with G2, G3)

- [ ] Create `core/orchestration/scout.js` with `scout({ repo, prompt, adapter, mode })` → `ScoutResult`.
- [ ] Implement `mode='subagent'` — spawn sub-agent in target repo with read-only system prompt; collect structured return.
- [ ] Implement `mode='in-process'` — walk repo specs + history; return summary (read-only).
- [ ] Wire scout to emit `started` / `step` / `finding` / `finished` events via `core/orchestration/events.js`.
- [ ] Wire scout to write `scout-NNN.md` via `core/orchestration/run-artifact.js`.
- [ ] Wire scout to append session log line via `core/orchestration/session-log.js`.
- [ ] Create `adapters/claude-code/commands/scout.md` — `/scout` slash command for Claude Code.
- [ ] Create `adapters/codex/commands/scout.md` — `/scout` slash command for Codex.
- [ ] Both slash commands include "natural-language inference guidance" block.
- [ ] Add `momentum scout <repo> "<prompt>"` CLI verb in `bin/momentum.js`.
- [ ] Add `--via-agent` flag (no-op for now; reserved for future MCP).
- [ ] Stream `▸` lines to stdout.
- [ ] Write `tests/orchestration-scout-unit.test.js` — `scout()` library API with mocked adapter.
- [ ] Write `tests/orchestration-scout-cli.test.js` — CLI end-to-end against fixture ecosystem.
- [ ] Commit: `feat(orchestration): scout primitive — read-only single-repo context fetch`.

## Group 2 — Dispatch primitive (Parallel with G1, G3)

- [ ] Create `core/orchestration/dispatch.js` with `dispatch({ repos, userIntent, adapter, mode })` → `DispatchResult`.
- [ ] Implement `mode='parallel'` — fan out one sub-agent per repo with auto-tailored prompts; wait for all.
- [ ] Implement `mode='sequential'` — same serially; emit `started` event with degraded-mode label.
- [ ] Implement failure handling: crashed sub-agents captured in `failures[]`; never throws; partial synthesis proceeds.
- [ ] Implement synthesizer for in-agent mode (originating agent reads results + produces synthesis in-band).
- [ ] Implement synthesizer for CLI mode (concatenates per-repo summaries with header; labels "no LLM synthesis available").
- [ ] Create `adapters/claude-code/commands/dispatch.md`.
- [ ] Create `adapters/codex/commands/dispatch.md`.
- [ ] Both slash commands include NL inference block.
- [ ] Add `momentum dispatch <repos…> --prompt "<text>"` CLI verb.
- [ ] Add `--sequential` flag (testing aid).
- [ ] Stream per-repo progress + final synthesis to stdout.
- [ ] Define `dispatch-NNN.md` run artifact format (header + per-repo + failures + synthesis).
- [ ] Write `tests/orchestration-dispatch-unit.test.js` — library API with mocked adapter + seeded failures.
- [ ] Write `tests/orchestration-dispatch-cli.test.js` — CLI end-to-end with 3 fixture members + seeded failure; assert partial synthesis + callout + artifact.
- [ ] Write `tests/orchestration-dispatch-sequential-label.test.js` — sequential mode emits degraded-mode note.
- [ ] Commit: `feat(orchestration): dispatch primitive — parallel multi-repo fan-out + synthesis`.

## Group 3 — Handoff primitive + SessionStart auto-greet (Parallel with G1, G2)

- [ ] Create `core/orchestration/handoff.js` with `handoff({ fromRepo, toRepo, summary, decisions, filesTouched, verificationCommands, openQuestions, adapter })`.
- [ ] Auto-collect context from originating session (recent edits, last session log lines, active phase ID).
- [ ] Write `<toRepo>/.momentum/inbox/handoff-NNN.md` with sentinel-fenced sections.
- [ ] Emit `[DECISION]` entry call (via Group 4 tracking helper — for now stub the call).
- [ ] Append session log line.
- [ ] Create `core/orchestration/continue.js` with `continueHandoff({ repo, inboxFile? })` → `HandoffBlock`.
- [ ] Implement inbox file move to `.momentum/inbox/read/handoff-NNN.md` after pickup.
- [ ] Implement multi-pending listing + "all" selection.
- [ ] Create `core/orchestration/scripts/sessionstart-handoff.sh`.
- [ ] Hook detects pending inbox files in CWD or walked-up member root.
- [ ] Hook prints one-line banner per pending handoff.
- [ ] Hook reads single char; exit 10 on `y`, exit 0 on skip.
- [ ] Wire `SessionStart` entry into `adapters/claude-code/.claude/hooks.json` (or equivalent overlay).
- [ ] Wire `SessionStart` entry into `adapters/codex/.codex/hooks.json`.
- [ ] Verify Antigravity prints banner via its hook surface (no slash command path on Antigravity).
- [ ] Create `adapters/claude-code/commands/handoff.md` (`/handoff`).
- [ ] Create `adapters/codex/commands/handoff.md`.
- [ ] Create `adapters/claude-code/commands/continue.md` (`/continue`).
- [ ] Create `adapters/codex/commands/continue.md`.
- [ ] Add `momentum handoff <repo> [--summary "<text>"]` CLI verb.
- [ ] Add `momentum continue [--handoff <id>]` CLI verb.
- [ ] Write `tests/orchestration-handoff-roundtrip.test.js`.
- [ ] Write `tests/orchestration-handoff-sessionstart.test.js`.
- [ ] Write `tests/orchestration-handoff-cli.test.js`.
- [ ] Write `tests/orchestration-handoff-multiple-pending.test.js`.
- [ ] Commit: `feat(orchestration): handoff primitive + sessionstart auto-greet`.

## Group 4 — Tracking contract integration (Sequential, depends on G1+G2+G3)

- [ ] Create `core/orchestration/tracking.js` with `appendSessionLog`, `proposeDiscovery`, `proposeHistoryDecision` APIs.
- [ ] Implement Rule-3-aligned criteria in `proposeDiscovery` (real bug, real tech debt, real enhancement).
- [ ] Implement direct-write path on `shouldWrite=true`; no-op (session log only) on `shouldWrite=false`.
- [ ] Wire scout to call `proposeDiscovery` per finding; meaningful → `[DISCOVERY]` in scouted repo's active phase history.
- [ ] Wire dispatch to call `proposeDiscovery` per repo per finding individually; meaningful → per-repo `[DISCOVERY]` in each repo.
- [ ] Wire dispatch synthesis to `[NOTE]` in originating repo's active phase history (references run artifact).
- [ ] Wire handoff to ALWAYS call `proposeHistoryDecision` → `[DECISION]` in originating active phase history.
- [ ] Wire continue (receiving) to write `[NOTE]` in receiving active phase history referencing handoff ID.
- [ ] Write `tests/orchestration-tracking-scout-no-finding.test.js`.
- [ ] Write `tests/orchestration-tracking-scout-finds-bug.test.js`.
- [ ] Write `tests/orchestration-tracking-dispatch-mixed.test.js`.
- [ ] Write `tests/orchestration-tracking-handoff-always-decision.test.js`.
- [ ] Write `tests/orchestration-tracking-no-new-entry-types.test.js` — assert no `[SCOUT]` / `[DISPATCH]` / `[HANDOFF]` markers anywhere.
- [ ] Commit: `feat(orchestration): tracking contract — meaningful-only history/backlog writes`.

## Group 5 — Verification: per-adapter smoke matrix + docs + release prep (Sequential, depends on G4)

- [ ] Extend `tests/helpers/adapter-smoke.js` with `scoutSingle(adapter)`.
- [ ] Extend with `dispatchFanout(adapter)`.
- [ ] Extend with `handoffRoundtrip(adapter)`.
- [ ] Extend `tests/adapter-smoke-claude-code.test.js` to run all three new scenarios via `/scout`, `/dispatch`, `/handoff`.
- [ ] Extend `tests/adapter-smoke-codex.test.js` to run all three via Codex slash commands.
- [ ] Extend `tests/adapter-smoke-antigravity.test.js` to run all three (NL inference for slash door, CLI as canonical).
- [ ] Verify 9 covered combinations green (3 primitives × 3 adapters).
- [ ] Add README "Orchestration" section: primitives table; three end-to-end examples; "Pick your door"; tracking-contract paragraph; capability-routing paragraph.
- [ ] Add "Orchestration" subsection to `core/specs-templates/specs/architecture/ecosystem.md`.
- [ ] Add `--help` text for `momentum scout` in `bin/momentum.js`.
- [ ] Add `--help` text for `momentum dispatch`.
- [ ] Add `--help` text for `momentum handoff`.
- [ ] Add `--help` text for `momentum continue`.
- [ ] Extend `tests/readme-examples.test.js` to verify every new orchestration CLI/slash invocation in README dispatches correctly.
- [ ] Extend `tests/tarball.test.js` to assert all new files present in published tarball.
- [ ] Run `/sync-docs` to propagate any additive `Affects-specs:` from history into architecture docs.
- [ ] Run `/complete-phase` to produce retrospective with verification evidence (Rule 12 + ENH-016).
- [ ] `npm test` green — target ~195 tests (165 baseline + ~25–30 new).
- [ ] `npm pack --dry-run` shape check passes.
- [ ] User approval gate before merge to staging.
- [ ] User approval gate before merge to main.
- [ ] User approval gate before `npm publish --access public`.
- [ ] Tag v0.14.0 after publish.
- [ ] Commit: `test+docs: per-adapter orchestration smoke + README + ecosystem doc`.
