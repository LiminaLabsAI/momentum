---
type: Task List
---

# Phase 14 — Site Refinement & Positioning Pivot: Tasks

> Granular checklist mirroring `plan.md`. Mark `[x]` complete, `[/]` in progress, `[ ]` not started.

## Group 0 — Foundations + tooling fixes (Sequential)

- [x] Renumber `specs/planning/roadmap.md` — Site Refinement = 14, Reach = 15, Intelligence = 16, Platform = 17 (Timeline + Dependencies + Milestones)
- [x] Update `specs/status.md` Upcoming Phases + Active Phase → Phase 14 — Site Refinement
- [x] Update `specs/phases/README.md` — append Phase 14 row, status In Progress
- [x] Update `specs/phases/index.json` — add `phase-14-site-refinement` entry with topic keywords
- [x] `npm install -D remark-custom-heading-id` in `/site`
- [x] Wire `remark-custom-heading-id` into `astro.config.mjs` `markdown.remarkPlugins`
- [x] Verified: `/orchestration/` has `id="scout"`, `id="dispatch"`, `id="handoff"`, `id="continue"` headings; 0 literal `${#...}` leaks
- [x] Rename `site/src/content/docs/ecosystem.md` → `ecosystem.mdx`
- [x] Verified: `/ecosystem/` renders `EcosystemTopology` SVG (2 matches in HTML); 0 leaked `import EcosystemTopology` text
- [x] Capture word-count baseline → `artifacts/wc-baseline.txt` (14,873 docs + 2,222 README)
- [x] Smoke build green: 11 pages, Pagefind 22 HTML files
- [ ] Commit Group 0: `infra(site): heading-id plugin + roadmap renumber + ecosystem.mdx rename`

## Group 1 — Rendering bug fixes (Parallel with G2, G3, G4, G5)

- [x] Anchor syntax verified (Group 0): `/orchestration/` has all four heading IDs (`scout`, `dispatch`, `handoff`, `continue`); 0 literal `${#...}` leaks
- [/] Inline-link resolution via linkinator smoke — deferred to Group 7 post-merge
- [x] Rewrote `mermaidConfig.themeVariables` in `astro.config.mjs` — added full sequence-diagram-specific palette (actor lines, signal color, label box, note bg, activation, state-diagram tokens — all missing before, which is why dark-mode arrows disappeared)
- [x] Rewrote `site/src/styles/mermaid.css` — dropped `filter: invert(0.88) hue-rotate(180deg) saturate(1.1)`; replaced with per-theme container backgrounds (light surface in BOTH modes so Mermaid's baked-in slate-900 text + slate-600 arrows stay readable)
- [/] Visual verify Mermaid in light + dark — deferred to Group 7 (manual on live site)
- [x] Removed `<animateMotion>` + `mpath` + `pf-pulse` circle from `PhaseFlow.astro`
- [x] Added CSS keyframes `pf-halo-pulse` + `pf-body-pulse` — each node pulses in turn via `animation-delay: calc(var(--i, 0) * 1.5s)`; 7.5s cycle
- [x] Added `style="--i: N"` to each of the 5 nodes (0–4) via Astro component
- [x] `@media (prefers-reduced-motion: no-preference)` gates the animation — reduced-motion holds static state
- [/] Visual verify PhaseFlow animation — deferred to Group 7 (live preview)
- [x] `ecosystem.mdx` verified Group 0 — topology renders, no leaked import
- [x] Smoke build green: 11 pages, Pagefind 22 HTML files
- [ ] Commit Group 1: `fix(site): mermaid dark mode + phaseflow animation`

## Group 2 — Positioning pivot (Parallel with G1, G3, G4, G5)

- [x] `index.mdx` lead block rewritten — "state layer for agentic AI" framing + coding/infra/research/pipelines scope mention
- [x] `about.md` "Why momentum exists" rewritten — "agentic AI" replaces "AI-assisted coding"; examples broadened to infra / research / data pipelines
- [/] `about.md` "A note on positioning" already aligned (will absorb terminology shift in Group 3)
- [x] `concepts.md` tone pass — "AI-assisted coding" → "Agentic AI work"
- [x] `getting-started.md` intro signals breadth — "open-source state layer for agentic AI"; one-paragraph callout that the loop applies to infra / research / data agents
- [x] `faq.md` — NEW Q&A: "Can I use momentum for non-coding agents (DevOps, research, data)?" with 3 concrete examples (infra agents, research agents, data-pipeline agents)
- [x] `Personas.astro` copy refresh — 3 personas (Solo / Tech lead / "PM exploring agentic AI"); language updated
- [x] `FeatureGrid.astro` "your AI agent runs" → "your agent runs"
- [x] `skills.md` intro "your AI agent runs" → "your agent runs"
- [x] `ecosystem.mdx` description "AI agent session" → "agent session" + "multiple related repos" → "multiple related projects"
- [x] Site-wide audit clean: grep for `AI-assisted coding | AI coding agent | coding agent` returns only the new FAQ heading (intentional)
- [x] Smoke build green
- [ ] Commit Group 2: `feat(site): pivot to agentic AI positioning site-wide`

## Group 3 — Terminology shift (Parallel with G1, G2, G4, G5)

- [x] Sidebar group title in `astro.config.mjs`: "Multi-repo coordination" → "Multi-project coordination"
- [x] Landing pillar / `OrchestrationShowcase.astro` heading eyebrow → "Multi-project coordination"
- [x] `concepts.md` — multi-repo → multi-project; across repos → across projects (sed batch)
- [x] `ecosystem.mdx` — same (description + body)
- [x] `orchestration.md` — same
- [x] `about.md` — same + "What's next" roadmap table renumbered (15 Reach / 16 Intelligence / 17 Platform)
- [x] `rules.md` — "Multi-repo projects (cross-repo guard)" → "Multi-project projects (cross-project guard)" (sed batch)
- [x] `skills.md` — same
- [x] `getting-started.md` — same
- [x] CLI / git contexts unchanged: `git commit/push/branch`, GitHub URLs, literal `repo-x` in CLI examples (audit confirms)
- [x] Audit: `grep -rn "multi-repo\|cross-repo\|across repos\|Multi-repo"` in `site/src/content/docs/` + `site/src/components/` + `astro.config.mjs` returns ZERO non-git hits
- [x] Smoke build green
- [ ] Commit Group 3: `refactor(site): repo → project in positioning copy`

## Group 4 — Ecosystem ↔ Orchestration clarity (Parallel with G1, G2, G3, G5)

- [x] NEW `site/src/components/diagrams/StateActionLayers.astro` — pure SVG + brand tokens, 800x440 viewBox
- [x] StateActionLayers — top half ACTION layer (4 verb cards: scout/dispatch/handoff/continue) with eyebrow "ACTION LAYER · ORCHESTRATION"
- [x] StateActionLayers — bottom half STATE layer (4 chips: ecosystem.json / initiatives/ / sessions/ / pointer blocks) on accent-tinted surface with eyebrow "STATE LAYER · ECOSYSTEM MODE"
- [x] StateActionLayers — dashed arrows from each verb down to corresponding state chip with arrow markers
- [x] StateActionLayers — "reads + writes" pill in the gap between layers
- [x] StateActionLayers — caption below diagram summarizing the relationship
- [x] StateActionLayers — mobile responsive via SVG width:100% (auto-scales)
- [x] `OrchestrationShowcase.astro` restructure — outer h2 "Work across multiple projects"
- [x] OrchestrationShowcase — sub-feature 1 article: "State layer · Ecosystem mode" with link to `/ecosystem/`
- [x] OrchestrationShowcase — `<StateActionLayers />` embedded between sub-features
- [x] OrchestrationShowcase — sub-feature 2 article: "Action layer · Orchestration primitives" leading the 4-primitive grid
- [x] `ecosystem.mdx` intro rewritten — leads with "**state layer** for multi-project work" + cross-link to `/orchestration/` + pair-not-alternatives framing
- [x] `orchestration.md` intro rewritten — leads with "**action layer** for multi-project work" + cross-link to `/ecosystem/` + pair-not-alternatives framing
- [x] `concepts.md` Ecosystem section — NEW "How they relate" subsection explaining state/action split with dual cross-links
- [x] Verified: 5 `/orchestration/` cross-links on ecosystem page; 4 `/ecosystem/` cross-links on orchestration page
- [x] Smoke build green: 11 pages, StateActionLayers rendered with both eyebrow labels in dist/index.html
- [ ] Commit Group 4: `feat(site): ecosystem ↔ orchestration as state layer + action layer + new diagram`

## Group 5 — New logo + identity asset refresh (Parallel with G1, G2, G3, G4)

- [x] `site/src/assets/logo/mark.svg` — 3 concentric arcs (slate-400 stroked) + curved arrow piercing through (indigo-600 stroke + arrowhead fill)
- [x] mark — viewBox `0 0 64 64`; single SVG with `.arcs` group + arrow body + arrow head; explicit hex colors (slate-400 #94A3B8 / indigo-600 #4F46E5)
- [x] `site/src/assets/logo/wordmark.svg` — 260x64 wordmark with mark on left + "momentum" Inter Variable semibold slate-700
- [x] `site/public/favicon.svg` — same mark + `prefers-color-scheme: dark` media query lifts to slate-300 + indigo-400 for dark visibility
- [x] `site/src/components/Logo.astro` — inline SVG matching new mark; wordmark text uses `currentColor`; arcs/arrow have explicit hex with `[data-theme='dark']` CSS overrides
- [x] `site/src/components/LogoMark.astro` — mark-only variant (64x64) with same dark-theme CSS overrides
- [x] `site/src/assets/og/og-template.svg` — replaced Velocity Arc with new mark (scaled 8x); tagline updated to "Spec-driven development for agentic AI"; footer reads "Phases · Decisions · History · Backlog · Multi-project orchestration"
- [x] OG card PNG regenerated (35KB) via prebuild script — `public/og/default.png` present
- [/] Visual verify (header / favicon / OG preview in browser) — deferred to Group 7 post-merge
- [x] No residual Velocity Arc paths — grepped `site/src/`, no Velocity-Arc-specific paths remain
- [x] Smoke build green: 11 pages, wordmark SVG in dist
- [ ] Commit Group 5: `feat(site): new logo — concentric arcs + arrow, two-tone treatment`

## Group 6 — README rewrite (Sequential, after Groups 1–5)

- [x] Header `<div align="center">` with wordmark SVG (relative path so GitHub renders it) + tagline + 3 badges (npm version, license, "site" custom)
- [x] Quick install code block — `npx @avinash-singh-io/momentum init` + per-adapter variants + ecosystem
- [x] "Works with any AI IDE" 5-row table: Claude Code / Codex / Antigravity (Shipped) + Cursor / Gemini CLI (Planned, Phase 15)
- [x] "What you get" 6-feature 2-column markdown table (Phases / Backlog / History / Rules / Skills / Multi-project)
- [x] "Single project ↔ Multi-project ecosystem" Mermaid `flowchart LR` block (GitHub renders natively) — two subgraphs + brand-colored styles
- [x] "Orchestration primitives" — 4 one-liner descriptions + link to deep page
- [x] "The 13 autonomous rules" callout with 3 standouts (Rule 6/8/12) + link
- [x] "Why momentum exists" — 2 short paragraphs (thesis + discipline-as-differentiator)
- [x] "Docs" — bullet list of links to site sections (Getting started / Concepts / Skills / Rules / Multi-project / FAQ)
- [x] Contributing section + License
- [x] README at 136 lines / 820 words (well under the ≤ 250 line target)
- [/] Verify GitHub renders Mermaid + SVG image + tables — deferred to Group 7 post-merge (push to main triggers GitHub README rendering)
- [x] Commit Group 6: `docs: README wholesale rewrite — agentic AI positioning + visual features showcase`

## Group 7 — Verification + v0.17.0 release (Sequential, final)

- [ ] Fresh-clone smoke build: `cd site && rm -rf dist .astro && npm ci && npm run build` exits 0
- [ ] All 7 Mermaid diagrams render to inline SVG (light + dark): phase lifecycle, brainstorm-gate, 5 orchestration sequences
- [ ] Anchor smoke: `grep '\${#' dist/orchestration/index.html` returns 0 hits
- [ ] Site-wide content audit: `grep -ri "AI-assisted coding"` in `site/src/content/docs/` returns 0 (non-historical)
- [ ] Terminology audit: `grep -ri "multi-repo"` in `site/src/content/docs/` returns 0 (non-git contexts)
- [ ] Manual visual check: theme toggle on every page; Mermaid arrows visible in BOTH light + dark
- [ ] Manual visual check: PhaseFlow nodes pulse sequentially; no overlay collision
- [ ] Manual visual check: ecosystem topology renders above the fold on `/ecosystem/`
- [ ] CLI regression: `npm test` on Node 20 → 246/246 pass
- [ ] Tarball-shape: `npm pack --dry-run` confirms `/site` excluded (81 files, 0 site/)
- [ ] No-shrinkage check: every page word count ≥ 70% of Group 0 baseline (sanity guard against accidental content loss in rewrites)
- [ ] `package.json` version → 0.17.0
- [ ] Write `retrospective.md` per Phase 13 precedent (Rule 12 evidence + acceptance + what worked / what could be better + deviations + discoveries + recommendation for Phase 15)
- [ ] `specs/status.md` — Phase 14 → Complete; Latest Release → v0.17.0; Active Phase cleared; Next Actions → `/brainstorm-phase` Phase 15; Recent Changes appended
- [ ] `specs/phases/README.md` — Phase 14 → Complete (v0.17.0)
- [ ] `specs/phases/index.json` — phase-14-site-refinement status → complete
- [ ] `specs/changelog/2026-06.md` — Phase 14 close entry
- [ ] Push branch + open PR phase-14 → main
- [ ] User-approved merge
- [ ] After merge: deploy runs (Playwright/Chromium already preloaded from Phase 13)
- [ ] Run `linkinator` on live site: 0 broken across 11 pages
- [ ] Run `lighthouse` on live landing: ≥ 90 across Perf / A11y / BP / SEO
- [ ] Save Lighthouse JSON → `artifacts/lighthouse-landing.json`
- [ ] Append post-merge evidence to `retrospective.md`
- [ ] Tag `v0.17.0` on main; push tag
- [ ] `gh release create v0.17.0 --title "v0.17.0 — Phase 14: Site Refinement & Positioning Pivot" --notes <body> --latest --verify-tag` (per CLAUDE.md Release Checklist)
- [ ] `npm publish --access public` (USER-APPROVED per CLAUDE.md Project Extension)
- [ ] Verify three surfaces: `gh release list` shows v0.17.0 Latest; `npm view @avinash-singh-io/momentum version` returns 0.17.0; live site shows new content
- [ ] Commit Group 7: `docs: Phase 14 retrospective + v0.17.0 release prep`
