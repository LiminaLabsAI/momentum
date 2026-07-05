---
type: Retrospective
---

# Phase 14 — Site Refinement & Positioning Pivot: Retrospective

> Written at `/complete-phase` time, after Group 7 verification and bookkeeping.
> Captures evidence, what worked, what could have been better, and a
> recommendation for the next phase.

## Release

| Field | Value |
| --- | --- |
| Version | **v0.17.0** |
| Date | 2026-06-08 |
| Branch | `phase-14-site-refinement` |
| Live site | <https://trymomentum.github.io/> |
| npm package | `@avinash-singh-io/momentum@0.17.0` |

## Evidence (Rule 12 — verify before claim)

```
$ npm test
1..246  # pass 246  # fail 0  # skipped 0
duration_ms 10803.108
✓ CLI regression — matches v0.16.0 baseline exactly (after the
  readme-examples.test.js fix for the env-var docs check)

$ cd site && npm run build
✓ 11 pages built (unchanged from v0.16.0)
✓ All Mermaid blocks render to inline SVG with brand colors
✓ StateActionLayers diagram (NEW) renders on landing
✓ Pagefind: 22 HTML files indexed
✓ Sitemap clean

$ grep -c '\${#' dist/orchestration/index.html
0   (anchor syntax fix verified — was the v0.16.0 visible bug)

$ grep -oE 'id="(scout|dispatch|handoff|continue)"' dist/orchestration/index.html
id="scout"
id="dispatch"
id="handoff"
id="continue"   (all four anchors render as proper IDs)

$ grep -c "import EcosystemTopology" dist/ecosystem/index.html
0   (ecosystem MDX leak fixed via .md → .mdx rename)
```

Post-merge verifications (deferred until v0.17.0 deploys to live):

- linkinator on live site
- Lighthouse landing (≥ 90 across all 4 categories)
- Mermaid diagrams in both light + dark mode (visual)
- PhaseFlow sequential node lighting animation (visual)
- New logo in header / favicon / OG card preview (visual)
- README rendering on GitHub (Mermaid block + SVG image + tables + badges)

## Acceptance criteria status

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | No `${#…}` literals anywhere | ✅ | grep on dist returns 0 |
| 2 | Mermaid sequence diagrams readable in both modes | ⏳ | structural fix landed; visual verify post-merge |
| 3 | PhaseFlow animation flows (sequential lighting, no overlay) | ⏳ | redesigned; visual verify post-merge |
| 4 | `/ecosystem/` renders topology diagram, no leaked import | ✅ | grep verified post-build |
| 5 | Site-wide audit: 0 "AI-assisted coding" unintended hits | ✅ | grep verified |
| 6 | Terminology audit: 0 "multi-repo" hits in non-git contexts | ✅ | grep verified |
| 7 | NEW `StateActionLayers` on landing | ✅ | grep verified in dist/index.html |
| 8 | Persona count = 3 (DevOps deferred) | ✅ | Personas.astro unchanged in count |
| 9 | New logo present (mark / wordmark / favicon / OG) | ✅ | 6 assets regenerated; OG PNG 35KB |
| 10 | README rewritten ≤ 250 lines with badges + Mermaid + features | ✅ | 136 lines / 820 words |
| 11 | Lighthouse landing ≥ 90 across 4 categories | ⏳ | post-merge run; v0.16.0 baseline 96/96/100/100 |
| 12 | linkinator: 0 broken | ⏳ | post-merge run |
| 13 | CLI regression: 246/246 still pass | ✅ | Fresh run today |
| 14 | GH release created + npm publish v0.17.0 | ⏳ | awaiting user approval at merge gate |

## What worked

- **Two of the four rendering bugs fixed in Group 0 alone** — `remark-custom-heading-id` plugin + `.md` → `.mdx` rename were one-shot fixes. The other two (Mermaid dark mode + PhaseFlow animation) needed redesigns but landed cleanly in Group 1.
- **The structural Mermaid fix (theme variables, not filter)** is genuinely better than the Phase 13 invert-hack. The diagram colors are baked once, work in both themes via a contrasting container, and don't need per-theme rebuilds. Should have been the original approach.
- **Bulk sed terminology shift** handled 27 hits across 10 files cleanly without touching git/CLI contexts. The exclusion patterns (left `git commit/push/branch`, GitHub URLs, CLI placeholder `repo-x` alone) held up.
- **State layer + action layer framing** is the right conceptual model. The NEW `StateActionLayers.astro` diagram makes the relationship visual: top-half verbs, bottom-half nouns, arrows showing the read/write flow. Both deep pages now reframe themselves as a pair in their intros — no more user confusion about whether they're the same thing.
- **The new logo's two-tone treatment** tells the brand story in the mark itself. Slate arcs (structure / phases) + indigo arrow (momentum) reads at every size from favicon to OG card.
- **README rewrite turned a 361-line jargon dump into 136 lines of visual showcase.** GitHub-native Mermaid rendering means we get a diagram in the README without committing a static image. SVG wordmark renders inline via relative path.

## What could have been better

- **CLI regression caught one test failure** — `readme-examples.test.js` checked the old README contract that included `MOMENTUM_MAX_PARENT_WALK` env var docs. New lean README moved that to the canonical `core/ecosystem/layout.md`. Should have anticipated this when scoping the README rewrite and updated the test in Group 6 (proactive) rather than discovering it in Group 7 (reactive). One-line fix; didn't block release.
- **Mermaid theme tuning was iterative.** First pass left many sequence-diagram-specific tokens (actorLineColor, signalColor, etc.) unset, so Mermaid fell back to its `theme:base` defaults. The Phase 13 invert hack was masking this — once dropped, the gaps became visible. Should have been more thorough in initial themeVariables on Phase 13.
- **PhaseFlow animation took two redesigns to land cleanly.** First Phase 13 design used `<animateMotion>` + `<mpath>` (bug). Phase 14 redesign used CSS keyframes + staggered animation-delay (working). Could have started with the simpler CSS approach in Phase 13.
- **No visual verification mid-phase.** Phases 12-13 also deferred visual checks to post-merge, but with 4 explicit visual bugs in scope (Mermaid dark, PhaseFlow, logo, README rendering), more rigorous mid-phase preview would have caught any layout/spacing issues before merge. Not a blocker — local preview was clean — but worth noting.

## Deviations from plan

- **README test failure required a test update.** Plan didn't anticipate that the existing `readme-examples.test.js` had a documentation-contract assertion against the OLD README. Updated the test in Group 7 to check `core/ecosystem/layout.md` (canonical home for ecosystem internals) instead. Net positive — the test is now more robust to README-style changes.
- **Group 6 README rewrite landed under the 250-line cap by a wide margin** (136 lines / 820 words). The cap was a guard against jargon; the actual constraint that mattered was "every section earns its space," which produced a tighter result.
- **All groups executed sequentially in this session** rather than truly in parallel — the plan declared 1-5 as parallel, but context budget made sequential execution more practical. The independence guarantee held (no group blocked any other), so the wall-clock saving from parallelism would have been ~30% best-case; not worth the context budget overhead.

## Discoveries

- **MOMENTUM_MAX_PARENT_WALK docs lived only in README** — a documentation-only assertion that broke when the README scope changed. Filed implicitly in this retrospective; the fix (test update) is already in.
- **Mermaid's `theme: 'base'` requires ALL sequence-diagram-specific tokens explicitly set** — defaults fall back to near-white which gets eaten by invert filters. Documented in history.md as part of the Group 1 decision so the next phase that touches Mermaid theming has the gotcha visible.
- **No new backlog items filed in Phase 14.** Like Phase 13, this was a content + polish + visual phase; no surprise bugs surfaced beyond the one test update.

## Recommendation for next phase

**Phase 15 — Reach** (target v0.18.0). Cursor adapter (FEAT-007), Gemini CLI adapter (FEAT-008), ENH-009 distribution decision. The site, README, and IDE matrix all now list both Cursor and Gemini CLI as "Planned (Phase 15)"; shipping Phase 15 flips both badges to "Shipped" and the per-IDE deep dives on `/ide-support/` + README table gain real content.

Phase 15 is also a natural moment to revisit:
- Whether the DevOps / Platform engineer persona (deferred as ENH-031) should land alongside the broader adapter coverage
- ENH-030 (upstream `/complete-phase` template gains the `gh release create` step) — could be picked up as a small chore alongside Reach
