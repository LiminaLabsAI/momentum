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

- [x] `getting-started.md` — install paths + `momentum init` walkthrough + first phase loop + troubleshooting
- [x] `concepts.md` — Phases, Backlog, History, ADRs, Ecosystem mode (sectioned, ≤ 250 words each)
- [x] `skills.md` — all ~15 slash commands grouped by lifecycle (Project · Phase · Backlog · Cross-repo · Quality)
- [x] Each skill entry: name + 1-line summary + GitHub link to command file
- [x] `rules.md` — one subsection per rule (Rules 1–13)
- [x] Each rule subsection: rule text + Why + Red flags
- [x] `ide-support.md` — per-IDE anchors: Claude Code · Codex · Antigravity · Cursor (Planned) · Gemini CLI (Planned)
- [x] For each shipped IDE: instruction file path + install command + hook compatibility
- [x] For planned IDEs: target instruction file + Phase 13 Reach reference
- [x] `ecosystem.md` — what it adds + when to use + quickstart + doesn't-change list
- [x] `faq.md` — 9 Q&As (license, telemetry, monorepo, upgrade, uninstall, contribute)
- [x] `about.md` — philosophy + design principles + GitHub/npm/LICENSE links + name rationale
- [x] Link audit: internal links resolve (smoke build green; pages cross-link cleanly)
- [/] Link audit: external links — `rel="noopener"` handled by Starlight default
- [/] `npx linkinator` deferred to Group 5 (needs live site)
- [ ] Commit Group 3: `feat(site): docs — getting-started, concepts, skills, rules, IDE support, ecosystem, FAQ, about`

## Group 4 — Deployment wiring (Sequential)

- [x] Activate `.github/workflows/deploy-site.yml` — push trigger on `main` with paths filter `site/**` + workflow file
- [x] Workflow permissions: `contents: read`, `pages: write`, `id-token: write` (already set in Group 0 draft)
- [x] Workflow steps: checkout → setup-node 22 → `cd site && npm ci && npm run build` → upload-pages-artifact (`site/dist`) → deploy-pages (already set in Group 0 draft)
- [x] Single concurrency group `pages` (cancel-in-progress: false) (already set in Group 0 draft)
- [ ] **USER ACTION:** Confirm Pages source = "GitHub Actions" in repo Settings → Pages (cannot be automated from CI)
- [x] Root `package.json` `"homepage": "https://avinash-singh-io.github.io/momentum"`
- [x] `npm pack --dry-run` confirms `/site` NOT in published tarball (81 files total, 0 matching `site/`)
- [x] README header: live-site banner just below npm badge
- [/] Local dry-run: build smoke green (last run @ Group 3); fresh-clone build deferred to Group 5
- [/] Browser walk: deferred to Group 5 (needs deployed site)
- [x] Commit Group 4: `infra(site): GitHub Actions deploy to GitHub Pages` (commit `6137dfa`)

## Group 4.5 — URL migration to trymomentum.github.io (in-cycle scope add)

- [x] User registered `trymomentum` GitHub org
- [x] User created `trymomentum/trymomentum.github.io` repo
- [x] User generated fine-grained PAT scoped to target repo; added as `PAGES_DEPLOY_TOKEN` secret
- [x] Rewrote `.github/workflows/deploy-site.yml` for cross-repo push via PAT
- [x] Updated `astro.config.mjs` — `site` URL + `base: '/'`
- [x] Updated `package.json` `homepage`, README banner
- [x] Bulk replaced `/momentum/<page>/` site paths → `/<page>/` (sed; preserved GitHub source URLs)
- [x] Smoke build + commit + PR #8 + merge
- [x] First deploy at `trymomentum.github.io` succeeded

## Group 5 — Verification (Sequential)

- [x] Build verification: `npm run build` exits 0 (every group)
- [x] Tarball-shape: `npm pack --dry-run` confirms `/site` excluded (81 files, 0 site/)
- [x] Internal link audit on live site: `npx linkinator https://trymomentum.github.io/ --recurse` returns 0 broken across 24 links
- [x] Lighthouse landing: Performance = **98** (≥ 90 ✓)
- [x] Lighthouse landing: Accessibility = **96** (≥ 90 ✓)
- [x] Lighthouse landing: Best Practices = **100** (≥ 90 ✓)
- [x] Lighthouse landing: SEO = **100** (≥ 90 ✓)
- [x] Save Lighthouse report → `specs/phases/phase-12-public-site/artifacts/lighthouse-landing.json`
- [/] Mobile responsive walkthrough @ 375px on all 9 pages — flagged for user-side visual confirmation (CSS auto-fit grids responsive by construction)
- [/] Smoke: search / light-dark toggle / copy-to-clipboard / OG preview — flagged for user-side visual confirmation
- [/] Console-error check on landing + getting-started — flagged for user-side DevTools check
- [x] CLI regression: `npm test` 246/246 pass (matches v0.14.0 exactly — zero regression)
- [x] Commit Group 5: rolled into Group 6 release commit

## Group 6 — Release & phase close (Sequential)

- [x] Phase retrospective in `retrospective.md` (per Phase 11 precedent — written separately, not in history.md)
- [x] Acceptance-criteria status verified via Group 5 [DECISION] entry in history.md
- [x] `specs/status.md`: Current Phase → (between phases)
- [x] `specs/status.md`: Latest Release → v0.15.0 — Public Site
- [x] `specs/status.md`: Completed Phases table extended with Phase 12
- [x] `specs/status.md`: Active Phase row cleared
- [x] `specs/status.md`: Next Actions → `/brainstorm-phase` Phase 13
- [x] `specs/status.md`: Recent Changes appended
- [/] `specs/changelog/2026-06.md`: phase-close entry pending in this commit
- [x] Root `package.json` `"version": "0.15.0"`
- [/] `npm install --package-lock-only` to regenerate `package-lock.json` — pending in this commit
- [/] `/sync-docs` — pending after this commit
- [/] `/complete-phase` — pending after merge: tag v0.15.0
- [/] `npm publish --access public` (USER-APPROVED per CLAUDE.md) — pending user OK
- [/] Push branch + open PR
- [/] Ask user for merge approval
