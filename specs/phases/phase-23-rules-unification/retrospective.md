---
type: Retrospective
---

# Phase 23 — Rules Unification: Retrospective

> **Completed**: 2026-07-04 (all groups; landing + release pending approval)
> **ADR**: 0004 — Single-Source Instruction Generation

## What Shipped

Every agent — Claude Code, Codex, Antigravity — now auto-loads the complete
detailed rulebook (Rules 1–15 with every Red Flags matrix and
anti-rationalization counter, Rule 13 TDD folded in) from its native primary
instruction file, generated from one canonical source:

- `core/instructions/{navigation,rules-body}.md` + per-adapter
  `header.md`/`surfaces.md`/`vars.json` → `scripts/generate-instructions.js`
  → the three committed templates (`npm run generate-instructions`,
  `--check` drift mode). Codex AGENTS.md 248 → 691 lines; Antigravity
  167 → 608; Claude Code unchanged in substance (marker + Rule 13).
- `.agent/rules/project.md` retired: not installed, deleted from the tree;
  `momentum upgrade` migrates installed copies — pristine (whitespace-
  tolerant sha256 vs 7 harvested historical revisions) → removed;
  customized → kept + deprecation warning + shielded from Phase 20 orphan
  cleanup (`removeOrphans` gained `keepRel`).
- ~20 reference sites repointed (momentum-orient skills, review-code
  recipes, migrate/start-project, both swarm-supervisor personas, codex
  reviewer TOML, parity matrix + footnote 16, developer guide,
  `adapters/claude-code/adapter.sh`).
- 3 adapter fingerprints re-baselined after a check-mode audit confirmed
  drift was exactly the phase surface.

## Verification Evidence

```
$ npm test                                → tests 733, pass 733, fail 0
$ node scripts/generate-instructions.js --check
  = core/specs-templates/CLAUDE.md up to date
  = adapters/codex/instructions/AGENTS.md up to date
  = adapters/antigravity/instructions/AGENTS.md up to date
$ node --test tests/instruction-generation.test.js    → 4/4 (byte-drift + invariants)
$ node --test tests/agent-rules-migration.test.js     → 5/5 (pristine / whitespace /
                                                          customized / orphan-shield / dry-run)

# Fresh-install smoke, all adapters (evidence: this run, 2026-07-04):
claude-code: rules=15 redflags=9 agent-rules-files=0  ✓
codex:       rules=15 redflags=9 agent-rules-files=0  ✓
antigravity: rules=15 redflags=9 agent-rules-files=0  ✓
(project-name substitution verified in the same run)

# Self-repo dogfood (evidence/self-upgrade.txt):
🗑  removed: .agent/rules/project.md (pristine — rules now live in the
    primary instruction file)   ← after the whitespace-normalization fix;
    the first run correctly took the safe path (kept + warned) on a
    single-trailing-newline difference, which drove that fix.
CLAUDE.md: managed section regenerated; '## Project Extensions'
    (release checklist) preserved byte-for-byte; 15 rules present.

# Regenerated-template diff audit (G1): exactly three intended changes vs
# the old hand-maintained CLAUDE.md — marker comment added, two pointer
# lines removed, Rule 13 expanded. Zero other churn.
```

## Deferred / Open

- **Antigravity `<user_rules>` size check** (G5 operator task): whether the
  IDE ingests a 608-line AGENTS.md untruncated needs a live IDE session —
  cannot be exercised from this CLI environment. Recorded as the phase's
  one open task; fallback decision (condensed body variant) pre-agreed in
  ADR-0004 if truncation is observed.
- **ENH-050 (P1, filed)**: `momentum lanes open` based this very lane on
  the checked-out (unlandable) VAL-002 branch; required a mid-phase
  `rebase --onto main` + fragment decontamination. Fix candidates recorded.

## What Went Well / Lessons

- The G1 diff audit (regenerated vs hand-maintained template) proved the
  extraction lossless before anything else depended on it.
- The self-repo dogfood caught a real edge (whitespace-only "customization")
  that synthetic tests missed — and the migration failed SAFE, exactly as
  designed.
- Lesson (fed into ENH-050): lane base must be explicit; the freshness gate
  catches contamination too late.

## Release Recommendation

Minor bump — **v0.26.0** (new generation subsystem + migration + retired
surface; no breaking CLI changes). Landing order: this lane is the only one
in flight.
