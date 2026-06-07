# Phase 12 — Public Site: Implementation History

> Append-only log. Do NOT edit existing entries.

## Entry Types

| Type | When to use |
|------|-------------|
| [DECISION] | ADR created, technology choice made |
| [SCOPE_CHANGE] | Phase deliverables added or removed |
| [DISCOVERY] | Bug, tech debt, or enhancement found |
| [FEATURE] | New planned feature |
| [ARCH_CHANGE] | Architectural pattern changed |
| [EVALUATOR] | Locked evaluator defined or evaluation set changed |
| [NOTE] | Anything else worth recording |

## Entries

### [DECISION] 2026-06-07 — Phase 12 = Public Site; Reach pushed to Phase 13
Topics: phase-12, roadmap, renumber
Affects-phases: phase-12-public-site, phase-13-reach, phase-14-intelligence, phase-15-platform
Affects-specs: specs/planning/roadmap.md, specs/status.md, specs/phases/README.md, specs/phases/index.json
Detail: User-confirmed during /brainstorm-phase. The site is a high-leverage adoption move and a natural pivot after Phase 11's orchestration work — momentum now has a story worth showcasing. Reach (Cursor + Gemini adapters) shifts to Phase 13 (target v0.16.0); Intelligence → 14; Platform → 15. Roadmap renumber lands in Group 0 of this phase before any site work begins.

---

### [DECISION] 2026-06-07 — Astro Starlight as the site framework
Topics: phase-12, tech-stack, astro, starlight
Affects-phases: phase-12-public-site
Affects-specs: specs/phases/phase-12-public-site/overview.md
Detail: Markdown-first, zero-JS by default, beautiful docs theme out of the box + full freedom for a custom landing page. Rejected alternatives: Docusaurus (heavier, harder landing customization), VitePress (less landing flexibility), Nextra (Next.js overhead unnecessary for static content). Best fit for "landing + docs + easy UX" on a tight v1 timeline. Search comes free via Pagefind (Starlight default).

---

### [DECISION] 2026-06-07 — Same repo, `/site` directory, GH Actions to `gh-pages`
Topics: phase-12, hosting, github-pages, github-actions, monorepo-layout
Affects-phases: phase-12-public-site
Affects-specs: specs/phases/phase-12-public-site/overview.md
Detail: Site source lives under `/site` (NOT `/docs` — that stays as internal contributor docs). GitHub Actions builds + deploys to gh-pages on push to `main` with paths filter `site/**`. Default URL: avinash-singh-io.github.io/momentum. Custom domain explicitly deferred until the site has traction. Single repo wins on coupling — the site lives next to the source it documents, so updates flow naturally with code changes. `/site` is self-contained (own package.json, node_modules) and excluded from the npm tarball.

---

### [DECISION] 2026-06-07 — Lean MVP IA: 9 pages (landing + 8 docs)
Topics: phase-12, ia, scope, mvp
Affects-phases: phase-12-public-site
Affects-specs: specs/phases/phase-12-public-site/overview.md
Detail: Locked v1 information architecture: Landing, Getting Started, Concepts, Skills reference, Rules reference, IDE support, Ecosystem mode, FAQ, About. Rejected alternatives: landing-only (no place to send curious visitors), full docs (~25 pages — too much for v1), auto-mirror docs/ verbatim (poor UX, no curation). This shape ships in one phase and answers "what is momentum / who is it for / how do I start" without bloat. Each docs page is hand-curated for the public audience — distinct from internal contributor docs under `/docs`.

---

### [DECISION] 2026-06-07 — Full identity pass for v1: custom logo, font, palette, OG cards, illustrated hero
Topics: phase-12, brand, identity, design
Affects-phases: phase-12-public-site
Affects-specs: specs/phases/phase-12-public-site/overview.md, specs/phases/phase-12-public-site/plan.md
Detail: User-confirmed during brainstorm. Investment in first impression rather than starting with Starlight defaults. Group 1 (Brand & Identity) lands in parallel with Groups 2 (Landing) and 3 (Docs); brand tokens flow from Group 0 lock-in. Risk: design scope creep; mitigation: lock direction in Group 0 with concrete options (2–3 logos / palettes / fonts) and pick one before any other group starts. All assets ship as SVG / CSS / self-hosted WOFF2 — no raster dependencies, no external CDN.

---

### [DECISION] 2026-06-07 — Hand-port docs content for v1; auto-sync deferred
Topics: phase-12, content, source-of-truth, drift, sync
Affects-phases: phase-12-public-site
Affects-specs: specs/phases/phase-12-public-site/overview.md
Detail: Skills and rules manually summarized from `core/commands/*` and `.agent/rules/project.md` once. Auto-sync script deferred to a later phase — not worth the build infrastructure for ~15 skills + 13 rules (manageable hand-port). Drift risk acknowledged; revisit if staleness shows up or when skill/rule churn accelerates. README and CLAUDE.md remain the canonical sources; the site is a derived view tuned for a public audience.

---

### [DECISION] 2026-06-07 — Default GitHub Pages URL only for v1 (no custom domain)
Topics: phase-12, hosting, domain
Affects-phases: phase-12-public-site
Affects-specs: specs/phases/phase-12-public-site/overview.md
Detail: v1 lives at avinash-singh-io.github.io/momentum. Custom domain (e.g., `momentum.dev`) explicitly deferred — DNS setup, registrar choice, and SSL provisioning are separate decisions worth making after the site has traction and a sense of brand direction. Astro Starlight `base: '/momentum'` config supports a future domain change with a single edit + redeploy.

---

### [NOTE] 2026-06-07 — npm version bump rationale (v0.15.0, metadata-only)
Topics: phase-12, npm, versioning
Affects-phases: phase-12-public-site
Affects-specs: package.json, specs/changelog/2026-06.md
Detail: This phase ships no functional CLI code changes. The npm version bumps to v0.15.0 because (a) package metadata (`homepage` field, README header) changes, (b) phase-versioning continuity matters for the roadmap, (c) `/complete-phase` runs `npm publish --access public` per CLAUDE.md Project Extension. Changelog explicitly notes "site release; no CLI behavior changes" so users don't expect new commands. Regression check in Group 5 confirms 246/246 tests still pass.

---

### [SCOPE_CHANGE] 2026-06-07 — Single-phase scope with 9 pages + full identity
Topics: phase-12, scope, sizing, no-split
Affects-phases: phase-12-public-site
Affects-specs: specs/phases/phase-12-public-site/overview.md
Detail: Considered splitting into 12a (landing + identity) and 12b (docs + deploy) for a faster initial ship. User confirmed single-phase scope during brainstorm. Mitigation against runaway size: aggressive non-goals (no custom domain, no auto-sync, no analytics, no i18n) + group decomposition (G0 foundations → parallel G1/G2/G3 → sequential G4/G5/G6). If the Lighthouse-90 acceptance criterion bites mid-phase, defer to a P1 follow-up rather than blocking the release.

---

### [NOTE] 2026-06-07 — Phase 12 supersedes Phase 12 (Reach) planning entry
Topics: phase-12, roadmap, supersedes
Affects-phases: phase-12-public-site, phase-13-reach
Affects-specs: specs/planning/roadmap.md
Detail: Prior roadmap entry for Phase 12 was "Reach — Cursor + Gemini CLI adapters + ENH-009 distribution decision." That work is intact and shifts to Phase 13 (v0.16.0). All deliverables, FEAT-007, FEAT-008, ENH-009 carry over unchanged. Group 0 task in this phase performs the roadmap renumber as a single atomic update across roadmap.md, status.md, phases/README.md, and phases/index.json.

---

### [DECISION] 2026-06-07 — Group 0 brand direction locked: Velocity Arc + Indigo/Slate + Inter
Topics: phase-12, group-0, brand, identity, logo, palette, font, inter, indigo
Affects-phases: phase-12-public-site
Affects-specs: site/src/styles/tokens.css, site/src/styles/custom.css, site/src/assets/logo/
Detail: Brand direction lock-in step in Group 0. User selected Indigo + Slate palette and Inter font outright; deferred logo choice to the agent. Logo mark chosen: **Velocity Arc with integrated arrowhead** — a single bold geometric arc sweeping up-and-right that resolves at its tip into a forward-pointing wedge. Conveys motion + direction in one shape; single-fill geometry scales cleanly from favicon (16px) to hero size; works as light or dark variant via fill color swap. Palette locked: primary `#4F46E5` indigo, surface slate scale (`#F8FAFC` → `#0F172A`), accent slate-700. Font locked: Inter Variable WOFF2, self-hosted in `site/public/fonts/`, with system-ui fallback. Rationale captured in tokens.css comment block; actual SVG mark + wordmark + WOFF2 file land in Group 1 (Brand & Identity Assets). Rejected alternatives: Phase Rings (less iconic motion story), Forward Delta (too sharp, less "momentum"), m-only wordmark (no mark hurts recognition at favicon size).

---

### [DECISION] 2026-06-07 — Group 0 start-phase setup absorbed the roadmap renumber
Topics: phase-12, group-0, start-phase, renumber, bookkeeping
Affects-phases: phase-12-public-site
Affects-specs: specs/planning/roadmap.md, specs/status.md, specs/phases/README.md, specs/phases/index.json, specs/phases/phase-12-public-site/tasks.md
Detail: Original Group 0 plan put the roadmap renumber as Tasks 0.1–0.3 to execute on the phase branch. In practice the renumber is small, atomic, and a /start-phase setup concern — it landed in the `docs: start Phase 12 — Public Site` initial commit alongside the rest of the bookkeeping. Tasks 0.1–0.3 marked `[x]` in tasks.md before any code in Group 0. Net effect: Group 0 on-branch work narrows to scaffold + config + brand tokens + smoke gate. No scope change, just a cleaner sequence.

---

### [DISCOVERY] 2026-06-07 — T7 Shield AppleDouble files break Starlight content loader
Topics: phase-12, group-0, appledouble, t7-shield, content-loader, starlight
Affects-phases: phase-12-public-site
Affects-specs: site/src/content.config.ts
Detail: First `npm run build` failed with `InvalidContentEntryDataError` on `._about.md` — the macOS AppleDouble sidecar files that the T7 Shield external drive (HFS+) generates next to every real `.md` file. Starlight's default `docsLoader()` glob includes them. Fix: replaced `docsLoader()` with `docsLoader({ pattern: ['**/*.{md,mdx}', '!**/._*'] })` in `site/src/content.config.ts`. Build smoke gate now passes with 10 pages built (9 IA + 404), Pagefind search index built, sitemap generated. Same class of bug as the historic BUG-003 in `momentum init`; the fix lives in the site, not the CLI. No backlog entry needed — the workaround is self-contained and the AppleDouble files are already in `.gitignore`.

---

### [DISCOVERY] 2026-06-07 — Ecosystem repos have no agent-discoverable instruction file
Topics: ecosystem, agent-discovery, claude-md, initiatives
Affects-phases: none (filed as ENH-025 in backlog; out of scope for Phase 12)
Affects-specs: none
Detail: Surfaced from a dogfood session in `../cerebrio-ecosystem/`. Agent invoked there proposed updating a "Current Phase Map" table in a parent-dir `CLAUDE.md` instead of writing an `initiatives/NNNN-<slug>.md` — the correct momentum pattern. Root cause verified: `cmdInit` (bin/ecosystem.js:113-200) writes `ecosystem.json`, `README.md`, `initiatives/`, `sessions/`, `.state/`, `.gitignore` but no CLAUDE.md / AGENTS.md, and the live `cerebrio-ecosystem/` repo has none (`ls` confirmed). CLAUDE.md (and AGENTS.md for Codex) is the only auto-loaded agent-discovery surface at session start, so the ecosystem layer is invisible to agents working inside it; they default to the most-familiar pattern in any loaded parent CLAUDE.md. One root cause, one fix: filed ENH-025 (P1) to have `ecosystem init` write a minimal managed CLAUDE.md/AGENTS.md. Initially also filed ENH-026 (detect parent-dir legacy CLAUDE.md), ENH-027 (expand member-repo pointer), ENH-028 (Rule 13 — write initiative before cross-repo planning), ENH-029 (SessionStart breadcrumb) — all dropped on review. ENH-026 was user-specific (cleaning a parent file momentum doesn't own; not framework concern). ENH-027/028/029 addressed hypothetical scenarios not observed in the failure; the principle "don't design for hypothetical requirements" applies. Scheduling deferred — natural home is Phase 15 (Platform / Ecosystem Tier 2) or a standalone ecosystem-polish branch before then.

---

### [DECISION] 2026-06-07 — Group 1 brand assets shipped (logo + favicon + OG card + font + hero)
Topics: phase-12, group-1, brand, assets, logo, favicon, og-cards, fontsource, hero
Affects-phases: phase-12-public-site
Affects-specs: site/src/assets/logo/, site/src/components/, site/public/favicon.svg, site/public/og/, site/scripts/generate-og-cards.mjs, site/astro.config.mjs
Detail: Group 1 (Brand & Identity Assets) landed. **Logo**: single-file SVG mark and wordmark using `currentColor` (one file serves both light and dark themes — no need to maintain duplicates). **Components**: `<Logo />` (wordmark) + `<LogoMark />` (mark only) in `src/components/`. Logo wired into Starlight via `logo.src` + `replacesTitle: true`. **Favicon**: brand-color SVG with `prefers-color-scheme: dark` media query swap; legacy `.ico` + iOS PNG variants deferred to Group 5 follow-up (single SVG favicon covers all evergreen browsers). **OG cards**: 1200×630 SVG template with momentum mark + tagline + IDE-matrix ribbon. `site/scripts/generate-og-cards.mjs` renders SVG → PNG via `sharp` (already in deps); wired as `prebuild` hook. `og:image` + `twitter:card` meta added via Starlight `head` config; PNG output (53KB) lands at `public/og/default.png` and ships in `dist`. **Font**: switched from manual WOFF2 self-host to `@fontsource-variable/inter` v5.2.8 npm package — proper locked dependency, no external download. Loaded via Starlight `customCss` before brand tokens. **Hero**: CSS/SVG composition under `<Hero />` — radial halo, three echo arcs (speed lines) with dashed pattern, main velocity arc + arrowhead, right-side phase-stack grid. Respects `prefers-reduced-motion`. Build smoke remains green (10 pages, Pagefind, sitemap, OG PNG, brand assets all present in `dist`).

---

### [DECISION] 2026-06-07 — Font self-hosting via @fontsource npm package, not curl download
Topics: phase-12, group-1, font, inter, fontsource, supply-chain, sandbox
Affects-phases: phase-12-public-site
Affects-specs: site/package.json, site/astro.config.mjs, site/src/styles/tokens.css
Detail: Initial attempt to `curl` Inter Variable WOFF2 directly from `github.com/rsms/inter/raw/...` was blocked by the auto-mode classifier as an external-source binary download (the agent picked the source itself; user only said "Inter"). Pivot: `npm install @fontsource-variable/inter` — proper version-locked dependency in `package.json`, no external curl, no surprise binary at runtime. Tradeoff: pulls one more npm package (~2MB on disk) vs a single 150KB WOFF2; in return we get a maintained, audited supply chain. `tokens.css` no longer declares its own `@font-face` — fontsource provides them. Family name `'Inter Variable'` matches the brand token already declared.

---

### [DECISION] 2026-06-07 — Group 2 landing page shipped (Starlight splash + custom MDX components)
Topics: phase-12, group-2, landing-page, hero, ide-matrix, feature-grid, install, personas, mdx
Affects-phases: phase-12-public-site
Affects-specs: site/src/content/docs/index.mdx, site/src/components/IDEMatrix.astro, site/src/components/FeatureGrid.astro, site/src/components/InstallSnippet.astro, site/src/components/Personas.astro, site/src/styles/custom.css
Detail: Group 2 (Landing Page) landed using Starlight's splash template + a custom MDX body that composes five new Astro components. **Hero**: Starlight's built-in splash hero handles tagline + Install/GitHub CTAs; custom `<Hero />` background SVG defined in Group 1 is wired via CSS overrides. **IDEMatrix**: agent grid with status badges (Shipped/Planned) and per-agent file-path notes; each card links into `/ide-support/#<anchor>`. **FeatureGrid**: 6 cards (Phases / Backlog / History / Rules / Skills / Ecosystem) with hand-rolled inline SVG icons (no icon library dependency) and per-feature links into the right docs pages. **InstallSnippet**: vanilla-JS copy button (no React/web component runtime); navigator.clipboard with graceful "Press ⌘C" fallback when clipboard is blocked; 2s "Copied" feedback. **Personas**: three short cards (Solo builder / Tech Lead / PM exploring AI coding). **Closing block**: "One repo or many" CTA toward ecosystem docs. Build smoke green; landing dist HTML confirmed to contain all five sections.

---

### [DISCOVERY] 2026-06-07 — MDX rejects inline `<style>` blocks because CSS braces parse as JSX expressions
Topics: phase-12, group-2, mdx, style-blocks, css-in-mdx
Affects-phases: phase-12-public-site
Affects-specs: site/src/content/docs/index.mdx, site/src/styles/custom.css
Detail: First Group 2 build failed with `@mdx-js/rollup` parse error: "Unexpected content after expression" at the `<style>` block inside `index.mdx`. Root cause: MDX treats HTML-like elements as JSX, and `{...}` inside CSS rules (`.foo { color: red; }`) gets parsed as a JS expression. Fix: moved the landing-only `.lead-block` and `.landing-closing` styles out of `index.mdx` and into `site/src/styles/custom.css` (under a comment-marked "Landing-page sections" block). Tradeoff: tiny coupling between content (index.mdx) and styles (custom.css); acceptable because the landing is the one page where they belong together. Workaround for future MDX style needs: write a tiny Astro wrapper component (`.astro` allows `<style>` natively) and import it into MDX. No backlog entry — this is a documented MDX constraint.

---

### [DECISION] 2026-06-07 — Group 3 docs content shipped (8 hand-curated pages)
Topics: phase-12, group-3, docs, getting-started, concepts, skills, rules, ide-support, ecosystem, faq, about
Affects-phases: phase-12-public-site
Affects-specs: site/src/content/docs/getting-started.md, concepts.md, skills.md, rules.md, ide-support.md, ecosystem.md, faq.md, about.md
Detail: Group 3 (Docs Pages) landed. All 8 IA pages have substantive hand-curated content tuned for the public audience (vs internal contributor docs that stay under `/docs`). **getting-started.md**: install paths (npx vs global), per-agent flags, scaffold map, first phase loop, troubleshooting (AppleDouble, hook permissions, BUG-006 reference). **concepts.md**: the five primitives — Phases, Backlog, History, ADRs, Ecosystem mode — sectioned, ≤ 250 words each, with code samples and a "how they fit together" summary. **skills.md**: ~15 slash commands grouped by lifecycle (Project / Phase / Backlog / Cross-repo / Quality), each with a 1-line summary and GitHub source link. **rules.md**: all 13 rules in compressed form (rule statement + Why + Red flag), pointing back to the canonical `.agent/rules/project.md` for full text. **ide-support.md**: matrix table + per-IDE deep section for Claude Code / Codex / Antigravity / Cursor / Gemini CLI with install command, instruction-file path, hook compatibility, and a "picking an adapter" closer. **ecosystem.md**: opt-in story, quickstart, what-it-adds / what-it-doesn't-change, leave + doctor commands. **faq.md**: 9 Q&As (license, telemetry, monorepo, agent lock-in, upgrade, uninstall, contribute, bug reporting, offline). **about.md**: philosophy ("why momentum exists" + 5 design principles), name rationale, source + LICENSE + npm links. Smoke build green (10 pages, Pagefind, sitemap, OG meta). Internal cross-links between pages all use the `/momentum/` base path. External link audit deferred to Group 5 (requires live site for linkinator).

---

### [DECISION] 2026-06-07 — Group 4 deployment wiring landed; ready for Group 5 verification gate
Topics: phase-12, group-4, deployment, github-actions, github-pages, homepage, readme, npm-tarball
Affects-phases: phase-12-public-site
Affects-specs: .github/workflows/deploy-site.yml, package.json, README.md
Detail: Group 4 (Deployment Wiring) landed. **`.github/workflows/deploy-site.yml`**: push trigger on `main` with paths filter `site/**` + workflow-file activated (was commented out in the Group 0 draft). workflow_dispatch preserved for manual re-runs. Existing perms (`contents: read`, `pages: write`, `id-token: write`) + concurrency group `pages` + steps (checkout → setup-node 22 → `npm ci && npm run build` → upload-pages-artifact → deploy-pages) carry over from the Group 0 skeleton. **Root `package.json`**: `homepage` field set to the live site URL. **README**: live-site banner added under the npm badge (`[**Visit the site →**](...)`). **Tarball shape**: `npm pack --dry-run` reports 81 files in the published tarball, ZERO matching `site/` — confirms the `files` glob doesn't accidentally capture site sources. **USER ACTION required before first deploy**: in repo Settings → Pages, set Source = "GitHub Actions". This cannot be automated from CI; the workflow will fail with a clear "Pages not configured" error until the toggle flips. After that, every push to `main` touching `site/**` deploys automatically. Phase now at the autonomous-execution merge-gate boundary; Group 5 (verification — Lighthouse, linkinator, mobile walk) requires a live deployed site and stops the autonomous engine until user confirms.

---
