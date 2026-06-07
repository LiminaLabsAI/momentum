# Phase 13 — Site Polish & Content Depth: Plan

## Execution Order

```
# Mixed: Group 0 → (Groups 1 + 2 + 3 + 4 in parallel) → Group 5
```

Group 0 installs the Mermaid toolchain, locks the brand theme overrides, renumbers the roadmap, and captures the v0.15.0 word-count baseline so Group 5 has a target to assert against. Groups 1–4 are independent content + design tracks that all consume Group 0's diagram tooling but otherwise touch different files. Group 5 verifies the live site and ships v0.16.0.

---

## Group 0 — Foundations & tooling (Sequential)

**Sequential.** Blocks Groups 1–5.

External deps: Node 22 (already pinned via `site/.nvmrc`), npm packages for Mermaid rendering.

**Commit:** `infra(site): Mermaid + diagram tooling + roadmap renumber + baseline capture`

### Tasks

- **Roadmap renumber.** Update `specs/planning/roadmap.md` Timeline + Dependencies + Milestones: Site Polish = 13 (v0.16.0); Reach → 14 (v0.17.0); Intelligence → 15 (v0.18.0); Platform → 16 (v1.0). Update `specs/status.md` Upcoming Phases. Update `specs/phases/README.md` (insert Phase 13 row, In Progress). Update `specs/phases/index.json` (add `phase-13-site-polish` entry with topic keywords).
- **Install Mermaid toolchain.** `npm install -D rehype-mermaid playwright` in `/site`. Wire into `astro.config.mjs` via `markdown.rehypePlugins` array.
- **Smoke-test Mermaid render.** Add a tiny `flowchart` fenced code block to a stub page, run `npm run build`, verify SVG output lands in `dist`.
- **Brand-themed Mermaid config.** Author `site/src/styles/mermaid.css` with overrides matching `--brand-primary` indigo, slate surfaces. Both light + dark variants. Wired via Starlight `customCss`.
- **Diagram component scaffolding.** Create `site/src/components/diagrams/` directory with:
  - `PhaseFlow.astro` — landing hero animated SVG skeleton (Group 1 fills in)
  - `Topology.astro` — single-vs-ecosystem topology SVG skeleton (Group 1 fills in)
  - `EcosystemTopology.astro` — multi-repo ecosystem topology SVG skeleton (Group 3 fills in)
- **Word-count baseline capture.** Run `wc -w site/src/content/docs/*.md site/src/content/docs/index.mdx | tee specs/phases/phase-13-site-polish/artifacts/wc-baseline.txt`. Group 5 asserts ≥ 3× per file.
- **Smoke build green.** `npm run build` succeeds with all stubs in place.
- **Commit Group 0.**

---

## Group 1 — Landing wholesale rewrite (Parallel with G2, G3, G4)

**Parallel.** Depends on Group 0's diagram components (`PhaseFlow`, `Topology`) and Mermaid wiring.

External deps: none beyond Group 0.

**Commit:** `feat(site): landing rewrite — agentic AI positioning + feature pillars + animated hero`

### Tasks

- **Tagline lock.** Update `astro.config.mjs` Starlight description: "Spec-driven development for agentic AI." Update landing `index.mdx` hero tagline to match.
- **Hero — animated phase flow SVG.** Fill in `PhaseFlow.astro`:
  - Five geometric nodes labeled brainstorm / plan / execute / verify / release
  - Connecting arrows in brand indigo
  - Subtle CSS pulse animation cycling left-to-right (respects `prefers-reduced-motion`)
  - Place behind/beside hero text; tagline + CTAs remain primary focal point
- **Section: "One workflow, many scales"** with `Topology.astro` — single repo on left, ecosystem of N repos on right, connected by a shared agent-session icon. SVG, hand-tuned with brand tokens.
- **Section: "Multi-repo coordination"** — orchestration primitives showcase. Four mini-blocks (scout / dispatch / handoff / continue), each with a one-line use case and a tiny inline sequence diagram or icon. Link to `/orchestration/` for the deep version.
- **Section: "The 13 rules"** — callout. Showcase 3–4 standout rules (Rule 6 Git, Rule 8 History, Rule 12 Verify Before Claim) in compact cards. Link to `/rules/`.
- **Section: "15+ slash commands"** — three code-block previews (`/brainstorm-phase`, `/start-phase`, `/complete-phase`) with one-line "what it does" captions. Link to `/skills/`.
- **Refine existing sections.** Keep IDE matrix and personas; augment with Cursor / Gemini CLI explicitly flagged as "shipping in Phase 14."
- **Mobile pass @ 375px.** Every new section single-column; hero SVG scales; no horizontal scroll.
- **Smoke build green.** Landing renders cleanly.

---

## Group 2 — Concepts + Skills + Rules deepening (Parallel with G1, G3, G4)

**Parallel.** Depends on Group 0 (Mermaid wiring).

External deps: source-of-truth files in `core/commands/*` and `.agent/rules/project.md`.

**Commit:** `feat(site): deepen Concepts / Skills / Rules — full content + Mermaid diagrams`

### Tasks

- **`concepts.md` rewrite.** Per-section ≥ 500 words:
  - **Phases** — purpose + lifecycle + the four files in a phase dir + Mermaid state machine showing brainstorm → in-progress → verified → released, with edges labeled `/brainstorm-phase`, `/start-phase`, `/complete-phase`.
  - **Backlog** — IDs / priorities / status / how items move into phases + a real example row.
  - **History** — append-only contract + entry types + one real `[DECISION]` walked through + the file's role in the doc-sync flow.
  - **ADRs** — when to write one + structure + relationship to history entries.
  - **Ecosystem (cross-ref)** — pointer to `/ecosystem/` page.
- **`skills.md` rewrite.** 15 entries grouped by lifecycle (Project / Phase / Backlog / Cross-repo / Quality). Each entry:
  - Name + 1-line summary
  - When to use
  - Input example (what the user types)
  - Output example (what the agent produces — abbreviated)
  - Link to source on GitHub
- **Brainstorm gate sequence diagram (Mermaid).** Inline with `/brainstorm-phase` entry on `/skills/`. Shows: user invokes → sentinel created → conversation phase → Write attempt → PreToolUse hook blocks → user approval → sentinel removed → files written.
- **`rules.md` rewrite.** 13 entries with **full** rule text + Why + Red Flags + Anti-rationalization counters from `.agent/rules/project.md`. Format consistent with the source — don't paraphrase, port faithfully (the source already optimizes for agent comprehension).

---

## Group 3 — Multi-repo deep dive (Parallel with G1, G2, G4)

**Parallel.** Depends on Group 0 (Mermaid wiring + `EcosystemTopology.astro` skeleton).

External deps: source-of-truth files in `core/ecosystem/`, `core/orchestration/`.

**Commit:** `feat(site): multi-repo coordination — ecosystem rewrite + new orchestration page`

### Tasks

- **`ecosystem.md` rewrite.**
  - Fill in `EcosystemTopology.astro` — multi-repo topology SVG showing ecosystem root (`my-eco/`) + 3 member repos with pointer-block annotations + arrows showing `momentum ecosystem status` data flow.
  - Worked example: a 3-repo platform / SDK / CLI ecosystem. Walk through `init --ecosystem` → `join` from each member → cross-repo initiative → daily session log auto-append on `git commit`.
  - Initiative lifecycle: when to write one + structure + how it threads through member-repo phases.
  - Session log: format, what gets auto-recorded, lock pattern for concurrent commits.
  - Cross-ref to `/orchestration/` for the "now-what-do-I-do" step.
- **NEW `/orchestration/` page (`orchestration.md`).**
  - Frame: "Orchestration primitives the main agent composes — not a pipeline."
  - **Scout** — read-only context fetch. When to use. Slash + NL + CLI invocations. Mermaid request/response sequence diagram.
  - **Dispatch** — parallel multi-repo fan-out. Sub-agent prompt scoping. Mermaid fan-out diagram (1 → N → synthesis). Synchronous result shape.
  - **Handoff** — control transfer. Mermaid sequence (sender → `.momentum/inbox/handoff-NNN.md` → receiver). SessionStart auto-greet behavior.
  - **Continue** — pickup. `/continue` slash command behavior, idempotency, inbox cleanup.
  - **Three invocation doors** — slash command, natural-language inference, CLI. Same output shape across all three. Why testing surface stays bounded.
  - **Capability-driven routing** — graceful degradation when an adapter doesn't declare parallel subagents. Labeled degraded modes.
- **Sidebar wiring.** Add `/orchestration/` to Starlight sidebar. Candidate placement: between Skills and Rules under "Reference" OR new top-level group "Multi-repo" containing Ecosystem + Orchestration. Decision recorded in history as `[DECISION]`.

---

## Group 4 — Tutorial + supporting page refinements (Parallel with G1, G2, G3)

**Parallel.** Depends on Group 0.

External deps: none.

**Commit:** `feat(site): end-to-end tutorial + IDE / FAQ / About refinements`

### Tasks

- **`getting-started.md` rewrite.** Keep install section; add new "Your first phase end-to-end" walkthrough that covers:
  - User invokes `/brainstorm-phase` → agent asks scoping questions
  - Brainstorm gate blocks disk writes — explain visible safety
  - User approves → `/start-phase` triggers setup + autonomous execution
  - Agent works through groups, committing and pushing automatically
  - `/complete-phase` verifies + tags + (optionally) publishes
  - Show real-ish `history.md` entries that get written
- **`ide-support.md` deepening.** Per-IDE: hook-compatibility deep dive (which hooks exist on each adapter, what they do), troubleshooting tips, "if your IDE doesn't appear here…" placeholder for Phase 14.
- **`faq.md` expansion.** Current 9 → ~15 Q&As:
  - Is this an MCP server? (No, but Platform Phase 16 will ship one.)
  - How does this compare to copilot rules / cursor rules?
  - Does momentum work with private GitHub repos?
  - Can the agent skip the discipline if I tell it to? (No — that's the point of hooks.)
  - What happens if `/complete-phase` is interrupted?
  - Can I disable specific rules per-project? (Yes — `## Project Extensions`.)
  - How do I write my own command/skill?
- **`about.md` refinement.** Philosophy section gains the "spec-driven development for agentic AI" rationale; design principles list refined to 5 named principles with one-sentence each.

---

## Group 5 — Verification + release (Sequential, final)

**Sequential.** Depends on Groups 1–4 complete.

External deps: live deployed site (auto-deploys on push to main), npm publish access.

**Commit:** `docs: Phase 13 retrospective + v0.16.0 release prep`

### Tasks

- **Smoke build.** `cd site && rm -rf dist .astro && npm run build` — clean exit, all 10 pages built including `/orchestration/`.
- **Mermaid render check.** Every Mermaid block produces an SVG (not a `<pre>` fallback) in dist; light + dark variants visible.
- **linkinator on live site.** `npx linkinator https://trymomentum.github.io/ --recurse --skip 'github.com|npmjs.com'` returns 0 broken; save report to artifacts.
- **Lighthouse landing.** All four categories ≥ 90; save JSON report to `specs/phases/phase-13-site-polish/artifacts/lighthouse-landing.json`.
- **Word-count assertion.** `wc -w` per docs page ≥ 3× baseline captured at Group 0.
- **Diagram count.** 6+ diagrams shipped (custom SVG + Mermaid).
- **CLI regression.** `npm test` on Node 20 → 246/246 pass.
- **Mobile + console-error checks.** Manual user-side or DevTools sweep on all pages.
- **Version bump.** `package.json` version → `0.16.0`.
- **`retrospective.md`** written per Phase 11 / 12 precedent: evidence (Rule 12), acceptance status table, what worked, what could be better, deviations, discoveries, recommendation for Phase 14.
- **Bookkeeping.** Update `specs/status.md` (Phase 13 → Complete; Latest Release → v0.16.0; Recent Changes appended); `specs/phases/README.md` (Phase 13 → Complete); `specs/phases/index.json` (status → complete); `specs/changelog/2026-06.md` entry.
- **/sync-docs + /complete-phase** for any missed reconciliation.
- **PR + merge + tag + npm publish.** PR phase-13 → main; user approval for merge; tag `v0.16.0`; push tag; `npm publish --access public` with user approval (per CLAUDE.md Project Extension).
