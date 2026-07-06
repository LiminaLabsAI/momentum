---
type: Ad-hoc Record
---

# Ad-hoc Work Record: 2026-07-06-readme-positioning

> **Type**: quick-task
> **Created**: 2026-07-06
> **Branch**: chore/readme-site-positioning
> **Backlog**: none
> **Status**: shipped

## Current Behavior

Operator review after v0.31.0:

1. The README still carried the pre-site-redesign positioning ("Spec-driven
   discipline for agentic AI" / "Your AI coding agent forgets") while the
   redesigned site leads with the right-context narrative ("Your agent
   doesn't need more context. It needs the right context." — less
   hallucination, higher-signal context, better-grounded plans).
2. The site's two install pills showcase bare
   `npx @limina-labs/momentum@latest init` with no hint that (since v0.31.0)
   init asks which agent — and errors when run non-interactively, which is
   exactly how momentum's audience often runs it (pasted into an agent
   session). Verified live: bare init through a pipe prints the
   agent-required error with the list + example (exit 1, correct behavior —
   an instructive error, but the instruction should exist upfront too).

## Expected Behavior

1. README retitled + rewritten to the site's positioning: right-context
   tagline and hero copy, guessing-vs-grounded problem section with the
   with/without table, "Better context in. Better work out." outcomes
   (including the honesty note), and "The phase loop" section. Existing
   accurate sections (install, how-it-works, adapter table, upgrade, OKF,
   ecosystem/orchestration/lanes/rules, docs, contributing) preserved.
2. Both site install pills gain a one-line hint: "init asks which agent to
   set up — or pass --agent …".
3. v0.31.1 docs-only patch published so the npm package page shows the new
   README.

## Unchanged Behavior

- No code changes — bin/, core/, adapters/, tests/ untouched (suite must
  stay 833/833 with zero fixture drift).
- README anchors pinned by tests/repo-integrity-guards.test.js preserved:
  npm badge, `## Works with any AI IDE` heading, bare
  `npx @limina-labs/momentum@latest init` quickstart line.
- Install command itself unchanged — bare init stays the showcased command
  (interactive users get the picker; non-interactive users get the
  instructive error).

## Verification Evidence

Fresh from this session (2026-07-06):

**Full suite** (`npm test`, after README rewrite + site edits + version bump):

```
ℹ pass 833
ℹ fail 0
```

**Live repro of the reported issue** (bare init via npx, non-TTY):

```
Error: --agent is required when init runs non-interactively.
Available: antigravity, claude-code, codex, opencode
Example: npx @limina-labs/momentum@latest init --agent antigravity
```

(exit 1; `init --agent claude-code` in the same context scaffolds
successfully — behavior correct, instructions updated to teach it upfront.)
