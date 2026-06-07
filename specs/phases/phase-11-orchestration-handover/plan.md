# Phase 11 — Dynamic Orchestration & Context Handover: Plan

## Execution Order

```
# Mixed: Group 0 → (Groups 1 + 2 + 3 in parallel) → Group 4 → Group 5
```

Group 0 defines the orchestration library skeleton, the typed event stream every primitive emits to, the capability-routing helper, and the cleaned-up capability flags every primitive will consume. Groups 1–3 are independent primitive implementations sharing only Group 0's helpers. Group 4 wires the tracking contract across all three primitives once they land. Group 5 is final per-adapter verification + docs.

---

## Group 0 — Foundations: orchestration library skeleton + capability cleanup (Sequential)

**Sequential.** Blocks Groups 1–4.

External deps: none. Capability research is documentation-only (read existing adapter docs + existing Phase 10 capability matrix; no new external integrations).

**Commit:** `feat(orchestration): library skeleton + capability flag unification`

### Tasks

- **Capability research — Codex parallel subagent reality + Antigravity reality.**
  - Re-read Codex's published documentation on subagents and confirm whether the `'codex-specific; not used by momentum v0.9.0'` declaration represents a true parallel surface or a sequential one.
  - Re-read Antigravity's published documentation on subagents and confirm its parallel surface shape.
  - Findings logged as `[DISCOVERY]` in `history.md` regardless of outcome.

- **ENH-023 + ENH-024 — capability flag type unification.**
  - Convert every `capabilities` value to a boolean across all three shipped adapters (`claude-code`, `codex`, `antigravity`).
  - Move "future-planned" notes to a new `roadmap` field on each adapter's metadata block (e.g., `roadmap: { skills: 'planned for adapter contract v4' }`).
  - Update `core/adapter-capabilities.md` matrix — every cell is now ✅ / ❌ / — (no more 📝 string variants in the capability table; roadmap notes get their own footnote section).
  - Update `tests/adapter-capabilities-declared.test.js` to assert uniform boolean shape across every adapter.
  - Close ENH-023 + ENH-024 in `backlog.md`.

- **`core/orchestration/index.js`** — entry point exporting `scout`, `dispatch`, `handoff`, `continueHandoff`, plus the event-stream API.

- **`core/orchestration/events.js`** — typed event emitter:
  - Event types: `started`, `step`, `subagent-started`, `subagent-finished`, `finding`, `synthesized`, `finished`, `failed`.
  - Subscriber API: `onEvent(handler)`; renderer subscribes; persister subscribes.
  - Default renderer prints `▸ <event.message>` lines to stdout (chat surface).
  - Default persister appends the same events to ecosystem session log.

- **`core/orchestration/types.js`** — structured result types:
  - `ScoutResult = { repo, prompt, summary, findings[], filesRead[], duration, runArtifactPath, sessionLogRef }`.
  - `DispatchResult = { repos[], userIntent, perRepoResults[], synthesis, failures[], duration, runArtifactPath, sessionLogRef }`.
  - `HandoffBlock = { fromRepo, toRepo, summary, decisions[], filesTouched[], verificationCommands[], openQuestions[], originatingPhase, originatingHistoryRef }`.

- **`core/orchestration/capability-routing.js`** — capability-driven router:
  - `chooseMode(adapter, primitive)` returns `{ mode: 'parallel' | 'sequential', notes[] }`.
  - Reads adapter's `capabilities.subagents` (now uniform boolean post-ENH-023).
  - Returns `notes` like `['this adapter does not declare parallel subagents — running sequentially']`. Notes surface to the user via an event on `started`.

- **`core/orchestration/session-log.js`** — shared writer used by every primitive.
  - Reuses Phase 10's `core/ecosystem/scripts/session-append.sh` lock pattern via a small Node wrapper.
  - Single line per primitive invocation: `2026-06-07 14:22:01 [scout] sapience "<prompt>" → runs/scout-042.md`.

- **`core/orchestration/run-artifact.js`** — shared run-artifact writer.
  - `writeRunArtifact(primitive, runId, payload)` → `.momentum/runs/<primitive>-NNN.md`.
  - Monotonic run-id per primitive scoped to the current repo.

- **`tests/orchestration-events.test.js`** — events emit/subscribe end-to-end; renderer/persister produce expected text.

- **`tests/orchestration-capability-routing.test.js`** — `chooseMode` returns correct shape per adapter; degraded notes present where capability is false.

### Verification

`npm test` — Group 0 tests pass; all existing 165 Phase 10 tests still green (regression check). `core/adapter-capabilities.md` matrix shows uniform boolean rows.

---

## Group 1 — Scout primitive (Parallel with Groups 2, 3)

**Parallel with Groups 2 and 3.** Depends only on Group 0.

External deps: none (sub-agent spawning is per-adapter via the existing adapter overlay).

**Commit:** `feat(orchestration): scout primitive — read-only single-repo context fetch`

### Tasks

- **`core/orchestration/scout.js`** — primitive implementation:
  - Signature: `scout({ repo, prompt, adapter, mode })` → `ScoutResult`.
  - On `mode='subagent'` (capable adapters): spawn a sub-agent in the target repo with a read-only system prompt; collect its structured return value; emit events as it progresses.
  - On `mode='in-process'` (CLI direct, no agent context): walk the repo's spec tree and history per the prompt; return a summary (read-only file operations only).
  - Always emits `started`, one or more `step` events per file read, and `finished`.
  - Writes `scout-NNN.md` run artifact via `core/orchestration/run-artifact.js`.
  - Appends one line to session log via `core/orchestration/session-log.js`.

- **Slash command `/scout` — Claude Code overlay** (`adapters/claude-code/commands/scout.md`):
  - Document: usage, the three doors (this is door 1), invariants.
  - Includes a "Natural-language inference guidance" block instructing the main agent to invoke this primitive when the user describes a single-repo read-only context-fetch task.
  - Dispatches to `core/orchestration` via the agent's tool surface (`Task` tool for Claude Code).

- **Slash command `/scout` — Codex overlay** (`adapters/codex/commands/scout.md`):
  - Same content shape as Claude Code; Codex-specific tool surface.

- **CLI verb `momentum scout <repo> "<prompt>"`** in `bin/momentum.js`:
  - Dispatches to `core/orchestration.scout()` with `mode='in-process'` by default.
  - `--via-agent` flag selects subagent mode (currently a no-op from raw CLI since there's no agent runtime; reserved for future MCP integration).
  - Streams `▸` lines to stdout.

- **Tests:**
  - `tests/orchestration-scout-unit.test.js` — `scout()` library API end-to-end with mocked adapter.
  - `tests/orchestration-scout-cli.test.js` — `momentum scout` CLI end-to-end against a fixture ecosystem; asserts session-log line + run artifact + structured output.

### Verification

All Group 1 tests pass. Manual smoke: in a fixture ecosystem, run `momentum scout <member> "<prompt>"` and confirm structured output + artifact + log line.

---

## Group 2 — Dispatch primitive (Parallel with Groups 1, 3)

**Parallel with Groups 1 and 3.** Depends only on Group 0.

External deps: none (parallel sub-agent spawning is per-adapter via existing adapter overlay).

**Commit:** `feat(orchestration): dispatch primitive — parallel multi-repo fan-out + synthesis`

### Tasks

- **`core/orchestration/dispatch.js`** — primitive implementation:
  - Signature: `dispatch({ repos, userIntent, adapter, mode })` → `DispatchResult`.
  - On `mode='parallel'` (capable adapters): fan out one sub-agent per repo with auto-tailored per-repo prompts derived from `userIntent`; wait for all; collect structured results.
  - On `mode='sequential'` (low-capability adapters): same but serially; emit a `started` event with the degraded-mode label up front ("this adapter does not declare parallel subagents — running sequentially").
  - Failure handling: any sub-agent that crashes is captured in `failures[]` with `{ repo, error, partialResult? }`; never throws; partial synthesis proceeds.

- **Synthesizer:**
  - After all sub-agents finish (or fail), the originating agent reads `perRepoResults[] + failures[]` and produces a top-level synthesis answering the `userIntent`.
  - Synthesis is generated in-band (originating agent prompt includes the results); the library DOES NOT call out to a separate model.
  - On `mode='in-process'` CLI dispatch (no agent), the synthesizer concatenates per-repo summaries with a header — no LLM synthesis available, and that's labeled to the user.

- **Slash command `/dispatch` — Claude Code overlay**:
  - Usage doc.
  - Natural-language inference block: "invoke when the user wants to align changes across multiple repos or audit a cross-cutting concern."
  - Dispatches to `core/orchestration.dispatch()`.

- **Slash command `/dispatch` — Codex overlay**: same content, Codex-specific tool surface.

- **CLI verb `momentum dispatch <repo1> <repo2> … --prompt "<text>"`** in `bin/momentum.js`:
  - Dispatches to `core/orchestration.dispatch()` with `mode='in-process'` by default.
  - `--sequential` flag forces sequential mode (testing aid; default is capability-driven).
  - Streams per-repo progress + final synthesis to stdout.

- **Run artifact format** — `dispatch-NNN.md` contains:
  - Header: prompt, repos, mode (parallel/sequential), start/end times.
  - Per-repo section per result with file list + findings.
  - Failures section (if any).
  - Synthesis section.

- **Tests:**
  - `tests/orchestration-dispatch-unit.test.js` — `dispatch()` library API with mocked adapter and seeded failures.
  - `tests/orchestration-dispatch-cli.test.js` — `momentum dispatch` CLI end-to-end against fixture ecosystem with 3 members; one member intentionally seeded to fail; assert partial synthesis + failure callout + run artifact.
  - `tests/orchestration-dispatch-sequential-label.test.js` — when mode is sequential, assert the `started` event includes the degraded-mode note text.

### Verification

All Group 2 tests pass. Manual smoke: dispatch across 3 fixture members with one seeded failure; observe synthesis-with-callout output + dispatch-NNN.md artifact.

---

## Group 3 — Handoff primitive + SessionStart auto-greet (Parallel with Groups 1, 2)

**Parallel with Groups 1 and 2.** Depends only on Group 0.

External deps: none (SessionStart hook surface is per-adapter; we use the existing one from Phase 7b/9).

**Commit:** `feat(orchestration): handoff primitive + sessionstart auto-greet`

### Tasks

- **`core/orchestration/handoff.js`** — primitive implementation:
  - `handoff({ fromRepo, toRepo, summary, decisions, filesTouched, verificationCommands, openQuestions, adapter })` → writes inbox file + returns `HandoffBlock`.
  - Auto-collects context from originating session: recent file edits, last few session log lines, active phase ID.
  - Writes `<toRepo>/.momentum/inbox/handoff-NNN.md` with sentinel-fenced sections that `continueHandoff` parses.
  - Emits `[DECISION]` entry in originating repo's active phase `history.md` via the tracking helper (Group 4 plumbs this; Group 3 calls the helper).
  - Appends line to ecosystem session log.

- **`core/orchestration/continue.js`** — receiving-side handler:
  - `continueHandoff({ repo, inboxFile? })` — reads the named inbox file (or the oldest pending if not specified); returns `HandoffBlock` for the receiving agent to act on; marks the inbox file as `read` (move to `.momentum/inbox/read/handoff-NNN.md`).
  - On agent invocation: receiving agent reads the block, narrates "▸ picking up handoff-NNN from <fromRepo>: <summary>", then proceeds.
  - Multiple pending: receiving agent lists them and asks user which to pick up (or "all").

- **`core/orchestration/scripts/sessionstart-handoff.sh`** — SessionStart hook script:
  - Detects `.momentum/inbox/handoff-*.md` files in CWD (or walked-up ecosystem member root).
  - For each pending handoff, prints a one-line banner: `▸ Pending handoff: handoff-NNN from <fromRepo> (<elapsed>): "<summary>"`.
  - Final line: `▸ Read now? [y/skip]  (or use /continue / momentum continue)`.
  - Reads single char from stdin; on `y`, exit code 10 (signals adapter to invoke `/continue`); otherwise exit 0.

- **Adapter wiring — Claude Code** (`adapters/claude-code/.claude/hooks.json` overlay or addition):
  - Add `SessionStart` entry pointing at `sessionstart-handoff.sh`.
  - Exit-code 10 handling documented as "agent should invoke /continue".

- **Adapter wiring — Codex** (`adapters/codex/.codex/hooks.json`):
  - Same as Claude Code; Codex's SessionStart surface.

- **Antigravity fallback**: Antigravity has hooks (`hooks: true` per matrix) but slash commands are chat-driven. Banner script still runs; user reads banner; types `continue` or runs CLI.

- **Slash commands** `/handoff <repo>` + `/continue` for Claude Code + Codex.

- **CLI verbs** `momentum handoff <repo> [--summary "<text>"]` + `momentum continue [--handoff <id>]` in `bin/momentum.js`.

- **Tests:**
  - `tests/orchestration-handoff-roundtrip.test.js` — write handoff in fixture-from repo, invoke `continueHandoff` in fixture-to repo, assert block parsed correctly + inbox file moved to `read/`.
  - `tests/orchestration-handoff-sessionstart.test.js` — invoke `sessionstart-handoff.sh` in fixture repo with seeded inbox; assert correct banner output + exit code on `y` / on `skip`.
  - `tests/orchestration-handoff-cli.test.js` — `momentum handoff` + `momentum continue` CLI round-trip.
  - `tests/orchestration-handoff-multiple-pending.test.js` — two pending handoffs; receiving session lists both; "all" picks both up in order.

### Verification

All Group 3 tests pass. Manual smoke: in a two-member fixture, run `momentum handoff <other>` from one, open a fresh session in the other (simulating SessionStart), confirm banner + `momentum continue` works.

---

## Group 4 — Tracking contract integration (Sequential, depends on G1+G2+G3)

**Sequential.** Depends on Groups 1, 2, 3.

External deps: none.

**Commit:** `feat(orchestration): tracking contract — meaningful-only history/backlog writes`

### Tasks

- **`core/orchestration/tracking.js`** — shared tracking helper used by every primitive:
  - `appendSessionLog(primitive, payload)` — always called; cheap layer.
  - `proposeDiscovery(primitive, findings, targetRepo)` — applies Rule 3 criteria: real bug, real tech debt, real enhancement. Returns `{ shouldWrite: boolean, suggestedEntry?: BacklogEntry }`.
  - `proposeHistoryDecision(primitive, decision, originatingRepo)` — only called by handoff today (handoff IS a decision). Returns `{ shouldWrite: boolean, suggestedEntry?: HistoryEntry }`.
  - When `shouldWrite=true`, helper writes directly using the existing append-only file APIs.
  - When `shouldWrite=false`, no curated-layer write; session log line still appended.

- **Wire scout**: emits `finding` events; tracking helper inspects each; meaningful → `[DISCOVERY]` in scouted repo's active phase history; not meaningful → session log only.

- **Wire dispatch**: per-repo findings flow through tracking helper individually; synthesis flagged as meaningful (records cross-repo state) → `[NOTE]` in originating repo's active phase history with reference to run artifact; per-repo bugs/TD/ENH findings → `[DISCOVERY]` in each respective repo.

- **Wire handoff**: ALWAYS writes `[DECISION]` to originating repo's active phase history with reference to inbox file ID. Receiving side, on pickup, writes a small `[NOTE]` to its active phase history "received handoff-NNN from <fromRepo>".

- **Tests:**
  - `tests/orchestration-tracking-scout-no-finding.test.js` — scout with empty findings → 0 history/backlog writes, 1 session log line.
  - `tests/orchestration-tracking-scout-finds-bug.test.js` — scout that finds a real bug → `[DISCOVERY]` in scouted repo's history, no entry in originating repo's history beyond the session log.
  - `tests/orchestration-tracking-dispatch-mixed.test.js` — dispatch over 3 repos: 1 real bug found in repo A, repo B clean, repo C real tech debt found. Assert: `[DISCOVERY]` in repo A history; nothing in repo B history; `[DISCOVERY]` in repo C history; `[NOTE]` in originating repo history referencing the run artifact; session log shows the dispatch and 2 discovery follow-ups.
  - `tests/orchestration-tracking-handoff-always-decision.test.js` — handoff → `[DECISION]` in originating history; on pickup, `[NOTE]` in receiving history.
  - `tests/orchestration-tracking-no-new-entry-types.test.js` — assert NO `[SCOUT]` / `[DISPATCH]` / `[HANDOFF]` markers appear in any history file across the full integration suite.

### Verification

All Group 4 tests pass. Integration smoke: full scout → dispatch → handoff sequence in a fixture ecosystem; manually inspect every member's `history.md` and ecosystem session log; confirm meaningful-only writes.

---

## Group 5 — Verification: per-adapter smoke matrix + docs + release prep (Sequential, depends on G4)

**Sequential.** Depends on Group 4.

External deps: none.

**Commit:** `test+docs: per-adapter orchestration smoke + README + ecosystem doc`

### Tasks

- **Extend `tests/helpers/adapter-smoke.js`** with three new scenarios:
  - `scoutSingle(adapter)` — invoke `/scout` (slash-capable adapters) or `momentum scout` (CLI) against a fixture member; assert structured result + session log + artifact.
  - `dispatchFanout(adapter)` — invoke `/dispatch` or `momentum dispatch` across 3 fixture members; assert synthesis + per-repo blocks + artifact; on capable adapters assert parallel mode label absent (or "parallel"), on incapable assert "sequential" label present.
  - `handoffRoundtrip(adapter)` — handoff from member A to member B, simulate SessionStart in B's repo, invoke `/continue` (slash-capable) or `momentum continue` (CLI), assert successful pickup.

- **Per-adapter test files** — extend existing `tests/adapter-smoke-{claude-code,codex,antigravity}.test.js`:
  - Each runs all three new scenarios via the appropriate door per adapter:
    - Claude Code: `/scout`, `/dispatch`, `/handoff` slash.
    - Codex: `/scout`, `/dispatch`, `/handoff` slash.
    - Antigravity: NL inference for slash door (test harness inserts the inferred call); CLI is the canonical path.
  - 9 covered combinations total (3 primitives × 3 adapters).

- **`README.md`** — add "Orchestration" section:
  - Short intro + the three primitives table (one-liner each).
  - Three end-to-end examples: scout-before-change, parallel align (dispatch), handoff-after-change.
  - "Pick your door" subsection: slash / NL / CLI with one-line each.
  - Tracking contract paragraph: what's auto, what's meaningful, no noise.
  - Capability-driven routing paragraph: "if your adapter doesn't support X, you'll see this label".

- **`core/specs-templates/specs/architecture/ecosystem.md`** — add an "Orchestration" subsection mirroring README structure for installed projects.

- **CLI `--help` for `scout`, `dispatch`, `handoff`, `continue`** in `bin/momentum.js`:
  - Each verb prints a usage block + the three doors + the tracking contract one-liner.

- **Extend `tests/readme-examples.test.js`** to verify:
  - Every `momentum scout/dispatch/handoff/continue` token in the README dispatches to a known CLI command.
  - Every `/scout`, `/dispatch`, `/handoff`, `/continue` token resolves to a real slash command in at least one adapter overlay.

- **`tests/tarball.test.js`** extension — assert all new `core/orchestration/` files, per-adapter `scout/dispatch/handoff/continue` commands, and `sessionstart-handoff.sh` are present in the published tarball.

- **`/sync-docs` checkpoint** — run before `/complete-phase`. Sync any `Affects-specs:` paths from history into the relevant specs/architecture documents (additive only; no decisional changes).

- **`/complete-phase` invocation** — produce retrospective with verification evidence captured (per Rule 12 + ENH-016).

### Verification

- `npm test` — all tests green (target: 165 + ~25–30 new = ~195).
- `npm pack --dry-run` — tarball shape check passes for all new files.
- Manual smoke matrix: 9 scenarios pass per adapter.
- `/complete-phase` produces a retrospective with verification evidence per Rule 12.
- `npm publish --access public` — only after acceptance criteria met and user approval (per CLAUDE.md project extension).
