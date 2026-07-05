---
type: Retrospective
---

# Phase 11 — Dynamic Orchestration & Context Handover: Retrospective

> Produced at `/complete-phase` time. Captures verification evidence
> per Rule 12 + ENH-016, deviations from plan, discoveries, and the
> handoff to the next phase.

## Summary

Phase 11 shipped three orchestration primitives (`scout`, `dispatch`, `handoff`) plus a `continue` receiving-side verb that let one agent session work across ecosystem member repos while preserving momentum's tracking discipline. Three invocation doors — slash command, natural-language inference, CLI — dispatch into one shared `core/orchestration/` library so output shape is identical regardless of how the user invokes a primitive. Capability-driven routing labels every degraded mode up front. Tracking contract proven by tests: cheap layer (session log + run artifact + handoff inbox) always auto; curated layer (`history.md` / `backlog.md`) only when meaningful per Rule 3 thresholds; no new history entry types.

Released as **v0.14.0** on 2026-06-07.

## Verification Evidence

All evidence captured from this same session (Rule 12).

### Final test run

```
$ npm test
...
1..246
# tests 246
# suites 0
# pass 246
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 10539.280667
```

165 baseline (Phase 10) → 246 green (+81 new tests across G0–G5). Zero flakes across 3 consecutive `npm test` runs during the phase.

### Per-group test landings (in commit order)

| Group | Tests added | Cumulative | Commit |
|---|---|---|---|
| G0 — Foundations + ENH-023/024 | +24 | 189/189 | `7db0dbd` |
| G1 — Scout | +13 | 202/202 | `531493a` |
| G2 — Dispatch | +14 | 216/216 | `f9e7b84` |
| G3 — Handoff + SessionStart | +18 | 234/234 | `cd8452e` |
| G4 — Tracking contract | +9 | 243/243 | `15094e5` |
| G5 — Smoke matrix + docs | +3 | 246/246 | `f669b79` |

### Tarball shape

```
$ npm pack --dry-run --json
"version": "0.14.0"
"filename": "avinash-singh-io-momentum-0.14.0.tgz"
"size": 111544
```

`tests/tarball.test.js` asserts every new orchestration file is present in the tarball (library modules, hook script, CLI bin, per-adapter slash command overlays).

### Adapter smoke matrix

9 covered combinations green (3 primitives × 3 adapters):

- `adapter-smoke-claude-code.test.js` — scout / dispatch / handoff via slash overlay files + CLI floor
- `adapter-smoke-codex.test.js` — same, against Codex
- `adapter-smoke-antigravity.test.js` — CLI floor only (chat-driven UI)

## Acceptance Criteria Status

All 11 criteria from `overview.md` met. Cross-referenced against test runs:

1. **Scout works on every shipped adapter** — `orchestration-scout-*` + smoke matrix.
2. **Dispatch parallelism + labeled sequential fallback** — `orchestration-dispatch-*` covers both modes; capability-routing test confirms Codex routes sequential with roadmap note.
3. **Dispatch synthesis + per-repo + artifact** — verified in `orchestration-dispatch-unit.test.js`.
4. **Handoff round-trip** — `orchestration-handoff-roundtrip.test.js` + `-cli.test.js` confirm inbox write, `[DECISION]` in originating, pickup via `/continue` / `momentum continue`.
5. **Tracking contract proven** — `orchestration-tracking.test.js` includes "no new entry types" assertion across full integration.
6. **Per-adapter smoke matrix — 9 scenarios green** — see above.
7. **ENH-023 + ENH-024 closed** — `adapter-capabilities-declared.test.js` enforces uniform booleans; backlog.md updated; `core/adapter-capabilities.md` matrix simplified.
8. **README orchestration section** — `readme-examples.test.js` confirms all four new CLI verbs dispatch correctly.
9. **Hard invariants preserved** — 165 Phase 10 baseline tests all still green; single-project invariant and ecosystem flows unchanged.
10. **All existing 165 tests still green + new orchestration tests added** — 246 total.
11. **Tarball check** — `tarball.test.js` extended; all new files present.

## Deviations from Plan

- **No `tests/orchestration-dispatch-sequential-label.test.js` as a separate file.** The sequential-label assertion was folded into `orchestration-dispatch-cli.test.js` ("momentum dispatch --sequential surfaces the forced-sequential note") and `orchestration-dispatch-unit.test.js` ("dispatch() with forceSequential surfaces a mode note"). Net coverage equivalent; the file-name deviation is in `tasks.md` for transparency.
- **No `tests/orchestration-handoff-multiple-pending.test.js` as a separate file.** Multiple-pending behaviour is tested inside `orchestration-handoff-roundtrip.test.js` ("multiple pending handoffs are listed; pickup picks oldest by id") and `orchestration-handoff-cli.test.js`. Net coverage equivalent.
- **Group 0 capability research without live testing.** Without an active Codex / Antigravity session, the research outcome was a conservative declaration in `adapter-capabilities.md` rather than a verified-by-CI claim. Codex's `parallelSubagents: false` ships with an explicit roadmap note "promote to true once dispatch parallel mode is exercised against Codex in CI." This is the documented next step for whoever validates parallel Codex first.
- **Tracking helper is direct-write rather than two-phase propose-then-confirm.** The plan called for `tracking.proposeDiscovery` to return `{ shouldWrite, suggestedEntry? }` and let callers decide. The helper does return that shape, but for the auto-meaningful path it also writes directly — the caller doesn't have to materialise. This was the user's intent: "auto everything that's meaningful, no confirmation prompts in the happy path." Backlog writes remain user-driven (never auto).

## Discoveries (logged in phase history)

- **G0 — Codex parallel-subagent reality unverified.** Logged as `[DISCOVERY] 2026-06-07 — Capability research conclusions`. Promoting `parallelSubagents: true` for Codex requires live CI validation; documented as roadmap entry in adapter metadata.
- **G3 — three sneaky bugs in handoff inbox parsing.**
  - `extract()` regex consumed newlines via `\s*` and pulled content from the NEXT line when a value was empty. Fixed by using horizontal-whitespace class `[ \t]*`.
  - `extractSection()` lookahead failed for the LAST section before the END sentinel because `parseInbox` stripped the sentinel from `inner`. Fixed by keeping the sentinel for the lookahead to anchor against.
  - SessionStart hook `set -e` + inline `[ ] && echo` exited 1 when the count check returned false. Fixed by replacing with an `if`/`else` block.

## Backlog Items Closed This Phase

- **ENH-023** — Adapter `subagents` capability inconsistent declaration type → resolved. Uniform boolean across all three adapters; caveats moved to `roadmap` block.
- **ENH-024** — Adapter `skills` / `browser` / `computerUse` string-vs-boolean inconsistency → resolved. Uniform booleans + `roadmap` notes.

## What Worked

- **Group decomposition.** G0 → (G1 + G2 + G3) → G4 → G5 held all the way through. The three primitive groups (G1/G2/G3) were truly independent — they shared only the G0 library skeleton, so each could land complete before the next started. No mid-flight refactor.
- **Three doors, one library.** The slash command Markdown files are pure documentation of how the agent invokes the same `core/orchestration/` library that the CLI uses. Output shape is genuinely identical across doors — verified by tests on the CLI side, asserted by docstring on the slash side.
- **Aggressive non-goals from brainstorm.** Streaming dispatch, new history entry types, ADR auto-creation, multi-machine handoff — all explicitly out of scope. The phase shipped at its target size without scope creep.
- **Tracking contract as a single helper.** Wiring `scout.record()` and `dispatch.record()` to one `tracking.js` module meant the meaningful-only invariant landed in exactly one place and was provable by one test file.

## What Could Have Been Better

- **Capability research without a live agent surface.** G0 effectively shipped documentation-only research because there was no way to spawn a real Codex sub-agent from this Node-only test harness. A future-phase task: build a true cross-adapter parallel-fan-out smoke test that actually exercises Codex's sub-agent surface end-to-end.
- **Three regex bugs in G3 inbox parsing.** All three were caught immediately by tests, but they could have been caught by writing the parser test BEFORE the implementation. TDD would have surfaced these in seconds; we found them in minutes via test failures, which is fine but not ideal.

## Next Phase Recommendation

Per the v1.0 roadmap, **Phase 12 — Reach** is next: Cursor adapter (FEAT-007), Gemini CLI adapter (FEAT-008), ENH-009 distribution decision, adapter contract refinements. The orchestration CLI floor is the universal door; Cursor and Gemini will automatically inherit `momentum scout/dispatch/handoff/continue` working out of the box once their adapters declare destinations + primary instruction file. Slash command authoring for those adapters is per-adapter overlay work.

Phase 12 should also consider:
- Live Codex parallel subagent validation to flip `parallelSubagents: true`.
- Antigravity SessionStart workaround (banner via primary instruction injection) if no native hook surface lands by then.

## Sign-off

- **Branch**: `phase-11-orchestration-handover` (8 commits)
- **Version**: 0.14.0
- **Tests**: 246/246 green
- **Tarball**: shape verified
- **Released**: 2026-06-07
