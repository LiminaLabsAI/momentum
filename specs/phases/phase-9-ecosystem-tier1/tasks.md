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

- `[ ]` **Group 4 — `/track` Aggregation + Slash Commands**
  - `[ ]` Extend `core/commands/track.md` for ecosystem mode
  - `[ ]` `core/commands/session.md` for `/session log`
  - `[ ]` Overlay copies for `claude-code`, `codex`, `antigravity`
  - `[ ]` Register commands in adapter manifests
  - `[ ]` Verify `momentum init` ships them; `momentum upgrade` syncs them

- `[ ]` **Group 5 — Tests**
  - `[ ]` `tests/ecosystem-cli.test.js` (init / add / remove / pre-flight / idempotency)
  - `[ ]` `tests/ecosystem-initiative.test.js` (create / numbering / status / close)
  - `[ ]` `tests/ecosystem-hook.test.js` (commit detection / bounded walk / no-op)
  - `[ ]` `npm test` green (~80 total)

- `[ ]` **Group 6 — Docs & Retrospective**
  - `[ ]` `core/specs-templates/specs/architecture/ecosystem.md`
  - `[ ]` README "Ecosystems" section + worked cerebrio example
  - `[ ]` `specs/changelog/2026-06.md` — v0.12.0 entry
  - `[ ]` Roadmap: renumber existing Phase 9 → Phase 10
  - `[ ]` `/sync-docs` and produce `walkthrough.md` evidence
  - `[ ]` Populate `retrospective.md`
