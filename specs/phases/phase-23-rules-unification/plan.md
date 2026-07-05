---
type: Plan
---

# Phase 23 — Rules Unification: Implementation Plan

```
# Mixed: Group 0 → Group 1 → (Groups 2 + 3 in parallel) → Group 4 → Group 5
```

## Group 0 — Canonical sources + ADR

**Sequential.** Blocks everything. No external dependencies.
Commit: `feat(instructions): canonical rules body + per-adapter headers (ADR-000N)`

- [ ] Write the ADR "Single-source instruction generation" in
      `specs/decisions/` (status: accepted; records build-time-generation
      choice vs install-time assembly vs mirrored copies, and the migration
      policy).
- [ ] Extract `core/instructions/rules-body.md` from
      `core/specs-templates/CLAUDE.md` — the full Rules 1–15 body including
      every Red Flags matrix and anti-rationalization counter, Naming
      Conventions, and Constraints.
- [ ] Fold Rule 13 (TDD, opt-in) from `core/agent-rules/project.md` into the
      body at its numbered position (it currently exists ONLY there).
- [ ] Neutralize agent-specific wording into generator variables
      (e.g. `{{TODO_TOOL}}`, `{{AGENT_DISPLAY}}`); inventory every
      Claude-specific phrase in the current template.
- [ ] Write `adapters/claude-code/instructions/header.md`,
      `adapters/codex/instructions/header.md`,
      `adapters/antigravity/instructions/header.md` — title, navigation
      table, per-agent tool/hook tables, agent-specific notes (salvage the
      good per-agent content from today's AGENTS.md files).
- [ ] Define per-adapter generator vars (in each `adapter.js` or a
      `header-vars.json`) — decide placement in G0, record in history.

## Group 1 — Generator + drift guard

**Sequential** (needs G0). No external dependencies.
Commit: `feat(instructions): build-time generation + drift-guard test`

- [ ] `scripts/generate-instructions.js` — header + rendered body +
      `## Project Extensions` tail → writes the three committed templates;
      `--check` mode diffs without writing (exit 1 on drift). Deterministic
      output; a `<!-- GENERATED — edit core/instructions/rules-body.md -->`
      marker at the top of each generated file.
- [ ] npm scripts: `generate-instructions`, wired into the suite via the
      drift test (not into `npm test` as a generator — TD-006 lesson: tests
      verify, never regenerate).
- [ ] Regenerate and commit the three templates.
- [ ] `tests/instruction-generation.test.js`:
      byte-drift (committed == generated); invariants — Rules 1–15 headings
      present in all three outputs, Red Flags tables present, Rule 13
      present, zero `{{` residue, Project Extensions marker intact.

## Group 2 — Install/upgrade retirement + migration

**Parallel with Group 3** (different files). No external dependencies.
Commit: `feat(install): retire .agent/rules/project.md with safe migration`

- [ ] Remove the agent-rules install block from `init()` and the
      corresponding upgrade step in `bin/momentum.js`.
- [ ] Harvest historical content hashes of `core/agent-rules/project.md`
      from git history into `core/instructions/legacy-project-md-hashes.json`
      (committed; generation documented in the file header).
- [ ] Upgrade migration: if installed `.agent/rules/project.md` hash ∈
      manifest → remove (orphan path, logged); else keep + print deprecation
      warning pointing at `## Project Extensions`.
- [ ] Decide `destinations['agent-rules']` contract-key fate: keep the key if
      any adapter ships agent-rules overlay content or the overlay contract
      requires it; otherwise deprecate. Record in history.
- [ ] Delete `core/agent-rules/project.md` from the tree once nothing ships it.

## Group 3 — Reference cleanup

**Parallel with Group 2.** No external dependencies.
Commit: `docs(adapters): repoint rule references to primary instructions`

- [ ] `momentum-orient` SKILL.md (codex + antigravity): orient via AGENTS.md
      only; drop the project.md hop.
- [ ] review-code recipes (claude-code command + antigravity workflow) and
      any other recipes referencing agent-rules.
- [ ] `/migrate` and `/start-project` command texts.
- [ ] `core/adapter-parity-matrix.md` + `core/adapter-capabilities.md` rows.
- [ ] Sweep: `grep -r "agent-rules\|\.agent/rules" core/ adapters/ bin/` —
      every remaining hit is either intentionally historical (changelog,
      backlog, old phase docs — leave) or a miss (fix).

## Group 4 — Tests + fingerprints

**Sequential** (needs G1+G2+G3). No external dependencies.
Commit: `test: instruction unification coverage + fingerprint re-baseline`

- [ ] Update `tests/upgrade.test.js`, `tests/tarball.test.js`,
      `tests/installed-manifest.test.js` expectations (no project.md in
      managed set / tarball / install output).
- [ ] `tests/agent-rules-migration.test.js`: fresh install ships none;
      pristine (historical-hash) copy deleted on upgrade; customized copy
      kept + warning printed; `.bak` never needed (nothing overwritten).
- [ ] Re-baseline the 3 adapter fingerprint fixtures
      (`node scripts/capture-fingerprints.js --write --note "phase-23:
      single-source instructions"`); assert only instruction files drifted.
- [ ] Full suite green.

## Group 5 — Verification + dogfood

**Sequential.** External dependency: Antigravity IDE for the size check
(operator-assisted).
Commit: `docs(phase-23): evidence + retrospective`

- [ ] Fresh-install smoke ×3 adapters in tmp dirs: verify complete rules in
      the installed primary instruction; no `.agent/rules/`.
- [ ] Self-repo dogfood: run `momentum upgrade` on this repo — its own
      CLAUDE.md regenerates via the new template; migration handles its
      installed state. Capture output to `evidence/self-upgrade.txt`.
- [ ] Operator check: Antigravity loads the full-size AGENTS.md in
      `<user_rules>` (record result; if truncated → file the condensed-body
      fallback decision).
- [ ] Retrospective with non-empty `## Verification Evidence` (Rule 12 /
      landing gate requirement).
