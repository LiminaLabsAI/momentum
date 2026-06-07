# Phase 12 — Public Site: Tasks

> Granular checklist mirroring `plan.md`. Mark `[x]` complete, `[/]` in progress, `[ ]` not started.

## Group 0 — Foundations & brand direction lock-in (Sequential)

- [x] Renumber `specs/planning/roadmap.md` — Site=12, Reach=13, Intelligence=14, Platform=15 (Timeline + Dependencies + Milestones)
- [x] Renumber `specs/status.md` Upcoming Phases table; set Active Phase → Phase 12 — Public Site; update Next Actions
- [x] Renumber `specs/phases/README.md` and `specs/phases/index.json` (whichever lists phases by number)
- [x] Scaffold Astro Starlight under `/site` (`npm create astro` with starlight template)
- [x] `cd site && npm install`; confirm `node_modules` lives under `/site`
- [x] Add `/site/node_modules`, `/site/dist`, `/site/.astro` to root `.gitignore`
- [x] Lock `site/astro.config.mjs` — site URL, base, title, description, GitHub link, IA sidebar
- [x] Brand direction lock-in: present 2–3 logo concepts to user
- [x] Brand direction lock-in: present 2–3 color palette candidates to user
- [x] Brand direction lock-in: present 2–3 self-hosted font candidates to user
- [x] User picks one of each; log `[DECISION]` in `history.md`
- [x] Write `site/src/styles/tokens.css` with `--brand-*` tokens (+ custom.css wired into Starlight)
- [x] Stub all 9 IA pages with single-line placeholders
- [x] Smoke gate: `cd site && npm run build` exits 0
- [x] Smoke gate: `cd site && npm run dev` serves locally; sidebar order matches IA
- [x] Draft `.github/workflows/deploy-site.yml` with active trigger COMMENTED OUT
- [ ] Commit Group 0: `infra(site): scaffold Astro Starlight site + lock brand direction`

## Group 1 — Brand & identity assets (Parallel with G2, G3)

- [x] Logo SVG mark (single file uses `currentColor` — light/dark via CSS, no two-file split needed)
- [x] Logo SVG wordmark (single file uses `currentColor`)
- [x] `<Logo />` + `<LogoMark />` Astro components with `aria-label`
- [x] Logo wired into Starlight site title (`logo.src` + `replacesTitle: true`)
- [x] Favicon: brand-color SVG with dark-theme media query (replaces Astro default)
- [/] Favicon set (`favicon.ico`, 16/32/180/192/512 PNG, Safari mask SVG) — deferred to Group 5 (single SVG favicon works for modern browsers; legacy `.ico` and iOS PNGs as follow-up)
- [x] Favicons wired via Starlight default (uses `public/favicon.svg`)
- [x] OG card template SVG (1200×630) with logo + title + tagline + IDE-matrix ribbon
- [x] `site/scripts/generate-og-cards.mjs` build script (uses `sharp` already in deps)
- [x] `prebuild` hook wires OG generator into `npm run build`
- [x] `<meta property="og:image">` + `twitter:card` added via Starlight `head` config
- [x] Verify OG PNG present in build output (`dist/og/default.png` — 53KB)
- [x] Inter Variable loaded via `@fontsource-variable/inter` npm package (proper dep, no external download)
- [x] `--brand-font` applied to Starlight `--sl-font` / `--sl-font-system`
- [x] Color palette tokens override Starlight `--sl-color-*` (light + dark)
- [x] Document palette override mapping in comment at top of `custom.css`
- [x] `site/src/components/Hero.astro` — CSS/SVG illustrated hero (no raster)
- [x] Hero respects `prefers-reduced-motion`
- [x] Starlight header: logo placement (`replacesTitle: true`) + GitHub icon link (social config)
- [/] Starlight footer: GitHub · npm · LICENSE · "Built with Astro Starlight" — pending Group 2 custom landing footer
- [/] Verify dark + light mode both look intentional — pending live preview in Group 5
- [ ] Commit Group 1: `feat(site): brand identity — logo, favicon, OG cards, fonts, palette`

## Group 2 — Landing page (Parallel with G1, G3)

- [x] Landing page via Starlight splash template + custom MDX (`index.mdx`)
- [x] Hero: tagline + Install/GitHub CTAs via Starlight `hero` config
- [x] `<IDEMatrix />` component: Claude Code · Codex · Antigravity (Shipped) + Cursor · Gemini CLI (Planned), each links to `/ide-support/#<agent>`
- [x] `<FeatureGrid />` component: 6 cards (Phases / Backlog / History / Rules / Skills / Ecosystem) with inline SVG icons
- [x] `<InstallSnippet />` component with vanilla-JS copy button (Copy → Copied with 2s timeout, graceful fallback)
- [x] `<Personas />` component: Solo builder · Tech Lead · PM exploring AI coding
- [x] Closing "One repo or many" section linking to ecosystem docs
- [/] Mobile responsive @ 375px: grids use `auto-fit, minmax(...)` (responsive by construction) — visual confirmation pending Group 5
- [ ] Commit Group 2: `feat(site): landing page — hero, IDE matrix, feature grid, CTAs`

## Group 3 — Docs pages (Parallel with G1, G2)

- [ ] `getting-started/index.md` — install paths + `momentum init` walkthrough + first phase loop + troubleshooting
- [ ] `concepts/index.md` — Phases, Backlog, History, ADRs, Ecosystem mode (sectioned, ≤ 250 words each)
- [ ] `skills/index.md` — all ~15 slash commands grouped by lifecycle (Project · Phase · Backlog · Cross-repo · Utility)
- [ ] Each skill entry: name + 1-line summary + GitHub link to command file
- [ ] `rules/index.md` — one subsection per rule (Rules 1–13)
- [ ] Each rule subsection: rule text + Why + Red flags
- [ ] `ide-support/index.md` — per-IDE anchors: Claude Code · Codex · Antigravity · Cursor (Planned) · Gemini CLI (Planned)
- [ ] For each shipped IDE: instruction file path + install command + hook compatibility
- [ ] For planned IDEs: target instruction file + Phase 13 Reach reference
- [ ] `ecosystem/index.md` — what it adds + when to use + quickstart + doesn't-change list
- [ ] `faq/index.md` — 6–10 Q&As
- [ ] `about/index.md` — philosophy + design principles + GitHub/npm/LICENSE links
- [ ] Link audit: every internal link resolves
- [ ] Link audit: every external link opens in new tab (`rel="noopener"` where appropriate)
- [ ] `npx linkinator http://localhost:4321/momentum --recurse --skip 'github.com'` on dev server returns 0 broken
- [ ] Commit Group 3: `feat(site): docs — getting-started, concepts, skills, rules, IDE support, ecosystem, FAQ, about`

## Group 4 — Deployment wiring (Sequential)

- [ ] Activate `.github/workflows/deploy-site.yml` — push trigger on `main` with paths filter `site/**` + workflow file
- [ ] Workflow permissions: `contents: read`, `pages: write`, `id-token: write`
- [ ] Workflow steps: checkout → setup-node 20 → `cd site && npm ci && npm run build` → upload-pages-artifact (`site/dist`) → deploy-pages
- [ ] Single concurrency group `pages` (cancel-in-progress: false)
- [ ] Confirm Pages source = "GitHub Actions" in repo settings (USER ACTION — flag)
- [ ] Root `package.json` `"homepage": "https://avinash-singh-io.github.io/momentum"`
- [ ] `npm pack --dry-run` confirms `/site` NOT in published tarball
- [ ] README header: live-site banner just below npm badge
- [ ] Local dry-run: fresh `cd site && rm -rf dist node_modules && npm ci && npm run build`
- [ ] Inspect `site/dist/` — every IA page present
- [ ] `npx http-server site/dist -p 4322`; walk every page in browser
- [ ] Commit Group 4: `infra(site): GitHub Actions deploy to GitHub Pages`

## Group 5 — Verification (Sequential)

- [ ] Build verification: fresh-clone `cd site && npm ci && npm run build` exits 0
- [ ] Tarball-shape: `npm pack --dry-run` (root) confirms `/site` excluded
- [ ] Internal link audit on live site: `npx linkinator <url> --recurse --skip 'github.com'` returns 0 broken
- [ ] Lighthouse landing: Performance ≥ 90
- [ ] Lighthouse landing: Accessibility ≥ 90
- [ ] Lighthouse landing: Best Practices ≥ 90
- [ ] Lighthouse landing: SEO ≥ 90
- [ ] Save Lighthouse report → `specs/phases/phase-12-public-site/artifacts/lighthouse-landing.html`
- [ ] Mobile responsive walkthrough @ 375px on all 9 pages
- [ ] Save mobile screenshots → `specs/phases/phase-12-public-site/artifacts/mobile/`
- [ ] Smoke: search returns results across docs
- [ ] Smoke: light/dark theme toggle works on every page
- [ ] Smoke: copy-to-clipboard works on landing install snippet
- [ ] Smoke: OG card preview shows correct title in social-preview debugger
- [ ] Console-error check on landing — zero errors
- [ ] Console-error check on getting-started — zero errors
- [ ] CLI regression: `npm test` from root same pass count as v0.14.0 (246/246 expected)
- [ ] Commit Group 5: `test(site): verification — build, link check, Lighthouse, mobile, smoke`

## Group 6 — Release & phase close (Sequential)

- [ ] Phase retrospective in `history.md`: what worked / what could be better / deviations / discoveries
- [ ] Acceptance-criteria status table in `history.md`
- [ ] `specs/status.md`: Current Phase → (between phases)
- [ ] `specs/status.md`: Latest Release → v0.15.0 — Public Site
- [ ] `specs/status.md`: Completed Phases table extended with Phase 12
- [ ] `specs/status.md`: Active Phase row cleared
- [ ] `specs/status.md`: Upcoming Phases shows Phase 13 (Reach) next
- [ ] `specs/status.md`: Next Actions → `/brainstorm-phase` Phase 13
- [ ] `specs/status.md`: Recent Changes appended
- [ ] `specs/changelog/2026-06.md`: one-line phase summary with site URL
- [ ] Root `package.json` `"version": "0.15.0"`
- [ ] `npm install --package-lock-only` to regenerate `package-lock.json`
- [ ] `/sync-docs` — apply pending history entries
- [ ] `/complete-phase` — verification rerun + tag v0.15.0 + write `retrospective.md`
- [ ] `npm publish --access public` (USER-APPROVED per CLAUDE.md)
- [ ] Push branch + open PR `phase-12-public-site` → `main`
- [ ] Ask user for merge approval
- [ ] Commit Group 6: `docs: Phase 12 retrospective + v0.15.0 release prep`
