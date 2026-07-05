---
type: Task List
---

# Phase 23 — Rules Unification: Tasks

> Mirrors `plan.md`. Mark `[/]` in-progress, `[x]` done (Rule 12: only after
> fresh verification output in-session).

## Group 0 — Canonical sources + ADR
- [x] ADR "Single-source instruction generation" written and accepted
- [x] `core/instructions/rules-body.md` extracted (Rules 1–15, full Red Flags + anti-rationalization)
- [x] Rule 13 (TDD) folded in from `core/agent-rules/project.md`
- [x] Agent-specific wording neutralized into `{{VAR}}` placeholders (inventory recorded)
- [x] Three per-adapter `instructions/header.md` files written
- [x] Per-adapter generator vars placed + recorded in history

## Group 1 — Generator + drift guard
- [x] `scripts/generate-instructions.js` (+ `--check` mode, deterministic, GENERATED marker)
- [x] npm script wired; suite verifies via drift test (never regenerates — TD-006)
- [x] Three templates regenerated + committed
- [x] `tests/instruction-generation.test.js` (byte-drift + invariants) green

## Group 2 — Install/upgrade retirement + migration
- [x] Agent-rules install block removed from init + upgrade
- [x] `core/instructions/legacy-project-md-hashes.json` harvested from git history
- [x] Migration: pristine → deleted (logged); customized → kept + deprecation warning
- [x] `destinations['agent-rules']` fate decided + recorded
- [x] `core/agent-rules/project.md` removed from tree

## Group 3 — Reference cleanup
- [x] momentum-orient SKILL.md ×2 repointed
- [x] review-code recipes repointed
- [x] `/migrate` + `/start-project` texts updated
- [x] Parity matrix + capabilities doc updated
- [x] Repo-wide sweep: no non-historical `agent-rules` references remain

## Group 4 — Tests + fingerprints
- [x] upgrade/tarball/installed-manifest test expectations updated
- [x] `tests/agent-rules-migration.test.js` green (fresh/pristine/customized paths)
- [x] 3 fingerprint fixtures re-baselined with note; only instruction files drifted
- [x] Full suite green

## Group 5 — Verification + dogfood
- [x] Fresh-install smoke ×3 adapters (complete rules present; no `.agent/rules/`)
- [x] Self-repo `momentum upgrade` dogfood + `evidence/self-upgrade.txt`
- [/] Antigravity `<user_rules>` size check — DEFERRED to operator (needs live IDE; fallback pre-agreed in ADR-0004)
- [x] Retrospective with `## Verification Evidence`
