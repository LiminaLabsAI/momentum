# Phase 12 — Public Site: Plan

## Execution Order

```
# Mixed: Group 0 → (Groups 1 + 2 + 3 in parallel) → Group 4 → Group 5 → Group 6
```

Group 0 renumbers the roadmap, scaffolds Astro Starlight, locks the site config and IA, and locks brand direction (logo concept, palette, font) with the user. Groups 1 (brand assets), 2 (landing page), and 3 (docs pages) are independent and run in parallel — each consumes tokens defined in Group 0. Group 4 wires deployment once content is in place. Group 5 verifies the live site. Group 6 closes the phase and releases.

---

## Group 0 — Foundations & brand direction lock-in (Sequential)

**Sequential.** Blocks Groups 1–6.

External deps: Node 20+, npm. No external services.

**Commit:** `infra(site): scaffold Astro Starlight site + lock brand direction`

### Tasks

- **Renumber roadmap to insert Site = Phase 12.**
  - Update `specs/planning/roadmap.md`: Timeline table — Site = 12 (v0.15.0); Reach = 13 (v0.16.0); Intelligence = 14 (v0.17.0); Platform = 15 (v1.0.0). Update Phase Dependencies block. Update Milestones table.
  - Update `specs/status.md`: Upcoming Phases table renumbered; Active Phase row → Phase 12 — Public Site; Next Actions reflect Phase 12.
  - Update `specs/phases/README.md` and `specs/phases/index.json` if they list phases by number.

- **Scaffold Astro Starlight under `/site`.**
  - `npm create astro@latest -- site --template starlight --no-git --no-install --typescript strict --skip-houston` (or equivalent flags). Verify scaffold writes to `/site` only.
  - `cd site && npm install`. Confirm `node_modules/` lands inside `/site`, not the root.
  - Add `/site/node_modules`, `/site/dist`, `/site/.astro` to root `.gitignore`.

- **Lock `site/astro.config.mjs`.**
  - `site: 'https://avinash-singh-io.github.io'`, `base: '/momentum'`.
  - Title: `momentum`. Description: one-line tagline.
  - GitHub link in social icons.
  - Sidebar: define the 9-page IA explicitly (so the menu order is intentional, not alphabetic).
  - `head` block reserved for favicon set + OG meta + font preload.

- **Brand direction lock-in (interactive step).**
  - Prepare 2–3 logo concepts (rough inline SVG sketches or descriptions) — geometric mark candidates aligned with "momentum" semantics.
  - Prepare 2–3 color palette candidates (primary, surface, accent; light + dark theme tokens).
  - Prepare 2–3 self-hosted display-font candidates (e.g., Inter, Geist, Manrope, IBM Plex Sans).
  - Present to user; user picks one of each. Log selection as `[DECISION]` in `history.md`.
  - Output: `site/src/styles/tokens.css` with `--brand-*` CSS vars (palette + font family + base spacing scale).

- **Smoke gate: empty-content build succeeds.**
  - Stub each of the 9 pages with a single-line placeholder (`# <Page Title>\n\nContent coming.`).
  - `cd site && npm run build` exits 0. `cd site && npm run dev` serves locally.
  - Open every page in the dev server; confirm sidebar order matches the IA.

- **Draft GitHub Actions workflow (`.github/workflows/deploy-site.yml`) but leave commented-out.**
  - Workflow file present so the diff doesn't surprise anyone in Group 4 review; the active trigger is added in Group 4.

- **Commit Group 0.**

---

## Group 1 — Brand & identity assets (Parallel with Groups 2 and 3)

**Parallel.** Depends on Group 0 tokens. No dependency on Groups 2 or 3.

External deps: chosen font's WOFF2 file (downloaded once locally and committed to `site/public/fonts/`).

**Commit:** `feat(site): brand identity — logo, favicon, OG cards, fonts, palette`

### Tasks

- **Logo system.**
  - SVG mark + wordmark, light + dark variants in `site/src/assets/logo/` (`mark-light.svg`, `mark-dark.svg`, `wordmark-light.svg`, `wordmark-dark.svg`).
  - Astro components `<Logo />` and `<LogoMark />` wrapping the SVGs with proper `aria-label`.
  - Logo wired into Starlight site title (replaces text-only title where the theme supports it).

- **Favicon set.**
  - Generate from logo mark: `favicon.ico` (multi-resolution), `favicon-16.png`, `favicon-32.png`, `apple-touch-icon-180.png`, `android-chrome-192.png`, `android-chrome-512.png`, `safari-pinned-tab.svg`.
  - Land under `site/public/`. Wire via Starlight's `head` config.
  - Verify in browser: tab favicon renders; iOS home-screen icon renders on mobile DevTools preview.

- **OG card template + per-page generator.**
  - Base template: 1200×630 SVG with logo + title slot + tagline.
  - Build script `site/scripts/generate-og-cards.mjs` reads page frontmatter (`title`, `description`) and emits `site/public/og/<slug>.png` via `@resvg/resvg-js`.
  - Wire into `astro build` via a `prebuild` script.
  - Add `<meta property="og:image">` to each page's `head` via Starlight's `head` config.
  - Verify: build produces an OG card per page; landing card opens in a social-preview debugger (e.g., the Twitter card validator or Discord embed).

- **Self-hosted display font.**
  - Download chosen font's WOFF2 subset (Latin only for v1). Place in `site/public/fonts/`.
  - `@font-face` declaration in `site/src/styles/tokens.css` with `font-display: swap`.
  - Preload the WOFF2 in Starlight's `head` config.
  - Apply `--brand-font` to Starlight's `--sl-font` and `--sl-font-system` token chains via `site/src/styles/custom.css`.

- **Color palette tokens.**
  - Extend Starlight theme: override `--sl-color-accent`, `--sl-color-text`, `--sl-color-bg`, etc. for both `:root` (light) and `[data-theme='dark']` (dark).
  - Document the override mapping in a comment block at the top of `custom.css`.

- **Illustrated hero component.**
  - `site/src/components/Hero.astro` — CSS-and-SVG-based hero (geometric shapes, gradient, animated subtle motion via prefers-reduced-motion-respecting CSS).
  - No raster assets. Composable with the landing-page layout in Group 2.

- **Apply identity to Starlight chrome.**
  - Header: logo placement + GitHub icon link.
  - Footer: GitHub · npm · LICENSE · "Built with Astro Starlight" attribution.
  - Verify dark mode and light mode both look intentional (no Starlight default cyan leaking through).

---

## Group 2 — Landing page (Parallel with Groups 1 and 3)

**Parallel.** Depends on Group 0 tokens; brand assets land in parallel via Group 1 (use CSS-var fallbacks until Group 1 lands).

External deps: none.

**Commit:** `feat(site): landing page — hero, IDE matrix, feature grid, CTAs`

### Tasks

- **Custom landing route at `/`.**
  - Replace Starlight's default index with a custom Astro layout (`site/src/pages/index.astro`) that opts out of the docs sidebar for the landing only.

- **Hero section.**
  - Tagline: "Spec-driven discipline for AI-assisted coding" (final wording locked during draft review).
  - Sub-tagline: one sentence on momentum's scope (single project OR ecosystem).
  - Two primary CTAs: `[Install]` (anchors to install snippet) + `[GitHub]` (external link).
  - `<Hero />` component from Group 1 in the background.

- **"Works with any AI IDE" matrix.**
  - Table or card grid showing Claude Code · Codex · Antigravity (Shipped, with checkmark) + Cursor · Gemini CLI (Planned, with clock icon).
  - Each agent links to its `/ide-support/#<agent>` anchor for installation details.

- **"What you get" feature grid.**
  - 6 cards: Phases · Backlog · History · Rules · Skills · Hooks/Ecosystem.
  - One sentence per card + small inline icon (SVG, no raster).
  - Cards link to the relevant `/concepts/` or `/skills/` page.

- **Install snippet with copy-to-clipboard.**
  - Code block: `npx @avinash-singh-io/momentum init`.
  - Small inline JavaScript copy button (zero-dep, vanilla `navigator.clipboard.writeText`).
  - Fallback: button shows "Copy" → "Copied" for 2s; gracefully degrades if clipboard API blocked.

- **Use-case personas.**
  - 3 personas: Solo Builder · Tech Lead · PM exploring AI coding.
  - One paragraph each on why momentum matters for that persona.

- **Footer.**
  - GitHub · npm · Docs (`/getting-started/`) · LICENSE · "Built with Astro Starlight".
  - Consistent footer component shared with docs pages (defined in Group 1's chrome work).

- **Mobile responsive pass.**
  - 375px viewport (DevTools): no horizontal scroll on landing.
  - Hero text remains readable; CTAs full-width; matrix collapses to single column.

---

## Group 3 — Docs pages (Parallel with Groups 1 and 2)

**Parallel.** Source material is `README.md`, `core/commands/*.md`, `.agent/rules/project.md`. Independent of Groups 1 and 2.

External deps: none.

**Commit:** `feat(site): docs — getting-started, concepts, skills, rules, IDE support, ecosystem, FAQ, about`

### Tasks

- **`getting-started/index.md`.**
  - Install paths: `npx` one-shot vs `npm install -g`.
  - `momentum init` walkthrough — what gets scaffolded.
  - First phase loop: `/start-project` → `/brainstorm-phase` → `/start-phase` → `/complete-phase`.
  - Troubleshooting: AppleDouble files, hook permissions, `momentum upgrade` regression notes.

- **`concepts/index.md`.**
  - Sectioned page (one `## Heading` per concept): Phases, Backlog, History, ADRs, Ecosystem mode.
  - Each section ≤ 250 words with a small code snippet or directory tree.

- **`skills/index.md`.**
  - List all ~15 slash commands from `core/commands/` and `adapters/*/commands/` overlays.
  - For each: name (e.g., `/start-phase`), 1-line summary, link to the command file in GitHub for the full text.
  - Group by lifecycle: Project · Phase · Backlog · Cross-repo · Utility.

- **`rules/index.md`.**
  - One subsection per rule (Rules 1–13 from `.agent/rules/project.md`).
  - Each subsection: rule text, "Why," "Red flags" (where present in source).
  - Hand-port; do not include the anti-rationalization counters block (keep page tight).

- **`ide-support/index.md`.**
  - Per-IDE sections (anchors): Claude Code · Codex · Antigravity · Cursor (Planned) · Gemini CLI (Planned).
  - For each shipped IDE: instruction-file path (`CLAUDE.md` / `AGENTS.md`), install command (`npx ... --agent <name>`), hook compatibility.
  - For planned IDEs: target instruction file + phase reference (Phase 13 Reach).

- **`ecosystem/index.md`.**
  - What ecosystem mode adds (cross-repo session log, initiatives, `/track` aggregation, ecosystem CLI).
  - When to use it (≥ 2 related repos).
  - Quickstart with `init --ecosystem` and `join`.
  - "Doesn't change" list — every per-project command works exactly as in single-project mode.

- **`faq/index.md`.**
  - 6–10 Q&As. Candidate questions:
    - Why momentum vs plain `CLAUDE.md`?
    - Is momentum agent-locked?
    - Does it work offline?
    - How do I upgrade an existing project?
    - How do I leave or uninstall?
    - Can I use it in a monorepo?
    - Does momentum send data anywhere?
    - What's the license?
    - How do I contribute?

- **`about/index.md`.**
  - Philosophy: why specs and discipline matter for AI-assisted coding.
  - Design principles: agent-agnostic, additive ecosystem mode, no telemetry, no lock-in.
  - Links: GitHub, npm, LICENSE.

- **Link audit.**
  - Every internal link resolves.
  - Every external link opens in a new tab.
  - Run `npx linkinator http://localhost:4321/momentum --recurse --skip 'github.com'` against the dev server.

---

## Group 4 — Deployment wiring (Sequential)

**Sequential.** Runs after Groups 1 + 2 + 3 land. Blocks Group 5.

External deps: GitHub repo + Pages settings toggle (user action — flagged in deliverables).

**Commit:** `infra(site): GitHub Actions deploy to GitHub Pages`

### Tasks

- **Activate `.github/workflows/deploy-site.yml`.**
  - Trigger: `push` to `main` with paths filter `site/**`, `.github/workflows/deploy-site.yml`.
  - Permissions: `contents: read`, `pages: write`, `id-token: write`.
  - Steps: checkout → setup-node 20 → `cd site && npm ci && npm run build` → `actions/upload-pages-artifact@v3` (path: `site/dist`) → `actions/deploy-pages@v4`.
  - Single concurrency group to prevent overlapping deploys.

- **Confirm Pages source = "GitHub Actions" in repo settings.**
  - Flag as user action in the phase deliverables list (cannot be automated from CI).
  - Plan: prompt user to flip it after the first workflow run fails with the expected "Pages not configured" error.

- **Root `package.json` updates.**
  - Set `"homepage": "https://avinash-singh-io.github.io/momentum"`.
  - Confirm no `"files"` glob accidentally captures `/site` (would inflate npm tarball — verify with `npm pack --dry-run`).

- **README header — live-site banner.**
  - Single line just below the npm badge: `[**Visit the site →**](https://avinash-singh-io.github.io/momentum)`.

- **Local dry-run.**
  - Fresh `cd site && rm -rf dist node_modules && npm ci && npm run build`.
  - Inspect `site/dist/` — confirm landing + every IA page is in the artifact.
  - `npx http-server site/dist -p 4322` and walk every page in a browser one more time.

---

## Group 5 — Verification (Sequential)

**Sequential.** Runs after Group 4 deploys live. Blocks Group 6.

External deps: deployed live site reachable.

**Commit:** `test(site): verification — build, link check, Lighthouse, mobile, smoke`

### Tasks

- **Build verification.**
  - Fresh clone → `cd site && npm ci && npm run build` exits 0.
  - Tarball-shape check on root: `npm pack --dry-run` — `/site` NOT in published files.

- **Internal link audit.**
  - `npx linkinator https://avinash-singh-io.github.io/momentum --recurse --skip 'github.com'` returns 0 broken links.
  - If linkinator flags external `github.com` links, manually spot-check 3–5.

- **Lighthouse landing page.**
  - `npx lighthouse https://avinash-singh-io.github.io/momentum --only-categories=performance,accessibility,best-practices,seo --view`.
  - Capture all four scores; assert each ≥ 90. Save report under `specs/phases/phase-12-public-site/artifacts/lighthouse-landing.html`.
  - If any score < 90, iterate Group 1/2 until passing or file a follow-up backlog entry.

- **Mobile responsive walkthrough.**
  - 375px viewport (DevTools): walk through all 9 pages.
  - Capture screenshots; save under `specs/phases/phase-12-public-site/artifacts/mobile/`.

- **Smoke walkthrough.**
  - Search returns results across docs.
  - Light/dark theme toggle works on every page.
  - Copy-to-clipboard works on the landing install snippet.
  - OG card preview shows correct title in a social-preview debugger (Twitter / Discord).

- **Console-error check.**
  - DevTools Console on landing + getting-started: zero errors. Warnings tolerated only if they're framework defaults (e.g., Starlight's missing-translation warnings).

- **Regression check on the CLI.**
  - `npm test` from root (excluding `/site`) — same pass count as v0.14.0 (246/246 expected).
  - Confirms no inadvertent CLI behavior change.

---

## Group 6 — Release & phase close (Sequential)

**Sequential.** Final.

External deps: user approval for `npm publish` (per CLAUDE.md Project Extension constraint).

**Commit:** `docs: Phase 12 retrospective + v0.15.0 release prep`

### Tasks

- **`specs/phases/phase-12-public-site/history.md` retrospective.**
  - What worked / what could have been better / deviations from plan / discoveries.
  - Acceptance-criteria status table.

- **`specs/status.md`.**
  - Current Phase → `(between phases)`.
  - Latest Release → `v0.15.0 — Public Site`.
  - Completed Phases table: append Phase 12.
  - Active Phase row cleared; Upcoming Phases shows Phase 13 (Reach) next.
  - Next Actions: `/brainstorm-phase` Phase 13 — Reach.
  - Recent Changes: phase summary appended.

- **`specs/changelog/2026-06.md`.**
  - One-line phase summary entry with site URL.

- **Version bump.**
  - Root `package.json` `"version": "0.15.0"`.
  - `package-lock.json` regenerated via `npm install --package-lock-only`.

- **`/sync-docs`.**
  - Apply any pending history-entry sync to other specs.
  - Confirm no cross-repo doc impact (this is the momentum repo; no `../` paths in `Affects-specs`).

- **`/complete-phase`.**
  - Verification rerun (per Rule 12 evidence requirement).
  - Tag `v0.15.0`.
  - Update `specs/phases/phase-12-public-site/retrospective.md` (per Phase 11 precedent).

- **`npm publish --access public`.**
  - User-approved per CLAUDE.md guidance — `npm publish` is a shared-system action; never run without explicit OK.

- **Push branch and propose merge.**
  - Open PR `phase-12-public-site` → `main`.
  - Ask user for merge approval.
