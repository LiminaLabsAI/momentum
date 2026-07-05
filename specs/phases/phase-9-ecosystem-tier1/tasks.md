---
type: Task List
---

# Phase 9 — Ecosystem (Tier 1): Tasks

- `[x]` **Group 0 — Schemas & Layout**
  - `[x]` Write `core/ecosystem/schema/ecosystem.schema.json`
  - `[x]` Write `core/ecosystem/schema/initiative.schema.json`
  - `[x]` Write `core/ecosystem/layout.md` (on-disk layout)
  - `[x]` Implement `core/ecosystem/lib/index.js` (`loadManifest`, `findRoot`, `listMembers`, `findMember`, `validateManifest`)
  - `[x]` Bounded-walk + caching for `findRoot` (max 5 parents)

- `[x]` **Group 1 — Manifest CLI**
  - `[x]` `bin/ecosystem.js` with `init / add / remove / status`
  - `[x]` Register `ecosystem` in `bin/momentum.js`
  - `[x]` Idempotent fenced pointer write in target CLAUDE.md
  - `[x]` Pre-flight: target must be momentum-installed
  - `[x]` `init` runs `git init` and produces initial commit

- `[x]` **Group 2 — Initiative Subsystem**
  - `[x]` `core/commands/initiative.md` recipe (create / status / close / list)
  - `[x]` `core/ecosystem/lib/initiative.js` (numbering, load, write, set/get-active, frontmatter parse/serialize, validation)
  - `[x]` `core/ecosystem/templates/initiative-template.md`
  - `[x]` Frontmatter validation against schema

- `[x]` **Group 3 — Session Log & Hook**
  - `[x]` `core/ecosystem/scripts/session-append.sh` (pure shell)
  - `[x]` Extend `core/scripts/check-history-reminder.sh` to source it
  - `[x]` Detect commit + `gh pr` events
  - `[x]` Header injection on first write of the day (with active initiative banner)
  - `[x]` Silent no-op when no ecosystem root
  - `[x]` `init` + `upgrade` ship the session-append helper alongside the hook

- `[x]` **Group 4 — Slash-Command Surface**
  - `[x]` `core/commands/ecosystem.md` — agent-facing recipe for the
        ecosystem CLI + discovery + on-disk model
  - `[x]` `core/commands/session.md` — `/session log` recipe
  - `[x]` Cross-repo note appended to existing `core/commands/track.md`
  - `[x]` Generic-only — no per-adapter overlays needed (commands are
        agent-agnostic; copied verbatim by existing init/upgrade copyDir)
  - `[x]` Verified `momentum init` + `momentum upgrade` ship the new
        commands via existing copyDir of `core/commands/`

- `[x]` **Group 5 — Tests**
  - `[x]` `tests/ecosystem-cli.test.js` — 13 cases (validateManifest,
        findRoot bounded walk + memoization, init scaffold, init
        overwrite refusal, add + idempotency + pre-flight, remove,
        status with active initiative, pointer inject/strip,
        sanitizeId)
  - `[x]` `tests/ecosystem-initiative.test.js` — 10 cases (frontmatter
        parse/serialize round-trip, validation, numbering, active
        state, loadInitiative, write rejects invalid)
  - `[x]` `tests/ecosystem-hook.test.js` — 7 cases (session-append
        first/subsequent/active-banner/orphan; hook commit detection;
        phase-history reminder still fires; non-significant no-op)
  - `[x]` `npm test` green: 101/101 (was 64; +37 new — exceeds the
        ~80 estimate from the brainstorm)

- `[x]` **Group 6 — Docs & Retrospective**
  - `[x]` `core/specs-templates/specs/architecture/ecosystem.md` — full
        reference shipped by `momentum init`
  - `[x]` README "Ecosystems" section + worked cerebrio example
  - `[x]` `specs/changelog/2026-06.md` — v0.12.0 entries
  - `[x]` Roadmap: renumbered existing Phase 9 → Phase 10 (done in
        bookkeeping PR #2)
  - `[ ]` `/sync-docs` and produce `walkthrough.md` evidence
        (defer to `/complete-phase`)
  - `[ ]` Populate `retrospective.md` (defer to `/complete-phase`)
