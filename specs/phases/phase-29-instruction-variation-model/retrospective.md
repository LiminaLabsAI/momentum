---
type: Retrospective
---

# Phase 29 — Retrospective (Instruction Variation Model)

**Target:** v0.36.0 · **Branch:** `phase-29-instruction-variation-model`

## What shipped

The primary instruction file is now a projection of **(principal constants ×
per-agent variation manifest)** (ADR-0011, extends ADR-0004; relates ADR-0007,
ADR-0010):

- **Three tiers.** Tier 1 principal constants (`core/instructions/`) — a
  **byte-identical neutral spine** across every agent + surface. Tier 2 per-agent
  `manifest.json` (`{ id, displayName, surface, taskTool, taskToolName,
  hasSurfaceDelta }`) — consolidates the retired `header.md` + `vars.json` and
  the generator's `TARGETS`. Tier 3 surface delta (`surfaces.md`).
- **Neutral spine made testable.** The task-tool token was lifted out of the
  rules body into a generator-emitted `## In-Session Task Tool` note, so the
  managed rules region is now byte-identical (enforced by test, not prose).
- **OCP.** The generator auto-discovers `adapters/*/instructions/` — adding an
  agent is drop-in (a synthetic-agent test proves it with zero generator edits).
  Assembly moved to shipped `core/lib/instruction-compose.js` so build-time
  generation and install-time composition share one path.
- **AGENTS.md category error fixed.** The header is one de-branded scaffold
  (killed the claude-code "for this project" drift). When >1 AGENTS.md agent is
  installed, AGENTS.md is composed — neutral spine + one integration section per
  installed agent (from `installed.json.agents`) — ending the same-path
  last-writer-wins collision. `bin/ecosystem.js` `detectMemberAgent` now reads
  the ADR-0007 `agents` map (it was reading the removed `m.agent` field, so every
  AGENTS.md agent was misidentified as codex).
- **Fold-ins.** BUG-027 verified already fixed in Phase 28 → stale row flipped +
  a well-formed-row regression guard added. TD-009 → `capture-fingerprints.js`
  now covers opencode (one command re-baselines all four).

## Verification Evidence

- **Full suite:** 963 → **969** (`npm test`, all green) — +6 Phase-29 invariant
  tests (`tests/instruction-variation-model.test.js`) + 1 BUG-027 guard.
- **Drift guard:** `npm run generate-instructions -- --check` clean.
- **Fingerprints:** all 4 re-baselined; exactly one file drifted per adapter
  (the instruction file); fingerprint + smoke suites green.
- **New invariants proven:** neutral-spine byte-identity across all agents;
  header scaffold (only display name varies); OCP synthetic-agent; multi-agent
  composition golden; manifest↔adapter destination consistency; ecosystem
  detection reads the agents map.
- **Multi-agent composition smoke:** `init codex` → `upgrade opencode` → one
  AGENTS.md, neutral header, both integration sections, spine byte-identical to
  the single-agent template.
- **Self-repo dogfood:** `momentum upgrade .` →
  `specs/phases/phase-29-instruction-variation-model/evidence/self-repo-dogfood.md`
  — CLAUDE.md ≡ AGENTS.md spine; both headers de-branded; opencode integration +
  ecosystem + project-rules pointers preserved; project name rendered.

## Notes / follow-ups

- **Discovery (out of scope):** the self-repo's `.opencode/commands/*` have drifted
  from `core/commands/*` across earlier phases (24 files). Reverted here — unrelated
  to Phase 29; a routine `momentum upgrade . --agent opencode` sync (or a small
  hygiene task) should land it separately.
- `manifest.json` and `adapter.js` briefly share the surface/destination fact; a
  consistency test asserts they agree (full unification deferred, per ADR-0011).
- Cursor (FEAT-007) / Copilot (FEAT-010) are now drop-in (manifest + optional
  surfaces.md) — the OCP path is proven.

## Renumber

Intelligence → 30, Platform → 31 (a concurrent Team-Mode lane further inserted
30a/30b/30c; that lane owns those roadmap rows).
