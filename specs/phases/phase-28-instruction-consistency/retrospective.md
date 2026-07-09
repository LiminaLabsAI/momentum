---
type: Retrospective
---

# Phase 28 — Retrospective: Instruction Consistency

> **Released**: v0.35.0 (pending operator merge/release approval)
> **Suite**: 927 (Phase-27 baseline was 951) → **963**

## Summary

Fixes the CLAUDE.md/AGENTS.md divergence the operator surfaced — a project
started on Claude Code, later given opencode, whose two instruction files had
drifted apart. Investigation found **four causes, two of them bugs**; ADR-0010
sets the principle that closes them structurally: **the instruction file is a
pure projection of `specs/`, never authored.** Project prose now lives once in
`specs/project-rules.md` (pointed to by every file), structured facts in
`config.md`, ecosystem context in the injected pointer — so there is nothing
per-file to keep in sync. Folds in BUG-027.

## What went well

- **The self-repo was the perfect test case** — it *was* the divergent project.
  The dogfood (`momentum upgrade .`) migrated both instruction files into
  `project-rules.md`, refreshed the stale opencode AGENTS.md, and the result is
  provably consistent: CLAUDE.md ≡ AGENTS.md except the 4 intended per-adapter
  task-tool lines, both carrying the ecosystem + project-rules pointers.
- **Migrate-never-drop held.** Real authored content (the release checklist,
  self-audits, the meta-constraint) moved losslessly to `project-rules.md`.
- **The structural guarantee is now a test** (`instruction-consistency.test.js`)
  that fails if the files ever diverge in managed content again.

## What didn't (challenges)

- **First pointer-into-all-files attempt broke autostash.** Making `upgrade`
  inject the ecosystem pointer for members double-added it against the stash →
  conflict. The original preserve-only snapshot was load-bearing; reverted, and
  put the all-files injection where it belongs (`ecosystem add`).
- **Editing generated templates directly desynced the drift guard.** The
  `## Project Extensions` boilerplate is generated from `EXTENSIONS_TAIL` in
  `scripts/generate-instructions.js` — had to edit the source and regenerate.
- **Migration must skip marker-less files** or it pre-empts the BUG-008 backup
  path that preserves custom instruction files — caught by the upgrade suite.
- **The consistency guard's normalization was brittle** (each adapter phrases
  the task-tool sentence entirely differently); switched to a line-diff that
  permits only the task-tool lines to differ.

## Lessons

- A per-file authoring surface is a drift surface *by construction* — the only
  durable fix is to remove it, not to sync it better.
- `momentum upgrade` must refresh *every* installed agent; per-agent upgrade is
  how AGENTS.md silently fell years behind CLAUDE.md.

## Follow-ups

- None blocking. The `## Migrated from …` sections a raw migration produces are
  intentionally redundant (migrate-never-drop); a maintainer consolidates them
  (as done here for the self-repo).

## Verification Evidence

Captured on `phase-28-instruction-consistency` (2026-07-09).

### `npm test` (full suite)

```
$ npm test
ℹ tests 963
ℹ pass 963
ℹ fail 0
```

New test files: `project-rules-migration.test.js` (G0), `upgrade-all-agents.test.js`
(G1), `pointer-all-files.test.js` (G2), `instruction-consistency.test.js` (G4).

### The divergence is fixed — self-repo dogfood

```
$ grep -c 'ecosystem:begin'          CLAUDE.md AGENTS.md   # 1  1
$ grep -c 'project-rules-pointer'     CLAUDE.md AGENTS.md   # 1  1
# managed Rules region (## Autonomous Behaviors → the pointer):
$ diff <(managed CLAUDE.md) <(managed AGENTS.md) | grep -c '^[<>]'
4      # only the intended per-adapter task-tool substitution
$ test -f specs/project-rules.md && echo yes
yes
```

Before: CLAUDE.md carried the ecosystem pointer, a full release checklist, and
Phase-25/26 rules; AGENTS.md had none of the pointer, a stub Project-Extensions,
and stale rules. After: identical managed rules, both pointers, project prose
migrated once into `specs/project-rules.md`.

### Mechanism proofs (from the suite)

- `upgrade-all-agents.test.js` — a claude-code+opencode project: one `upgrade`
  refreshes both; a drifted AGENTS.md is restored. ✓
- `pointer-all-files.test.js` — `ecosystem add` injects the pointer into
  CLAUDE.md AND AGENTS.md; idempotent. ✓
- `project-rules-migration.test.js` — prose migrated, file pointerized,
  idempotent; BUG-027 rows well-formed. ✓
- `instruction-consistency.test.js` — generated managed regions identical modulo
  the task-tool line; every file ends with the pointer, no authoring boilerplate. ✓
