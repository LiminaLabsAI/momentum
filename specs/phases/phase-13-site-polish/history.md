# Phase 13 — Site Polish & Content Depth: Implementation History

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

### [DECISION] 2026-06-08 — Phase 13 = Site Polish & Content Depth; Reach pushed to Phase 14
Topics: phase-13, roadmap, renumber, site, content-depth
Affects-phases: phase-13-site-polish, phase-14-reach, phase-15-intelligence, phase-16-platform
Affects-specs: specs/planning/roadmap.md, specs/status.md, specs/phases/README.md, specs/phases/index.json
Detail: After v0.15.0 (Phase 12) shipped trymomentum.github.io, user reviewed the live site and flagged three structural gaps: (1) landing is plain text with no diagrams or motion; (2) docs are too thin to be "fully useful by reading it"; (3) the multi-repo coordination story (ecosystem mode + orchestration primitives — the actual moat) is buried or missing entirely. Phase 13 — Site Polish & Content Depth — closes these gaps before Reach (Cursor + Gemini CLI adapters) ships. Reach moves to Phase 14 (v0.17.0); Intelligence → 15; Platform → 16. Renumber lands in Group 0.

---

### [DECISION] 2026-06-08 — Augment in place, not full rebrand
Topics: phase-13, scope, augment, brand-stability, rebrand-rejected
Affects-phases: phase-13-site-polish
Affects-specs: specs/phases/phase-13-site-polish/overview.md
Detail: Considered four redesign shapes during brainstorm: (a) augment in place, (b) new landing + restructured docs IA, (c) full visual rebrand + content rewrite, (d) two-phase split. User chose augment in place. Rationale: brand identity (Velocity Arc logo, Indigo + Slate palette, Inter Variable font) just locked one day ago in Phase 12 — wholesale rebrand discards fresh investment. The visual delta in Phase 13 comes from new LAYOUT + MOTION + DIAGRAMS + CONTENT DEPTH, not new identity tokens. IA stays at 9 existing pages + 1 new (`/orchestration/`). Lower risk; ships one focused sprint.

---

### [DECISION] 2026-06-08 — Mermaid (technical sequences) + custom SVG (landing/topology) hybrid for diagrams
Topics: phase-13, diagrams, mermaid, custom-svg, hybrid-tooling, starlight-plugin
Affects-phases: phase-13-site-polish
Affects-specs: site/astro.config.mjs, site/src/styles/mermaid.css, site/src/components/diagrams/
Detail: Site needs 6–8 diagrams (phase lifecycle state machine, handoff sequence, dispatch fan-out, scout request/response, brainstorm gate sequence, single-vs-ecosystem topology, multi-repo ecosystem topology, animated landing hero). Considered: (a) all Mermaid, (b) all custom SVG, (c) hybrid Mermaid + custom SVG, (d) Mermaid + ONE animated SVG hero. User chose (c). **Mermaid** via `rehype-mermaid` plugin for technical sequences — maintainable, lives next to the prose, easy to update. **Custom SVG** for landing hero and topology diagrams — matches brand tokens precisely, won't have Mermaid's "default" feel where polish matters most. Best of both axes. Group 0 installs the plugin and authors `site/src/styles/mermaid.css` for brand-themed light + dark renders.

---

### [DECISION] 2026-06-08 — Landing hero: editorial diagram + animated phase flow
Topics: phase-13, landing, hero, animation, phase-flow, prefers-reduced-motion
Affects-phases: phase-13-site-polish
Affects-specs: site/src/content/docs/index.mdx, site/src/components/diagrams/PhaseFlow.astro
Detail: Four hero directions considered during brainstorm: (a) editorial diagram + animated flow, (b) live terminal + code panel, (c) two-panel "before / after", (d) single statement + asymmetric layout. User chose (a). Hero centers on a custom SVG showing the momentum workflow in motion: brainstorm → plan → execute → verify → release, with brand-indigo connecting arrows and a subtle CSS pulse animation cycling left-to-right. Respects `prefers-reduced-motion` — when reduced motion is requested, the animation falls back to a static gradient highlight. Tagline + Install / GitHub CTAs sit beside the diagram. Conveys product shape in one glance; reads as "modern technical product."

---

### [DECISION] 2026-06-08 — Positioning: "Spec-driven development for agentic AI"
Topics: phase-13, positioning, umbrella, agentic-ai, framing, feature-pillars
Affects-phases: phase-13-site-polish
Affects-specs: site/astro.config.mjs, site/src/content/docs/index.mdx
Detail: User flagged that v0.15.0's positioning — "open-source toolkit" — is too generic and under-provisions the feature story. New framing locked during brainstorm: **"Spec-driven development for agentic AI"** as the umbrella tagline. Under that umbrella, multiple distinct features each get their own showcase section with diagram: single-project workflow, multi-project (no context switching — agent has full ecosystem context), orchestration primitives, context handover, 13 autonomous rules, 15+ slash commands. The landing is structured as feature pillars (one section per pillar with a diagram), not a single headline + supporting blocks. This frames momentum as a CATEGORY — spec-driven dev for agentic AI — not a tool. Echoes the user's explicit ask: "within that there are multiple features and we can highlight the features."

---

### [DECISION] 2026-06-08 — Multi-repo coordination unified: ecosystem + orchestration as one pillar
Topics: phase-13, multi-repo, ecosystem, orchestration, pillar-framing, moat
Affects-phases: phase-13-site-polish
Affects-specs: site/src/content/docs/index.mdx, site/src/content/docs/ecosystem.md, site/src/content/docs/orchestration.md
Detail: v0.15.0 framed ecosystem mode as a single short paragraph at the bottom of the landing; orchestration primitives (scout / dispatch / handoff / continue — the biggest v0.14.0 differentiators) were missing from the site entirely. Phase 13 unifies them as the "Multi-repo coordination" pillar on the landing — ecosystem mode is the durable state layer; orchestration primitives are how an agent works inside it. Together they form the moat. Standalone deep-dive at `/orchestration/` (NEW page) with sequence diagrams for scout, dispatch, handoff. Ecosystem page rewritten with a topology SVG + 3-repo worked example. Both pages cross-reference each other so the narrative connects regardless of entry point.

---

### [DECISION] 2026-06-08 — Content depth target: each docs page ≥ 3× v0.15.0 word count
Topics: phase-13, content-depth, acceptance-criteria, measurable, word-count, baseline
Affects-phases: phase-13-site-polish
Affects-specs: specs/phases/phase-13-site-polish/overview.md, specs/phases/phase-13-site-polish/artifacts/wc-baseline.txt
Detail: User flagged docs are "too thin to be fully useful by reading it" — Concepts has ~50 words per topic, Skills is a flat link index, Rules is compressed, Ecosystem is one paragraph. "Fully useful" is subjective. Locked a measurable proxy: **each docs page word count ≥ 3× the v0.15.0 baseline**, measured via `wc -w site/src/content/docs/*.md`. Group 0 captures the baseline at phase start (`artifacts/wc-baseline.txt`). Group 5 asserts ≥ 3× per file. Removes ambiguity from the acceptance bar without forcing arbitrary minima — pages with less inherent content (FAQ, About) won't be padded just to hit a number, since they start from a low baseline.

---

### [DECISION] 2026-06-08 — One new page only; no IA restructure
Topics: phase-13, ia, new-page, orchestration, no-restructure, augment-in-place
Affects-phases: phase-13-site-polish
Affects-specs: site/astro.config.mjs, site/src/content/docs/orchestration.md
Detail: Considered splitting Concepts into per-concept sub-pages and Skills into per-skill sub-pages. Rejected — IA churn confuses returning visitors, breaks search rankings (Pagefind regenerates), and adds maintenance overhead. Phase 13 adds exactly ONE new page: `/orchestration/`. All other content depth lives inline in existing pages with richer sectioning and diagrams. The augment-in-place principle from the redesign-shape decision applies to IA the same way it applies to brand. Sidebar placement of `/orchestration/` (Reference group vs new "Multi-repo" group) deferred to Group 3 execution; whichever placement lands gets logged as a follow-up `[DECISION]`.

---

### [NOTE] 2026-06-08 — Sizing: Phase 13 is larger than Phase 12; group decomposition keeps it tractable
Topics: phase-13, sizing, group-decomposition, scope-control
Affects-phases: phase-13-site-polish
Affects-specs: specs/phases/phase-13-site-polish/plan.md
Detail: Rough estimate: Group 0 ~1-2h, Group 1 (landing) ~4-6h, Group 2 (Concepts/Skills/Rules deepening) ~6-8h, Group 3 (multi-repo deep dive + NEW orchestration page) ~6-8h, Group 4 (tutorial + 3 page refinements) ~4-6h, Group 5 (verification + release) ~1-2h. Total ~22-32h focused work — larger than Phase 12 but appropriately sized for the v0.16.0 target. Mitigation against runaway scope: aggressive non-goals (no custom domain, no rebrand, no IA restructure beyond `/orchestration/`, no per-item sub-pages); parallel Groups 1-4 keep wall-clock bounded; Group 5's "6 of 8 diagrams" floor (vs hard 8/8) leaves a release-safety valve.

---
