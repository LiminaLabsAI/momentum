---
type: Project Rules
---

# Project Rules — momentum

> Project-specific rules every agent reads — referenced by each instruction
> file's `## Project Extensions` pointer (ADR-0010). One home, shared by all
> adapters. Edit freely. For a rule that applies to only one agent, annotate it
> inline (e.g. *(Claude Code only)*).

## Release Checklist (after `git tag` + `git push <tag>`)

The release **commands** are config-driven (`specs/config.md`: `release_command`,
`publish_target`, `release_flow`) — `/complete-phase` runs them. This checklist
is the human-facing contract for *how* momentum releases; every release MUST do
**all three**:

1. **`gh release create <tag>`** — create the GitHub Release with notes drawn
   from the phase retrospective; mark the newest `--latest`. Without it, the tag
   exists at `/tags` but not `/releases` and the "Latest release" badge goes stale.

   ```bash
   gh release create v0.X.Y \
     --title "v0.X.Y — Phase N: <phase name>" \
     --notes "<retrospective summary: highlights + verification + acceptance>" \
     --latest --verify-tag
   ```

2. **`npm publish --access public`** — momentum is an npm package. Skip it and the
   registry stays on the previous version.

3. **Verify both surfaces are live** — `gh release list --limit 3` shows the new
   release as `Latest`; `npm view @limina-labs/momentum version` returns the new version.

**Approval required:** both `gh release create` and `npm publish` are "shared
system" actions — never run either without explicit user OK.

**Self-audit (catches missed releases):** at session start, compare `git tag -l`
against `gh release list`; surface any tag lacking a matching release.

## Branch-hygiene self-audit (ENH-042 / BUG-026)

At session start, run `momentum lanes reconcile` — it sweeps every lane whose
branch is now contained in the terminal branch (an out-of-band merge) and reports
them cleanable; `momentum lanes reconcile --execute` removes their worktree +
branch + state (default-branch-safe). Also run `git branch -r | grep -E
'origin/(phase-|chore/|audit/)'` and `git worktree list` for anything reconcile
doesn't track (non-lane branches, orphan worktrees): confirm each is merged into
`main`, then `momentum lanes cleanup <branch>`; leave unmerged branches alone and
surface them. Keeps Rule 6's "delete merged branch" honest.

## Project-Specific Constraint

**Template files must be generic** — anything in `core/specs-templates/`,
`core/instructions/`, `core/commands/`, or `core/scripts/` must contain no
project-specific names, paths, or references. Project-specific content for
momentum itself goes here (`specs/project-rules.md`), never in the templates.
