# Phase 9 — Ecosystem (Tier 1): Overview

## Vision

Phase 9 introduces **multi-repo ecosystem coordination** to momentum (target
release `v0.12.0`). Today every momentum command operates against a single
`specs/` tree; a developer working across N related repos in one session
loses the benefit of momentum's tracking the moment they switch directories.

This phase adds a thin **ecosystem layer** that sits alongside member
repos. It records which repos belong together, threads daily activity
into a single session log, and exposes cross-repo features as
first-class "initiatives" without owning or rewriting any member-repo
state. Single-repo momentum is unchanged; the ecosystem layer is
strictly additive.

The cerebrio constellation (`cerebrio-sapience`, `cerebrio-frontend`,
`cerebrio-infra`, `open-guard`, `open-shield-python`, `cerebrio-py`,
`cerebrio-cli`, `cerebrio-bench`) is the proving ground — the existing
hand-maintained `cerebrio/CLAUDE.md` parent file becomes a generated
view over an `ecosystem.json` manifest.

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Ecosystem state location | Separate git repo (sibling to members) | PR-reviewable initiatives + session logs; portable across machines; independent lifecycle. |
| Session logging mode | Auto via PostToolUse hook | Zero developer discipline required; rich record by default. Hook walks up `$PWD` to locate the ecosystem root. |
| Opt-in mechanism | `momentum ecosystem add <repo-path>` | Symmetric with `momentum init`; writes the one-line CLAUDE.md pointer in the target. |
| Phase number | Phase 9 (renumber existing 9 → 10) | Ecosystem is the next thing momentum ships; Hardening & Activation slips one release. |
| Touching member repos | Read-only + one CLAUDE.md pointer | The ecosystem layer must never write into a member's `specs/`. Member-internal docs stay authoritative. |

## Key Deliverables

1. **Ecosystem manifest** — `ecosystem.json` schema + reader. Lists
   members, roles, dependency edges, owned artifacts (e.g. who owns
   `openapi.json`).
2. **Initiative concept** — markdown files under `initiatives/` naming
   cross-repo features and linking per-repo phases/branches/PRs.
3. **Daily session log** — `sessions/YYYY-MM-DD.md` auto-appended from
   member-repo PostToolUse hooks.
4. **CLI surface** —
   - `momentum ecosystem init [name]` — create a new ecosystem repo skeleton.
   - `momentum ecosystem add <repo-path>` — register a member.
   - `momentum ecosystem remove <id>` — inverse.
   - `momentum ecosystem status` — print manifest + member states.
5. **Slash commands** —
   - `/track` extended — ecosystem-aware aggregation when invoked in a
     member repo or in the ecosystem root.
   - `/initiative` — `create / status / close` subcommands operating on
     `initiatives/`.
   - `/session log <message>` — manual entry on today's session file
     (auto-events from the hook still fire independently).
6. **Hook extension** — `core/scripts/check-history-reminder.sh` learns
   to also append structural events (commit, PR open/merge, deploy) to
   the ecosystem session file. Self-locating; no-ops outside an
   ecosystem.
7. **Schemas + validation** — tiny JSON schemas for `ecosystem.json`
   and initiative frontmatter; bad files surface clearly.
8. **Tests** — extend the existing `tests/` (node:test) with ~12 cases
   covering CLI surface, schema validation, hook event detection,
   ecosystem opt-in/out.
9. **Docs** — `core/specs-templates/specs/architecture/ecosystem.md` +
   README section in momentum.

## Scope

### In scope (Tier 1)

- Cross-repo manifest, initiatives, session log, `/track` aggregation,
  `momentum ecosystem` CLI, hook auto-logging, schemas, tests, docs.
- Conventions for member repos: one-line CLAUDE.md pointer at the top.
- Adapter overlays: Claude Code, Codex, Antigravity all receive the
  new commands.

### Out of scope (Tier 2, future phase)

- `/switch-repo` first-class repo handoff with context carry-over.
- Federated impact-map (cross-repo `/sync-docs`).
- Shared rules of record (Rules 1–12 single source of truth).
- Deploy-order awareness / merge-order enforcement.
- Initiative-aware code review (`/review-code` across repos).
- Cross-repo parallel agent orchestration (extending Phase 8 worktrees
  to multi-repo).

### Explicitly NOT in scope ever

- Owning or rewriting member repos' `specs/` content.
- Replacing per-repo phases / backlog / status / history.
- Required dependency — momentum-without-ecosystem must keep working
  identically.

## Acceptance Criteria

- [ ] `momentum ecosystem init cerebrio` in a fresh dir creates a valid
      git repo with `ecosystem.json` + scaffolded directories.
- [ ] `momentum ecosystem add ../cerebrio-sapience` updates the
      manifest and writes the one-line pointer in the target's
      `CLAUDE.md` (idempotent).
- [ ] `momentum ecosystem remove sapience` reverses both writes
      cleanly.
- [ ] `/track` inside a member repo prints the per-repo view AND the
      ecosystem-wide aggregate (one section per sibling).
- [ ] `/initiative create memory-module` creates
      `initiatives/0001-memory-module.md` with templated sections and
      sets `.state/active-initiative`.
- [ ] After a commit in any registered member repo, today's
      `sessions/YYYY-MM-DD.md` has a new line citing the repo + commit.
- [ ] `npm test` passes (existing 68 tests + ~12 new) with no
      regressions.
- [ ] An ecosystem-less momentum project (no `ecosystem.json` in any
      parent) behaves identically to today.
- [ ] Docs explain the model in under 200 lines and link a worked
      example using the cerebrio constellation.

## Verification

- `node bin/momentum.js ecosystem init` → scaffolded dir, validates.
- `node bin/momentum.js ecosystem add` then `remove` → reversible.
- `tests/ecosystem.test.js` passes.
- Manual: scaffold ecosystem over the actual cerebrio constellation,
  run `/track`, confirm Repo Map paragraph in `cerebrio/CLAUDE.md` can
  be replaced by `> ecosystem: ../cerebrio-ecosystem`.

## Risks

| Risk | Mitigation |
|---|---|
| Hook walks too far up the filesystem | Bounded walk: max 5 parent levels; cache the resolved root per session. |
| Session log conflicts on concurrent commits | Each line is its own atomic append; rely on `>>` with a lockfile only on contended platforms. |
| Member-repo CLAUDE.md drift | Pointer is one line, sentinel-fenced; `momentum upgrade` re-syncs it. |
| Initiative numbering races | Use ISO date + slug if a numeric collision is detected. |

## Dependencies on prior phases

- Adapter Contract v3 (Phase 7b) — new commands ship through the same
  overlay pattern.
- Hook infrastructure (Phase 7a/0) — extend, don't replace.
- Phase 8 (parallel worktrees) — orthogonal; ecosystem can host
  multiple worktree-running repos.
