---
type: Retrospective
---

# Phase 22c — Retrospective: Opencode Polish & Multi-Adapter Support

> **Completed**: 2026-07-06 · **Release**: v0.30.0
> **Execution**: opencode session (Build agent, free tier) implemented G0–G4;
> claude-code session reviewed, reverted one destructive commit, and hardened.

## What shipped

- **BUG-020 fixed (P1)**: `.momentum/installed.json` restructured to a
  per-agent `agents` map (ADR-0007) with one-time legacy migration; orphan
  cleanup scoped to the agent being upgraded. Multi-adapter installs are now
  genuinely additive — the ide-support docs promise is finally true.
- **Compat hardening (review)**: `momentumVersion` mirror kept for external
  readers (the ecosystem fleet D1 lock reads it) + tolerant fleet reader.
- **Opencode polish**: three new shipped skills (track/lanes/validate),
  run-mode caveat documented via surfaces.md + regeneration, A2 verified
  already covered by ENH-058 (no double session-append).
- **Repo-integrity guards**: new suite tests pin the product README, the
  .gitignore negation pair, and the no-eco-root invariant — the exact class
  of damage an accidental in-repo `ecosystem init` caused mid-phase
  (reverted; BUG-021 filed for the CLI-side guard).

## Verification Evidence

- Full suite green pre-landing (see landing gate output; baseline 809 →
  new: +10 multi-adapter/migration, +1 compat mirror, +3 integrity guards).
- Multi-adapter scenarios test-pinned: init A → upgrade B preserves A (both
  directions), legacy migration idempotent, scoped orphan cleanup.
- `momentum okf check` conformant; instruction drift-guard green (A3 done
  via surfaces.md + `npm run generate-instructions`).
- G4 live swarm validation deferred (operator-driven; record stub at
  `specs/adhoc/val-opencode-swarm-live/`).

## Lessons

- **Agent-session process gaps repeat**: work started directly on `main`
  with no branch/lane/commits (corrected mid-phase), and an errant
  `ecosystem init` shipped inside an unrelated commit. The mechanism
  (lanes, gates) only protects work that's inside it.
- **The suite was blind to repo-identity damage** — README/.gitignore
  destruction kept 819/819 green. Guards added; invariant-pinning beats
  reviewing diffs after the fact.
- **Schema changes need a consumer sweep**: the ADR flagged "external
  tools" generically but its own repo's fleet reader broke. grep the
  field name before dropping it.
