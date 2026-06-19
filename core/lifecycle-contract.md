# Lifecycle Contract (Phase 19 — Lifecycle Hardening)

> Canonical reference for momentum's git-lifecycle + ad-hoc-work enforcement.
> The single source of truth in code is [`core/git-hooks/contract.js`](git-hooks/contract.js)
> (pure functions + constants). This doc explains the *why*; that module is the *what*.

## Principle: enforce in vendor-neutral git, document the rest

momentum is forge-agnostic (the same DIP that gives it per-agent adapters). So
**enforcement lives in plain git hooks** — pure git, no forge API — which work
on any forge (GitHub / GitLab / Bitbucket / Gitea / bare remote) and under any
agent. Forge-specific server-side protection (GitHub Rulesets, GitLab protected
branches, …) is recommended as *optional* hardening in docs only; it is never a
core dependency. Forge-specific scaffolding, if ever built, belongs behind a
future "forge adapter," not in core.

## Hook delivery

- Hooks ship from `core/git-hooks/` and install into a tracked `.githooks/`
  dir in the target repo (a dedicated install step, separate from the
  `core/scripts/` → `scripts/` copy, so the shared `contract.js` lands once).
- `bin/momentum.js` wires them via `git config core.hooksPath .githooks` — no
  husky, no lefthook, zero runtime dependencies (`fs`/`path`/`process` only).
- **Warn, don't clobber**: if the target already sets `core.hooksPath` or uses
  husky, momentum warns and skips rather than overwriting (the BUG-008 lesson).

## Escape hatch

Enforcement is hard-block (exit ≠ 0) — the only design that actually fixes
"advice masquerading as enforcement." Two documented escapes:

| Mechanism | Use |
|---|---|
| `MOMENTUM_SKIP_HOOKS=1` (env var) | Emergency bypass of all momentum hooks for a single command. |
| `.momentum/merge-approved` (single-use sentinel) | Authorizes ONE push to a protected branch. The agent creates it only after the user approves a merge; the `pre-push` hook consumes (deletes) it on use. Mirrors the `.momentum/brainstorm-active` pattern. |

## Enforced controls

| Control | Hook | Rule |
|---|---|---|
| Conventional-commit subject | `commit-msg` | Rule 6 |
| Block direct push to `main`/`staging` without the sentinel | `pre-push` | Rule 6 |
| Block a release-tag push without verification evidence | `pre-push` (tag path) | Rule 12 |

Allowed commit types: `feat fix docs refactor chore infra test perf build ci style revert`.
A release tag is `vMAJOR.MINOR.PATCH…`. Verification evidence = a non-empty
`## Verification Evidence` section in the relevant `retrospective.md`.

## Work types (Rule 14)

| Type | When | Ceremony |
|---|---|---|
| `phase` | Net-new features, cross-cutting work | Full: brainstorm → plan → groups → verify → release. |
| `quick-task` | A bounded fix/chore with a clear blast radius | An ad-hoc record (`specs/adhoc/<id>/record.md`) + the Rule 12 evidence gate. No phase scaffold. |
| `spike` | Time-boxed exploration, throwaway | Declared up front; exempt from acceptance gates; record what was learned. |

Escalation (`quick-task` → `phase`) criteria live in **Rule 14** (CLAUDE.md):
touches > N files, modifies `specs/architecture/`, needs an ADR, changes a
public contract, or displaces a planned phase.
