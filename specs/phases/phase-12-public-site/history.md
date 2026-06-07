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
