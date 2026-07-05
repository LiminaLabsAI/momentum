# Phase 24 — Implementation Plan

# Mixed: Group 0 → (Groups 1 + 2 + 3 in parallel) → Group 4 → Group 5

## Group 0 — Contracts: ADR-0005, frontmatter lib, type taxonomy
**Sequential.** Blocks everything. No external dependencies.
Commit: `feat(okf): ADR-0005 + zero-dep frontmatter lib + type taxonomy`

- [ ] ADR-0005 "Adopt OKF v0.1 as the specs storage format": pinned spec
      reference, full path→type taxonomy table, migration policy, dual-read
      (fallback + nudge) policy, log.md non-adoption rationale
- [ ] `core/lib/frontmatter.js` — parse/serialize the emitted YAML subset
      (string scalars, inline + block string lists, quoted strings); tolerant
      reads (unparseable → null, never throw); round-trip preserves unknown keys
      (OKF requirement)
- [ ] `core/lib/okf-types.js` — path-pattern → `type` map, single source for
      migration + checker + templates:
      status.md→Status · backlog.md→Backlog · backlog/details/*→Backlog Detail ·
      roadmap.md→Roadmap · planning/*→Planning Note · decisions/NNNN-*→Decision ·
      impact-map.md→Impact Map · phases/*/overview.md→Phase · plan.md→Plan ·
      tasks.md→Task List · history.md→Phase History · retrospective.md→Retrospective ·
      phases/*/evidence/**/*.md→Evidence · adhoc/*/record.md→Ad-hoc Record ·
      changelog/*→Changelog · **/README.md→Guide · fallback→Note
- [ ] Tests: `tests/frontmatter.test.js`, `tests/okf-types.test.js`

## Group 1 — Waves engine on distributed frontmatter
**Parallel with Groups 2 and 3** (G0 fixes the contract both sides code against).
Commit: `feat(waves): phase metadata from OKF frontmatter; index.json fallback`

- [ ] `core/waves/lib/plan-graph.js`: scan `specs/phases/*/overview.md`
      frontmatter for status/deps; fall back to index.json when no phase dir
      has frontmatter, emitting one stderr nudge ("legacy specs/phases/index.json
      — run `momentum upgrade`")
- [ ] `bin/waves.js` + `bin/momentum.js` help text
- [ ] Re-point `tests/waves-cli.test.js` / `tests/waves-e2e-demo.test.js`
      fixtures; add fallback-path test + parity test (same fixture, both
      formats, equal output)

## Group 2 — Migration engine + `momentum okf` CLI
**Parallel with Groups 1 and 3.**
Commit: `feat(upgrade): OKF v0.1 migration — JSON state → markdown bundle`

- [ ] `core/lib/okf-migrate.js`: (a) index.json → per-phase overview.md
      frontmatter (status/tags/deps; create minimal overview.md when a listed
      phase dir lacks one); (b) impact-map.json → impact-map.md table;
      (c) frontmatter-injection sweep — every frontmatter-less `specs/**/*.md`
      gets `type` (from taxonomy) with body preserved byte-for-byte; files with
      existing frontmatter: add missing `type` only, preserve everything else;
      (d) root `specs/index.md` (`okf_version: "0.1"`) + listings for phases/ +
      decisions/; (e) delete both JSON files; (f) idempotent — rerun = no-op
- [ ] Wire into `momentum upgrade` (after clean-tree gate/autostash, before
      hook refresh); summary line in upgrade output
- [ ] `momentum okf check` — conformance report (parseable frontmatter +
      non-empty type on every non-reserved specs .md; reserved-file structure);
      exit 1 on violations. `momentum okf index` — regenerate listings
- [ ] Tests: `tests/okf-migration.test.js` (synthetic legacy project e2e:
      migrate → check green → fidelity asserts → idempotency),
      `tests/okf-check.test.js`

## Group 3 — Templates + instruction sweep
**Parallel with Groups 1 and 2.**
Commit: `feat(templates): OKF-native specs templates + recipe updates`

- [ ] `core/specs-templates/`: frontmatter on every .md; delete
      `specs/phases/index.json` + `specs/decisions/impact-map.json` templates;
      add `specs/index.md` (okf_version) + phases/decisions `index.md` templates;
      new `impact-map.md` template
- [ ] Instruction sweep (all index.json / impact-map.json references):
      `core/commands/{start-phase,start-project,migrate,validate,sync-docs,lanes,log}.md`,
      `core/instructions/rules-body.md`, `core/specs-templates/CLAUDE.md`,
      `core/specs-templates/specs/decisions/README.md` — adapters inherit via
      the existing transforms
- [ ] `/validate` recipe gains an OKF section (delegates to `momentum okf check`)
- [ ] Fingerprint re-baseline with meta (expected: large, fully explained drift)

## Group 4 — Self-repo dogfood migration
**Sequential** after 1+2+3.
Commit: `chore(specs): self-repo OKF migration — specs/ is an OKF v0.1 bundle`

- [ ] Run the real `momentum upgrade` path against this repo (also refreshes
      installed recipes); review the full diff phase-by-phase
- [ ] `node bin/momentum.js okf check` green; `momentum waves` resolves; both
      JSON files gone; CLAUDE.md nav/Rule 8 references now say impact-map.md

## Group 5 — Verification, docs, release prep
**Sequential** last.
Commit: `docs(phase-24): evidence + retrospective; v0.27.0`

- [ ] Full suite; smoke: fresh init → `okf check` green; legacy fixture
      upgrade → converted + green
- [ ] README "Your specs are an OKF bundle" section + developer-guide note;
      backlog item for the site page (site-redesign lane owns the surface)
- [ ] Retrospective with Rule 12 evidence; version bump

## Risks / Coordination

- **Overlap (advisory) with opencode lane**: `bin/momentum.js`, `tests/` —
  Rule 6 Landing Order handles it (rebase + suite between landings); signal the
  lane before landing.
- **Fingerprint drift is the point** in G3 — re-baseline discipline: every
  drifted file listed + explained in the snapshot meta.
- **Upgrade rewrites user-authored files** (frontmatter injection) — mitigations:
  byte-preserving body, additive-only, idempotent, behind the Phase 20
  clean-tree gate so the diff is always reviewable.
