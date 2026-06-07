# Phase 13 — Site Polish & Content Depth: Tasks

> Granular checklist mirroring `plan.md`. Mark `[x]` complete, `[/]` in progress, `[ ]` not started.

## Group 0 — Foundations & tooling (Sequential)

- [x] Renumber `specs/planning/roadmap.md` — Site Polish = 13, Reach = 14, Intelligence = 15, Platform = 16 (Timeline + Dependencies + Milestones)
- [x] Renumber `specs/status.md` Upcoming Phases + Active Phase → Phase 13 — Site Polish
- [x] Update `specs/phases/README.md` — append Phase 13 row, status In Progress
- [x] Update `specs/phases/index.json` — add `phase-13-site-polish` entry with topic keywords
- [x] `npm install -D rehype-mermaid playwright` in `/site`
- [x] `npx playwright install chromium` (92MB browser binary cached at ~/Library/Caches/ms-playwright/)
- [x] Wire Mermaid into `astro.config.mjs` via `markdown.rehypePlugins` with `strategy: 'inline-svg'`
- [x] Mermaid themeVariables: brand indigo + slate + Inter Variable font wired through
- [x] Smoke-test: state-diagram block in concepts.md → inline SVG with brand colors (verified)
- [x] Author `site/src/styles/mermaid.css` — container + dark-mode filter overrides
- [x] Wire `mermaid.css` into Starlight `customCss` array
- [x] Create `site/src/components/diagrams/` directory
- [x] Create `PhaseFlow.astro` skeleton (landing hero — Group 1 fills in)
- [x] Create `Topology.astro` skeleton (single-vs-ecosystem — Group 1 fills in)
- [x] Create `EcosystemTopology.astro` skeleton (multi-repo topology — Group 3 fills in)
- [x] Capture word-count baseline (4,011 total; per-file in `artifacts/wc-baseline.txt`)
- [x] Smoke build green: 10 pages built, Mermaid SVG inline-rendered, Pagefind + sitemap clean
- [ ] Commit Group 0: `infra(site): Mermaid + diagram tooling + roadmap renumber + baseline capture`

## Group 1 — Landing wholesale rewrite (Parallel with G2, G3, G4)

- [x] Update Starlight `description` in `astro.config.mjs` → "Spec-driven development for agentic AI…"
- [x] Update landing `index.mdx` hero tagline → "Spec-driven development for agentic AI."
- [x] `PhaseFlow.astro` filled — 5 nodes (brainstorm / plan / execute / verify / release), brand arc, animated pulse via animateMotion, prefers-reduced-motion respected
- [x] Section "One workflow, many scales" — `Topology.astro` rendered (single repo ↔ ecosystem visual; eyebrow + heading + lead + diagram)
- [x] Section "Multi-repo coordination" — NEW `OrchestrationShowcase.astro` (4 primitive cards: scout / dispatch / handoff / continue with icons + body text + link to `/orchestration/`)
- [x] Section "The 13 rules" — NEW `RulesCallout.astro` (Rule 6 / Rule 8 / Rule 12 standouts + link to `/rules/`)
- [x] Section "15+ slash commands" — NEW `SkillsPreview.astro` (3 code-block previews with realistic-looking command output)
- [x] IDE matrix unchanged (already accurate — Cursor / Gemini CLI flagged as Planned)
- [x] Personas unchanged from v0.15.0 (still accurate)
- [/] Mobile pass @ 375px — CSS auto-fit grids responsive by construction; visual confirmation in Group 5
- [x] Smoke build green: 10 pages, all 5 new sections rendered + PhaseFlow/Topology SVGs inline
- [ ] Commit Group 1: `feat(site): landing rewrite — agentic AI positioning + feature pillars + animated hero`

## Group 2 — Concepts + Skills + Rules deepening (Parallel with G1, G3, G4)

- [x] `concepts.md` rewrite — Phases + Group Execution Pattern + git boundaries + state diagram (1,597 words; 2.85× baseline)
- [x] `concepts.md` — Backlog section with priorities table + ID prefixes + how items move
- [x] `concepts.md` — History section with entry types + format + worked example + doc-sync explanation
- [x] `concepts.md` — ADRs section + when to write vs history + "how they fit together" closer
- [x] `concepts.md` — Ecosystem cross-ref pointer to `/ecosystem/`
- [x] `skills.md` rewrite — 15 entries grouped by lifecycle (Project / Phase / Backlog / Cross-repo / Quality), each with input/output examples (1,102 words; 2.24× baseline — pad in Group 5)
- [x] `skills.md` — Brainstorm gate Mermaid sequence diagram inline with `/brainstorm-phase` entry
- [x] `rules.md` rewrite — 13 rules ported faithfully from `.agent/rules/project.md` (statement + Why + Red Flags + Anti-rationalization where present) + "where the rules live" + "what's not a rule" closer (2,157 words; 3.09× baseline ✓)
- [x] Smoke build green: 11 pages, brainstorm-gate sequence diagram + phase-lifecycle diagram both inline-rendered
- [ ] Commit Group 2: `feat(site): deepen Concepts / Skills / Rules — full content + Mermaid diagrams`

## Group 3 — Multi-repo deep dive (Parallel with G1, G2, G4)

- [x] `EcosystemTopology.astro` filled (Group 0 skeleton already had ecosystem root + 3 members + pointer-block markers + status-flow arrows)
- [x] `ecosystem.md` rewrite — topology SVG hero + 5-step worked example (3 repos: platform / sdk / cli)
- [x] `ecosystem.md` — initiatives section (lifecycle + structure + example)
- [x] `ecosystem.md` — session log section (format + auto-append behavior + concurrent-commit lock)
- [x] `ecosystem.md` — cross-ref to `/orchestration/`
- [x] NEW `/orchestration/` page created (`orchestration.md`, 1,716 words)
- [x] Orchestration intro — primitives composed by main agent, not a pipeline; intro flowchart diagram
- [x] Scout section — invocations + Mermaid request/response sequence + ScoutResult shape + when to / when NOT
- [x] Dispatch section — Mermaid fan-out diagram + result shape + sync vs stream rationale + capability-driven routing
- [x] Handoff section — Mermaid sequence (sender → inbox → receiver) + context block format + pickup mechanics
- [x] Continue section — invocations + idempotency + inbox archival convention
- [x] Three invocation doors — slash / NL / CLI explainer with same-output-shape guarantee
- [x] Capability-driven routing + labeled degraded modes
- [x] Sidebar wiring — NEW "Multi-repo coordination" sidebar group containing Ecosystem mode + Orchestration (decision: new group, not under Reference)
- [x] Smoke build green: 11 pages (was 10), Pagefind 22 HTML files
- [/] Word count target for ecosystem.md (≥ 1371): currently 1289 — slight padding deferred to Group 5
- [ ] Commit Group 3: `feat(site): multi-repo coordination — ecosystem rewrite + new orchestration page`

## Group 4 — Tutorial + supporting page refinements (Parallel with G1, G2, G3)

- [ ] `getting-started.md` — add "Your first phase end-to-end" walkthrough section
- [ ] Walkthrough — `/brainstorm-phase` step with agent question example
- [ ] Walkthrough — brainstorm gate visible safety explanation
- [ ] Walkthrough — `/start-phase` autonomous execution flow
- [ ] Walkthrough — `/complete-phase` verification + tag + (optional) publish
- [ ] Walkthrough — show real-ish `history.md` entries
- [ ] `ide-support.md` — per-IDE hook compatibility deep dive
- [ ] `ide-support.md` — troubleshooting tips section
- [ ] `ide-support.md` — "if your IDE doesn't appear here…" placeholder
- [ ] `faq.md` — current 9 retained, 6 new Q&As added (MCP / copilot compare / private repos / disable rules / interrupted complete-phase / authoring own skill)
- [ ] `about.md` — philosophy gains "spec-driven development for agentic AI" rationale
- [ ] `about.md` — design principles refined to 5 named principles, one-sentence each
- [ ] Smoke build green
- [ ] Commit Group 4: `feat(site): end-to-end tutorial + IDE / FAQ / About refinements`

## Group 5 — Verification + release (Sequential)

- [ ] Build verification: fresh `cd site && rm -rf dist .astro && npm ci && npm run build` exits 0
- [ ] Mermaid SVG rendering verified in `dist` (no `<pre>` fallback)
- [ ] linkinator on live site: 0 broken links across all 10 pages
- [ ] Lighthouse landing: Performance ≥ 90
- [ ] Lighthouse landing: Accessibility ≥ 90
- [ ] Lighthouse landing: Best Practices ≥ 90
- [ ] Lighthouse landing: SEO ≥ 90
- [ ] Save Lighthouse JSON → `specs/phases/phase-13-site-polish/artifacts/lighthouse-landing.json`
- [ ] Word-count assertion: each docs page ≥ 3× baseline
- [ ] Diagram count: 6+ shipped (SVG + Mermaid)
- [ ] CLI regression: `npm test` 246/246 pass on Node 20
- [ ] Mobile + console-error sweep (flagged for user-side confirmation)
- [ ] `package.json` version → 0.16.0
- [ ] Write `retrospective.md` per Phase 11 / 12 precedent
- [ ] `specs/status.md` — Phase 13 → Complete; Latest Release → v0.16.0; Recent Changes appended
- [ ] `specs/phases/README.md` — Phase 13 → Complete
- [ ] `specs/phases/index.json` — phase-13-site-polish status → complete
- [ ] `specs/changelog/2026-06.md` — Phase 13 close entry
- [ ] `/sync-docs` for missed reconciliation
- [ ] `/complete-phase` — verification rerun + write retrospective.md
- [ ] PR phase-13-site-polish → main; user approval for merge
- [ ] Tag `v0.16.0` on main; push tag
- [ ] `npm publish --access public` (USER-APPROVED per CLAUDE.md Project Extension)
- [ ] Commit Group 5: `docs: Phase 13 retrospective + v0.16.0 release prep`
