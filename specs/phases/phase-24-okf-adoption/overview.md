---
type: Phase
status: complete
tags: [okf, open-knowledge-format, knowledge-format, frontmatter, yaml, specs-structure, phases-index, impact-map, migration, upgrade, templates, waves, okf-check, okf-index, adr-0005, distributed-metadata, v0-27-0]
---

# Phase 24 — Open Knowledge Format (OKF v0.1) Adoption

> **Target version**: v0.27.0 (nominal — next free minor at landing; 3 lanes in flight)
> **Branch / lane**: `feat/open-knowledge-format` (lane `feat-open-knowledge-format`;
> branch keeps its lane-registry binding — Active Phase row is the phase binding record,
> per the 21b/21c non-phase-branch precedent)
> **Status**: Complete — landed on main and released as v0.27.0 (2026-07-05)

## Goal

Make every momentum project's `specs/` tree a conformant **OKF v0.1 bundle** —
Google Cloud's open, vendor-neutral knowledge format (announced 2026-06-13;
normative spec: `github.com/GoogleCloudPlatform/knowledge-catalog`, `okf/SPEC.md`).
Kill the two remaining JSON knowledge files (`specs/phases/index.json`,
`specs/decisions/impact-map.json`) in favor of markdown with YAML frontmatter,
migrate existing projects at `momentum upgrade` time, and ship OKF-native templates.

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| Target spec | OKF v0.1, pinned to `GoogleCloudPlatform/knowledge-catalog` `okf/SPEC.md` | Mission task #1; only required field is `type` — near-zero ceremony |
| Ambition | **Full bundle conformance** (operator, 2026-07-05) | specs/ becomes portable agent knowledge, not just momentum state |
| Phase metadata | **Distributed frontmatter** on each phase's `overview.md` (operator, 2026-07-05) | File path = identity (OKF); kills the index.json-vs-reality drift class (bit Phases 21a & 23); lane-parallel-safe |
| `index.json` topics | Become OKF-recommended `tags` | Native field, no invented key |
| `status` / `deps` | Extension keys in frontmatter | OKF explicitly allows; consumers preserve unknown keys |
| `impact-map.json` | → `specs/decisions/impact-map.md`, one table (`type: Impact Map`) | Only agent-read (no JS reader) — a table is strictly better for its consumers |
| `history.md` | **Stays** `history.md` (+ `type` frontmatter); reserved `log.md` NOT adopted | log.md is optional in OKF; renaming would churn Rule 8 + every recipe for zero conformance gain |
| CLI readers | Frontmatter first, **index.json fallback + upgrade nudge** | A new CLI must not break inside a not-yet-upgraded project |
| YAML parsing | Zero-dep subset parser (`core/lib/frontmatter.js`) | Constraint: no runtime dependencies; we emit the subset we parse |
| ADR | **ADR-0005** authored in G0 | Storage format of the whole spec layer is a decisional change |

## Scope

**In:**
1. ADR-0005 + frontmatter lib + path→`type` taxonomy (one shared module)
2. Waves engine reads distributed frontmatter (`core/waves/lib/plan-graph.js`, `bin/waves.js`)
3. `momentum upgrade` OKF migration: distribute index.json → per-phase frontmatter;
   impact-map.json → impact-map.md; frontmatter-injection sweep over `specs/**/*.md`;
   root `specs/index.md` with `okf_version: "0.1"` + generated listings for
   `specs/phases/` and `specs/decisions/`; delete the JSON; **idempotent**
4. `momentum okf check` (conformance) + `momentum okf index` (regenerate listings)
5. `core/specs-templates/` fully OKF-native; JSON templates replaced; the ~9
   instruction surfaces referencing the JSON files updated (recipes ×7,
   `rules-body.md`, CLAUDE.md template); fingerprint re-baselined with meta
6. Self-repo dogfood: momentum's own `specs/` migrated via the real upgrade path
7. README + developer-guide note

**Out (non-goals):**
- Reserved `log.md` adoption (history.md stays)
- OKF for runtime state: lanes registry (ADR-0003 §5), swarm state, `ecosystem.json`
- Site page (site-redesign lane owns that surface — backlog item + landing signal instead)
- `index.md` in every directory (root + phases + decisions only; OKF consumers synthesize)
- Renaming overview/plan/tasks/history conventions
- Non-`.md` artifacts (evidence `.txt`/`.json`, fixtures) — untouched

## Deliverables & Verification

| # | Deliverable | Verification |
|---|---|---|
| D1 | ADR-0005 + `core/lib/frontmatter.js` + taxonomy | `node --test tests/frontmatter.test.js` |
| D2 | Waves on frontmatter (JSON fallback) | `node --test tests/waves-*.test.js`; fixture parity: waves output pre = post migration |
| D3 | Upgrade migration, idempotent | `node --test tests/okf-migration.test.js` (incl. 2nd-run no-diff assert) |
| D4 | `momentum okf check` / `okf index` | `node --test tests/okf-check.test.js`; check passes on fresh-init fixture |
| D5 | OKF-native templates + instruction sweep | fingerprint test green after re-baseline; `grep -r 'index\.json' core/commands core/instructions core/specs-templates` → 0 hits |
| D6 | Self-repo migration | `node bin/momentum.js okf check` green on self repo; `momentum waves` resolves phases; index.json + impact-map.json deleted |
| D7 | Docs + retrospective + bump | full suite green; Rule 12 evidence section |

## Acceptance Criteria

1. `momentum okf check` passes on: fresh `momentum init` project, upgraded legacy
   fixture, and the momentum self-repo.
2. Migration fidelity test: every phase's status/deps/topics after migration ==
   index.json values before (assertion, not eyeball).
3. `momentum waves` fixture output semantically identical pre/post migration.
4. Second `momentum upgrade` run produces an empty git diff (idempotency).
5. Full suite green (baseline 733 + new tests); zero unexplained fingerprint drift.
