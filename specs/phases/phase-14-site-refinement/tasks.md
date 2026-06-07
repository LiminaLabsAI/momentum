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

- [ ] `index.mdx` lead block rewritten — "state layer for agentic AI" framing
- [ ] `about.md` "Why momentum exists" rewritten — broader examples (infra / research / ops, coding as concrete-today)
- [ ] `about.md` "A note on positioning" updated — wider agentic AI scope acknowledged
- [ ] `concepts.md` tone pass — "AI-assisted coding" → "agentic AI" throughout
- [ ] `getting-started.md` intro signals breadth — one-line acknowledgment that the loop works for non-coding agents
- [ ] `faq.md` — NEW Q&A: "Can I use momentum for non-coding agents (DevOps, research, data agents)?"
- [ ] `Personas.astro` copy refresh — 3 personas (Solo / Tech lead / PM) language updated; no 4th persona
- [ ] `OrchestrationShowcase.astro` / `RulesCallout.astro` / `SkillsPreview.astro` — "your AI coding agent" → "your agent" where applicable
- [ ] Site-wide audit: `grep -ri "AI-assisted coding\|AI coding agent\|coding agent\|just for coding"` in `site/src/content/docs/` returns 0 hits (apart from historical-quote contexts)
- [ ] Smoke build green
- [ ] Commit Group 2: `feat(site): pivot to agentic AI positioning site-wide`

## Group 3 — Terminology shift (Parallel with G1, G2, G4, G5)

- [ ] Sidebar group title in `astro.config.mjs`: "Multi-repo coordination" → "Multi-project coordination"
- [ ] Landing pillar / `OrchestrationShowcase.astro` heading → "Work across multiple projects"
- [ ] `concepts.md` — "across repos" → "across projects" in positioning prose
- [ ] `ecosystem.mdx` — same
- [ ] `orchestration.md` — same
- [ ] `about.md` — same
- [ ] `faq.md` — same
- [ ] CLI / git contexts left unchanged (audit): `git commit/push/branch`, GitHub URLs, literal `repo-x` placeholders in CLI examples
- [ ] Audit: `grep -ri "multi-repo\|cross-repo coordination"` in `site/src/content/docs/` + `site/astro.config.mjs` + `site/src/components/` returns 0 hits in non-git contexts
- [ ] Smoke build green
- [ ] Commit Group 3: `refactor(site): repo → project in positioning copy`

## Group 4 — Ecosystem ↔ Orchestration clarity (Parallel with G1, G2, G3, G5)

- [ ] NEW `site/src/components/diagrams/StateActionLayers.astro` — pure SVG + brand tokens
- [ ] StateActionLayers — top half ACTION layer (4 verb cards: scout/dispatch/handoff/continue)
- [ ] StateActionLayers — bottom half STATE layer (ecosystem.json + initiatives + sessions + pointer blocks surface)
- [ ] StateActionLayers — connecting arrows from verbs down to state
- [ ] StateActionLayers — eyebrow text "ACTION LAYER" / "STATE LAYER" in monospace slate-500
- [ ] StateActionLayers — mobile: collapses to single-column
- [ ] `OrchestrationShowcase.astro` restructure — outer heading "Work across multiple projects"
- [ ] OrchestrationShowcase — sub-feature 1: "Ecosystem mode — the state layer" with link to `/ecosystem/`
- [ ] OrchestrationShowcase — sub-feature 2: "Orchestration — the action layer" with 4-primitive grid
- [ ] OrchestrationShowcase — embed `<StateActionLayers />` between the two sub-features
- [ ] `ecosystem.mdx` intro (first 2 paragraphs) rewritten — leads with "state layer for multi-project work" + cross-link to `/orchestration/`
- [ ] `orchestration.md` intro (first 2 paragraphs) rewritten — leads with "action layer for multi-project work" + cross-link to `/ecosystem/`
- [ ] `concepts.md` Ecosystem mode section — add "How they relate" subsection with state/action split + dual cross-links
- [ ] Both deep pages cross-reference each other in intro AND closer "See also" blocks
- [ ] Smoke build green
- [ ] Commit Group 4: `feat(site): ecosystem ↔ orchestration as state layer + action layer + new diagram`

## Group 5 — New logo + identity asset refresh (Parallel with G1, G2, G3, G4)

- [ ] `site/src/assets/logo/mark.svg` — concentric arcs (slate-400) + curved arrow piercing through (indigo-600)
- [ ] mark — viewBox `0 0 64 64`; two `<g>` groups (`.arcs` + `.arrow`); arcs use `currentColor`, arrow stays brand-indigo
- [ ] `site/src/assets/logo/wordmark.svg` — mark + "momentum" wordmark in Inter Variable semibold
- [ ] `site/public/favicon.svg` — simplified mark + `prefers-color-scheme: dark` media query swap
- [ ] `site/src/components/Logo.astro` — inline SVG matching new mark
- [ ] `site/src/components/LogoMark.astro` — mark-only variant for tight spaces
- [ ] `site/src/assets/og/og-template.svg` — replace Velocity Arc with new mark
- [ ] Visual verify: Starlight header logo in light + dark
- [ ] Visual verify: browser tab favicon in light + dark
- [ ] Visual verify: OG card preview (opengraph.xyz debugger) after `prebuild` regenerates `public/og/default.png`
- [ ] No residual Velocity Arc paths in `site/src/` (search audit)
- [ ] Smoke build green
- [ ] Commit Group 5: `feat(site): new logo — concentric arcs + arrow, two-tone treatment`

## Group 6 — README rewrite (Sequential, after Groups 1–5)

- [ ] Header `<div align="center">` with wordmark SVG + tagline + badges (npm version, license, "Visit the site →")
- [ ] Quick install code block — `npx @avinash-singh-io/momentum init`
- [ ] "Works with any AI IDE" 5-row table: Claude Code / Codex / Antigravity (Shipped) + Cursor / Gemini CLI (Planned, Phase 15)
- [ ] "What you get" 6-feature grid: Phases / Backlog / History / Rules / Skills / Multi-project (ecosystem + orchestration)
- [ ] "Single project ↔ Multi-project ecosystem" Mermaid `flowchart LR` block (GitHub renders natively)
- [ ] "Orchestration primitives" — 4 one-liner descriptions + link to deep page
- [ ] "Why momentum exists" — 1 paragraph (~3 sentences)
- [ ] "Docs" — bullet list of links (site sections + npm + LICENSE)
- [ ] README ≤ 250 lines total
- [ ] Verify GitHub renders Mermaid block, SVG image, table — push to draft branch and preview if uncertain
- [ ] Badges resolve: npm shields URL valid, license badge valid, site link 200
- [ ] Commit Group 6: `docs: README wholesale rewrite — agentic AI positioning + visual features showcase`

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
