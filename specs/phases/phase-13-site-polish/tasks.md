# Phase 13 — Site Polish & Content Depth: Tasks

> Granular checklist mirroring `plan.md`. Mark `[x]` complete, `[/]` in progress, `[ ]` not started.

## Group 0 — Foundations & tooling (Sequential)

- [x] Renumber `specs/planning/roadmap.md` — Site Polish = 13, Reach = 14, Intelligence = 15, Platform = 16 (Timeline + Dependencies + Milestones)
- [x] Renumber `specs/status.md` Upcoming Phases + Active Phase → Phase 13 — Site Polish
- [x] Update `specs/phases/README.md` — append Phase 13 row, status In Progress
- [x] Update `specs/phases/index.json` — add `phase-13-site-polish` entry with topic keywords
- [ ] `npm install -D rehype-mermaid playwright` in `/site`
- [ ] Wire Mermaid into `astro.config.mjs` via `markdown.rehypePlugins`
- [ ] Smoke-test: add `flowchart` block to a stub page, build, verify SVG output in `dist`
- [ ] Author `site/src/styles/mermaid.css` — brand-themed overrides, light + dark
- [ ] Wire `mermaid.css` into Starlight `customCss` array
- [ ] Create `site/src/components/diagrams/` directory
- [ ] Create `PhaseFlow.astro` skeleton (landing hero — Group 1 fills in)
- [ ] Create `Topology.astro` skeleton (single-vs-ecosystem — Group 1 fills in)
- [ ] Create `EcosystemTopology.astro` skeleton (multi-repo topology — Group 3 fills in)
- [ ] Capture word-count baseline: `wc -w site/src/content/docs/*.md site/src/content/docs/index.mdx | tee specs/phases/phase-13-site-polish/artifacts/wc-baseline.txt`
- [ ] Smoke build green: `cd site && npm run build`
- [ ] Commit Group 0: `infra(site): Mermaid + diagram tooling + roadmap renumber + baseline capture`

## Group 1 — Landing wholesale rewrite (Parallel with G2, G3, G4)

- [ ] Update Starlight `description` in `astro.config.mjs` → "Spec-driven development for agentic AI"
- [ ] Update landing `index.mdx` hero tagline → "Spec-driven development for agentic AI"
- [ ] Fill `PhaseFlow.astro` — 5 nodes (brainstorm / plan / execute / verify / release), brand-indigo arrows, CSS pulse animation, prefers-reduced-motion respected
- [ ] Section "One workflow, many scales" — fill `Topology.astro`; single repo ↔ ecosystem visual
- [ ] Section "Multi-repo coordination" — 4 orchestration primitive mini-blocks (scout / dispatch / handoff / continue) + link to `/orchestration/`
- [ ] Section "The 13 rules" — callout with 3–4 standout rules (Rule 6 / Rule 8 / Rule 12) in compact cards + link to `/rules/`
- [ ] Section "15+ slash commands" — three code-block previews (`/brainstorm-phase`, `/start-phase`, `/complete-phase`) + link to `/skills/`
- [ ] Refine existing IDE matrix (flag Cursor / Gemini CLI as Phase 14 shipping)
- [ ] Refine existing personas (compress copy where possible)
- [ ] Mobile pass @ 375px — no horizontal scroll; hero SVG scales; all sections single-column
- [ ] Smoke build green
- [ ] Commit Group 1: `feat(site): landing rewrite — agentic AI positioning + feature pillars + animated hero`

## Group 2 — Concepts + Skills + Rules deepening (Parallel with G1, G3, G4)

- [ ] `concepts.md` rewrite — Phases section ≥ 500 words + Mermaid state machine
- [ ] `concepts.md` — Backlog section ≥ 500 words + real example row
- [ ] `concepts.md` — History section ≥ 500 words + walked-through real `[DECISION]`
- [ ] `concepts.md` — ADRs section ≥ 500 words + when to write + structure
- [ ] `concepts.md` — Ecosystem cross-ref pointer to `/ecosystem/`
- [ ] `skills.md` rewrite — 15 entries, each with input/output example + when-to-use + GitHub link
- [ ] `skills.md` — Brainstorm gate Mermaid sequence diagram inline with `/brainstorm-phase` entry
- [ ] `rules.md` rewrite — port all 13 rules verbatim from `.agent/rules/project.md` (rule + Why + Red Flags + Anti-rationalization counters)
- [ ] Smoke build green
- [ ] Commit Group 2: `feat(site): deepen Concepts / Skills / Rules — full content + Mermaid diagrams`

## Group 3 — Multi-repo deep dive (Parallel with G1, G2, G4)

- [ ] Fill `EcosystemTopology.astro` — ecosystem root + 3 members + pointer-block annotations + status data-flow arrows
- [ ] `ecosystem.md` rewrite — topology SVG hero + 3-repo worked example
- [ ] `ecosystem.md` — initiative lifecycle section
- [ ] `ecosystem.md` — session log section (format + auto-append behavior + lock pattern)
- [ ] `ecosystem.md` — cross-ref to `/orchestration/`
- [ ] NEW `/orchestration/` page — create `site/src/content/docs/orchestration.md`
- [ ] Orchestration intro — primitives composed by the main agent, not a pipeline
- [ ] Scout section — slash + NL + CLI invocations + Mermaid request/response sequence
- [ ] Dispatch section — Mermaid fan-out (1 → N → synthesis) + result shape + sub-agent prompt scoping
- [ ] Handoff section — Mermaid sequence (sender → inbox → receiver) + SessionStart auto-greet
- [ ] Continue section — `/continue` slash command behavior + idempotency + inbox cleanup
- [ ] Three invocation doors — slash / NL / CLI explainer with same-output-shape guarantee
- [ ] Capability-driven routing + labeled degraded modes
- [ ] Sidebar wiring — add `/orchestration/` to Starlight sidebar (placement decision logged as `[DECISION]`)
- [ ] Smoke build green
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
