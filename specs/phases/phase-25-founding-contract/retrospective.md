---
type: Retrospective
---

# Phase 25 — Founding Contract — Retrospective

> **Status**: built + verified; at the merge/release gate (v0.32.0 target)
> **Branch**: `phase-25-founding-contract`
> **Trigger**: ENH-060 (P1) — live dogfood on a fresh v0.31.2 project shipped
> an entire MVP while all four foundation docs remained untouched init
> templates, and nothing noticed.

## What shipped

1. **ADR-0008 + `core/project-lifecycle.md`** — the three-state contract
   (Installed → Founded → Phase loop), one owning command per state;
   founded ⟺ charter + roadmap exist (pure file existence, zero heuristics).
2. **init ships no foundation placeholders** — the four templates deleted
   from `core/specs-templates/`; `status.md` template carries the explicit
   "Not founded" router state; init success message routes through founding.
3. **upgrade heals legacy installs** — `migrateFoundationDocs()` removes
   foundation files whose frontmatter-stripped, whitespace-normalized body
   hash matches the frozen historical set
   (`core/foundation-placeholder-hashes.json` — audited: exactly ONE hash
   per path across all shipped history; the v0.27.0 OKF revision was
   frontmatter-only). Edited files untouched; `--dry-run` previews;
   idempotent.
4. **`/start-project` reframed as the founding step** — content, not
   structure; works on any repo state; inline authoring formats for the four
   docs; brainstorm-gate + approval contract intact.
5. **Founded gate across the surface** — `/brainstorm-phase` +
   `/start-phase` stop and route to `/start-project` when unfounded;
   `/validate` check 2b (phases ⟹ founded = failure; unfounded-no-phases =
   valid); `/migrate` reports "Founded: yes/no" and never creates
   placeholders; Rule 1 not-founded routing in the single-source rules body
   (all four generated instruction surfaces regenerated per ADR-0004).
6. **Docs** — site getting-started gains "Step 2 — Found the project"
   (walkthrough renumbered), scaffold tree corrected, skills page
   `/start-project` rewritten; README phase-loop gains the founding sentence.
7. **Roadmap renumber** — 25 = Founding Contract (v0.32.0),
   Intelligence → 26 (v0.33.0+), Platform → 27 (v1.0).

## Verification Evidence

- **Full suite**: `npm test` → `tests 845 / pass 845 / fail 0`
  (baseline 833 → +12 `tests/founding-contract.test.js`: init shape ×4
  adapters, init message, manifest↔fixture integrity, removal, edited-file
  survival, pre-OKF variant, dry-run, idempotence, authored-doc
  byte-stability). Run three times across G1/G2/G3 states — green each time.
- **Adapter fingerprints**: all 4 re-baselined with ADR-0008 meta
  (claude-code, codex, antigravity via `scripts/capture-fingerprints.js
  --write --note …`; opencode via `MOMENTUM_RESNAPSHOT_OPENCODE=1`).
  Observed drift exactly matched intent: 4 removals + status/README/index
  templates + the touched command docs + regenerated instruction files.
- **e2e fresh init**: `evidence/e2e-fresh-init.txt` — no `specs/vision/`,
  no roadmap, `NOT-FOUNDED-SHAPE-OK`, status router text present,
  `momentum okf check` ✓ (13-file conformant bundle).
- **e2e legacy heal**: `evidence/e2e-legacy-upgrade.txt` — dry-run previews
  without deleting; real run removes all 4 with per-file 🗑 lines + summary
  `foundation docs: removed 4 untouched placeholder(s)`;
  `HEALED-TO-NOT-FOUNDED-OK`; second run reports no untouched placeholders.
- **Site build**: `npm run build` in `site/` → `[build] Complete!`,
  postbuild content gate ✓ (12 pages, all bodies non-empty). Required a
  local `npm ci` first (stale node_modules missing `astro-icon` from the
  redesign — environment issue, not a product change).
- **Instruction-generation drift guard**: suite-embedded `--check` green
  after regeneration.

## Acceptance criteria — status

- [x] Fresh init (all 4 adapters): no `specs/vision/*`, no roadmap, status
  says Not founded (test + e2e evidence)
- [x] Upgrade removes exactly the provably-untouched files; edited charter
  survives (tests + e2e evidence)
- [x] `/start-phase` + `/brainstorm-phase` gate on founded (command docs)
- [x] `/validate` fails phases-without-founding (check 2b)
- [x] `/start-project` authors all four + status Summary on any repo state
- [x] Roadmap shows 25/26/27 (grep sweep clean; frozen records untouched)
- [x] Suite green; 4 fingerprints re-baselined with meta

## What went well

- The frozen-hash audit collapsed the migration risk: one normalized hash
  per path across ALL history makes false-positive deletion essentially
  impossible while catching every real placeholder.
- The `migrateAgentRules()` precedent (Phase 23) meant the new migration
  followed a proven shape — hash-match → remove + report, dry-run aware.
- Deleting the templates did most of the init work by construction (the
  copy loop simply has nothing to copy) — no init code change needed.

## What could improve

- Fingerprint re-baselining ran twice (G1, G2) because a G2 doc rode the G1
  snapshot; a single-batch template+doc change would have avoided the double
  churn (accepted trade-off for honest per-group commits).
- The site walkthrough had accumulated stale claims beyond this phase's
  scope (retired `.agent/rules/project.md`, Antigravity hook status) — left
  untouched per lane discipline; consider a site accuracy pass.

## Follow-ups

- None filed as backlog items during the phase. The demo project
  (`~/Workspace/Projects/password-manager`) can be healed post-release with
  `npx @limina-labs/momentum@latest upgrade` (operator-run — outside this
  repo).
