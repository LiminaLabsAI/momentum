---
type: Ad-hoc Record
---

# Ad-hoc Work Record: fix-BUG-016-ecosystem-root-guard

> **Type**: quick-task
> **Created**: 2026-07-03
> **Branch**: fix/BUG-016-ecosystem-root-guard (lane `fix-BUG-016-ecosystem-root-guard`, opened via `momentum lanes open`)
> **Backlog**: BUG-016
> **Status**: shipped

## Current Behavior

Project-mode `momentum init` / `momentum upgrade` never check whether the
target directory is itself an ecosystem coordination root. The only ecosystem
detection on that path (`maybePromptForAutoEcosystem`, bin/momentum.js) scans
SIBLING directories for `ecosystem.json` to offer membership — so a
coordination root is treated as a normal project and receives the full
phase-project scaffold: a CLAUDE.md whose first rule is "ALWAYS read
`specs/status.md`" (a file that can never exist there), `.agent/rules`,
`.claude/commands` (phase lifecycle commands), `.githooks`, `scripts/`.

This happened live in `../cerebrio-ecosystem/`: scaffolded 2026-06-07 (one day
before ENH-025 shipped, so no ecosystem CLAUDE.md was written), plain
`momentum init` v0.20.2 on 2026-06-14 installed the project template, and
`momentum upgrade` v0.22.1 on 2026-06-28 cemented it. Every agent session in
that repo then oriented as a phase project, hunted for `specs/status.md`, and
had zero in-context signal about initiatives/`/scout`/`/dispatch`.

Compounding gap: the ecosystem instruction surfaces were written ONLY by
`ecosystem init` (`renderEcosystemInstruction` had no other call site), so
pre-Phase-15 ecosystems had no retrofit path and a damaged root had no repair
path.

## Expected Behavior

Momentum knows which directory is a coordination root and which is a member,
and which instruction file belongs where — two distinct CLAUDE.md/AGENTS.md
surfaces, one per layer:

1. **Guard** — `assertNotEcosystemRoot()` runs at the top of both `init()`
   and `upgrade()`. If the target's `ecosystem.json` carries both `name` and
   a `members` array, the command exits non-zero with an actionable message
   (use `momentum ecosystem upgrade` for the root; point `init`/`upgrade` at
   a member path). Requiring BOTH keys keeps foreign `ecosystem.json` files
   (e.g. PM2's) from tripping the guard.
2. **Self-heal** — `refreshRootInstructions()` runs at the start of every
   `momentum ecosystem upgrade`, before the member sweep (and even with zero
   members). Per surface (CLAUDE.md / AGENTS.md): missing → write the
   rendered ecosystem template (pre-ENH-025 retrofit); ecosystem template
   present → refresh the managed section above `## Project Extensions`;
   project template present (the BUG-016 signature) → repair by replacing the
   managed section, `.bak` first; user extensions under the marker are
   preserved, boilerplate-only tails are swapped for the ecosystem tail;
   non-momentum files are left untouched with a warning. Honors `--dry-run`.

## Unchanged Behavior

- `ecosystem init` still writes both surfaces idempotently
  (`writeManagedInstructionFile` skip-if-exists) — unchanged.
- The member sweep in `ecosystem upgrade` (dirty-skip/--force/--autostash,
  per-repo summary) is byte-for-byte unchanged; the root refresh is purely
  additive ahead of it.
- Project-mode `init`/`upgrade` behavior in normal projects and member repos
  is unchanged (guard is a pure pre-flight; fires only on a valid manifest).
- The member-repo pointer block (`ensurePointerInjected`) is untouched.
- No shipped template/hook artifact changed — adapter fingerprints show no
  drift (suite fingerprint tests green without re-baselining).

## Verification Evidence

```
$ node --test --test-concurrency=1 tests/ecosystem-root-guard.test.js
✔ init — refuses to install the project scaffold into an ecosystem root
✔ upgrade — refuses to run project-mode in an ecosystem root
✔ init — a foreign (non-momentum) ecosystem.json does not trip the guard
✔ ecosystem upgrade — retrofits missing root CLAUDE.md/AGENTS.md, then is idempotent
✔ ecosystem upgrade — repairs a BUG-016 project-template CLAUDE.md, preserving user extensions
✔ ecosystem upgrade — boilerplate-only extensions tail is swapped for the ecosystem tail
✔ ecosystem upgrade — leaves a non-momentum CLAUDE.md untouched
✔ ecosystem upgrade --dry-run — reports the repair without writing
tests 8, pass 8, fail 0

$ npm test
tests 715, pass 715, fail 0   (707 → 715 with the eight new tests)

# Live repro — the exact directory that surfaced the bug:
$ node bin/momentum.js init /Users/avinash/Workspace/Projects/cerebrio/cerebrio-ecosystem
Error: init: … is the coordination root of ecosystem "cerebrio-ecosystem" … (exit 1)

$ node bin/momentum.js ecosystem upgrade --ecosystem …/cerebrio-ecosystem --dry-run
Coordination-root instructions:
  = CLAUDE.md up to date
  = AGENTS.md up to date
(confirms the same-day manual repair of that repo — its commit 77a0c88 —
matches what the self-heal now produces byte-for-byte)
```

## Commit

Single commit on `fix/BUG-016-ecosystem-root-guard`:
`fix(install): guard project scaffold out of ecosystem roots; self-heal root instructions (BUG-016)`
— touches `bin/momentum.js` (`assertNotEcosystemRoot` + two call sites +
export), `bin/ecosystem.js` (`refreshRootInstructions` + `hasExtensionContent`
+ cmdUpgrade wiring), `tests/ecosystem-root-guard.test.js` (+8), and the
lane-scoped tracking (this record, the BUG-016 backlog row, two changelog
bullets).
