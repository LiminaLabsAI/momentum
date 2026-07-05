---
type: Plan
---

# Phase 9 — Ecosystem (Tier 1): Plan

## Execution Order

```
Group 0 (contracts + schemas) — sequential, blocks everything
  → Group 1 (manifest CLI)              \
  → Group 2 (initiative subsystem)       — parallel
  → Group 3 (session log + hook)        /
    → Group 4 (/track aggregation + slash commands)  — sequential, integrates
      → Group 5 (tests)                              — sequential
        → Group 6 (docs + retrospective)             — sequential
```

`Group 0` defines the JSON shapes and the on-disk layout every later
group depends on; Groups 1–3 are independent implementations that share
only the schema. Group 4 wires them together at the agent surface.
Group 5 validates. Group 6 finalizes.

## Group 0 — Schemas & Layout (Sequential)

**Commit:** `feat(ecosystem): contracts and on-disk layout`

External deps: none.

- `core/ecosystem/schema/ecosystem.schema.json` — JSON Schema for the
  manifest:
  ```json
  {
    "name": "string",
    "version": 1,
    "created": "ISO-8601 date",
    "members": [{"id": "slug", "path": "rel-path", "role": "platform|client|library|infra|bench",
                  "owns?": ["string"], "consumes?": ["string"]}],
    "dependencies": [{"from": "id", "to": "id", "kind": "api-contract|library|deploy"}]
  }
  ```
- `core/ecosystem/schema/initiative.schema.json` — frontmatter shape:
  `id, slug, status (in-progress|closed), started, closed?, owner, repos[]`.
- `core/ecosystem/layout.md` — short doc fixing directory layout:
  ```
  <ecosystem-root>/
  ├── ecosystem.json
  ├── README.md
  ├── initiatives/                NNNN-slug.md, indexed
  ├── sessions/                   YYYY-MM-DD.md, one per day
  └── .state/                     gitignored: active-initiative, last-session
  ```
- `core/ecosystem/lib/index.js` — pure helpers:
  `loadManifest(rootPath)`, `findRoot(startPath)`,
  `listMembers(manifest)`, `validateManifest(obj)` (against schema).
  `findRoot`: walk up from `startPath`, max 5 levels, look for
  `ecosystem.json`; return absolute path or `null`. Caches via a
  module-level `Map` keyed by `startPath` prefix.

## Group 1 — Manifest CLI (Parallel with Groups 2, 3)

**Commit:** `feat(ecosystem): momentum ecosystem init / add / remove / status`

External deps: `git` (for `init` to run `git init`).

- `bin/commands/ecosystem.js` — dispatch on subcommand:
  - `init [name]` — create dir, write `ecosystem.json` with empty
    members[], create `initiatives/README.md`, `sessions/.gitkeep`,
    `.state/.gitkeep`, `.gitignore` (with `.state/`), then `git init`
    and produce the initial commit.
  - `add <repo-path>` — read manifest, append a member (id = basename,
    role prompted if not given via `--role`), write back, append a
    one-line ecosystem pointer to the target's CLAUDE.md (fenced by
    HTML comments `<!-- ecosystem:begin -->` / `<!-- ecosystem:end -->`
    so it's safe to re-run).
  - `remove <id>` — strip from manifest + strip fenced lines from the
    target's CLAUDE.md.
  - `status` — print manifest summary + `git status` of each member.
- `bin/momentum.js` — register `ecosystem` as a top-level command.
- Idempotency tests: `add` twice changes nothing the second time.
- Pre-flight check on `add`: target path must contain a
  momentum-initialized repo (look for `CLAUDE.md` or `AGENTS.md` +
  `specs/status.md`); refuse otherwise with a hint.

## Group 2 — Initiative Subsystem (Parallel with Groups 1, 3)

**Commit:** `feat(ecosystem): initiative create / status / close`

External deps: none.

- `core/commands/initiative.md` — recipe for the agent:
  - `create <slug>` — finds next NNNN, asks for "why" + repos involved
    (defaults to all members), writes `initiatives/NNNN-slug.md` from
    template, sets `.state/active-initiative` to the slug.
  - `status [slug]` — prints the named (or active) initiative card +
    fetches live state per repo (open PRs via `gh pr list --repo`, last
    commit, last deploy if recorded).
  - `close <slug>` — prompts for "what happened" + outcomes, writes the
    Close section, clears `.state/active-initiative`.
- `core/ecosystem/lib/initiative.js` — helpers: `nextInitiativeNumber()`,
  `loadInitiative(slug)`, `writeInitiative(obj)`, `setActive(slug)`,
  `getActive()`. Initiative file is markdown with a small YAML
  frontmatter block (validated against `initiative.schema.json`).
- `core/ecosystem/templates/initiative-template.md` — the body fed to
  `create`. Sections: Why / Per-repo contributions / Linked decisions /
  Deploy chronology / Close.

## Group 3 — Session Log & Hook (Parallel with Groups 1, 2)

**Commit:** `feat(ecosystem): auto session log via PostToolUse hook`

External deps: none (uses bash + git already available in member
repos).

- Extend `core/scripts/check-history-reminder.sh` to detect ecosystem
  membership via `findRoot` (re-implemented in shell). On every
  invocation: if running inside a registered member repo, append a
  one-line event to `<ecosystem-root>/sessions/$(date -u +%F).md`.
- Event detection:
  - **Commit:** triggered when the hook runs after a `git commit`
    (detect via `git log -1 --since=2 seconds ago`). Line:
    `HH:MMZ [<member-id>] <subject> (<sha>)`.
  - **PR open/merge:** triggered when `gh pr` activity is observed
    (Phase 9 detects via last `gh` invocation in shell history when
    feasible; v2 may push the agent to emit it explicitly via
    `/session log`).
  - **Deploy:** detected via a presence sentinel
    `.momentum/last-deploy` written by `/deploy-*` adapters; the hook
    reads + clears it.
- Header line: if today's session file is empty, write a header naming
  the active initiative (if any).
- Bounded: hook never writes outside `<ecosystem-root>/sessions/`;
  on missing ecosystem root, exits silently.
- New helper script `core/ecosystem/scripts/session-append.sh` — pure
  shell, sourced by `check-history-reminder.sh` so existing per-repo
  behavior is untouched.

## Group 4 — `/track` Aggregation & Slash-Command Surface (Sequential)

**Commit:** `feat(ecosystem): /track ecosystem-aware aggregation and slash commands`

External deps: `gh` for PR state (optional — `/track` degrades to
git-only if `gh` unavailable).

- `core/commands/track.md` — extend the existing recipe:
  1. Check for ecosystem root (`findRoot`).
  2. If found: read manifest, read each member's `specs/status.md`,
     run `git status --short` + `git log -3` + `gh pr list` per
     member, render unified table.
  3. Print active initiative banner if `.state/active-initiative`
     exists.
- `core/commands/session.md` — recipe for `/session log <message>`.
  Appends a user-narrated line to today's session file.
- Adapter overlays: copy the same files (with adapter-shaped tweaks)
  to `adapters/claude-code/commands/`, `adapters/codex/commands/`,
  `adapters/antigravity/commands/`. Use the existing overlay
  conflict-detection from Adapter Contract v2.
- Register all three new commands in adapter manifests so
  `momentum init` and `momentum upgrade` install them.

## Group 5 — Tests (Sequential)

**Commit:** `test(ecosystem): cli, schema, hook, initiative coverage`

External deps: node:test (already used).

- `tests/ecosystem-cli.test.js`:
  - `ecosystem init` creates valid structure; `ecosystem add` is
    idempotent and writes the fenced pointer; `remove` reverses both.
  - Pre-flight refuses paths that aren't momentum-installed.
  - Manifest validation rejects malformed inputs.
- `tests/ecosystem-initiative.test.js`:
  - `create` numbers correctly and sets active; `status` reads back;
    `close` populates Close section and clears active.
  - Frontmatter validation.
- `tests/ecosystem-hook.test.js`:
  - Simulated commit in a fake member repo writes one line to today's
    session file; missing ecosystem root → no-op; bounded walk
    (5 levels max) verified.
- Run: `npm test` — target ~80 tests total (existing 68 + ~12).

## Group 6 — Docs, Retrospective, Release Notes (Sequential)

**Commit:** `docs(ecosystem): tier-1 model + worked example`

External deps: none.

- `core/specs-templates/specs/architecture/ecosystem.md` — the model
  doc (members / initiatives / sessions / hook flow / opt-in).
- `README.md` — add an "Ecosystems" section ~50 lines, point at a
  worked example using `cerebrio`.
- `specs/changelog/2026-06.md` — release notes for v0.12.0.
- `specs/phases/phase-9-ecosystem-tier1/retrospective.md` — populate
  at close per Rule 5/12 evidence rigor.
- Roadmap update: bump existing Phase 9 → Phase 10; current scope
  becomes Phase 9.
- `/sync-docs` run to propagate.

## Out of plan, deferred to a follow-up Tier 2 phase

- `/switch-repo` with carry-over context.
- Federated impact-map / cross-repo `/sync-docs`.
- Shared rules of record (Rules 1–12 single source).
- Deploy-order awareness.
- Multi-repo `/review-code`.
- Inter-repo parallel agent orchestration (extending Phase 8).
