# Project Lifecycle Contract

> Normative contract for how a momentum project comes into being
> (ADR-0008). Command docs reference these states; the CLI enforces the
> Installed-state shape; command contracts enforce the gates.

A momentum project moves through three states. Each state has exactly one
owning command. State is determined by **file existence** — never by file
content, markers, or heuristics.

## States

| # | State | Owner | What exists |
|---|-------|-------|-------------|
| 1 | **Installed** | `momentum init` | Machinery: adapter surfaces (commands/rules/hooks/scripts), git hooks, and the contentless-by-nature specs skeleton — `specs/status.md` (in the "Not founded" state), `specs/backlog/backlog.md` (empty tables), `specs/changelog/`, `specs/decisions/` (template + README), `specs/phases/` (README + index), `specs/adhoc/`. **No foundation docs.** |
| 2 | **Founded** | `/start-project` | Everything above PLUS the authored foundation docs: `specs/vision/project-charter.md`, `specs/vision/principles.md`, `specs/vision/success-criteria.md`, `specs/planning/roadmap.md`, and a filled `status.md` Summary. |
| 3 | **Phase loop** | `/brainstorm-phase` → `/start-phase` → `/complete-phase` | Everything above PLUS `specs/phases/phase-N-*/` directories. |

## The founded predicate

```
founded ⟺ specs/vision/project-charter.md exists
          AND specs/planning/roadmap.md exists
```

The minimal load-bearing pair: *why the project exists* + *where it's
going*. `principles.md` and `success-criteria.md` are authored at founding
but their absence never blocks phase work (tolerates legacy projects).

## Rules

1. **`momentum init` never writes foundation docs.** A placeholder document
   satisfies structural checks while carrying zero information; absence is
   the honest, machine-checkable signal.
2. **`/start-project` founds the project — content, not structure.** It
   authors the four foundation docs from the brainstorm/conversation under
   the brainstorm-gate + explicit-approval contract. It works on any repo
   state (empty, freshly init'd, or full of code). If machinery is missing,
   it routes to `momentum init` first.
3. **Phase commands gate on founded.** `/brainstorm-phase` and
   `/start-phase` check the predicate before any phase work. Not founded →
   STOP and route to `/start-project` (offering to draft the foundation
   docs with the user from available context — best-effort and marked for
   refinement beats absent).
4. **`/validate` checks the invariant** `phase dirs exist ⟹ founded` as a
   failure. "Installed but not founded, no phases" is a valid state, not an
   error.
5. **`/migrate` reports "not founded"** — it never creates foundation
   placeholders.
6. **`momentum upgrade` heals legacy installs**: foundation files whose
   frontmatter-stripped, whitespace-normalized body hash matches any
   historically shipped template (see
   `core/foundation-placeholder-hashes.json` — frozen) are removed with a
   report. Any user-edited file is untouched. `--dry-run` previews.

## Routing (what an agent does per state)

| Observed state | Correct next step |
|---|---|
| No `.momentum/` machinery | `momentum init` |
| Installed, not founded, idea unclear | `/brainstorm-idea` (writes nothing) |
| Installed, not founded, idea clear | `/start-project` (founds it) |
| Founded, no phase planned | `/brainstorm-phase` |
| Founded, phase planned | `/start-phase` |

`status.md` in the Installed state carries this routing inline ("Not
founded — run `/brainstorm-idea` → `/start-project`"), so Rule 1
orientation self-corrects on every adapter.
