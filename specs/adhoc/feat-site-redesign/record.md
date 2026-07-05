---
type: Ad-hoc Record
---

# Ad-hoc Work Record: feat-site-redesign

> **Type**: quick-task
> **Created**: 2026-07-05
> **Branch**: feat/site-redesign
> **Backlog**: none (operator-directed site redesign)
> **Status**: shipped-on-lane (landing + deploy pending operator approval)

## Current Behavior

The public site (`site/`) was an Astro **Starlight** docs site on an
Indigo/Slate/Inter identity: a `splash`-template home (`index.mdx` + a dozen
bespoke `.astro` section components) plus Starlight-chromed docs.

## Expected Behavior

Implement the operator-provided design **"Momentum Home.dc.html"** (imported
from the claude.ai design project "Momentum website redesign" via the
`claude_design` / DesignSync MCP) as the new home, and — per the operator's
"one stack, no patchwork" directive ([[site-redesign-one-stack]]) — rebuild
the **whole** site (home + docs) as a single coherent **pure-Astro** stack on
the imported cerebrio design system (cobalt / glassmorphic / **Geist**, Lucide
via `astro-icon`). **Starlight removed entirely.**

## Unchanged Behavior (blast-radius guardrail)

- Scope limited to `site/**` (lane touch-path).
- Docs URLs preserved: root-level slugs (`/getting-started/`, `/rules/`, …)
  — content collection entry ids match the old Starlight slugs.
- Docs **content** (`src/content/docs/*.md,mdx`) preserved; only two factual
  edits (about.md: "Built with Astro Starlight"→Astro/Geist; logo-identity
  paragraph → new chevron mark). The concepts.md `[DECISION]` history example
  about choosing Starlight is left intact as an honest historical record.
- Mermaid diagrams, custom heading ids (`{#id}`), and the postbuild empty-body
  gate (BUG-013) all retained (gate re-pointed from `sl-markdown-content` to
  the new `<article class="doc">`).
- Deploy pipeline (`site: trymomentum.github.io`, `base:/`, `trailingSlash`,
  OG generation, favicon) unchanged in shape.

## What changed (summary)

- **Design system**: `src/styles/tokens.css` — cobalt ramp, glass, ambient,
  Geist aliases, both `[data-theme=light|dark]`. Single source for the site.
- **Shell/components**: `BaseLayout.astro` (html/head/OG/fonts/ambient/theme),
  `DocsLayout.astro` (topbar + sidebar + on-this-page + prev/next + ⌘K palette
  + light/dark toggle), `lib/docsNav.ts`, `plugins/remark-asides.mjs`.
- **Home**: `src/pages/index.astro` — pixel-faithful reproduction of the
  design (glass-pill nav, hero, IDE row, problem/stats, outcomes, phase loop,
  features, how-it-works, live terminal, commands, rules, orchestration,
  personas, CTA, footer), light-only, responsive.
- **Docs**: `src/pages/[...slug].astro` over a plain `docs` content collection.
- **Icons/fonts**: `astro-icon` + `@iconify-json/lucide` (build-time inlined
  SVG, zero client JS); `@fontsource-variable/geist` + `geist-mono`.
- **Removed**: `@astrojs/starlight`, `@fontsource-variable/inter`,
  `index.mdx`, `custom.css`, 16 dead home components, 2 unused logo SVGs.
- **Brand assets**: OG card + favicon → cobalt chevron mark / Geist.

## Verification Evidence

Fresh from this session (lane worktree, `site/`):

- `npm run build` → **12 pages built, exit 0**; postbuild content gate:
  `✓ dist content gate: 12 page(s) checked, all bodies non-empty (min 5897 chars)`.
- Mermaid renders as inline SVG post-fix (`excludeLangs:['mermaid']`):
  `aria-roledescription` present in concepts/swarm; `language-mermaid` count 0.
- Playwright functional test on the built site: theme default `light` →
  toggle → `dark`, persisted to `localStorage.mm-theme`; ⌘K palette opens,
  filters pages+headings, closes on Esc; home copy button present;
  **0 console/page errors**.
- Visual review (Playwright screenshots, desktop 1280 + mobile 390): home
  above-the-fold, outcomes/phase-loop, features/how-it-works, live terminal;
  docs light + dark (mermaid legible on light surface). All faithful.

## Escalation note (Rule 14)

Kept as a quick-task lane per the operator's explicit framing. It touches many
files but they are all the **marketing site**, not the shipped momentum npm
package (no `core/`, `bin/`, `specs/architecture/`, or public-contract change;
no ADR). Landing to `main` + the two-hop Pages deploy remain operator-gated
(Rule 6).

## Follow-up (2026-07-05) — brand kit + home light/dark

Operator-provided brand pack ("Momentum logo redesign.zip") integrated:
- New **fast-forward three-chevron mark** (speed-trail; single load + hover
  sweep; `prefers-reduced-motion` static) as reusable `src/components/Brand.astro`
  (cobalt `#0023AE` light / white dark via `currentColor`). Swapped into home
  nav + footer, docs topbar, and the OG card.
- Full kit **vendored** into `site/public/brand/` (favicon SVG + PNGs, app
  icons, mark variants, animated lockup, README) + `site/public/site.webmanifest`,
  apple-touch-icon, `theme-color`.
- **Home page now supports light + dark** (BaseLayout `theme=auto` + nav toggle,
  matching the docs); old `public/favicon.svg` and the lucide-square mark removed.

Verified: `npm run build` 12 pages green + gate; Playwright home light+dark +
docs light+dark, favicon/manifest head present, home theme toggle + 0 console
errors.
