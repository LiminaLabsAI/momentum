# Phase 14 — Site Refinement & Positioning Pivot: Implementation History

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

### [DECISION] 2026-06-08 — Phase 14 = Site Refinement & Positioning Pivot; Reach pushed to Phase 15
Topics: phase-14, roadmap, renumber, site-refinement, positioning
Affects-phases: phase-14-site-refinement, phase-15-reach, phase-16-intelligence, phase-17-platform
Affects-specs: specs/planning/roadmap.md, specs/status.md, specs/phases/README.md, specs/phases/index.json
Detail: After Phase 13 (v0.16.0) shipped, user reviewed the live site and flagged six issues: four rendering bugs visible on every visitor's screen (anchor-syntax leak, Mermaid dark-mode invisibility, PhaseFlow animation overlay, ecosystem MDX import leak), an unfinished positioning pivot (tagline = agentic AI but lead copy still = AI-assisted coding), inconsistent terminology (repo everywhere in positioning copy), unclear ecosystem ↔ orchestration relationship, a new logo direction, and a README that reads dense + doesn't showcase features. Phase 14 fixes all six before Reach (Cursor + Gemini CLI adapters) ships. Reach moves to Phase 15 (v0.18.0); Intelligence → 16; Platform → 17. Renumber lands in Group 0.

---

### [DECISION] 2026-06-08 — Anchor-syntax fix: install `remark-custom-heading-id` plugin
Topics: phase-14, group-0, mdx, anchor, heading-id, kramdown
Affects-phases: phase-14-site-refinement
Affects-specs: site/astro.config.mjs, site/src/content/docs/orchestration.md
Detail: Bug surfaced on `/orchestration/`: headings like `## scout — read-only context fetch {#scout}` rendered with literal `${#scout}` text in both heading + TOC. Root cause: Starlight's default markdown processor doesn't recognize kramdown-style `{#id}` anchors and the `{...}` then collides with MDX expression-syntax escaping (the `$` appears as the TOC generator's template-literal artifact). Fix: install `remark-custom-heading-id` and wire into `astro.config.mjs` `markdown.remarkPlugins`. Keeps the `{#id}` syntax working as authored — no need to rewrite the orchestration page's anchors. Alternative considered: auto-slugify (`## scout` → `#scout`) — rejected because the headings need to carry context ("read-only context fetch") for the TOC, which would slug to `#scout-read-only-context-fetch` and break the existing `OrchestrationShowcase` deep links.

---

### [DECISION] 2026-06-08 — Mermaid dark-mode: drop `filter: invert()` hack; use brand-themed neutrals
Topics: phase-14, group-1, mermaid, dark-mode, filter, theme-variables
Affects-phases: phase-14-site-refinement
Affects-specs: site/astro.config.mjs, site/src/styles/mermaid.css
Detail: Bug: Mermaid sequence-diagram arrows + message labels disappear in dark mode. Root cause: the `filter: invert(0.88) hue-rotate(180deg) saturate(1.1)` Phase 13 applied to `.mermaid svg` to "auto-darkmode" Mermaid output also inverts the arrow markers (which Mermaid renders with near-white fill at build time) — they end up near-black on a near-black background. Fix: drop the filter entirely. Rewrite `mermaidConfig.themeVariables` in `astro.config.mjs` to use a single neutral palette (indigo accents + slate-500 lines/text) that's legible on BOTH light and dark backgrounds. Per-theme container styling adapts via CSS vars in `mermaid.css`; the inner SVG renders identically in both modes. Cleaner mental model: one diagram, two surrounding surfaces.

---

### [DECISION] 2026-06-08 — PhaseFlow animation: sequential node lighting (no separate pulse circle)
Topics: phase-14, group-1, animation, phase-flow, animate-motion, css-keyframes
Affects-phases: phase-14-site-refinement
Affects-specs: site/src/components/diagrams/PhaseFlow.astro
Detail: Bug: PhaseFlow animated pulse circle (Phase 13 design) renders as a static visual overlay between two static node circles, looking like a stray dot on the path rather than a flowing pulse. Root cause: SVG `<animateMotion>` + `<mpath>` is supported inconsistently and even when it works visually conflicts with the existing static circles. Fix: drop the separate pulse circle and `animateMotion` entirely. Redesign as **sequential node lighting** — each of the 5 nodes (brainstorm / plan / execute / verify / release) pulses its stroke + soft halo in turn (1.5s per node, 7.5s total cycle, infinite). Cleaner brand story: the workflow lights up phase by phase, mirroring how a real momentum loop runs. `prefers-reduced-motion: reduce` holds the static state — no animation.

---

### [DECISION] 2026-06-08 — `ecosystem.md` → `ecosystem.mdx` to fix import-leak bug
Topics: phase-14, group-0, mdx, ecosystem, file-rename
Affects-phases: phase-14-site-refinement
Affects-specs: site/src/content/docs/ecosystem.md → ecosystem.mdx
Detail: Bug: `/ecosystem/` page renders `import EcosystemTopology from '../../components/diagrams/EcosystemTopology.astro';` as literal text + the `<EcosystemTopology />` component never instantiates. Root cause: the file is `ecosystem.md` (plain Markdown), not `ecosystem.mdx`. Plain `.md` files don't process MDX imports or component invocations. Fix: rename to `.mdx`. Starlight slug stays `ecosystem`, so internal links don't change. Astro picks `.mdx` automatically. One-line fix; the Phase 13 mistake was choosing `.md` despite needing MDX features.

---

### [DECISION] 2026-06-08 — Positioning pivot: complete the agentic AI shift across all body copy
Topics: phase-14, group-2, positioning, agentic-ai, lead-block, copy-rewrite
Affects-phases: phase-14-site-refinement
Affects-specs: site/src/content/docs/index.mdx, about.md, concepts.md, getting-started.md, faq.md, site/src/components/Personas.astro, OrchestrationShowcase.astro, RulesCallout.astro, SkillsPreview.astro
Detail: Phase 13 shipped tagline + Starlight description as "Spec-driven development for agentic AI" but the lead block, about page, concepts page, getting-started, FAQ all still said "AI-assisted coding" / "your AI coding agent." User explicitly flagged the inconsistency: "momentum is not just for coding. Momentum is for agentic AI development or building projects something like that... going forward... can be used to manage infrastructure as a DevOps agent." Phase 14 completes the pivot: site-wide rewrite of body copy to position momentum as the **state layer for agentic AI** — phases / decisions / history / backlog as first-class state across any agentic workflow (coding today; infrastructure / research / ops next). Tagline unchanged; just the body alignment. New FAQ Q&A: "Can I use momentum for non-coding agents (DevOps, research, data agents)?" Site-wide grep audit gates Group 2 commit.

---

### [SCOPE_CHANGE] 2026-06-08 — DevOps / Platform engineer persona deferred to ENH-031
Topics: phase-14, group-2, personas, devops, deferred, enh-031
Affects-phases: phase-14-site-refinement
Affects-specs: specs/backlog/backlog.md, site/src/components/Personas.astro
Detail: Original Phase 14 draft proposed adding a 4th persona (DevOps / Platform engineer) to the landing `<Personas />` component to reinforce the agentic-AI-not-just-coding pivot. User declined: "Devopersona, we will not keep it right now, we will think about it later." Decision: persona count stays at 3 (Solo builder / Tech lead / PM). The body copy of the 3 existing personas is refreshed to drop coding-only language, but no 4th card. Deferred work tracked as ENH-031 in backlog (P2, unscheduled) — natural fit when we have a concrete DevOps-agent example to point at and want to visually claim the territory.

---

### [DECISION] 2026-06-08 — Terminology: repo → project in positioning copy; CLI/git contexts unchanged
Topics: phase-14, group-3, terminology, repo, project, multi-project
Affects-phases: phase-14-site-refinement
Affects-specs: site/astro.config.mjs, site/src/content/docs/concepts.md, ecosystem.mdx, orchestration.md, about.md, faq.md, OrchestrationShowcase.astro
Detail: User flagged: "you are targeting this as multi repo coordination. So repo, we should not use repo. I think the terminology we should use multi project." Decision: shift "repo" → "project" in positioning copy and sidebar group title. Site-wide changes: sidebar group "Multi-repo coordination" → "Multi-project coordination"; landing pillar title → "Work across multiple projects"; conceptual prose "across repos" → "across projects"; "cross-repo coordination" → "cross-project coordination"; "the repo's state" → "the project's state." **Stays "repo"** in: pure-git contexts (`git commit/push/branch`); GitHub URLs (`github.com/<user>/<repo>`); the literal CLI command examples (`momentum scout repo-x` — placeholder convention stays). Audit pass before commit: `grep -ri "multi-repo\|cross-repo coordination"` returns 0 non-git hits.

---

### [DECISION] 2026-06-08 — Ecosystem ↔ Orchestration: state layer + action layer framing with NEW StateActionLayers diagram
Topics: phase-14, group-4, ecosystem, orchestration, state-layer, action-layer, diagram, framing
Affects-phases: phase-14-site-refinement
Affects-specs: site/src/components/diagrams/StateActionLayers.astro, site/src/components/OrchestrationShowcase.astro, site/src/content/docs/ecosystem.mdx, orchestration.md, concepts.md
Detail: User explicitly asked "how ecosystem and orchestration are different or they are same and how to showcase the user" and shared their mental model: "ecosystem provides the capability to work with multiple projects and orchestration is a feature or ecosystem itself orchestration. I am not sure. Let us review that once." Decision: lock the relationship as **two complementary layers**. Ecosystem mode = STATE LAYER (nouns: `ecosystem.json`, `initiatives/`, `sessions/`, pointer blocks). Orchestration = ACTION LAYER (verbs: scout / dispatch / handoff / continue). They're complementary, not the same; together they're the canonical multi-project pattern. NEW landing component `StateActionLayers.astro` makes the layering visually explicit: top half = action layer with the 4 verb cards; bottom half = state layer surface with the 4 stateful nouns; connecting arrows from verbs down to state. `OrchestrationShowcase` restructured to host both sub-features under one "Work across multiple projects" pillar with the diagram between them. Both deep pages reframed in their intros to position themselves as half of the pair.

---

### [DECISION] 2026-06-08 — New logo: concentric arcs + curved arrow piercing through, two-tone treatment
Topics: phase-14, group-5, logo, brand, identity, two-tone, concentric-arcs, indigo, slate
Affects-phases: phase-14-site-refinement
Affects-specs: site/src/assets/logo/mark.svg, wordmark.svg, site/public/favicon.svg, site/src/components/Logo.astro, LogoMark.astro, site/src/assets/og/og-template.svg
Detail: User shared a reference image and asked "Can we have the logo like this? You can decide the color." The reference shows 3 concentric arcs (semicircles) on the left + a curved arrow piercing through them up-and-right. Cleaner evolution of the Phase 12 Velocity Arc — adds structural depth via the concentric arcs (suggesting "phases stacking into momentum" or "ripples of progress"). User authorized color choice; locked **two-tone treatment**: arcs in slate-400 (structural / quiet), arrow in indigo-600 (momentum / accent). Tells the brand story in the mark itself: "structure underneath, momentum on top." Light/dark adapt cleanly — arcs use `currentColor` (inherit from text color); arrow stays explicitly indigo-600 (pops on both backgrounds). Regenerate full identity set: mark.svg, wordmark.svg, favicon.svg, Logo.astro, LogoMark.astro, og-template.svg. Velocity Arc retired.

---

### [SCOPE_CHANGE] 2026-06-08 — README wholesale rewrite added to Phase 14
Topics: phase-14, group-6, readme, scope-add, github-presence, jargon
Affects-phases: phase-14-site-refinement
Affects-specs: README.md, specs/phases/phase-14-site-refinement/plan.md
Detail: User flagged after initial draft: "We also need to update the readme file of the momentum. It looks very much like a jargon not able to read it properly. It also should look interesting, understandable and all the images and diagrams we are building... should the readme file also showcase the features and all." Decision: add Group 6 to Phase 14 — wholesale README rewrite mirroring the site's storytelling for GitHub visitors. Hero banner with new wordmark + tagline + badges; quick install code block; "Works with any AI IDE" matrix; "What you get" 6-feature grid; single ↔ multi-project Mermaid diagram (GitHub renders Mermaid natively); orchestration primitives one-liners; "Why momentum exists" paragraph; links to site + npm + LICENSE. ≤ 250 lines. Drops the jargon. Reuses content patterns from the site but doesn't duplicate the docs — README's job is to convert a GitHub visitor into a site visitor. Group 6 sequences after Groups 1–5 (depends on locked positioning, terminology, framing, and the new logo).

---

### [DECISION] 2026-06-08 — Release lifecycle: Phase 14 uses the new gh release create checklist baked into CLAUDE.md
Topics: phase-14, group-7, release, gh-release-create, ci-cd, release-lifecycle, enh-030
Affects-phases: phase-14-site-refinement
Affects-specs: CLAUDE.md, specs/phases/phase-14-site-refinement/plan.md
Detail: PR #11 (post-Phase-13) added the "Release Checklist" block to CLAUDE.md Project Extensions: every release MUST do `gh release create` + `npm publish` + verify both surfaces. Phase 14 is the first phase that operationalizes the checklist. Group 7 explicitly runs `gh release create v0.17.0 --title <title> --notes <body> --latest --verify-tag` between the git tag push and the npm publish, and ends with the three-surface verification (`gh release list | head -3` shows v0.17.0 Latest; `npm view ... version` returns 0.17.0; live site shows new content). ENH-030 (filed in PR #11) still tracks the upstream template fix — it's queued for a future phase that touches `core/commands/complete-phase.md`.

---

### [NOTE] 2026-06-08 — Sizing: Phase 14 is comparable to Phase 13 in scope; 7 groups vs 5 because rendering bugs + README rewrite are additive
Topics: phase-14, sizing, group-decomposition, scope-control
Affects-phases: phase-14-site-refinement
Affects-specs: specs/phases/phase-14-site-refinement/plan.md
Detail: Rough estimate: Group 0 ~1h (renumber + plugin + rename), Group 1 ~2-3h (3 rendering bugs), Group 2 ~3-4h (positioning rewrite across 5+ pages), Group 3 ~1-2h (terminology find-replace + audit), Group 4 ~3-4h (NEW diagram + restructure + cross-link rewrites), Group 5 ~2-3h (logo system regen), Group 6 ~2-3h (README rewrite + verify GitHub rendering), Group 7 ~2-3h (verification + release). Total ~16-23h focused work — slightly smaller than Phase 13 (~22-32h) because most heavy framework code (Mermaid wiring, Playwright, brand system) is already in place. Mitigation against scope creep: aggressive non-goals (no palette/font change, no IA restructure, no Cursor/Gemini, no per-page OG, no DevOps persona); parallel Groups 1-5 keep wall-clock bounded.

---

### [DECISION] 2026-06-08 — Group 0 foundations landed: heading-id plugin + ecosystem rename fix 2 of 4 bugs
Topics: phase-14, group-0, remark-custom-heading-id, ecosystem-mdx, baseline, rendering-bugs
Affects-phases: phase-14-site-refinement
Affects-specs: site/astro.config.mjs, site/src/content/docs/ecosystem.mdx, specs/phases/phase-14-site-refinement/artifacts/wc-baseline.txt
Detail: Group 0 (Foundations + tooling) landed. `remark-custom-heading-id` installed and wired into `markdown.remarkPlugins` in `astro.config.mjs`. Verified post-build: `/orchestration/index.html` contains `id="scout"`, `id="dispatch"`, `id="handoff"`, `id="continue"` heading IDs and ZERO literal `${#...}` leaks (grep confirms). `ecosystem.md` → `ecosystem.mdx` rename + smoke confirms the `EcosystemTopology` SVG now renders (2 matches in dist HTML, ZERO leaked import statements). Word-count baseline captured at `artifacts/wc-baseline.txt`: docs total 14,873 + README 2,222. Roadmap renumber (Site Refinement = 14; Reach → 15; Intelligence → 16; Platform → 17) was absorbed into start-phase setup commit per Phase 12/13 precedent. **Net: 2 of the 4 user-flagged rendering bugs (anchor syntax + ecosystem MDX leak) are already fixed.** Groups 1 takes care of the remaining 2 (Mermaid dark mode + PhaseFlow animation).

---

### [DECISION] 2026-06-08 — Group 1 fixes Mermaid dark mode + redesigns PhaseFlow animation
Topics: phase-14, group-1, mermaid, dark-mode, theme-variables, phaseflow, animation, css-keyframes
Affects-phases: phase-14-site-refinement
Affects-specs: site/astro.config.mjs, site/src/styles/mermaid.css, site/src/components/diagrams/PhaseFlow.astro
Detail: Group 1 (Rendering bug fixes) landed. **Mermaid dark mode fix**: dropped the `filter: invert(0.88) hue-rotate(180deg) saturate(1.1)` hack from `mermaid.css` (which had inverted arrow markers' near-white fill to near-black on the dark page background, making them disappear). Replaced with a STRUCTURAL fix: Mermaid's `themeVariables` now include a full sequence-diagram-specific palette (`actorLineColor` slate-600 for lifelines, `signalColor` slate-600 for arrows, `signalTextColor` slate-900 for messages, `labelBoxBkgColor`/`labelBoxBorderColor`/`labelTextColor`, `noteBkgColor`/`noteBorderColor`, `activationBkgColor`/`activationBorderColor`, plus state-diagram tokens) — these tokens were missing before, which is the root cause of dark-mode arrows vanishing under the invert filter (Mermaid fell back to its `theme:base` defaults of near-white). Container styling in `mermaid.css` now uses a light surface in BOTH modes (slate-50 light / slate-100 dark) so the baked-in slate-900 text + slate-600 arrows + indigo-50 node fills stay readable. The diagram is a "light card on a dark page" pattern — visually clean, no inversion gymnastics. **PhaseFlow animation redesign**: dropped `<animateMotion>` + `<mpath>` + the separate `pf-pulse` circle entirely. Replaced with sequential node lighting via CSS keyframes: each node gets `style="--i: N"` (0–4) so its `animation-delay: calc(var(--i) * 1.5s)` staggers the pulse across the 7.5s cycle. Two keyframe sequences run in parallel per node: `pf-halo-pulse` (a translucent indigo halo scales up and fades out, suggesting an outward ripple) + `pf-body-pulse` (the node's stroke-width briefly thickens). Result: a clean left-to-right "flow" suggestion without a stray dot overlay between nodes. `@media (prefers-reduced-motion: reduce)` (now correctly inverted: animation only runs under `no-preference`) holds the static state with no animation. Smoke build green; verification on the live PhaseFlow + Mermaid blocks happens post-merge in Group 7.

---

### [DECISION] 2026-06-08 — Group 2 completes the agentic AI positioning pivot in body copy
Topics: phase-14, group-2, positioning, agentic-ai, copy-rewrite, faq, personas
Affects-phases: phase-14-site-refinement
Affects-specs: site/src/content/docs/index.mdx, about.md, concepts.md, getting-started.md, faq.md, skills.md, ecosystem.mdx, site/src/components/Personas.astro, FeatureGrid.astro
Detail: Group 2 (Positioning pivot) landed. **9 files updated** to complete the shift Phase 13 started (tagline was already correct; body copy lagged). Key rewrites: (1) `index.mdx` lead block — "momentum is **the state layer for agentic AI**" + explicit "whether your agent ships code, manages infrastructure, runs research, or operates pipelines" scope; (2) `about.md` "Why momentum exists" — "Agentic AI raised the floor" replaces "AI-assisted coding raised the floor"; concrete examples list now includes infra / research / data pipeline; (3) `concepts.md` — "Agentic AI work without phases" replaces "AI-assisted coding without phases"; (4) `getting-started.md` — opens with "open-source state layer for agentic AI" + a one-paragraph callout that the same loop applies to non-coding agents (tutorial stays coding-flavored because it's the most teachable concrete path); (5) `faq.md` — NEW Q&A "Can I use momentum for non-coding agents (DevOps, research, data)?" with 3 concrete examples (infra agents planning Terraform refactors as phases, research agents recording experiment outcomes as `[DECISION]` entries, data agents tracking schema migrations); (6) `skills.md` / `Personas.astro` / `FeatureGrid.astro` / `ecosystem.mdx` description — drop "AI coding agent" / "your AI agent" in favor of "your agent." Persona count stays at 3 (Solo builder / Tech lead / PM exploring agentic AI); DevOps persona deferred to ENH-031 per user direction. Site-wide audit grep returns 0 unintended hits for `AI-assisted coding | AI coding agent | coding agent` (only match is the new FAQ heading itself, which is intentional). Smoke build green.

---

### [DECISION] 2026-06-08 — Group 3 terminology shift: repo → project in positioning copy
Topics: phase-14, group-3, terminology, repo, project, multi-project, sed-batch
Affects-phases: phase-14-site-refinement
Affects-specs: site/astro.config.mjs, site/src/content/docs/about.md, concepts.md, skills.md, getting-started.md, ecosystem.mdx, orchestration.md, rules.md, site/src/components/OrchestrationShowcase.astro, EcosystemTopology.astro
Detail: Group 3 (Terminology shift) landed. **27 hits** across 10 files corrected via targeted sed batch: `multi-repo` → `multi-project`, `cross-repo` → `cross-project`, `across repos` → `across projects`, `Multi-repo` → `Multi-project`. Most-visible changes: (1) `astro.config.mjs` sidebar group title "Multi-repo coordination" → "Multi-project coordination" (this is what the user sees in every page's left sidebar); (2) `OrchestrationShowcase.astro` eyebrow heading on the landing pillar; (3) `concepts.md` line 17 ("Ecosystem mode is the optional layer for cross-project coordination"); (4) `orchestration.md` h2 "## `dispatch` — parallel multi-project fan-out" + multiple paragraph contexts; (5) `rules.md` "Multi-project projects (cross-project guard)" subsection (Rule 9 multi-repo block); (6) `ecosystem.mdx` initiatives + Rule 9 references. Also fixed `about.md` "What's next" roadmap table where Phase numbers were stale (14 = Reach was the OLD Phase 14; renumbered to 15 = Reach / 16 = Intelligence / 17 = Platform to match the Phase 14 renumber from setup). **CLI / git contexts deliberately unchanged**: `git commit/push/branch` references; GitHub URLs (`github.com/<user>/<repo>`); the literal CLI command examples like `momentum scout repo-x` where `repo-x` is a conventional placeholder for the CLI argument. Audit: `grep -rn "multi-repo\|cross-repo\|across repos\|Multi-repo"` against docs + components + astro config returns ZERO hits. Smoke build green.

---
