---
type: ADR
---

# ADR-0008: Foundation Docs Are Authored, Not Scaffolded

## Status
Accepted

## Context

Since Phase 3 (ENH-003, v0.4.0), `momentum init` has copied the full
`core/specs-templates/specs/` tree into new projects — including four
**foundation documents** shipped as placeholder templates:

- `specs/vision/project-charter.md`
- `specs/vision/principles.md`
- `specs/vision/success-criteria.md`
- `specs/planning/roadmap.md`

**Problem (ENH-060, P1)**: live dogfood on a fresh v0.31.2 project
(`password-manager`, opencode adapter, 2026-07-06) showed an agent-driven
flow — `momentum init` → `/brainstorm-idea` → `/start-phase` — build and
merge an entire MVP while all four foundation docs remained byte-identical
init templates (`<Project Name>`, `YYYY-MM-DD`, `_(TBD)_`). Nothing noticed:

1. **Routing dead zone** — `/brainstorm-idea` routes to `/start-project`,
   but `start-project.md` declared "Run this on a NEW or EMPTY repository"
   and its steps were create-from-scratch. On an init-scaffolded repo an
   agent reasonably judges it inapplicable and skips to phase planning.
   No surface said "on an init'd repo, `/start-project` FILLS the templates."
2. **No foundation gate** — `/brainstorm-phase` reads `roadmap.md` with no
   instruction for the placeholder case; `/start-phase` reads only
   `status.md` + backlog.
3. **`/validate` blind spot** — checks structure (files exist, frontmatter,
   tables), never placeholder content. The broken state validates green.
4. **No machine-checkable "unfilled" signal** — a placeholder file is
   indistinguishable from an authored one to every cheap check.

A patch shape (fill-modes, `placeholder: true` markers, per-command content
heuristics) was drafted and **rejected by the operator** (2026-07-06):
placeholder files are the root disease, not a detection problem.

## Decision

**momentum never ships placeholder foundation docs. Foundation docs are
authored at founding time; their absence IS the machine-checkable signal.**

The project lifecycle becomes an explicit three-state contract
(`core/project-lifecycle.md`), one owning command per state:

| State | Owner | Meaning |
|---|---|---|
| **Installed** | `momentum init` | Machinery (adapter surfaces, hooks, commands, scripts) + the contentless-by-nature skeleton (backlog, changelog, decisions, phases, adhoc, status). NO foundation docs. `status.md` ships in an explicit "Not founded" state with router text. |
| **Founded** | `/start-project` | Reframed from "scaffold a NEW/EMPTY repo" to "**found the project**": authors charter, principles, success-criteria, roadmap + status Summary from the brainstorm, under the existing brainstorm-gate + approval contract. Content, not structure — works on any repo state. |
| **Phase loop** | `/brainstorm-phase`, `/start-phase`, `/complete-phase` | Gated on **founded** = `specs/vision/project-charter.md` AND `specs/planning/roadmap.md` exist (pure file-existence check). Not founded → stop and route to `/start-project`. |

### Key design points

1. **Founded predicate = charter + roadmap exist.** The minimal load-bearing
   pair (why the project exists + where it's going). Principles and
   success-criteria are authored at founding but never block phase work.
2. **Legacy migration in `momentum upgrade`**: foundation files whose
   frontmatter-stripped, whitespace-normalized body hash matches ANY
   historically shipped template version are removed (provably zero user
   content) with a report: "not yet founded — run `/start-project`".
   The historical hash set is frozen forever once the templates are deleted.
   `--dry-run` previews removals. Files with any user edit are untouched.
3. **`/validate` invariant**: phase directories exist ⟹ founded (failure).
   "Not founded, no phases" is a valid state.
4. **`/migrate` must not create foundation placeholders** — it reports
   "not founded" instead.

## Consequences

### Positive
- ✅ The demo failure mode is structurally impossible: phase work cannot
  start (per command contract) and cannot validate green without founding
- ✅ Zero heuristics: founded = files exist; unfounded = files absent
- ✅ Kills the init/`start-project` overlap debt (both scaffolding structure
  since Phase 3) — one owner per concern
- ✅ `status.md`'s unfounded router text makes Rule 1 orientation
  self-correcting for every agent on every adapter

### Negative
- ⚠️ init output shape changes (4 fewer files) — adapter fingerprints
  re-baseline; downstream tooling expecting the files must adapt
- ⚠️ Upgrade deletes files (mitigated: only on exact historical-hash match,
  reported loudly, previewable with `--dry-run`)
- ⚠️ The four foundation formats move from copyable templates into
  `/start-project`'s command doc — format drift is now caught by review,
  not by file diff

## Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| Fill-mode + placeholder markers + per-command detection (original ENH-060 sketch) | Patch shape; heuristics forever; placeholder files keep lying to structural checks; operator directive: clean redesign |
| Keep placeholders, make `/validate` scan content | Detection without prevention; the dead files persist; every consumer needs the heuristic |
| `placeholder: true` frontmatter flag | Still ships lies-shaped files; flag removal is one more thing agents forget |

## References
- ENH-060 (backlog) — evidence + operator design direction
- `core/project-lifecycle.md` — the normative three-state contract
- Phase 25 — Founding Contract (`specs/phases/phase-25-founding-contract/`)
- ENH-003 / Phase 3 — where init gained the full scaffold (the origin of the overlap)
