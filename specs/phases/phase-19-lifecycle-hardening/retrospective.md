# Phase 19 — Lifecycle Hardening: Retrospective

> **Target release**: v0.21.0
> **Branch**: `phase-19-lifecycle-hardening`
> **Theme**: make momentum's lifecycle discipline *real* (mechanism), not prose.

## What shipped

Two workstreams, six groups (G0 → G1 ∥ G2 → G3 → G4 → G5).

### Workstream A — Git lifecycle enforcement
- **FEAT-018** — vendor-neutral git hooks installed via `core.hooksPath` → `.githooks/` (zero-dependency, no husky): `commit-msg` validates Conventional Commits; `pre-push` blocks direct pushes to `main`/`staging` without the single-use `.momentum/merge-approved` sentinel. Warn-not-clobber on husky / pre-existing hooks paths.
- **FEAT-019** — Rule 12 verify-evidence gate: `pre-push` blocks a release-tag push unless the relevant `retrospective.md` has a non-empty `## Verification Evidence` (inert where no retrospective convention exists).
- **BUG-009** — Rule 6 relabeled (dropped "(Automatic)"; per-row "Hook enforcement" column; `--no-verify` line points to the real hooks + `MOMENTUM_SKIP_HOOKS`).
- **ENH-041 (reframed)** — forge-neutral "optional hardening" docs (no GitHub-specific code; DIP preserved).
- **ENH-042** — `/complete-phase` branch-delete step + branch-hygiene self-audit.
- **ENH-043** — `.gitignore` (repo + template) ignore `.claude/worktrees/`.
- **TD-007** — pruned 14 stale origin branches (after a merged-vs-unmerged analysis).
- **TD-008** — phase-8 closed won't-do; branch deleted; false "shipped v0.11.0" retrospective corrected in the planning doc.

### Workstream B — First-class ad-hoc work lane
- **FEAT-020** — `/hotfix` (quick-task + `--spike`): scaffolds a `fix/`-`chore/`-`spike/` branch + `specs/adhoc/<id>/record.md`, reuses the Rule 12 gate without a phase scaffold, guards phase-sized work via Rule 14. Auto-parity across all three adapters.
- **ENH-044** — `/log`, `/sync-docs`, `check-history-reminder.sh` made phase-optional (ad-hoc fallback sink); "Ad-hoc / Patch Releases" status section (v0.20.1 + v0.20.3 moved there); `/validate` treats no-active-phase as valid.
- **ENH-045** — Rule 14 (work-type escalation + "lightest type that fits" principle).

Foundation (G0): `core/git-hooks/contract.js` (single source of truth, pure + tested), ad-hoc schema, `core/lifecycle-contract.md`, and `scripts/capture-fingerprints.js` (dev helper that resolved the fingerprint tests' dangling "capture helper" reference).

## Verification Evidence

**Full test suite — `npm test` (final run, this session):**
```
# tests 604
# pass 604
# fail 0
# skipped 0
# todo 0
```
604/604 pass (580 v0.20.4 baseline + 24 new: 11 contract unit tests, 9 git-hook integration tests, 4 ad-hoc-lane tests). Per-adapter install fingerprints (Claude Code / Codex / Antigravity) re-baselined at each group with explanatory meta; the parity-matrix audit (`tests/adapter-parity-matrix.test.js`) passes 4/4 after adding the `/hotfix` row + git-lifecycle-hooks subsection + footnote 15.

**End-to-end smoke (fresh temp git repo, `momentum init --agent claude-code`):**
```
[install] exit=0 hooksPath=.githooks
[commit-msg bad]      exit=1   (blocked — non-conventional subject)
[commit-msg good]     exit=0   (feat: … accepted)
[--no-verify bypass]  exit=0   (git-native bypass works)
[pre-push to main, no sentinel]   exit=1   (blocked)
[pre-push to main WITH sentinel]  exit=0   (allowed; sentinel consumed=yes)
[/hotfix surface]   present
[adhoc template]    present
```

All enforcement paths fire as designed; the escape hatch and single-use sentinel behave correctly.

## Acceptance criteria — met

1. ✅ Every git rule momentum states is enforced (hook) or honestly labeled advised (Rule 6 table).
2. ✅ Non-conventional commit rejected; direct push to main without sentinel blocked; release tag without evidence blocked; escape hatch works + documented.
3. ✅ `/hotfix` produces a tracked off-phase record through the Rule 12 gate, no phase scaffold.
4. ✅ `/validate` treats no-active-phase as valid; off-phase `/log` + `/sync-docs` have a home.
5. ✅ phase-8 closed + branch deleted; 14 stale branches pruned; `.claude/worktrees/` gitignored.
6. ✅ Suite + fingerprints green; all three adapters at parity; this retrospective carries captured evidence.

## Notes & follow-ups
- **Dogfooding the gate**: the v0.21.0 release tag push will itself be gated by FEAT-019 on this `## Verification Evidence` section — the feature guards its own release.
- **Near-miss (logged in history)**: a bulk branch-delete command mistakenly included `phase-7-subagent-engine`; caught immediately and restored byte-identical from the untouched local ref. Lesson: derive destructive arg lists programmatically from the verified keep/delete split.
- **No capability-boolean changes**: the git hooks are agent-agnostic (installed via `core.hooksPath` regardless of agent), so `core/adapter-capabilities.md` needs no edit — parity is documented in the matrix instead.
- **Not in scope (future)**: forge-specific server-side protection scaffolding belongs behind a future "forge adapter" (DIP); documented forge-neutrally only.
