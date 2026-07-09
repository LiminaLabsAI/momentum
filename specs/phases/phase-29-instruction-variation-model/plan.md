---
type: Plan
---

# Phase 29 — Implementation Plan

# Execution: Group 0 → Group 1 → Group 2 → (Group 3a ∥ Group 3b) → Group 4

Baseline: `npm test` green on branch before Group 0.

## Group 0 — Model + ADR

**Sequential. Blocks everything.**
Deps: none. Commit: `docs(adr): instruction file variation model (neutral spine + manifest)`

- 0.1 Write **ADR-0011**: three-tier model (principal constants / variation
  manifest / surface delta), neutral-spine byte-identity invariant, AGENTS.md
  multi-agent composition, ADR-0004 reconciliation (static N=1 + composed N>1).
  Extends ADR-0004; relates ADR-0007, ADR-0010.
- 0.2 Define `manifest.json` schema: `{ id, displayName, surface:
  "claude-md"|"agents-md", taskTool, taskToolName, hasSurfaceDelta }`.
  Document in `core/instructions/README.md`.
- 0.3 Log Group 0 history entries (`[DECISION]`, `[ARCH_CHANGE]`); update
  `specs/decisions/impact-map.md` with new topics.

## Group 1 — Generator restructure

**Sequential, after Group 0.**
Deps: Group 0 schema. Commit: `refactor(instructions): neutral-spine projection + adapter auto-discovery`

- 1.1 Add `manifest.json` to all 4 adapters (fold in `header.md` +
  `vars.json`); retire `header.md`/`vars.json` (migration-safe — generator no
  longer reads them).
- 1.2 Move `{{TASK_TOOL}}`/`{{TASK_TOOL_NAME}}` out of
  `core/instructions/rules-body.md`; add the task-tool mapping line to each
  `surfaces.md` integration delta. Rules body becomes agent-neutral.
- 1.3 Rewrite `generate-instructions.js`: auto-discover `adapters/*/instructions/`,
  neutral scaffold header from `manifest.displayName`, assemble
  `header → navigation → surfaces(delta) → neutral rules body → extensions tail`,
  destination from `manifest.surface`. Kill the hardcoded `TARGETS` array.
- 1.4 Regenerate all 4 committed templates; extend the `--check` drift guard.

## Group 2 — Install-time composition + collision fix

**Sequential, after Group 1.**
Deps: Group 1. Commit: `feat(install): compose AGENTS.md for all installed AGENTS.md agents`

- 2.1 Install/upgrade: when >1 `agents-md` agent is in `installed.json.agents`,
  compose AGENTS.md = neutral spine (once) + integration delta per installed
  agent; single-agent path stays a static copy.
- 2.2 Remove the last-writer-wins collision (a second AGENTS.md agent no longer
  silently overwrites the first's integration).
- 2.3 Fix `bin/ecosystem.js:790-791` detection to read `installed.json.agents`
  instead of assuming AGENTS.md ⇒ codex.

## Group 3a — BUG-027

**Parallel with Group 3b.**
Deps: Group 1. Commit: `fix(instructions): emit trailing pipe on generated recipe rows (BUG-027)`

- 3a.1 Recipe-table row generator always emits the closing `|`; regression test.

## Group 3b — TD-009

**Parallel with Group 3a.**
Deps: Group 1. Commit: `chore(fingerprints): cover opencode in capture-fingerprints (TD-009)`

- 3b.1 Extend `scripts/capture-fingerprints.js` to the opencode adapter.

## Group 4 — Verification

**Sequential, last.**
Deps: all. Commit: `test(instructions): spine-identity + OCP + composition; re-baseline fingerprints`

- 4.1 Tests: neutral-spine byte-identity; header scaffold (only name varies);
  OCP synthetic-agent; multi-AGENTS.md composition golden; ecosystem detection.
- 4.2 Re-baseline 4 adapter fingerprints (record meta note).
- 4.3 Self-repo dogfood: `momentum upgrade .` → verify neutral spine, opencode
  integration intact, CLAUDE.md ≡ AGENTS.md spine; capture evidence under
  `evidence/`.
- 4.4 `/sync-docs` prep, retrospective, version bump v0.36.0.
