---
type: Decision
---

# ADR-0004: Single-Source Instruction Generation

> **Status**: Accepted (2026-07-04)
> **Phase**: phase-23-rules-unification
> **Deciders**: operator + agent (brainstormed 2026-07-03, operator-approved)

## Context

Momentum's agent rules were split across three files with radically
different depth:

- `core/specs-templates/CLAUDE.md` (468 lines) — full detail (Red Flags
  matrices, anti-rationalization counters), auto-loaded by Claude Code only.
- `adapters/{codex,antigravity}/instructions/AGENTS.md` (248/167 lines) —
  reference-only summaries, auto-loaded by Codex/Antigravity, deferring to…
- `core/agent-rules/project.md` (202 lines) — the "condensed rules", which
  **no agent auto-loads**, and the only home of Rule 13 (TDD).

On 2026-07-03 an Antigravity session violated Rule 6 (edited on `main`,
branched after the edits), Rule 12 (unverified completion claim), and
Rule 2 (no tracking) — every violated rule existed only in surfaces that
session never loaded. The two-tier architecture was the root cause: full
rules must ride whatever surface each agent auto-loads.

The naive fix — hand-mirroring the full rulebook into each AGENTS.md —
creates three near-copies that will silently diverge (sync-drift replaces
hidden-detail as the failure mode).

## Decision

**Build-time generation from a single canonical source.**

- `core/instructions/navigation.md` + `core/instructions/rules-body.md`
  hold the one true copy of the navigation table and the full Rules 1–15
  (Rule 13 folded in from `project.md`), written agent-neutral with small
  `{{VAR}}` placeholders (`TASK_TOOL`, `TASK_TOOL_NAME`).
- Each adapter contributes `instructions/header.md` (title + intro),
  `instructions/surfaces.md` (agent-specific skills/hooks/swarm/subagent
  reference; optional — Claude Code has none), and `instructions/vars.json`
  (placeholder values).
- `scripts/generate-instructions.js` assembles
  **header → navigation → surfaces → rendered rules body → Project
  Extensions tail** into the three committed instruction templates at
  their existing paths (`core/specs-templates/CLAUDE.md`,
  `adapters/{codex,antigravity}/instructions/AGENTS.md`). A
  `<!-- momentum-managed (generated) … -->` marker heads each output.
- A drift-guard test regenerates in-memory and fails the suite if the
  committed outputs differ from the sources (`--check` mode for humans).
- `.agent/rules/project.md` is retired: no longer installed; existing
  installs are migrated on upgrade — **deleted when pristine** (content
  hash ∈ a committed manifest of every historically shipped revision),
  **kept with a deprecation warning when customized**.

## Alternatives Considered

1. **Install-time assembly** — momentum concatenates at `init`/`upgrade`.
   Rejected: shipped artifacts become dynamic, fingerprint fixtures and
   tarball inspection get harder, and install-time failure modes multiply
   for zero contributor benefit.
2. **Three full copies + parity test** — rejected: highest ongoing editing
   burden; a normalizing parity test can verify rule presence but not
   nuance-equivalence, so drift risk remains.
3. **Status quo + "read the file" instruction** — rejected by evidence:
   the pointer hop is exactly what failed live.

## Consequences

- Contributors edit `core/instructions/rules-body.md` once; three outputs
  regenerate (`npm run generate-instructions`).
- Codex/Antigravity AGENTS.md grow to full size (~500 lines). Antigravity
  `<user_rules>` ingestion at this size is verified in Phase 23 G5
  (operator-assisted); fallback if truncated: condensed-but-complete body
  variant for that adapter (new decision required).
- `momentum upgrade` gains a one-time migration path; the orphan-cleanup
  machinery (Phase 20) is reused with a content-hash pristine check so
  user-customized copies are never destroyed.
- Adapter fingerprints re-baseline once (instruction files + removed
  project.md), with an audit note.
