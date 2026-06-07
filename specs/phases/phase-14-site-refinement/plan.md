# Phase 14 — Site Refinement & Positioning Pivot: Plan

## Execution Order

```
# Mixed: Group 0 → (Groups 1 + 2 + 3 + 4 + 5 in parallel) → Group 6 → Group 7
```

Group 0 lands the foundation: roadmap renumber, heading-id plugin, ecosystem MDX rename. Groups 1 (rendering bug fixes), 2 (positioning pivot), 3 (terminology), 4 (ecosystem ↔ orchestration), and 5 (new logo) are independent file-set work and run in parallel. Group 6 (README rewrite) consumes the locked outputs from Groups 2/3/4/5 and the new logo from Group 5, so it sequences after the parallel batch. Group 7 verifies + releases v0.17.0.

---

## Group 0 — Foundations + tooling fixes (Sequential)

**Sequential.** Blocks all downstream groups.

External deps: Node 22 (already pinned), npm package `remark-custom-heading-id`.

**Commit:** `infra(site): heading-id plugin + roadmap renumber + ecosystem.mdx rename`

### Tasks

- Renumber roadmap: Site Refinement = 14 (v0.17.0), Reach → 15 (v0.18.0), Intelligence → 16 (v0.19.0), Platform → 17 (v1.0). Update `specs/planning/roadmap.md` (Timeline + Dependencies + Milestones), `specs/status.md` (Upcoming Phases + Active Phase), `specs/phases/README.md` (insert Phase 14 In Progress), `specs/phases/index.json` (add `phase-14-site-refinement` entry with topic keywords).
- Install `remark-custom-heading-id` in `/site`: `npm install -D remark-custom-heading-id`. Wire into `astro.config.mjs` `markdown.remarkPlugins`.
- Smoke-test heading-id plugin: confirm `## scout — read-only context fetch {#scout}` in any page now produces `<h2 id="scout">`. Sample with a temporary heading; remove before commit.
- Rename `site/src/content/docs/ecosystem.md` → `site/src/content/docs/ecosystem.mdx`. Starlight slug stays `ecosystem`. Verify `/ecosystem/` still routes correctly (Astro picks .mdx automatically).
- Capture word-count baseline for pages that will be rewritten this phase (`index.mdx`, `about.md`, `concepts.md`, `getting-started.md`, `ecosystem.mdx`, `orchestration.md`, `faq.md`) into `specs/phases/phase-14-site-refinement/artifacts/wc-baseline.txt`. Group 7 sanity-checks (no minimum target — quality over count for this phase).
- Smoke build: `cd site && npm run build` green; 11 pages still build; no MDX errors.

---

## Group 1 — Rendering bug fixes (Parallel with G2, G3, G4, G5)

**Parallel.** Depends only on Group 0 (plugin + MDX rename).

External deps: none beyond Group 0.

**Commit:** `fix(site): anchor syntax + mermaid dark mode + phaseflow animation`

### Tasks

- **Anchor syntax**: with the heading-id plugin from Group 0 active, smoke `/orchestration/` — all four anchors (`{#scout}`, `{#dispatch}`, `{#handoff}`, `{#continue}`) render as `<h2 id="…">…</h2>`, NOT literal text. TOC sidebar shows clean headings. Inline links (`OrchestrationShowcase` component points to `/orchestration/#scout` etc.) all 200 OK from `linkinator` smoke.
- **Mermaid theme overhaul**:
  - Rewrite `site/astro.config.mjs` `markdown.rehypePlugins[0][1].mermaidConfig.themeVariables` to use a single neutral palette that works on BOTH light and dark backgrounds: `primaryColor` light-indigo, `primaryBorderColor` indigo-600, `lineColor` slate-500, `textColor` slate-900 (legible on both via CSS-var override in container), `secondaryColor` slate-100, etc.
  - Rewrite `site/src/styles/mermaid.css`: **drop `filter: invert(0.88) hue-rotate(180deg) saturate(1.1)`**. Replace with per-theme container styling via CSS vars: light theme → light surface; dark theme → slate-800 surface, slightly raised border. The Mermaid SVG renders the SAME in both themes — only the container around it adapts.
  - Verify: open every Mermaid diagram (phase lifecycle on `/concepts/`, brainstorm-gate on `/skills/`, 5 sequences on `/orchestration/`) in both light + dark; all arrows + labels + messages visible.
- **PhaseFlow redesign**:
  - Remove `<animateMotion>` + the `mpath` path + the `<circle class="pf-pulse">` from `site/src/components/diagrams/PhaseFlow.astro`.
  - Add a CSS keyframe animation: each node (`<g class="pf-node">`) gets an animation-delay so the stroke + a soft halo pulse in turn. 1.5s per node, 7.5s total cycle, infinite.
  - Use `data-i` attribute on each node (0–4); CSS `animation-delay: calc(var(--i, 0) * 1.5s)`.
  - `@media (prefers-reduced-motion: reduce)`: drop the animation; keep nodes static.
  - Visual smoke: open landing; nodes pulse left-to-right cleanly; no overlay collision.
- **ecosystem.mdx**: verify the page now renders the `<EcosystemTopology />` SVG above the fold; no leaked `import EcosystemTopology …` text (Group 0's rename should have fixed this; this is the smoke check).
- Final smoke build green; all 4 bugs visibly fixed in local preview.

---

## Group 2 — Positioning pivot (Parallel with G1, G3, G4, G5)

**Parallel.** Depends only on Group 0.

External deps: none.

**Commit:** `feat(site): pivot to agentic AI positioning site-wide`

### Tasks

- **`index.mdx` lead block**: rewrite to lead with "momentum is the **state layer for agentic AI** — phases, decisions, history, backlog — first-class across any agentic workflow." Keep the install snippet + PhaseFlow diagram below the lead.
- **`about.md`**: rewrite "Why momentum exists" + "A note on positioning" to broaden examples beyond coding. Explicitly call out that agentic AI is wider than coding — infrastructure, research, data, ops. Keep coding as the most-developed concrete example today; signal the breadth.
- **`concepts.md`**: tone shift — "AI-assisted coding" → "agentic AI" throughout. The 5 primitives (phases / backlog / history / ADRs / ecosystem mode) descriptions stay accurate; only the surrounding positioning prose changes.
- **`getting-started.md`**: intro paragraph signals breadth without losing the concrete coding example. Tutorial steps remain coding-flavored (because that's the most teachable path today); a one-line "the same loop applies to infra-managing agents, research agents, etc." sits near the top.
- **`faq.md`**: add ONE new Q&A — **"Can I use momentum for non-coding agents (DevOps, research, data agents)?"** Short answer: yes; the discipline (phases, decisions, history) is domain-agnostic; the coding-flavored slash commands are examples, not requirements.
- **Personas refresh** in `site/src/components/Personas.astro`: keep the 3 existing (Solo builder, Tech lead, PM) — copy refreshed so they don't say "AI-assisted coding," just "agentic AI."
- **`OrchestrationShowcase.astro` / `RulesCallout.astro` / `SkillsPreview.astro`**: copy review pass — "agent" not "AI coding agent" / "your coding agent."
- Site-wide audit before committing: `grep -ri "AI-assisted coding\|AI coding agent\|coding agent\|just for coding"` in `site/src/content/docs/` returns 0 hits (other than explicit historical quotes).

---

## Group 3 — Terminology shift (Parallel with G1, G2, G4, G5)

**Parallel.** Depends only on Group 0.

External deps: none.

**Commit:** `refactor(site): repo → project in positioning copy (CLI / git contexts unchanged)`

### Tasks

- **Sidebar group title** in `site/astro.config.mjs`: "Multi-repo coordination" → "Multi-project coordination".
- **Landing pillar title** in `index.mdx` (the "Multi-repo coordination" section, currently inside `OrchestrationShowcase` heading) and inside `OrchestrationShowcase.astro` header: → "Work across multiple projects" or "Multi-project coordination."
- **Conceptual prose** in `concepts.md`, `ecosystem.mdx`, `orchestration.md`, `about.md`, `faq.md`: "across repos" → "across projects"; "multi-repo" → "multi-project"; "cross-repo coordination" → "cross-project coordination"; "the repo's state" → "the project's state."
- **Stays unchanged** (audit confirms):
  - GitHub URLs (`github.com/<user>/<repo>` syntax).
  - Pure-git contexts: `git commit`, `git push`, `git branch`, "feature branch."
  - The literal CLI command examples (`momentum scout repo-x`) — the placeholder `repo-x` stays since the CLI argument is conventionally a repo-name placeholder.
  - `EcosystemTopology.astro` label "ecosystem root" / "member repos" — these are visual labels referring to the literal git repos.
- Audit pass before commit: `grep -ri "multi-repo\|cross-repo coordination"` in `site/src/content/docs/` + `site/astro.config.mjs` + `site/src/components/` returns 0 hits except in code comments referring to git history.

---

## Group 4 — Ecosystem ↔ Orchestration clarity + NEW StateActionLayers diagram (Parallel with G1, G2, G3, G5)

**Parallel.** Depends only on Group 0.

External deps: none.

**Commit:** `feat(site): ecosystem ↔ orchestration as state layer + action layer + new diagram`

### Tasks

- **NEW `site/src/components/diagrams/StateActionLayers.astro`** — pure SVG + brand tokens, no animation:
  - Top half = ACTION layer: a row of four labeled cards (scout / dispatch / handoff / continue), framed as "what the agent does."
  - Bottom half = STATE layer: a containing surface labeled "ecosystem.json + initiatives + sessions + pointer blocks," framed as "what the agent reads/writes."
  - Connecting arrows from each verb in the top half down into the surface below, showing the verbs reach into the state.
  - Eyebrow text on each layer: "ACTION LAYER" / "STATE LAYER" in monospace, slate-500.
  - Mobile: collapses to single-column with the state surface below the actions.
- **`OrchestrationShowcase.astro` restructure**:
  - Outer section heading: "Work across multiple projects" (matches the Group 3 terminology lock).
  - Inside, TWO clearly-labeled sub-features:
    1. **"Ecosystem mode — the state layer"** — 2-sentence description + link to `/ecosystem/`.
    2. **"Orchestration — the action layer"** — 2-sentence description + the existing 4-primitive grid (scout/dispatch/handoff/continue with icons + bodies).
  - Embed `<StateActionLayers />` between the two sub-features so the relationship is visually obvious.
- **`ecosystem.mdx` intro rewrite** (first 2 paragraphs): lead with "Ecosystem mode is the **state layer** for multi-project work" + cross-link to `/orchestration/` as "the verbs the agent uses to act on this state."
- **`orchestration.md` intro rewrite** (first 2 paragraphs): lead with "Orchestration is the **action layer** for multi-project work" + cross-link to `/ecosystem/` as "the durable state these verbs read and write."
- **`concepts.md` Ecosystem mode section**: add a short "How they relate" subsection at the end explaining the state/action split + cross-link to both deep pages.
- Audit: both deep pages cross-reference each other in their intro AND their closer (where they currently have a "See also" block).

---

## Group 5 — New logo + identity asset refresh (Parallel with G1, G2, G3, G4)

**Parallel.** Independent of all other groups (touches different files).

External deps: none.

**Commit:** `feat(site): new logo — concentric arcs + arrow piercing through, two-tone treatment`

### Tasks

- **`site/src/assets/logo/mark.svg`** — concentric arcs + curved arrow:
  - 3 progressively smaller arc segments on the left (slate-400 stroke, no fill).
  - Curved arrow with arrowhead piercing up-right through the arcs (indigo-600 fill).
  - viewBox `0 0 64 64`. Single `<svg>` with two `<g>` groups: `.arcs` (slate-400) and `.arrow` (indigo-600).
  - Uses `currentColor` on the arcs so when wrapped in `color: var(--brand-text)` containers it inherits cleanly; the arrow stays explicitly indigo-600.
- **`site/src/assets/logo/wordmark.svg`** — mark + "momentum" wordmark in Inter Variable semibold, slate-700 in light theme (uses `currentColor` for theme adaptation).
- **`site/public/favicon.svg`** — simplified mark; arcs in slate-400, arrow in indigo-600; `prefers-color-scheme: dark` media query lightens slate to slate-200 for visibility on dark.
- **`site/src/components/Logo.astro` + `LogoMark.astro`**: regenerate inline SVG matching the new mark. `LogoMark` is the mark-only variant for tight spaces (e.g., mobile header).
- **`site/src/assets/og/og-template.svg`**: replace the Velocity Arc with the new mark; the OG card generator (`scripts/generate-og-cards.mjs`) rebuilds `public/og/default.png` on next build.
- Visual smoke: verify in both themes (Starlight header at top of every page, favicon in browser tab, OG card preview via opengraph debugger).
- No partial / broken Velocity Arc artifacts left behind (search for residual Velocity-Arc paths in `site/src/`).

---

## Group 6 — README rewrite (Sequential, after Groups 1–5)

**Sequential.** Depends on the locked outputs from Groups 2/3/4/5 (positioning copy, terminology, ecosystem/orchestration framing, logo).

External deps: none.

**Commit:** `docs: README wholesale rewrite — agentic AI positioning + visual features showcase`

### Tasks

- **Wholesale rewrite of root `README.md`**:
  - **Header**: centered `<div align="center">` with the new wordmark image (`site/src/assets/logo/wordmark.svg` — GitHub renders SVG natively), tagline "Spec-driven discipline for agentic AI", and three badges: npm version, license, "Visit the site →" linking to <https://trymomentum.github.io>.
  - **Quick install**: one prominent code block — `npx @avinash-singh-io/momentum init`.
  - **Works with any AI IDE**: 5-row markdown table — Claude Code / Codex / Antigravity (Shipped) + Cursor / Gemini CLI (Planned, Phase 15).
  - **What you get**: 6-feature 2-column grid (HTML `<table>` or markdown — TBD on render quality): Phases, Backlog, History, Rules, Skills, Multi-project (ecosystem + orchestration).
  - **Single project ↔ Multi-project ecosystem**: a Mermaid `flowchart LR` block showing the two modes (GitHub renders Mermaid natively, no static images needed). Single-project on the left; ecosystem (1 root + 3 members + agent session in the middle) on the right.
  - **Orchestration primitives**: 4 one-liner descriptions of scout / dispatch / handoff / continue + link to `/orchestration/` deep page.
  - **Why momentum exists**: 1 paragraph (~3 sentences) — agentic AI raised the floor on individual productivity; what didn't scale was coherent project state; momentum is the missing state layer.
  - **Docs**: bullet list linking to live site sections (Getting started, Concepts, Skills, Rules, IDE support, Ecosystem, Orchestration, FAQ, About) + npm + LICENSE.
  - **No more than 250 lines total.** Easy to scan, no jargon, every section earns its space.
- **Verify GitHub renders the README cleanly** by previewing locally (`gh markdown` or just push to a draft branch and check) — confirms the Mermaid diagram renders, the SVG image loads, the table renders correctly.
- **Site link badge points to live site**, npm badge to <https://npmjs.com/package/@avinash-singh-io/momentum>.

---

## Group 7 — Verification + v0.17.0 release (Sequential, final)

**Sequential.** Final group; depends on Groups 0–6.

External deps: live deployed site (auto-deploy on push to main), GitHub release access, npm publish access.

**Commit:** `docs: Phase 14 retrospective + v0.17.0 release prep`

### Tasks

- **Smoke build** clean: `cd site && rm -rf dist .astro && npm ci && npm run build` exits 0.
- **Mermaid SVG rendering** verified — all 7 Mermaid diagrams (phase lifecycle + brainstorm-gate + 5 orchestration sequences) render to inline SVG in both light + dark; no fallback `<pre>`.
- **Anchor smoke** — `grep '\${#' dist/orchestration/index.html` returns 0 hits.
- **Site-wide content audit**: `grep -ri "AI-assisted coding"` + `grep -ri "multi-repo"` in `site/src/content/docs/` return 0 hits (except explicit historical mentions).
- **Visual checks** (manual / DevTools): theme toggle every page; Mermaid diagrams arrows visible in BOTH; PhaseFlow animation flows; ecosystem topology renders.
- **CLI regression**: `npm test` 246/246 still pass on Node 20.
- **Tarball-shape**: `npm pack --dry-run` confirms `/site` excluded.
- **Word-count sanity** (no minimum, just delta vs Group 0 baseline): no page accidentally shrunk by > 30% — that'd suggest content was lost in a rewrite.
- **Version bump**: `package.json` 0.16.0 → 0.17.0.
- **Retrospective** written at `specs/phases/phase-14-site-refinement/retrospective.md` per Phase 13 precedent (evidence, acceptance status table, what worked, what could be better, deviations, discoveries, recommendation for Phase 15).
- **Bookkeeping**: `specs/status.md` (Phase 14 → Complete; Latest Release → v0.17.0; Active Phase cleared; Next Actions → /brainstorm-phase Phase 15; Recent Changes appended); `specs/phases/README.md` (Phase 14 → Complete); `specs/phases/index.json` (status → complete); `specs/changelog/2026-06.md` (phase-close entry).
- Push branch + open PR phase-14 → main.
- **User approval** for merge.
- After merge: deploy runs automatically (Playwright/Chromium step is already there from Phase 13 Group 5). Run `linkinator` + `lighthouse` on the deployed live site; append evidence to retrospective.
- **Tag `v0.17.0`** on main + push tag.
- **`gh release create v0.17.0 --title "v0.17.0 — Phase 14: Site Refinement & Positioning Pivot" --notes <body> --latest --verify-tag`** (per CLAUDE.md Release Checklist).
- **`npm publish --access public`** (with user approval).
- Verify all three surfaces: `gh release list | head -3` shows v0.17.0 Latest; `npm view @avinash-singh-io/momentum version` returns `0.17.0`; <https://trymomentum.github.io/> loads new content live.
