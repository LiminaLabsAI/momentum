---
type: Plan
---

# Phase 25 — Implementation Plan

# Mixed: Group 0 → (Groups 1 + 2 in parallel) → Group 3

Reference: ENH-060 (backlog), ADR-0008 (authored in G0), `core/project-lifecycle.md` (authored in G0).

## Group 0 — Contract, ADR, renumber (Sequential. Blocks everything.)
No external dependencies.
Commit: `docs(lifecycle): ADR-0008 + project-lifecycle contract; renumber Intelligence→26, Platform→27`

- ADR-0008: "Foundation docs are authored, not scaffolded" — context (ENH-060 dogfood evidence), decision (3-state lifecycle, one owner per state, absence as signal), consequences (init shape change, upgrade migration, command semantics)
- `core/project-lifecycle.md`: Installed / Founded / Phase-loop states, owners, the founded predicate (charter + roadmap exist), routing table
- Renumber sweep: `specs/planning/roadmap.md`, `specs/status.md` (header + Upcoming table), `specs/phases/README.md`, grep `specs/planning/` for stale "Phase 25/26" references

## Group 1 — CLI mechanics (Parallel with Group 2.)
No external dependencies.
Commit: `feat(init)!: stop shipping foundation placeholders; upgrade removes provably-untouched ones (ADR-0008)`

- Delete `core/specs-templates/specs/vision/{project-charter,principles,success-criteria}.md` + `specs/planning/roadmap.md` (content relocates into `start-project.md` in G2)
- Rewrite `core/specs-templates/specs/status.md`: "Not founded — run /brainstorm-idea → /start-project" state (all validate-required fields kept)
- Build the frozen historical hash set: script walks git history of the 4 template paths, hashes frontmatter-stripped + whitespace-normalized bodies → `core/foundation-placeholder-hashes.json` (checked in; frozen forever since the templates stop evolving)
- `momentum upgrade`: for each of the 4 paths, if present AND normalized-body hash ∈ set → remove + report "not yet founded; run /start-project"; honors `--dry-run`
- Audit OKF sweep interaction: the v0.27.0 `type:` frontmatter injection must not defeat matching (normalization covers it — test proves it)
- Update init success message to the lifecycle routing
- Tests: `tests/founding-contract.test.js` (init shape ×4 adapters, migration incl. injected-frontmatter fixture + edited-file survival + dry-run); re-baseline fingerprints (meta: ADR-0008)

## Group 2 — Command + rules surface (Parallel with Group 1.)
No external dependencies.
Commit: `docs(commands): /start-project founds the project; founded gate in phase commands; validate invariant (ADR-0008)`

- `start-project.md` rewrite: founding semantics ("content, not structure"; any repo state; if machinery missing → run `momentum init` first); inline authoring templates for the four docs; status Summary fill; Phase 0/1 planning handoff; gate contract preserved verbatim
- `brainstorm-idea.md`: routing line update
- `brainstorm-phase.md` + `start-phase.md`: founded precondition step (exists-check on charter + roadmap → STOP, route to `/start-project`, offer to draft from available context with the user)
- `validate.md`: add invariant check "phase dirs exist ⟹ founded" (failure), "not founded, no phases" = valid state
- `migrate.md` audit: ensure it reports "not founded" instead of creating placeholders
- CLAUDE.md template: one sentence in Rule 1
- `core/specs-templates/specs/README.md`: vision/ + planning/ described as created at founding
- Fingerprint re-baselines for the command-doc drift (meta per adapter)

## Group 3 — Verification, docs, release prep (Sequential. Last.)
External: none (site build needs repo's existing toolchain).
Commit: `docs(phase-25): e2e evidence, README/site touch-ups, retrospective, v0.32.0`

- e2e evidence: fresh init in tmp (assert unfounded shape) + legacy-fixture upgrade run → capture to `evidence/`
- `momentum okf check` + `okf index` green on a fresh init (bundle listings without vision/planning until founded)
- README + site getting-started: flow reads init → /brainstorm-idea → /start-project (founds) → /start-phase
- Full suite; smoke matrix; retrospective.md with verification evidence; version bump 0.31.2 → 0.32.0
- HARD STOP at the Rule 6 / release gate (merge + tag + `gh release create` + `npm publish` need operator approval)
