---
type: Tasks
---

# Phase 25 — Tasks

## Group 0 — Contract, ADR, renumber
- [x] ADR-0008 authored (status Accepted)
- [x] core/project-lifecycle.md authored
- [x] Roadmap/status/phases-README renumbered (25 Founding Contract / 26 Intelligence / 27 Platform); stale-ref grep clean

## Group 1 — CLI mechanics
- [x] 4 foundation templates deleted from core/specs-templates/
- [x] status.md template: Not-founded state + router text
- [x] Historical hash set generated + checked in (frontmatter-normalized; audit: 1 hash per path across ALL history — OKF rev was frontmatter-only)
- [x] upgrade: auto-remove + report; --dry-run preview
- [x] OKF-frontmatter-injected variant matched (test)
- [x] Edited-charter survival (test)
- [x] init success message updated
- [x] tests/founding-contract.test.js green ×4 adapters (12 tests); fingerprints re-baselined ×4
- [x] Verify: full suite green (845/845)

## Group 2 — Command + rules surface
- [x] start-project.md rewritten (founding; inline authoring templates; gate intact) — landed with G1's commit (fingerprint atomicity)
- [x] brainstorm-idea.md routing line
- [x] brainstorm-phase.md founded gate
- [x] start-phase.md founded gate
- [x] validate.md invariant (phases ⟹ founded; step 2b)
- [x] migrate.md audited — foundation docs declared non-gaps; "Founded:" report line
- [x] Rule 1 not-founded routing + navigation note in core/instructions/ (single source, ADR-0004) — all 4 instruction surfaces regenerated
- [x] specs README template updated — landed with G1's commit
- [x] Verify: fingerprints re-baselined ×4; full suite green (845/845)

## Group 3 — Verification, docs, release prep
- [x] e2e evidence captured (fresh init + legacy upgrade) — `evidence/`
- [x] okf check green on fresh init (13-file conformant bundle)
- [x] README founding sentence + site getting-started Step 2 (Found the project) + skills page rewrite; site build green (12 pages + content gate)
- [x] Full suite green ×3 runs (845/845)
- [x] retrospective.md with verification evidence
- [x] Version bump → 0.32.0
- [/] HARD STOP: request operator approval for merge + tag + release + publish

## Release (operator approved 2026-07-06)
- [x] HARD STOP passed — operator approved merge + tag + release + publish
- [x] Merge → main (sentinel-gated); suite green on updated main
- [x] Tag v0.32.0 (evidence-gated) + GitHub Release (--latest)
- [x] npm publish + both surfaces verified
