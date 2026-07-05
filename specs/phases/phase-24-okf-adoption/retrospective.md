---
type: Retrospective
---

# Phase 24 — Retrospective: Open Knowledge Format (OKF v0.1) Adoption

> **Completed on lane**: 2026-07-05 (branch `feat/open-knowledge-format`, lane `feat-open-knowledge-format`)
> **Target version**: v0.27.0 (assigned at landing; 3 lanes in flight)
> **ADR**: ADR-0005

## Summary

Every momentum project's `specs/` tree is now a conformant OKF v0.1 bundle —
Google Cloud's open, vendor-neutral agent-knowledge format (announced
2026-06-13; spec pinned to `GoogleCloudPlatform/knowledge-catalog`
`okf/SPEC.md`). The two remaining JSON knowledge files are gone: phase
status/tags/deps live as frontmatter on each phase's own `overview.md`
(killing the central-index drift class), the impact map is a readable
markdown table, and legacy projects convert automatically and idempotently
at `momentum upgrade`. New `momentum okf check` / `momentum okf index`
give a mechanical conformance gate and generated bundle listings.

## What shipped

- **G0** — ADR-0005; `core/lib/frontmatter.js` (zero-dep YAML subset,
  tolerant reads, textual `type` insertion); `core/lib/okf-types.js`
  (path→type taxonomy, 20 rules incl. Architecture Spec / Vision).
- **G1** — waves engine reads `overview.md` frontmatter; legacy
  `index.json` fallback with a one-time `momentum upgrade` stderr nudge;
  cross-format parity test.
- **G2** — `core/lib/okf-migrate.js` (distribute / convert / sweep /
  index / delete; idempotent; ghost entries recreated so no data is
  lost); wired into `momentum upgrade`; `bin/okf.js` (`check`, `index`).
- **G3** — `core/specs-templates/` migrated by the engine itself (scaffold
  and generator provably can't drift); 7 recipes + `rules-body.md` +
  regenerated CLAUDE.md/AGENTS.md; `/validate` step 4b delegates to
  `momentum okf check`; all 3 adapter fingerprints re-baselined with a
  phase-24 meta note.
- **G4** — self-repo dogfood via the real upgrade: 28 phases distributed,
  155 files swept, 192-file bundle checks green; two pre-existing drift
  artifacts surfaced and repaired (phase-18 `complete-on-branch`
  staleness; phase-7c listed-but-dirless ghost).
- **G5** — README "Your specs are an open knowledge bundle" section;
  developer-guide OKF section; ENH-052 filed for the site page (deferred
  to the `feat-site-redesign` lane); signals sent to the site + opencode
  lanes; version bump to 0.27.0.

## Verification Evidence

All output fresh from this session (2026-07-05), lane branch
`feat/open-knowledge-format`; raw captures in `evidence/`:

- **Full suite**: `npm test` → **769/769 pass, 0 fail** (baseline 733 at
  phase start; +36 net new tests). Post-rebase onto main (VAL-002 +
  BUG-017 landings): **770/770 pass** — the combination is green.
  `evidence/suite-and-grep.txt`.
- **Smoke 1 — fresh init**: `momentum init` → `momentum okf check` →
  `✓ specs/ is an OKF v0.1 conformant bundle (17 markdown file(s))`.
  `evidence/smoke-init-upgrade.txt`.
- **Smoke 2 — legacy upgrade**: index.json + impact-map.json project →
  `momentum upgrade` → both JSONs deleted, frontmatter distributed
  (`status: in-progress`, `tags: [demo]` verified in the output), check
  green. Same evidence file.
- **Self-repo (D6)**: `node bin/momentum.js okf check .` →
  `✓ … (192 markdown file(s))`; `momentum waves` reads
  `overview.md frontmatter` source and schedules only phase-24;
  `specs/phases/index.json` + `specs/decisions/impact-map.json` deleted.
- **Idempotency (acceptance #4)**: second `node bin/momentum.js upgrade .`
  after the G4 commit → `git status --short | wc -l` = **0**.
- **Fidelity (acceptance #2)**: `tests/okf-migration.test.js` asserts
  status/tags/deps equality for every index.json entry post-migration,
  including the dir-less ghost entry.
- **Parity (acceptance #3)**: `tests/waves-cli.test.js` parity test —
  identical wave layers + lane suggestions from both formats.
- **D5 sweep**: remaining `index.json`/`impact-map.json` mentions in
  shipped instruction surfaces are deliberate legacy/migration references
  only (grep capture in evidence).

## Acceptance Criteria — status

1. `okf check` green on fresh init / upgraded legacy fixture / self-repo — **met** (smokes 1-2, D6).
2. Migration fidelity asserted, not eyeballed — **met** (okf-migration tests).
3. Waves parity across formats — **met** (parity test).
4. Second upgrade = empty diff — **met** (0 changed files).
5. Suite green, zero unexplained fingerprint drift — **met** (769/769; all drift enumerated + noted in fixture meta).

## What went well

- Running the migration engine on `core/specs-templates/` itself removed
  an entire class of template↔generator drift and cost zero extra code.
- The dogfood migration immediately proved the thesis: it *surfaced* two
  real drift artifacts (phase-18, phase-7c) that the central index had
  been hiding for weeks.
- Dual-read fallback let every existing index.json test fixture become
  fallback-path coverage for free.

## What to improve

- `git add -A` on the G4 dogfood commit swept in 8 upgrade-backup `.bak`
  files (removed in a follow-up commit). The `.bak` noise class is now
  twice-observed — folded into BUG-017's scope.
- The full-conformance sweep makes upgrade rewrite up to ~155 user spec
  files in one diff; the clean-tree gate contains it, but release notes
  must warn users to expect a large (content-preserving) first diff.

## Follow-ups

- ~~BUG-017~~ — RESOLVED on main same day by lane
  `fix-BUG-017-hook-exec-bits` (exec bits committed, `.bak` artifacts
  dropped + gitignored, BUG-012 guard extended); picked up here via the
  pre-landing rebase.
- **ENH-052** (P2): OKF site page — owned by the `feat-site-redesign`
  lane (signaled).
- Landing coordination: declared overlap with `feat-opencode-adapter` on
  `bin/momentum.js` + `tests/` (signaled; Rule 6 Landing Order applies).
