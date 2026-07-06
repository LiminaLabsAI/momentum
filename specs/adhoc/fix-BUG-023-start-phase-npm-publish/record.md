---
type: Ad-hoc Record
---

# Ad-hoc Work Record: fix-BUG-023-start-phase-npm-publish

> **Type**: quick-task
> **Created**: 2026-07-07
> **Branch**: fix/BUG-023-start-phase-npm-publish
> **Backlog**: BUG-023
> **Status**: in-progress

## Current Behavior

`/start-phase`'s Autonomous Execution Contract hard-stop text
(`core/commands/start-phase.md:124`) reads:

> "All groups complete and verified. Ready to merge `<phase-branch>` → staging (then main), tag `v<version>`, and run `npm publish --access public`. Approve to proceed?"

The `npm publish --access public` clause is hardcoded into the **global**
recipe template — so it ships to every downstream install regardless of
project type. The momentum self-repo corrects for this under `## Project
Extensions` in CLAUDE.md (project-specific release checklist + approval
gate); other projects don't, and an agent following the recipe on a
non-npm project (Next.js web app, Python, Rust, Go, .NET) parrots the
clause verbatim and asks for an approval that makes no sense for that
project type.

Operator dogfood on a Next.js project surfaced this: the agent asked
"Ready to merge … tag v<version>, and run `npm publish --access public`.
Approve?" for a deploy-only web app — parroting the recipe text instead
of gating it against the project type.

ENH-030 already established the precedent: `gh release create` is
project-agnostic (git forge releases are universal), so it was upstreamed
into the global template. `npm publish` is NOT project-agnostic — it is
specific to npm-package projects — and was incorrectly upstreamed the
same way. The momentum self-repo's `## Project Extensions` already shows
the right home for project-specific release actions.

## Expected Behavior

The `/start-phase` hard-stop text mentions only the project-agnostic
parts of the release gate — merge + tag + GitHub Release — and is silent
on `npm publish`. Projects that publish to a registry (or deploy to a
platform, or upload to a forge) carry those specifics under their
`## Project Extensions` block, where the agent already reads them at
approval time. The global recipe thus stops leaking language/package-
manager assumptions into every downstream install.

The long-term structural fix (per-project preferences surface consumed by
recipe templates) is tracked as ENH-061. This quick-task is the short-
term doc-honesty fix: drop the wrong assumption from the global gate.

## Unchanged Behavior

- The merge + tag + `gh release create` portions of the gate — these
  are project-agnostic (a git tag + forge release applies universally
  to git projects) and were already upstreamed correctly via ENH-030.
- The hard-stop's existence and approval semantics — `/start-phase`
  STILL stops at the merge+release gate and asks for explicit operator
  approval before proceeding. Only the npm-publish clause is removed.
- `/complete-phase` behavior — step 9 (`gh release create`) and step 10
  (project-specific publish) are unchanged. The project-specific
  publish/deploy action lives in `/complete-phase` step 10 + CLAUDE.md
  `## Project Extensions` checklist, neither of which this change touches.
- The momentum self-repo's release checklist in CLAUDE.md `## Project
  Extensions` — keeps `npm publish --access public` (this repo IS an npm
  package; the checklist is the contract for that fact).
- Adapter command-mirroring machinery — `momentum upgrade` still
  re-copies `core/commands/start-phase.md` to all installed adapter
  surfaces (`.claude/commands/`, `.opencode/commands/`,
  `.agents/skills/start-phase/SKILL.md`); only the file content changes.
- Adapter install fingerprint mechanism — fixtures re-baseline
  byte-for-byte against the new install output, same as every prior
  intentional recipe-text change.

## Verification Evidence

**Files changed (4 + 4 fingerprint re-baselines + 1 record):**

- `core/commands/start-phase.md` — canonical recipe; line 124 hard-stop text
- `.agents/skills/start-phase/SKILL.md` — Antigravity skill (mirrors `core/`)
- `.claude/commands/start-phase.md` — locally-installed Claude Code command
- `.opencode/commands/start-phase.md` — locally-installed opencode command
- `tests/fixtures/v0.18.0-claude-code-fingerprint.json` — re-baselined (1 file drifted: `.claude/commands/start-phase.md`)
- `tests/fixtures/v0.20.4-codex-fingerprint.json` — re-baselined (1 file drifted: `.agents/skills/start-phase/SKILL.md`)
- `tests/fixtures/v0.20.4-antigravity-fingerprint.json` — re-baselined (1 file drifted: `.agents/workflows/start-phase.md`)
- `tests/fixtures/v0.28.0-opencode-fingerprint.json` — re-baselined via `MOMENTUM_RESNAPSHOT_OPENCODE=1 node --test tests/adapter-opencode-fingerprint.test.js` (1 file drifted: `.opencode/commands/start-phase.md`)

The `momentum upgrade .` run on this repo swept in unrelated Phase-25
drift (the local install was at v0.30.0; `core/` is at v0.32.0). That drift
belongs to a separate chore and was reverted; only the BUG-023 single-line
edit was kept in the locally-installed mirror copies. (Self-repo local
install drift is noted as a separate cleanup candidate, not in scope here.)

**Diff size:** 4 lines changed in recipes + 4 fingerprint hashes rotated.
No production code, no schema, no behavior change beyond the gate-text
rephrase.

**Fingerprint re-baseline commands run:**

```
$ node scripts/capture-fingerprints.js
=== claude-code (v0.18.0-claude-code-fingerprint.json) ===
  DRIFTED: .claude/commands/start-phase.md
=== codex (v0.20.4-codex-fingerprint.json) ===
  DRIFTED: .agents/skills/start-phase/SKILL.md
=== antigravity (v0.20.4-antigravity-fingerprint.json) ===
  DRIFTED: .agents/workflows/start-phase.md
```

Then `--write` re-baselined all three; opencode via its env-gated
test re-snapshot path.

**Fresh full suite run (Rule 12 gate):**

```
$ npm test
ℹ tests 845
ℹ pass 845
ℹ fail 0
ℹ duration_ms 55125.713416
```

Full suite green: 845/845 pass, 0 fail. Includes all four
adapter fingerprint regression tests (claude-code, codex,
antigravity, opencode), the fingerprint-fresh-install parity
tests, and the multi-adapter upgrade-idempotence tests.
The one expected drift per adapter (start-phase path) matches
the committed re-baselined fixtures byte-for-byte.

**Manual sanity check (visual diff of the gate text):**

Before:
> "All groups complete and verified. Ready to merge `<phase-branch>`
>  → staging (then main), tag `v<version>`, and run
>  `npm publish --access public`. Approve to proceed?"

After:
> "All groups complete and verified. Ready to merge `<phase-branch>`
>  → staging (then main), tag `v<version>`, and create the GitHub
>  Release. Approve to proceed? Project-specific publish/deploy
>  steps (e.g. `npm publish`) run from `## Project Extensions`
>  in CLAUDE.md/AGENTS.md — consult them now if any apply."

Identical across `core/commands/start-phase.md`, the locally-installed
`.claude/commands/` and `.opencode/commands/` mirrors, and the
Antigravity `.agents/skills/start-phase/SKILL.md` skill. Codex and
Antigravity install paths derive from `core/commands/start-phase.md`
at install time (codex transforms to `.agents/skills/<name>/SKILL.md`
with frontmatter, antigravity to `.agents/workflows/<name>.md`), so
the fingerprint re-baselines already prove byte-exact propagation.