---
type: Phase
status: complete
tags: [lifecycle, init, start-project, foundation-docs, templates, upgrade-migration, commands]
---

# Phase 25 — Founding Contract (foundation docs authored, not scaffolded)

## Goal

Close ENH-060 (P1) with a clean redesign of the new-project flow: momentum
never ships placeholder foundation docs again. A project moves through three
explicit lifecycle states — **Installed → Founded → Phase loop** — each with
exactly one owning command, and "founded" is a pure file-existence signal.

Live dogfood evidence (2026-07-06, fresh v0.31.2 project): an entire MVP was
built and merged while charter/principles/success-criteria/roadmap remained
byte-identical init templates, and `/validate` had no way to notice.

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| Fix shape | Clean lifecycle contract, NOT patch-mode markers/heuristics | Operator directive 2026-07-06: placeholder files are the root disease; absence is the clean machine-checkable signal |
| Foundation docs at init | NOT created — init ships machinery + contentless-by-nature skeleton only | A placeholder satisfies structural checks while carrying zero information |
| `/start-project` semantics | Reframed "scaffold a NEW/EMPTY repo" → "found the project" (content, not structure) | Kills the routing dead zone AND the init/start-project overlap debt (ENH-003 era) |
| Founded gate | `specs/vision/project-charter.md` + `specs/planning/roadmap.md` exist | Minimal load-bearing pair; principles/success-criteria authored at founding but never block |
| Legacy migration | `momentum upgrade` auto-removes placeholders provably untouched (normalized-body hash vs all historical template versions) + reports | Zero user content by proof; returns old installs to the clean signal; `--dry-run` previews |
| Numbering | This phase = 25; Intelligence → 26; Platform → 27 | Operator choice: clean sequence over letter suffix |

## Scope

### In
- `momentum init`: stop shipping the four foundation files; `status.md` template gains explicit "Not founded" state with router text
- `momentum upgrade`: placeholder-removal migration (frozen historical hash set, frontmatter-normalized)
- `/start-project` rewrite: founding semantics, inline authoring templates for the four docs, same brainstorm-gate + approval contract
- `/brainstorm-phase` + `/start-phase`: founded precondition (exists-check, route to `/start-project`)
- `/validate`: invariant "phases exist ⟹ founded"
- `/brainstorm-idea`: one routing line ("works whether or not init has run")
- `/migrate` audit: must not create foundation placeholders
- `core/project-lifecycle.md` contract doc + ADR-0008
- CLAUDE.md template: one Rule 1 sentence (status says Not founded → `/start-project` first)
- Roadmap renumber sweep (25/26/27)
- init success-message update; README/site getting-started touch-ups

### Out
- Any content-quality scoring of foundation docs (founded = exists, period)
- `specs/architecture/ecosystem.md` template rework (separate concern)
- Retroactive founding of existing projects (upgrade only removes + reports; authoring stays interactive)
- Forcing `/complete-phase` flow discipline (the demo's second symptom — separate backlog item if pursued)

## Deliverables

| # | Artifact | Verification |
|---|---|---|
| 1 | ADR-0008 "Foundation docs are authored, not scaffolded" | file exists, status Accepted |
| 2 | `core/project-lifecycle.md` (3-state contract) | referenced by the 5 command docs |
| 3 | init without foundation placeholders + unfounded status.md | `tests/founding-contract.test.js`: fresh init asserts 4 files ABSENT, status router text present; all-adapter matrix |
| 4 | upgrade placeholder-removal migration | test: legacy fixture (incl. OKF-frontmatter-injected variant) → files removed + report line; user-edited file untouched; `--dry-run` previews |
| 5 | Reworked command docs (start-project, brainstorm-idea, brainstorm-phase, start-phase, validate) | fingerprint re-baselines with meta; doc assertions |
| 6 | Renumber sweep | `grep -rn "Phase 25 — Intelligence\|Phase 26 — Platform" specs/` returns nothing stale |
| 7 | Green suite + e2e evidence | full suite (baseline 833) + `evidence/` captures |

## Acceptance Criteria

- [ ] Fresh `momentum init` (all 4 adapters) creates NO `specs/vision/*` and NO `specs/planning/roadmap.md`; `status.md` says "Not founded" with router text
- [ ] `momentum upgrade` on a legacy placeholder install removes exactly the provably-untouched files and reports; an edited charter survives untouched
- [ ] `/start-phase` and `/brainstorm-phase` docs stop and route to `/start-project` when charter or roadmap is missing
- [ ] `/validate` fails a project that has phase directories but is not founded
- [ ] `/start-project` doc authors all four docs + status Summary on any repo state, gate contract intact
- [ ] Roadmap/status/planning show: 25 Founding Contract, 26 Intelligence, 27 Platform
- [ ] Full suite green; 4 adapter fingerprints re-baselined with meta
