# Phase 16 — Implementation Plan

# Sequential:  Group 0 → (Groups 1 + 2 in parallel) → Group 3 → Group 4 → Group 5

External dependencies:

- A working `codex` CLI installation for the live dogfood pass (Group 4).
- A working `agy` CLI installation for the live dogfood pass (Group 4).
- Both already used informally; no new deps for momentum itself.

If either CLI is unavailable at G4 time, that group's evidence becomes a follow-up `[VALIDATION]` backlog item — Groups 0/1/2/3/5 still ship as v0.19.0.

---

## Group 0 — Contracts & Matrices

**Sequential.** Blocks Groups 1 and 2.

External: none.

Commit: `feat(adapter-contract): extend destinations + introduce parity matrix`

- [ ] G0.1 Extend `destinations` block on every `adapters/*/adapter.js` — add `agents` and `skills` keys to all three. Document the new keys in `core/adapter-capabilities.md`.
- [ ] G0.2 Refresh `core/adapter-capabilities.md` against current vendor docs. Mark stale roadmap footnotes (ENH-023/24 for Codex parallel/skills) as candidates for closure pending G5 evidence.
- [ ] G0.3 Create `core/adapter-parity-matrix.md` as the new source of truth for feature × adapter shipping status. Columns: Claude Code | Codex | Antigravity. Rows: every command in `core/commands/` + every hook event we wire + every primitive + every overlay subdir. Each cell: `shipped` / `shipped-degraded` / `not-applicable` with footnote.
- [ ] G0.4 Stub `tests/adapter-parity-matrix.test.js` parsing the matrix doc and asserting every (feature, adapter) cell has a declared status (no silent gaps).
- [ ] G0.5 Add `tests/_helpers.js` helper `fakeToolEvent(adapter, eventName, payload)` for use in Group 3.
- [ ] G0.6 Update `tests/adapter-capabilities-declared.test.js` to assert the new `destinations.agents` + `destinations.skills` keys are present on every adapter.

Verification: `node --test tests/adapter-parity-matrix.test.js tests/adapter-capabilities-declared.test.js` passes.

---

## Group 1 — Codex Hardening

**Parallel with Group 2.**

External: none (depends only on Group 0 contracts).

Commit: `feat(codex): full hook surface + subagents + review-code parity`

- [ ] G1.1 Add `PreToolUse` block to `adapters/codex/hooks.json` matching the Claude Code matcher (`Write|Edit|MultiEdit`) + `bash scripts/brainstorm-gate.sh` command.
- [ ] G1.2 Author `adapters/codex/agents/momentum-reviewer-security.toml` with required fields `name`, `description`, `developer_instructions` per Codex subagent spec.
- [ ] G1.3 Author `adapters/codex/agents/momentum-reviewer-qa.toml` (same shape, QA-focused instructions).
- [ ] G1.4 Author `adapters/codex/agents/momentum-reviewer-architecture.toml` (same shape, architecture-focused instructions).
- [ ] G1.5 Add `runInstall` / `runUpgrade` paths in `adapters/codex/adapter.js` to copy the `agents/` overlay into `.codex/agents/`, idempotently.
- [ ] G1.6 Author `adapters/codex/commands/review-code.md` as the Codex-flavored `/review-code` recipe. Invokes the three TOML subagents in parallel when `parallelSubagents=true`; sequential fallback otherwise.
- [ ] G1.7 Update `adapters/codex/instructions/AGENTS.md` "Codex Hooks" section: document the full hook surface (PreToolUse for brainstorm-gate, PostToolUse for history reminder, SessionStart for handoff/ecosystem banner).
- [ ] G1.8 Extend `tests/adapter-smoke-codex.test.js` to assert `.codex/agents/*.toml` installs and the `/review-code` overlay copies.
- [ ] G1.9 Write `tests/adapter-subagents-codex.test.js` — install codex adapter into a tmp dir; assert all three reviewer TOMLs exist and parse as valid TOML with required fields populated.

Verification: `node --test tests/adapter-smoke-codex.test.js tests/adapter-subagents-codex.test.js` passes.

---

## Group 2 — Antigravity Realignment

**Parallel with Group 1.**

External: none (depends only on Group 0 contracts).

Commit: `feat(antigravity): .agents/ realignment + hooks.json + skills/subagents overlay`

- [ ] G2.1 In `adapters/antigravity/adapter.js`, rewire `destinations.commands` from `['.antigravity','commands']` to `['.agents','commands']`. Add `destinations.skills` → `['.agents','skills']` and `destinations.agents` → `['.agents','agents']`.
- [ ] G2.2 Author `adapters/antigravity/hooks.json` wiring `check-history-reminder.sh` as PostToolUse. Add SessionStart entry if vendor docs confirm support (record finding in history; ship anyway behind a documented degraded-mode if `agy` ignores it).
- [ ] G2.3 Add `configFiles` entry for `hooks.json` → `.agents/hooks.json` and wire `runInstall` / `runUpgrade` to install + idempotently upgrade it (mirror the Codex pattern).
- [ ] G2.4 Author `adapters/antigravity/agents/momentum-reviewer-*.{toml|md}` mirrors of the Codex set. Format decision: use TOML if `agy` accepts it; otherwise the documented Antigravity equivalent. Decision logged to history.
- [ ] G2.5 Author `adapters/antigravity/skills/momentum-orient/SKILL.md` as the first shipped skill — codifies "always read `specs/status.md` first." Frontmatter per documented `SKILL.md` convention.
- [ ] G2.6 Rewrite `adapters/antigravity/instructions/AGENTS.md`: drop all `.antigravity/` references; describe `.agents/` layout; surface the orient skill + reviewer agents; document the hook events we wire.
- [ ] G2.7 Update `tests/adapter-smoke-antigravity.test.js`: assert install lands at `.agents/...`, assert `hooks.json` is wired, assert no `.antigravity/` paths exist after install.
- [ ] G2.8 Write `tests/adapter-subagents-antigravity.test.js` — install antigravity adapter; assert skills + agents overlay files exist with correct frontmatter shape.

Verification: `node --test tests/adapter-smoke-antigravity.test.js tests/adapter-subagents-antigravity.test.js` passes.

---

## Group 3 — Hook Execution Smoke Harness

**Sequential** (after Groups 1 + 2 land).

External: `bash` (already required).

Commit: `test(adapters): prove hooks actually fire, not just install`

- [ ] G3.1 Write `tests/adapter-hook-execution-codex.test.js` — install Codex adapter into a tmp project; exec `bash` against the `hooks.json` PreToolUse matcher with a fake `Write` payload; assert `brainstorm-gate.sh` exits 2 (blocking) when the sentinel `.momentum/brainstorm-active` exists in the target project and `specs/` is the write path.
- [ ] G3.2 Write `tests/adapter-hook-execution-antigravity.test.js` — same shape; assert `check-history-reminder.sh` fires PostToolUse via the wired `hooks.json` entry and emits the reminder text expected by Rule 8.
- [ ] G3.3 Extend the Claude-Code execution test to the same level of rigor as the new Codex one (current test only verifies install; closes the test-coverage symmetry gap surfaced during this phase).
- [ ] G3.4 Run `npm test`; capture pass count; confirm zero regressions vs v0.18.0 baseline (288 tests).

Verification: all three new/extended tests pass; full suite green.

---

## Group 4 — Live Dogfood + Evidence Capture

**Sequential** (after Group 3 lands).

External: `codex` CLI and `agy` CLI both installed on the dev machine.

Commit: `docs(phase-16): live dogfood evidence captured`

- [ ] G4.1 On a scratch project at `/tmp/momentum-codex-smoke`, run `momentum init --agent codex`, exercise `/brainstorm-phase` (verify gate blocks unauthorized writes), `/start-phase`, `/sync-docs`, `/complete-phase`. Capture terminal output to `specs/phases/phase-16-adapter-parity/evidence/codex-dogfood.txt`.
- [ ] G4.2 Same flow on `/tmp/momentum-antigravity-smoke` with `agy`. Capture to `evidence/agy-dogfood.txt`.
- [ ] G4.3 Specifically exercise a 3-target `momentum dispatch` on Codex to confirm parallel fan-out works end-to-end. Capture to `evidence/codex-parallel-dispatch.txt`. This evidence gates the G5.1 capability flip.
- [ ] G4.4 For any gap surfaced during dogfood, append a `[DISCOVERY]` entry to `history.md` and decide inline: fix in-phase (small) or file a backlog item (larger).

Verification: three evidence files exist; any discoveries logged.

If either CLI is unavailable on the dev machine, file a `[VALIDATION]` backlog item and proceed to Group 5 with G4 partially complete — evidence becomes a post-release follow-up.

---

## Group 5 — Capability Flips, Matrix Close-Out, Verification

**Sequential** (after Group 4).

External: none.

Commit: `chore(adapters): close capability matrix gaps for v0.19.0`

- [ ] G5.1 If G4.3 evidence proves parallel fan-out works, flip `adapters/codex/adapter.js` `parallelSubagents: true`; drop the matching `roadmap.parallelSubagents` entry; update parity matrix + capability matrix.
- [ ] G5.2 If G4 confirms Codex skills surface works in practice, flip `skills: true`; drop the matching `roadmap.skills` entry; update both matrices.
- [ ] G5.3 Re-run `tests/adapter-capabilities-declared.test.js` and `tests/adapter-parity-matrix.test.js` with the post-flip values; both must pass.
- [ ] G5.4 Full regression: `npm test`. Expect ≥288 + new tests passing; zero pre-existing regressions.
- [ ] G5.5 Author `retrospective.md` with "Verification Evidence" section populated from Group 4 capture files (per Rule 12).
- [ ] G5.6 Run `/sync-docs` (will pick up `Affects-specs:` paths from history entries — primarily `core/adapter-capabilities.md`, `core/adapter-parity-matrix.md`, both adapter `adapter.js` files, `specs/planning/roadmap.md`, `specs/status.md`).
- [ ] G5.7 Prompt user for `/complete-phase`.

Verification: full suite green; retrospective complete; docs synced.
