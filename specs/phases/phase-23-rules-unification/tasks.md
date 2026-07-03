# Phase 23 — Rules Unification: Tasks

> Mirrors `plan.md`. Mark `[/]` in-progress, `[x]` done (Rule 12: only after
> fresh verification output in-session).

## Group 0 — Canonical sources + ADR
- [ ] ADR "Single-source instruction generation" written and accepted
- [ ] `core/instructions/rules-body.md` extracted (Rules 1–15, full Red Flags + anti-rationalization)
- [ ] Rule 13 (TDD) folded in from `core/agent-rules/project.md`
- [ ] Agent-specific wording neutralized into `{{VAR}}` placeholders (inventory recorded)
- [ ] Three per-adapter `instructions/header.md` files written
- [ ] Per-adapter generator vars placed + recorded in history

## Group 1 — Generator + drift guard
- [ ] `scripts/generate-instructions.js` (+ `--check` mode, deterministic, GENERATED marker)
- [ ] npm script wired; suite verifies via drift test (never regenerates — TD-006)
- [ ] Three templates regenerated + committed
- [ ] `tests/instruction-generation.test.js` (byte-drift + invariants) green

## Group 2 — Install/upgrade retirement + migration
- [ ] Agent-rules install block removed from init + upgrade
- [ ] `core/instructions/legacy-project-md-hashes.json` harvested from git history
- [ ] Migration: pristine → deleted (logged); customized → kept + deprecation warning
- [ ] `destinations['agent-rules']` fate decided + recorded
- [ ] `core/agent-rules/project.md` removed from tree

## Group 3 — Reference cleanup
- [ ] momentum-orient SKILL.md ×2 repointed
- [ ] review-code recipes repointed
- [ ] `/migrate` + `/start-project` texts updated
- [ ] Parity matrix + capabilities doc updated
- [ ] Repo-wide sweep: no non-historical `agent-rules` references remain

## Group 4 — Tests + fingerprints
- [ ] upgrade/tarball/installed-manifest test expectations updated
- [ ] `tests/agent-rules-migration.test.js` green (fresh/pristine/customized paths)
- [ ] 3 fingerprint fixtures re-baselined with note; only instruction files drifted
- [ ] Full suite green

## Group 5 — Verification + dogfood
- [ ] Fresh-install smoke ×3 adapters (complete rules present; no `.agent/rules/`)
- [ ] Self-repo `momentum upgrade` dogfood + `evidence/self-upgrade.txt`
- [ ] Antigravity `<user_rules>` size check (operator) recorded
- [ ] Retrospective with `## Verification Evidence`
