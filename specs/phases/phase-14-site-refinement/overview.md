# Phase 14 — Site Refinement & Positioning Pivot: Overview

## Vision

Phase 13 (v0.16.0) shipped depth, diagrams, and the orchestration page. On review of the live site, the user flagged six issues: four rendering bugs visible on every visitor's screen, an unfinished positioning pivot (tagline says "agentic AI" but body copy still says "AI-assisted coding"), inconsistent terminology ("repo" everywhere in positioning copy), an unclear relationship between ecosystem mode and orchestration, a new logo direction, and a README that reads dense and doesn't showcase what the product actually does.

**Phase 14 fixes the bugs, completes the positioning pivot started in Phase 13, sharpens the multi-project story by making ecosystem ↔ orchestration explicit as "state layer + action layer," evolves the brand mark, and rewrites the README so GitHub visitors get the same compelling story the site tells.**

The hard discipline: no code behavior changes. The npm package shipping as v0.17.0 is byte-identical to v0.16.0 in `bin/`, `core/`, and `adapters/`. Only content + visuals + small site-tooling fixes change. The CLI regression (`npm test`) must stay green at 246/246.

## Hard invariants

- **No CLI behavior change.** This phase is content + visuals + small site-tooling. `npm test` stays at 246/246. v0.17.0 is a metadata-only npm release.
- **Brand palette + font stay locked.** Indigo + Slate + Inter Variable from Phase 12 carry forward; only the *mark itself* evolves.
- **Augment in place.** Same 10-page IA from Phase 13. No new pages. Sidebar restructure limited to renaming "Multi-repo coordination" → "Multi-project coordination."
- **README does NOT duplicate the site.** It gives GitHub visitors a compelling entry point with links to the site for depth; it's not a copy of every docs page.

## Key Decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Anchor-syntax fix | Add `remark-custom-heading-id` plugin to the Astro markdown pipeline. Keep the `{#scout}` syntax working as authored across `/orchestration/` and any future page that needs explicit anchor IDs. |
| 2 | Mermaid dark-mode strategy | **Drop the `filter: invert()` hack** in `mermaid.css`. Theme Mermaid with brand-tinted neutrals that render legibly on both light and dark backgrounds (indigo for accents, slate-500 for arrows/text/edges). One palette, both modes. Per-theme container styling via CSS vars, not filter. |
| 3 | PhaseFlow animation redesign | **Sequential node-lighting via CSS keyframes** — each node's stroke + halo pulses in turn (brainstorm → plan → execute → verify → release → repeat). No separate pulse circle on the path. Respects `prefers-reduced-motion: reduce` by holding the static state. |
| 4 | `ecosystem.md` MDX leak | Rename `ecosystem.md` → `ecosystem.mdx`. Internal links unchanged (Starlight slug stays `ecosystem`). |
| 5 | Positioning lead copy | Keep tagline "Spec-driven development for agentic AI." Rewrite the LEAD block + about/concepts/getting-started/FAQ so "agentic AI" replaces "AI-assisted coding" wherever it leaks through. |
| 6 | Persona count | Stays at 3 (Solo builder / Tech lead / PM). Copy refreshed for agentic AI tone. **DevOps / Platform engineer persona deferred to ENH-031** — user-confirmed defer; revisit in a future phase. |
| 7 | Terminology shift | "repo" → "project" in positioning copy and sidebar group title. **Stays "repo"** in pure-git contexts (commit, push, branch) + GitHub URLs + CLI examples where the literal arg is a repo. |
| 8 | Ecosystem ↔ Orchestration framing | **Two layers** — Ecosystem = STATE layer (nouns: manifest / initiatives / sessions / pointer blocks); Orchestration = ACTION layer (verbs: scout / dispatch / handoff / continue). Together = canonical multi-project pattern. NEW `StateActionLayers.astro` landing diagram makes the layering explicit. Sidebar group renamed. Both deep pages cross-reference more explicitly in their intros. |
| 9 | New logo mark | Concentric arcs + curved arrow piercing through (user-referenced shape). **Two-tone color treatment**: arcs in slate-400, arrow in indigo-600. Tells the brand story in the mark: "structure underneath, momentum on top." Light/dark adapt cleanly: arcs use `currentColor`; arrow stays brand-indigo. |
| 10 | README rewrite | Wholesale rewrite to mirror the site's storytelling for GitHub visitors. Hero with logo + badges + tagline; quick install; "Works with any AI IDE" matrix; "What you get" 6-feature grid; single ↔ multi-project diagram (Mermaid — GitHub renders natively); orchestration primitives one-liners; "Why momentum exists" paragraph; links to site/npm/LICENSE. Drops the jargon; matches the new positioning. |
| 11 | Roadmap renumber | Site Refinement = 14 (v0.17.0), Reach → 15 (v0.18.0), Intelligence → 16 (v0.19.0), Platform → 17 (v1.0). |
| 12 | Release lifecycle | Phase 14 uses the new `gh release create` step locked in CLAUDE.md Project Extensions via PR #11. Phase ends with all three release surfaces verified (tag + GH release + npm). |

## Information Architecture (unchanged from Phase 13)

The 10-page IA stays. Sidebar group restructure only:

```
Start here:               Getting started · Concepts
Reference:                Skills · Rules · IDE support
Multi-project coordination:  Ecosystem mode · Orchestration   ← was "Multi-repo coordination"
More:                     FAQ · About
```

## Key Deliverables

1. **All four rendering bugs fixed and verified on the live site.**
2. **Positioning pivot complete** — site-wide audit confirms zero unintended "AI-assisted coding" / "your AI coding agent" hits in body copy.
3. **Terminology shifted** — "multi-repo coordination" → "multi-project coordination" sidebar group title + pillar heading + all positioning prose.
4. **NEW `StateActionLayers.astro` landing diagram** showing ecosystem (state layer) under orchestration (action layer); both pages cross-reference explicitly.
5. **New logo system** — mark + wordmark + favicon + OG card all regenerated with the two-tone concentric-arcs-and-arrow design.
6. **Wholesale README rewrite** — hero, badges, install, IDE matrix, feature grid, multi-project diagram, orchestration primitives, philosophy paragraph, links.
7. **v0.17.0 released** — tag + `gh release create --latest` + `npm publish` all verified.

## Acceptance Criteria

1. **No `${#…}` literals** anywhere in rendered pages (grep `dist/` for `${#`).
2. **Mermaid sequence diagrams readable** in both light and dark mode — every arrow, label, message visible. Visual smoke covers all 5 Mermaid diagrams on `/orchestration/` + the state-machine on `/concepts/` + the brainstorm-gate on `/skills/`.
3. **PhaseFlow animation flows** — sequential node lighting visible; no static pulse-circle overlay between nodes. `prefers-reduced-motion: reduce` holds a static state.
4. **`/ecosystem/` renders the topology diagram** — no leaked `import EcosystemTopology …` text; the SVG renders above the fold.
5. **Site-wide audit clean** — `grep -ri "AI-assisted coding\|AI coding agent\|coding agent"` in `site/src/content/docs/` returns 0 hits (except where the historical phrase is quoted/explained explicitly).
6. **Terminology audit clean** — `grep -ri "multi-repo"` in `site/src/content/docs/` + sidebar config returns 0 hits in non-git contexts.
7. **NEW `StateActionLayers.astro` present** on landing between the OrchestrationShowcase and FeatureGrid sections (or wherever Group 4 lands it).
8. **Persona count = 3** (DevOps deferred to ENH-031).
9. **New logo present** at `site/src/assets/logo/mark.svg`, `wordmark.svg`, `site/public/favicon.svg`, and OG card; previous Velocity Arc removed; visual review confirms two-tone treatment in both light + dark.
10. **README rewritten** — hero banner, badges, install code block, IDE matrix, feature grid, multi-project Mermaid diagram, orchestration primitives, "Why momentum exists" paragraph, footer links.
11. **Lighthouse landing ≥ 90** across all four categories (no regression from v0.16.0's 96/96/100/100).
12. **linkinator on live site: 0 broken**.
13. **CLI regression: `npm test` 246/246 still pass**.
14. **GH release created** for v0.17.0 (`gh release list --limit 3` shows it as Latest) + **npm publish v0.17.0** succeeds.

## Scope (Out — Non-Goals)

- **Brand palette / font change** — Indigo + Slate + Inter stay locked.
- **IA restructure beyond renaming the "Multi-project coordination" sidebar group.** No new pages.
- **CLI behavior changes** — metadata-only release.
- **Cursor / Gemini CLI adapters** — that's Phase 15 (Reach).
- **DevOps / Platform engineer persona** — deferred to ENH-031.
- **Per-page OG cards** — single default card carries every page.
- **Documentation versioning.**
- **i18n / translations.**
- **Custom domain.**
- **Mermaid client-side runtime** — sticking with build-time inline-svg via Playwright/Chromium.
