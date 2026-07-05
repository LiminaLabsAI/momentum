---
type: Phase
status: complete
tags: [phase-12, public-site, github-pages, astro, starlight, landing-page, docs-site, site, brand, identity, logo, favicon, og-cards, self-hosted-font, color-palette, illustrated-hero, lighthouse, deployment, github-actions, gh-pages, pagefind, homepage, npm-metadata, metadata-bump, roadmap-renumber, ide-support, skills-reference, rules-reference, ecosystem-mode, faq, about, philosophy]
---

# Phase 12 — Public Site: Overview

## Vision

After eleven phases, momentum has a real story to tell: spec-driven discipline for AI-assisted coding that works the same across Claude Code, Codex, and Antigravity today (Cursor and Gemini CLI coming next). The toolkit is mature; the missing layer is the **public face**. Right now, anyone curious about momentum has to read a README inside a repo — there's no polished landing page that says *what it is*, *who it's for*, *which IDEs it supports*, and *how to start*.

Phase 12 ships that public face: a GitHub Pages site that doubles as a **landing page** for newcomers and a **lean docs hub** for users who want to go deeper. The site lives at `https://avinash-singh-io.github.io/momentum` and is built with Astro Starlight — Markdown-first, zero-JS by default, with a custom landing page on top of the polished default docs theme. Visual identity is a full pass: custom logo, brand palette, self-hosted display font, illustrated hero, and OG/social-card images. First impression matters; the toolkit deserves a site that looks intentional, not generic.

**Audience.** Anyone using an AI coding agent — Claude Code, Codex, Antigravity, Cursor, Gemini CLI — at any role: solo builder, tech lead, PM exploring AI-assisted development. The landing page communicates value in under 30 seconds; the docs go deep for the curious.

**Hard invariant — the npm package's behavior stays identical.** No CLI code changes ship in this phase. Only docs, site source, deploy infrastructure, and the small metadata bump (`homepage` field, README header). A user running `momentum init` sees zero functional difference between v0.14.0 and v0.15.0.

**Hard invariant — `/site` is a self-contained subproject.** Its `package.json`, `node_modules`, build output, and CI workflow live entirely under `/site` and `.github/workflows/deploy-site.yml`. The root npm package is untouched by site dependencies. Adding the site never affects users who only install the CLI.

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Astro Starlight | Markdown-first, zero-JS default, beautiful docs theme + freedom for a custom landing page. Best fit for "landing + docs + easy UX." |
| Hosting | Same repo, `/site` directory, GitHub Actions → `gh-pages` branch | Single source-of-truth; site lives next to source it documents. `/docs` stays as internal contributor docs (untouched). |
| URL | `https://avinash-singh-io.github.io/momentum` (default GH Pages) | Custom domain deferred to a later phase once site has traction. |
| Phase numbering | Site = 12; Reach moves to 13; Intelligence → 14; Platform → 15 | User-confirmed during brainstorm. Roadmap renumber lands in Group 0 of this phase. |
| Information architecture | 9 pages: landing + 8 docs | Locked v1 IA — see Deliverables. Smallest set that answers "what / who / how" without bloat. |
| Visual polish | Full identity pass — logo, palette, self-hosted font, illustrated hero, OG cards | User-confirmed. Investment in first impression rather than Starlight defaults. Scoped via Group 0 lock-in (2–3 concrete options each) to prevent design creep. |
| Content sourcing | Hand-port docs content from README + `core/commands/*` + `.agent/rules/project.md` for v1 | Auto-sync deferred — not worth build infra for ~15 skills + 13 rules. Drift acknowledged; revisit if staleness shows. |
| Search | Pagefind (Starlight default) | No external dependency, runs at build time, fast. |
| Deploy cadence | Push to `main` with paths filter `site/**` | Site reflects shipped state. Branch builds preview-only via local `npm run build`. |
| npm release | v0.15.0 (metadata-only bump) | Changelog explicitly notes "site release; no CLI behavior changes." Phase-versioning continuity matters; `npm publish` runs at `/complete-phase` per CLAUDE.md Project Extension. |

## Information Architecture (v1)

```
/                       Landing — hero, IDE matrix, feature grid, install CTA, footer
/getting-started/       Install · momentum init · first phase walkthrough · troubleshooting
/concepts/              Phases · Backlog · History · ADRs · Ecosystem mode (one page, sectioned)
/skills/                All slash commands with one-paragraph summaries (~15 entries)
/rules/                 The 13 autonomous agent rules — what / why / red flags
/ide-support/           Per-IDE setup: Claude Code · Codex · Antigravity · Cursor (planned) · Gemini CLI (planned)
/ecosystem/             What ecosystem mode adds · when to use · quickstart · doesn't-change-this list
/faq/                   6–10 common questions, concise answers
/about/                 Philosophy · design principles · links to GitHub / npm / LICENSE
```

## Key Deliverables

1. **Astro Starlight site scaffolded under `/site`** — `package.json`, `astro.config.mjs`, `src/`, `public/`; `npm run build` and `npm run dev` both succeed.
2. **9 IA pages live and linked in the sidebar** — content matches the IA above. Sidebar ordering reflects user journey (Getting Started → Concepts → Reference).
3. **Brand identity applied site-wide:**
   - SVG logo (mark + wordmark, light + dark variants) under `site/src/assets/logo/`.
   - Favicon set (`favicon.ico`, 16/32/180/192/512 PNGs, Safari mask).
   - OG card template (1200×630) — landing variant + per-docs-page variant with title overlay.
   - Self-hosted display font (WOFF2 subset under `site/public/fonts/`).
   - Brand color palette tokens applied to Starlight light + dark themes.
   - CSS/SVG illustrated hero component (no raster assets).
4. **GitHub Actions deploy workflow** — `.github/workflows/deploy-site.yml` triggered on push to `main` with paths filter `site/**`; uses `actions/configure-pages` + `actions/upload-pages-artifact` + `actions/deploy-pages`. Site reaches default URL on first run.
5. **Root `package.json` `homepage` field set** + README header link to live site.
6. **Roadmap renumbered** — `specs/planning/roadmap.md`, `specs/status.md`, `specs/phases/README.md`, `specs/phases/index.json` reflect Site = 12, Reach = 13, Intelligence = 14, Platform = 15.
7. **v0.15.0 published to npm** — metadata-only bump, changelog notes "site release; no CLI behavior changes."

## Scope (Out — Non-Goals)

- **Custom domain** (`momentum.dev` etc.). Default GH Pages URL only for v1.
- **Auto-sync** of skills/rules from `core/` into site content. Hand-port for v1.
- **Documentation versioning** (v0.x vs v1.0 docs). Single live set.
- **Analytics** (Plausible / Fathom / GA). Defer.
- **External search** (Algolia DocSearch). Pagefind only.
- **i18n / translations.**
- **Comments / discussions on docs pages.**
- **Auto-generated API reference.** Hand-curated content only.
- **Marketing copy iteration with AI tooling.** First draft ships; iteration is a post-phase activity.
- **CLI behavior changes.** Bug fixes and tracked backlog items unrelated to the site are out of scope here.

## Acceptance Criteria

1. Site live at `https://avinash-singh-io.github.io/momentum` with all 9 pages rendering and no broken internal links.
   - **Verify:** `npx linkinator https://avinash-singh-io.github.io/momentum --recurse` returns 0 broken links, OR manual walkthrough of all 9 pages confirms.
2. Landing page communicates *what momentum is*, *who it's for*, *how to install*, and *which IDEs it supports* above the fold on a 1440px desktop and within one scroll on a 375px mobile viewport.
   - **Verify:** Manual desktop + DevTools mobile walkthrough; screenshots in retrospective.
3. Brand identity (logo, palette, font, OG card) is consistent across every page.
   - **Verify:** Visual review of every page; no Starlight default tokens leaking through.
4. GitHub Actions deploy succeeds end-to-end on a single push (no manual intervention beyond enabling Pages source = "GitHub Actions" in repo settings).
   - **Verify:** Action run green; site loads at default URL within 5 minutes of merge.
5. Lighthouse landing-page scores ≥ 90 in Performance, Accessibility, Best Practices, and SEO.
   - **Verify:** `npx lighthouse <url> --view` output captured in retrospective.
6. Root `package.json` `homepage` field and README header both link to the live site.
   - **Verify:** `node -p "require('./package.json').homepage"` returns site URL; `grep -n 'avinash-singh-io.github.io/momentum' README.md` returns the header line.
7. Roadmap reflects new phase numbering — Site = 12, Reach = 13, Intelligence = 14, Platform = 15.
   - **Verify:** `grep -n 'Phase 13.*Reach' specs/planning/roadmap.md` returns the renumbered row.
8. v0.15.0 published to npm; CLI behavior unchanged from v0.14.0.
   - **Verify:** `npm view @avinash-singh-io/momentum version` returns `0.15.0`; `npm test` from a fresh clone produces the same pass count as v0.14.0 (246/246 expected, no regressions).

## Open Questions (resolved during execution)

- **Brand direction** — concrete logo concepts, palette options, font candidates. Resolved at Group 0 lock-in step by presenting 2–3 of each and selecting one before any other group starts.
- **GitHub Pages source toggle** — flagged as user action; the workflow will fail loudly until enabled.
