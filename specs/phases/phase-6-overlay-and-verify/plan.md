# Phase 6 — Adapter Overlay & Verification: Implementation Plan

```
Sequential:  Group 0 → (Groups 1 + 2 + 3 in parallel) → Group 4 → Group 5
```

## Group 0 — Adapter Contract v2 (foundation)

**Sequential.** Blocks Groups 1, 2, 3.
**External dependencies:** none.
**Commit:** `feat(cli): adapter overlay — additive per-agent commands/rules/scripts`

Tasks:
- **0a** — Update `bin/momentum.js install` to walk `adapters/<chosen>/agent-rules/`, `adapters/<chosen>/commands/`, `adapters/<chosen>/scripts/` after the corresponding `core/` copies, and overlay onto target
- **0b** — Add conflict detection: if any filename appears in both `core/<dir>/` and `adapters/<chosen>/<dir>/`, exit non-zero **before any writes** with `Error: duplicate <type> "<name>" in core/ and adapters/<agent>/ — choose one location`
- **0c** — Update `bin/momentum.js upgrade` to apply the same overlay walk; per-file marker-based upgrade rules unchanged
- **0d** — Update `adapters/claude-code/adapter.js` and `adapter.sh` headers to document the overlay convention (no behavior change here — convention docs only)
- **0e** — Update root `README.md` adapter-author section: "place agent-specific commands/rules/scripts in `adapters/<agent>/<dir>/`; place generic ones in `core/<dir>/`; the same filename in both is an error"

## Group 1 — Verification Rigor in core/

**Parallel with Groups 2 and 3.**
**External dependencies:** Group 0 contract decisions (overlay model).
**Commit:** `feat(rules): add Rule 12 verify-before-claim; /complete-phase evidence rigor; cross-repo Rule 9`

Tasks:
- **1a** — Add Rule 12 "Verify before claim" to `core/specs-templates/CLAUDE.md` (full version with Red Flags table + ≥3 anti-rationalization counters, structured like Rules 10/11)
- **1b** — Add Rule 12 (condensed) to `core/agent-rules/project.md`
- **1c** — Update `core/commands/complete-phase.md`:
  - Step 3 (validation): require commands to be run; capture stdout/stderr to a temp file
  - New step between retrospective creation and tracking updates: "Append Verification Evidence section to `retrospective.md` with command, exit code, and last 50 lines of output"
  - Refuse to advance to Release section if no validation evidence was captured
- **1d** — ENH-014 cross-repo safeguard: update `core/agent-rules/project.md` Rule 9 with conditional "if multi-repo project: NEVER modify docs in another repo; log as `Affects-specs: ../other-repo/...` and flag to user"
- **1e** — Update `core/commands/sync-docs.md`: detect `Affects-specs: ../` prefixes during processing; flag to user instead of editing cross-repo docs
- **1f** — Update `core/specs-templates/CLAUDE.md` Rule 9 with the same cross-repo safeguard

## Group 2 — Claude Code Overlay: /review-code

**Parallel with Groups 1 and 3.**
**External dependencies:** Group 0 contract; Claude Code Task/Agent tool.
**Commit:** `feat(adapter/claude-code): /review-code with role-based subagent reviews`

Tasks:
- **2a** — Create `adapters/claude-code/commands/review-code.md` — single command that:
  - Detects scope: branch diff vs `main` (default), or staged changes
  - Spawns subagents in parallel via the Task tool, one per role: security (OWASP/STRIDE), QA (test coverage, edge cases), architecture (rule compliance, pattern consistency)
  - Each subagent returns a structured report: critical / important / minor findings
  - Main agent consolidates, presents to user, asks which to act on
  - Honors momentum's rules during review (Rule 12 evidence requirement, Rule 6 git lifecycle, etc.)
- **2b** — Document in command header: "This command is Claude-Code-specific (uses Task tool for subagents). Equivalent for other agents lives in their respective `adapters/<agent>/commands/`."

## Group 3 — Tests for momentum CLI

**Parallel with Groups 1 and 2.**
**External dependencies:** Node `node:test` (built-in, no new deps).
**Commit:** `infra: add tests/ directory with install/upgrade/marker/overlay/conflict coverage`

Tasks:
- **3a** — Create `tests/` at repo root; wire `node --test tests/*.test.js` runner
- **3b** — `tests/install.test.js`: fresh install, skip-if-exists, full-scaffold check, adapter validation, `--agent` flag handling
- **3c** — `tests/upgrade.test.js`: marker-preserved (extensions byte-equal), no-op identical (reports unchanged), pre-marker migration with `.bak`, content-changed update
- **3d** — `tests/marker.test.js`: `partitionByMarker` lossless round-trip; `upgradeMarkedFile` covering all four states (added / updated / unchanged / migrated)
- **3e** — `tests/overlay.test.js`: adapter overlay copies files into target; conflict detection exits non-zero before writes; verifies no partial install on conflict
- **3f** — Add `npm test` script to `package.json`; ensure tests run cleanly with `npm test` and `node --test tests/`

## Group 4 — Wiring + Dogfood

**Sequential.** Runs after Groups 0/1/2/3.
**External dependencies:** working `bin/momentum.js`; populated `core/` and `adapters/`.
**Commit:** `chore: dogfood — momentum upgrade on self; fix any uncovered bugs`

Tasks:
- **4a** — Run `node bin/momentum.js upgrade` on this repo; verify Rule 12 added to CLAUDE.md and project.md, `/review-code` available under `.claude/commands/`, `## Project Extensions` preserved byte-for-byte
- **4b** — Smoke test: fresh `momentum init --agent claude-code` in a tmp dir; assert all 12 rules + `/review-code` + adapter overlay structure present
- **4c** — Smoke test: trigger conflict (place a duplicate `core/commands/review-code.md` in addition to the adapter version); confirm CLI errors before any writes; remove the duplicate after verification
- **4d** — Fix any bugs uncovered by 4a–4c; commit fixes separately for clarity

## Group 5 — Release Prep

**Sequential.** Last group.
**External dependencies:** all prior groups complete; user approval before merge/publish.
**Commit:** `chore(release): prepare v0.7.0 — Adapter Overlay & Verification`

Tasks:
- **5a** — Update `package.json` version → `0.7.0`
- **5b** — Update `specs/changelog/2026-05.md` with v0.7.0 entry
- **5c** — Update `specs/status.md`: phase 6 → complete; add v0.7.0 release entry
- **5d** — Update `specs/planning/roadmap.md`: phase 6 status → complete
- **5e** — Run `/sync-docs` to propagate `[ARCH_CHANGE]` and `[FEATURE]` history entries
- **5f** — Run `/complete-phase` (which now uses the new evidence rigor — eat our own dog food)
- **5g** — `npm publish --access public` (per project Rule in CLAUDE.md `## Project Extensions`; requires user approval per "shared system" rule)
