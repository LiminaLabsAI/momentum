---
type: Phase
status: complete
tags: [phase-13, site-polish, content-depth, augment-in-place, mermaid, custom-svg, diagrams, landing-rewrite, agentic-ai, positioning, feature-pillars, phase-flow, animated-hero, topology, ecosystem-rewrite, orchestration-page, scout, dispatch, handoff, continue, multi-repo-coordination, concepts-deepening, skills-examples, rules-full-text, tutorial, end-to-end-walkthrough, ide-support-deep, faq-expansion, word-count-baseline, rehype-mermaid]
---

# Phase 13 — Site Polish & Content Depth: Overview

## Vision

Phase 12 (v0.15.0) shipped the public site at `trymomentum.github.io` — structurally complete, all 9 pages live, Lighthouse green. On review, the site under-provisions the product story: the landing is text-only with no diagrams or motion, the docs are too thin to be "fully useful by reading it," and the two biggest differentiators — **ecosystem mode** (multi-repo state) and **orchestration primitives** (scout / dispatch / handoff / continue) — are either buried or absent entirely.

Phase 13 transforms the site from "structurally complete" to "compelling, modern, and fully useful." The positioning shifts to **"spec-driven development for agentic AI"** as the umbrella, with each distinct feature given its own showcase section with a diagram. The multi-repo coordination story — ecosystem + orchestration unified — becomes visible from the first viewport. Every docs page is rewritten to be the source you'd actually keep open while building.

**Hard invariant — the npm package's behavior stays identical.** No CLI code changes ship in this phase. Only site source, diagram tooling, and the small metadata bump.

**Hard invariant — Phase 12's brand identity stays locked.** Velocity Arc logo, Indigo + Slate palette, Inter Variable font. No rebrand. The visual delta comes from new layout / motion / diagrams, not new identity tokens.

**Hard invariant — augment in place.** The 9-page IA from Phase 12 stays. We add exactly ONE new page (`/orchestration/`). Existing pages get rewritten content, not restructured location.

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Redesign shape | Augment in place | Brand just locked one day ago. Wholesale rebrand would discard fresh investment. Layout + motion + diagrams + content depth carries the visual delta. |
| Diagrams stack | Mermaid (technical sequences) + custom SVG (landing hero / topology) | Mermaid is maintainable for sequence/state diagrams next to the prose; custom SVG matches brand tokens for marketing-facing visuals. Hybrid wins on both axes. |
| Hero direction | Editorial diagram + animated phase flow | Conveys product shape in one glance: brainstorm → plan → execute → verify → release. Subtle motion (respects `prefers-reduced-motion`). |
| Umbrella positioning | "Spec-driven development for agentic AI" | User-confirmed during brainstorm. Multiple feature pillars showcase under this banner — single-project, multi-project (no context switching), orchestration, context handover, autonomous rules, slash commands. |
| Multi-repo framing | Ecosystem + orchestration as ONE unified "Multi-repo coordination" pillar on the landing | Together they're the moat. Standalone Orchestration page covers scout/dispatch/handoff/continue with sequence diagrams. |
| Content depth target | Each docs page ≥ 3× v0.15.0 word count | Measurable acceptance criterion via `wc -w site/src/content/docs/*.md`. Removes subjectivity from "fully useful." |
| New page | ONE only — `/orchestration/` | Avoids IA churn. Orchestration content was missing entirely in v0.15.0; the new page closes that gap. |
| Roadmap renumber | Site Polish = 13 (v0.16.0); Reach → 14; Intelligence → 15; Platform → 16 | One step shift; carries the v1.0 milestone forward one slot. |

## Information Architecture (v2 — 10 pages)

```
/                          Landing — wholesale rewrite (new hero, 6+ feature pillars)
/getting-started/          + end-to-end "Your first phase" tutorial inline
/concepts/                 Per-concept sections ≥ 500 words; phase lifecycle diagram (Mermaid)
/skills/                   15 entries with input/output examples + brainstorm-gate diagram
/rules/                    13 entries with full text + Why + Red Flags + Anti-rationalization
/ide-support/              Per-IDE setup + hook compatibility deep dive
/ecosystem/                Rewritten with topology SVG + worked 3-repo example
/orchestration/  (NEW)     scout / dispatch / handoff / continue with sequence diagrams
/faq/                      Expanded from 9 → ~15 Q&As
/about/                    Refined: philosophy + design principles + name rationale
```

## Diagrams to ship (8 total)

| # | Diagram | Type | Page |
|---|---|---|---|
| 1 | Animated phase flow (brainstorm → … → release) | Custom SVG + CSS | Landing hero |
| 2 | Single-project vs ecosystem topology | Custom SVG | Landing — "One workflow, many scales" |
| 3 | Phase lifecycle state machine | Mermaid | `/concepts/#phases` |
| 4 | Multi-repo ecosystem topology | Custom SVG | `/ecosystem/` hero |
| 5 | Handoff sequence (sender → inbox → receiver) | Mermaid | `/orchestration/#handoff` |
| 6 | Dispatch fan-out (1 → N sub-agents → synthesis) | Mermaid | `/orchestration/#dispatch` |
| 7 | Scout request/response sequence | Mermaid | `/orchestration/#scout` |
| 8 | Brainstorm gate sequence (PreToolUse hook flow) | Mermaid | `/skills/#brainstorm-phase` or `/rules/#rule-7` |

## Landing v2 — feature pillar sections

1. **Hero** — "Spec-driven development for agentic AI" + tagline + animated SVG phase flow + Install / GitHub CTAs.
2. **Works with any AI IDE** — refined agent matrix (existing IDEMatrix component).
3. **One workflow, many scales** — single project ↔ ecosystem with topology SVG; "no context switching" angle.
4. **Multi-repo coordination** — orchestration primitives showcase with embedded mini sequence diagrams.
5. **The 13 rules** — discipline preserved without enforcement overhead; 3–4 standout rules + link to `/rules/`.
6. **15+ slash commands** — code-block previews of `/start-phase`, `/complete-phase`, `/scout`, etc.
7. **Built for the way you work** — personas (refined from v0.15.0).
8. **Install** — code + copy button (existing InstallSnippet component).
9. **Footer**

## Key Deliverables

1. **Landing wholesale rewrite** per the section list. Hero SVG animated. 6+ feature sections with diagrams.
2. **`/orchestration/` page (NEW)** — scout / dispatch / handoff / continue with 3 sequence diagrams + 1 NL-inference example.
3. **`/concepts/` rewritten** — per-concept ≥ 500 words; phase lifecycle Mermaid diagram inline.
4. **`/skills/` rewritten** — 15 entries with input/output examples; brainstorm-gate Mermaid diagram inline.
5. **`/rules/` rewritten** — 13 entries with full text + Why + Red Flags + Anti-rationalization counters from `.agent/rules/project.md`.
6. **`/ecosystem/` rewritten** — topology SVG + 3-repo worked example + initiative lifecycle + session log demo.
7. **`/getting-started/` augmented** — end-to-end "Your first phase" walkthrough section.
8. **`/ide-support/`, `/faq/`, `/about/` refinements** — moderate deepening.
9. **Mermaid plugin wired into Starlight** — diagrams render in both light + dark themes.
10. **v0.16.0 metadata-only release** — npm published, tag, retrospective.

## Acceptance Criteria

1. **Landing has 6+ distinct feature sections** (currently 4); each has a diagram or visual element.
   - Verify: count `<section>` blocks in `dist/index.html` or visual walkthrough.
2. **Each docs page word count ≥ 3× the v0.15.0 baseline.**
   - Verify: `wc -w site/src/content/docs/*.md` against a baseline captured at Phase 13 start.
3. **At least 6 of 8 diagrams ship.** Non-negotiable: hero animated SVG + ecosystem topology SVG + handoff + dispatch sequences. The remaining 4 may defer to a follow-up if scope tightens (logged as backlog).
   - Verify: file presence in `site/src/components/diagrams/` + Mermaid blocks in markdown.
4. **`/orchestration/` page exists** with scout, dispatch, handoff, continue all documented.
   - Verify: `curl https://trymomentum.github.io/orchestration/` returns 200 with all four sections.
5. **Every Mermaid diagram readable in both light and dark mode.**
   - Verify: visual review with theme toggle on each page that has a Mermaid block.
6. **Lighthouse landing ≥ 90 across Performance / Accessibility / Best Practices / SEO.**
   - Verify: `npx lighthouse https://trymomentum.github.io/ --only-categories=...` JSON output saved to artifacts.
7. **linkinator: 0 broken links across the live site.**
   - Verify: `npx linkinator https://trymomentum.github.io/ --recurse --skip 'github.com|npmjs.com'`.
8. **CLI regression: `npm test` 246/246 still pass.**
   - Verify: fresh run on Node 20 from a clean working tree.
9. **v0.16.0 published to npm**, `homepage` unchanged, package size within ±5% of v0.15.0.
   - Verify: `npm view @avinash-singh-io/momentum@0.16.0 dist.unpackedSize`.

## Scope (Out — Non-Goals)

- **Custom domain** (`momentum.dev`, etc.) — still deferred.
- **Brand rebrand** — Velocity Arc logo, Indigo + Slate palette, Inter Variable font all stay locked from Phase 12.
- **IA restructure** beyond adding `/orchestration/`. No splitting Concepts / Skills / Rules into per-item sub-pages.
- **External search** (Algolia DocSearch) — Pagefind only.
- **Analytics / telemetry / cookies.**
- **Documentation versioning** (v0.x vs v1.0 docs).
- **i18n / translations.**
- **Page-transition animations** (Astro view transitions can come later if needed).
- **Tutorials beyond the single end-to-end walkthrough** on `/getting-started/`.
- **Reach work** (Cursor / Gemini CLI adapters) — pushes to Phase 14.
- **Marketing-copy iteration with AI tooling.** First draft is shipped; iteration is a post-phase activity.

## Open Questions (resolved during execution)

- **Mermaid theme colors** — locked at Group 0 to match `--brand-primary` indigo.
- **Sidebar placement of `/orchestration/`** — TBD in Group 3; candidates: "Reference" group or a new "Multi-repo" group containing both Ecosystem and Orchestration.
- **Word-count baselines** — captured at Group 0 start so Group 5 verification has a target to assert against.
