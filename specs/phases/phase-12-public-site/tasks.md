# Phase 12 — Public Site: Tasks

> Granular checklist mirroring `plan.md`. Mark `[x]` complete, `[/]` in progress, `[ ]` not started.

## Group 0 — Foundations & brand direction lock-in (Sequential)

- [ ] Renumber `specs/planning/roadmap.md` — Site=12, Reach=13, Intelligence=14, Platform=15 (Timeline + Dependencies + Milestones)
- [ ] Renumber `specs/status.md` Upcoming Phases table; set Active Phase → Phase 12 — Public Site; update Next Actions
- [ ] Renumber `specs/phases/README.md` and `specs/phases/index.json` (whichever lists phases by number)
- [ ] Scaffold Astro Starlight under `/site` (`npm create astro` with starlight template)
- [ ] `cd site && npm install`; confirm `node_modules` lives under `/site`
- [ ] Add `/site/node_modules`, `/site/dist`, `/site/.astro` to root `.gitignore`
- [ ] Lock `site/astro.config.mjs` — site URL, base, title, description, GitHub link, IA sidebar
- [ ] Brand direction lock-in: present 2–3 logo concepts to user
- [ ] Brand direction lock-in: present 2–3 color palette candidates to user
- [ ] Brand direction lock-in: present 2–3 self-hosted font candidates to user
- [ ] User picks one of each; log `[DECISION]` in `history.md`
- [ ] Write `site/src/styles/tokens.css` with `--brand-*` tokens
- [ ] Stub all 9 IA pages with single-line placeholders
- [ ] Smoke gate: `cd site && npm run build` exits 0
- [ ] Smoke gate: `cd site && npm run dev` serves locally; sidebar order matches IA
- [ ] Draft `.github/workflows/deploy-site.yml` with active trigger COMMENTED OUT
- [ ] Commit Group 0: `infra(site): scaffold Astro Starlight site + lock brand direction`

## Group 1 — Brand & identity assets (Parallel with G2, G3)

- [ ] Logo SVG mark — light variant
- [ ] Logo SVG mark — dark variant
- [ ] Logo SVG wordmark — light variant
- [ ] Logo SVG wordmark — dark variant
- [ ] `<Logo />` + `<LogoMark />` Astro components with `aria-label`
- [ ] Logo wired into Starlight site title
- [ ] Favicon set generated from logo mark (`favicon.ico`, 16/32/180/192/512 PNG, Safari mask SVG)
- [ ] Favicons wired via Starlight `head` config
- [ ] Verify favicon: tab + iOS home-screen preview
- [ ] OG card template SVG (1200×630) with logo + title slot + tagline
- [ ] `site/scripts/generate-og-cards.mjs` build script (uses `@resvg/resvg-js`)
- [ ] `prebuild` hook wires OG generator into `npm run build`
- [ ] `<meta property="og:image">` added to each page's `head`
- [ ] Verify OG card per page in build output; landing card opens cleanly in social-preview debugger
- [ ] Download chosen WOFF2 subset (Latin) → `site/public/fonts/`
- [ ] `@font-face` + `font-display: swap` in `tokens.css`
- [ ] Preload WOFF2 in Starlight `head`
- [ ] Apply `--brand-font` to Starlight `--sl-font` / `--sl-font-system`
- [ ] Color palette tokens override Starlight `--sl-color-*` (light + dark)
- [ ] Document palette override mapping in comment at top of `custom.css`
- [ ] `site/src/components/Hero.astro` — CSS/SVG illustrated hero (no raster)
- [ ] Hero respects `prefers-reduced-motion`
- [ ] Starlight header: logo placement + GitHub icon link
- [ ] Starlight footer: GitHub · npm · LICENSE · "Built with Astro Starlight"
- [ ] Verify dark + light mode both look intentional
- [ ] Commit Group 1: `feat(site): brand identity — logo, favicon, OG cards, fonts, palette`

## Group 2 — Landing page (Parallel with G1, G3)

- [ ] Custom landing layout `site/src/pages/index.astro` (opts out of docs sidebar)
- [ ] Hero section: tagline + sub-tagline + Install CTA + GitHub CTA + `<Hero />` background
- [ ] "Works with any AI IDE" matrix: Claude Code · Codex · Antigravity (Shipped) + Cursor · Gemini CLI (Planned)
- [ ] Each agent links to `/ide-support/#<agent>`
- [ ] "What you get" 6-card grid: Phases · Backlog · History · Rules · Skills · Hooks/Ecosystem
- [ ] Each card has inline SVG icon + 1-sentence description + link
- [ ] Install snippet code block: `npx @avinash-singh-io/momentum init`
- [ ] Copy-to-clipboard button (vanilla JS, `navigator.clipboard.writeText`)
- [ ] Copy button shows "Copy" → "Copied" for 2s; graceful clipboard-blocked fallback
- [ ] 3 use-case personas: Solo Builder · Tech Lead · PM exploring AI coding
- [ ] Footer component shared with docs (defined in G1 chrome work)
- [ ] Mobile responsive @ 375px: no horizontal scroll
- [ ] Mobile: hero readable, CTAs full-width, matrix collapses to single column
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
