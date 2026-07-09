---
type: Phase
status: in-progress
tags: [instructions, adapters, agent-neutral, projection, manifest, solid, multi-adapter]
---

# Phase 29 — Instruction Variation Model (Agent-Neutral Projection)

> **Target version**: v0.36.0 · **Branch**: `phase-29-instruction-variation-model`
> Inserted before Intelligence (→ 30) and Platform (→ 31).

## Goal

Make momentum's primary instruction file a clean **projection of
(principal constants × per-agent variation manifest)**, so momentum can serve
any coding agent — and a project can switch or run several at once (Claude Code
→ opencode → Antigravity → Codex) — without the instruction file being branded
to, or misinstructed for, the wrong agent.

Close the category error: `CLAUDE.md` is legitimately Claude-specific, but
`AGENTS.md` is a cross-agent open standard (opencode / Codex / Antigravity /
Cursor / Zed / …). momentum currently generates N single-agent-**branded**
`AGENTS.md` files that all install to the same path and collide. This phase
gives AGENTS.md an **agent-neutral spine** with agent identity expressed as a
composable **integration delta**.

Continues the instruction-consistency arc: Phase 23 single-sourced the *rules*,
Phase 26 moved *config* out of core, Phase 28 made the file a pure projection of
`specs/`. Phase 29 formalizes the last axis — *what varies per agent* — so it is
a single declarative surface instead of scattered, drift-prone fragments.

## Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Three explicit tiers: **principal constants** (neutral spine) / **variation manifest** / **surface delta** | Draws the constant-vs-variable boundary at the right line (SRP/DRY); makes "what varies per agent" a single declarative surface |
| 2 | Neutral spine is **byte-identical** across every agent and both surfaces (CLAUDE.md ≡ AGENTS.md body) | Turns "neutral" into a testable invariant, not a claim |
| 3 | Pull `{{TASK_TOOL}}` OUT of the rules body into the agent's integration delta | The last variable leaking into the spine; its removal is what makes the spine byte-identical |
| 4 | One **per-adapter manifest** (`adapters/<agent>/instructions/manifest.json`); generator **auto-discovers adapters** (no hardcoded `TARGETS`) | OCP — add an agent = drop an adapter dir; no shared switch point to edit. Consolidates today's `header.md` + `vars.json` + generator `TARGETS` |
| 5 | AGENTS.md serves **all** its installed consumers: neutral spine + one integration section **per installed AGENTS.md agent**, composed from `installed.json.agents` | Operator directive: capable for all agents + switching/coexistence. Fixes the destination collision structurally |
| 6 | Single-agent install stays a **static committed template** (N=1 projection); multi-agent AGENTS.md is **deterministically composed** at install | Preserves ADR-0004's fingerprint/tarball model for the common case; extends (not reverses) it for coexistence |
| 7 | New **ADR-0011** extends ADR-0004, relates to ADR-0007 (per-agent state) + ADR-0010 (projection) | The projection principle extended from specs→file to (constants × manifest)→file |

## Scope

**In:**
- 3-tier source model + per-adapter `manifest.json` schema
- Rewrite `scripts/generate-instructions.js`: adapter auto-discovery, neutral
  header scaffold (`> {{AGENT_DISPLAY}} configuration for this momentum-managed
  project.`), byte-identical spine, task-tool moved to integration delta
- Regenerate all 4 committed instruction templates; extend the drift guard
- Install/upgrade: compose AGENTS.md from the installed AGENTS.md-agent set;
  remove the last-writer-wins destination collision
- Fix `bin/ecosystem.js` agent detection (AGENTS.md → always "codex")
- Fold-ins: **BUG-027** (malformed `sync-config` recipe row), **TD-009**
  (fingerprint capture skips opencode)
- ADR-0011; re-baseline adapter fingerprints; self-repo dogfood

**Out (non-goals):**
- Unifying `manifest.json` into `adapter.js` (a consistency test asserts they
  agree; full unification is a follow-up)
- New adapters (Cursor FEAT-007 / Copilot FEAT-010) — but the model is proven
  OCP-ready with a synthetic-agent test so they become trivial later
- Any change to Rules 1–15 semantics (only the task-tool phrasing moves)
- Runtime behavior of agents; hook mechanisms

## Deliverables

| # | Deliverable | Verification |
|---|-------------|--------------|
| D1 | Per-adapter `manifest.json` (4 agents) + schema doc | `npm test` (schema + presence tests) |
| D2 | Rewritten generator with adapter auto-discovery + neutral scaffold | `npm run generate-instructions -- --check` clean |
| D3 | Neutral-spine byte-identity invariant across all agents/surfaces | `npm test` (spine-identity test) |
| D4 | OCP proof: synthetic adapter → correct file, zero generator edits | `npm test` (synthetic-agent test) |
| D5 | Multi-AGENTS.md composition at install (golden output) | `npm test` (composition test) + install smoke |
| D6 | `ecosystem.js` detection reads `installed.json.agents` | `npm test` (detection test) |
| D7 | BUG-027 + TD-009 closed | `npm test`; `npm run generate-instructions -- --check` |
| D8 | ADR-0011 + re-baselined fingerprints + self-repo dogfood evidence | `npm test`; `momentum upgrade .` diff review |

## Acceptance Criteria

1. `npm test` green (baseline + all new tests).
2. `npm run generate-instructions -- --check` reports no drift.
3. The rules-body spine is byte-identical across CLAUDE.md and all AGENTS.md
   outputs (enforced by test, not inspection).
4. No committed or installed instruction file is branded to a single agent in
   its header or spine; agent identity appears only in the integration delta.
5. A synthetic adapter dir produces a correct instruction file with no edit to
   `generate-instructions.js` (OCP proven).
6. Installing two AGENTS.md agents in one repo yields one AGENTS.md whose spine
   is neutral and which carries an integration section for BOTH.
7. Self-repo `momentum upgrade .` → this repo's AGENTS.md is agent-neutral in
   spine + header, opencode integration intact; CLAUDE.md ≡ AGENTS.md spine.
