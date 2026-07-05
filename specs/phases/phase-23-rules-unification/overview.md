---
type: Phase
status: complete
tags: [instructions, agent-rules, rules-body, generation, templates, adapters, claude-code, codex, antigravity, migration, upgrade, fingerprints, primary-instruction]
---

# Phase 23 — Rules Unification (single-source agent instructions)

> **Status**: Planned (brainstormed 2026-07-03)
> **Runs BEFORE Phase 22 (Reach)** — new adapters must be born single-source.

## Goal

Every agent — Claude Code, Codex, Antigravity — auto-loads the **complete**
detailed operational rules (Red Flags matrices, anti-rationalization
counters, Rule 13 TDD included) at session start, from exactly **one
canonical source** in the momentum repo. The pointer-hop file
`.agent/rules/project.md` is retired with a safe migration.

## Root Cause Being Fixed

Codex/Antigravity auto-load only a 167–248-line reference-only AGENTS.md
that defers to `.agent/rules/project.md` — a file no agent auto-loads.
Claude Code alone gets the full 468-line CLAUDE.md. A live Rule 6 violation
(2026-07-03: an Antigravity session edited files directly on `main`, then
created its branch after the edits) traced directly to this gap; the same
session's unverified VAL-002 closure showed Rules 12 and 2 were equally
invisible to it. The rules that would have prevented all three failures sat
one unfollowed pointer-hop away.

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| Source-of-truth mechanism | **Build-time generation**: `core/instructions/rules-body.md` (canonical, agent-neutral) + `adapters/<agent>/instructions/header.md`; a repo script regenerates the three committed instruction templates; a drift-guard test asserts committed == generated | Shipped artifacts stay static, inspectable, fingerprintable; contributors edit one file |
| Generated targets keep current paths | `core/specs-templates/CLAUDE.md`, `adapters/codex/instructions/AGENTS.md`, `adapters/antigravity/instructions/AGENTS.md` | `primaryInstruction` config, tarball globs, and install machinery stay untouched |
| Existing-install migration | **Delete if pristine, keep + warn if customized.** A committed manifest of historical `project.md` content hashes (harvested from git history) distinguishes "untouched old version" (delete via orphan cleanup) from "user-customized" (keep + deprecation warning) | Honors customizations without leaving stale rule files in the common case |
| Agent-specific wording | Per-adapter headers carry nav/hooks/tool tables; the body is agent-neutral with small `{{VAR}}` substitutions rendered at generation | Full detail everywhere, zero divergent copies |
| Sequencing | Phase 23 before Phase 22 (Reach) | Reach's new adapters inherit the single-source pattern |
| ADR | New ADR: "Single-source instruction generation" | Instruction-architecture direction shift (Rule 10) |

## Scope

**In:**
- Canonical body extraction from the current CLAUDE.md template, including
  Rule 13 (TDD) fold-in from `core/agent-rules/project.md`
- Generator script + `npm run generate-instructions` (+ `--check` mode) +
  drift-guard/invariant tests
- Stop shipping `.agent/rules/project.md`; upgrade-time migration
  (delete-if-pristine / keep+warn) with historical-hash manifest
- Reference cleanup (~20 files): momentum-orient SKILL.md (codex +
  antigravity), review-code recipes, `/migrate`, `/start-project`,
  adapter parity matrix, adapter-capabilities doc, adapter.js
  `agent-rules` handling
- Fingerprint re-baseline (3 adapters, deliberate, with note)
- Self-repo dogfood upgrade (live migration evidence)

**Out (non-goals):**
- Rule *content* rewrites beyond agent-neutralization + Rule 13 fold-in
- New adapters (Phase 22's job)
- Ecosystem-root templates (`ecosystem-claude.md` / `ecosystem-agents.md`)
- Per-project `## Project Extensions` content (marker machinery preserves it)

## Deliverables & Verification

| Deliverable | Verification |
|---|---|
| `core/instructions/rules-body.md` + 3 headers + ADR | `npm run generate-instructions -- --check` exits 0 |
| Generated CLAUDE.md + 2× AGENTS.md (committed) | `tests/instruction-generation.test.js` (byte-drift + invariants) |
| project.md retirement + migration | `tests/agent-rules-migration.test.js` (fresh install ships none; pristine deleted; customized kept + warned) |
| Reference cleanup | `grep -r "agent-rules/project.md"` clean outside history/changelog |
| Fingerprints | suite fingerprint tests green post re-baseline |
| Self-repo dogfood | evidence file in `evidence/` from live `momentum upgrade` of this repo |

## Acceptance Criteria

1. All three generated templates contain Rules 1–15 complete with Red Flags
   + anti-rationalization sections (invariant test); zero unrendered `{{`
   placeholders.
2. Drift guard green; regeneration byte-deterministic.
3. Fresh install of each adapter ships **no** `.agent/rules/project.md`;
   upgrade deletes a pristine copy and keeps+warns on a customized one.
4. Full suite green with deliberately re-baselined fingerprints.
5. Momentum's own repo upgraded via the new path with migration evidence.

## Risks

- **Antigravity `<user_rules>` size**: ingestion of a ~500-line AGENTS.md is
  unverified. G5 includes an operator check; fallback (decision deferred
  until evidence): a condensed-but-complete body variant for that adapter.
- **Historical-hash completeness**: hash manifest must cover every shipped
  `project.md` revision or pristine old installs get "customized" warnings
  (annoying, not destructive — the safe failure direction).
