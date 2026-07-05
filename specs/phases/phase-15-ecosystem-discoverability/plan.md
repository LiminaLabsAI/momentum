---
type: Plan
---

# Phase 15 — Ecosystem Agent Discoverability: Plan

## Execution Order

```
Group 0 → (Groups 1 + 2 + 3 + 4 + 5 in parallel) → Group 6 → Group 7
```

Group 0 lands the scaffolding (roadmap renumber, status update, phase tracking files). Groups 1–5 are independent file-set work over distinct code surfaces — they run in parallel. Group 6 runs the full test suite + tarball-shape check. Group 7 syncs docs + cuts the release.

---

## Group 0 — Foundations + tracking (Sequential)

**Sequential.** Blocks all downstream groups.

External deps: none.

**Commit:** `infra(specs): phase 15 scaffolding + roadmap renumber`

### Tasks

- Renumber roadmap: Phase 15 = Ecosystem Agent Discoverability (v0.18.0), Reach → 16 (v0.19.0), Intelligence → 17 (v0.20.0), Platform → 18 (v1.0). Update `specs/planning/roadmap.md` (Timeline + Dependencies + Milestones), `specs/status.md` (Upcoming Phases + Active Phase), `specs/phases/README.md`, `specs/phases/index.json`.
- Bump ENH-025 from `open` to `in-progress` in `specs/backlog/backlog.md`; mark its phase as `phase-15`.
- Phase tracking: `specs/phases/phase-15-ecosystem-discoverability/` already contains `overview.md` + `plan.md` from this work. Add `tasks.md` (granular checklist) + `history.md` (append-only log) + `retrospective.md` (stub for Group 7) + `artifacts/.gitkeep`.

---

## Group 1 — Managed CLAUDE.md/AGENTS.md on `ecosystem init` (Parallel)

**Parallel** with G2–G5. Depends only on Group 0 scaffolding.

External deps: none.

**Commit:** `feat(ecosystem): write managed CLAUDE.md + AGENTS.md on init (ENH-025)`

### Tasks

- Create `core/ecosystem/templates/ecosystem-claude.md` — 30–40 lines of content with `## Project Extensions` marker at the bottom. Content covers: "you are in an ecosystem coordination layer (NOT a project)"; what lives here (`ecosystem.json`, `initiatives/`, `sessions/`, `.state/`); cross-repo work → write `initiatives/<NNNN-slug>.md` (never plan implementation here); orchestration primitives one-liners (`/scout`, `/dispatch`, `/handoff`, `/continue`, `/initiative`, `/session`); how to discover state (`momentum ecosystem status`); link to docs.
- Sibling `core/ecosystem/templates/ecosystem-agents.md` — same content, file exists separately so both `CLAUDE.md` and `AGENTS.md` ship from `cmdInit` regardless of which adapter the consuming repos use. (We don't know the consuming agent at ecosystem init time — write both.)
- Extend `cmdInit` in `bin/ecosystem.js`:
  - After existing scaffold steps, write `path.join(root, 'CLAUDE.md')` from `ecosystem-claude.md` template (only if absent — never overwrite).
  - Write `path.join(root, 'AGENTS.md')` from `ecosystem-agents.md` template (only if absent).
  - Update the "Next steps" stdout block to mention `CLAUDE.md` was created.
- Update `package.json` `files` glob to include `core/ecosystem/templates/**` so tarball ships the new templates. Verify with `npm pack --dry-run --json`.
- Add test `tests/ecosystem-init-claude-md.test.js` — asserts `CLAUDE.md` + `AGENTS.md` exist after init, contain orchestration primitives, contain `## Project Extensions` marker, are NOT overwritten on second `init` attempt (idempotency).

---

## Group 2 — Action-bearing pointer block (Parallel)

**Parallel** with G1, G3, G4, G5. Depends only on Group 0.

External deps: none.

**Commit:** `feat(ecosystem): action-bearing pointer block (orchestration primitives + routing rule)`

### Tasks

- Rewrite `ensurePointerInjected` in `core/ecosystem/lib/pointer.js` to inject a richer block:
  ```
  <!-- ecosystem:begin v=2 -->
  > **Member of `<name>` ecosystem** at `<rel>`.
  >
  > **Cross-repo work?** Write an initiative — never plan cross-repo features here:
  > `<rel>/initiatives/<NNNN-slug>.md` (or `/initiative create <slug>`)
  >
  > Orchestration primitives (run from this repo or the ecosystem root):
  > - `/scout <repo>` — read another member's state
  > - `/dispatch <r1> <r2> "..."` — parallel multi-repo investigation
  > - `/handoff <repo>` — transfer context to another member
  > - `/continue` — resume from an inbox handoff
  >
  > See siblings + live state: `momentum ecosystem status`
  <!-- ecosystem:end -->
  ```
- Add `POINTER_VERSION = 2` constant. `ensurePointerInjected` checks the BEGIN sentinel for `v=N`; if missing or older than `POINTER_VERSION`, rewrites the block contents in place (preserving surrounding content). If equal, no-op (preserves user edits inside the fence — though we now discourage edits inside the managed block).
- `stripPointer` regex updated to match any version sentinel (`v=\d+` or absent).
- Add test `tests/pointer-block-content.test.js` — asserts new content shape; asserts upgrade-from-v1 path rewrites cleanly; asserts strip removes both v1 and v2 forms.

---

## Group 3 — SessionStart hook prints ecosystem context (Parallel)

**Parallel** with G1, G2, G4, G5. Depends only on Group 0.

External deps: none.

**Commit:** `feat(adapters/claude-code): SessionStart hook surfaces ecosystem context`

### Tasks

- Extend `core/scripts/sessionstart-handoff.sh` (or rename → `sessionstart-momentum.sh` and update `adapters/claude-code/settings.json` reference accordingly). Keep handoff banner; PREPEND ecosystem context banner when reachable.
- Ecosystem detection algorithm (mirror `session-append.sh`):
  1. Walk up from CWD bounded by `MOMENTUM_MAX_PARENT_WALK` (default 5) looking for `ecosystem.json`.
  2. If not found, scan siblings of CWD (and each parent up to bound) for a directory containing `ecosystem.json`.
  3. If still not found, skip the ecosystem banner — handoff-only behavior.
- When found:
  - Read `ecosystem.json`; extract `name` + `members.length`.
  - Read `.state/active-initiative` if present.
  - Print to stderr (matching handoff banner's stream):
    ```
    ▸ Ecosystem: <name> (<N> members)
    ▸ Active initiative: <slug>      (only if set)
    ```
- Performance: total hook cost stays <100ms (current handoff hook is ~30ms; the ecosystem detection adds one `cat` + one `find` at most).
- Update `adapters/codex/hooks.json` SessionStart entry too (Codex shares the same hook script per Phase 11).
- Add test `tests/sessionstart-ecosystem-banner.test.js` — runs the script against a temp directory with/without an `ecosystem.json` neighbor; asserts banner content + exit code.

---

## Group 4 — Dispatch CLI degraded-mode notice upfront (Parallel)

**Parallel** with G1, G2, G3, G5. Depends only on Group 0.

External deps: none.

**Commit:** `feat(orchestration): dispatch CLI surfaces degraded-mode notice upfront`

### Tasks

- In `core/orchestration/dispatch.js` `dispatch(opts)`:
  - Compute `isInProcess = !opts.record` (i.e., we're running the in-process keyword scan, not the agent-driven `record()` path).
  - Before the `started` event, when `isInProcess` is true, emit `note` event:
    ```
    ▸ MODE NOTICE: CLI mode produces keyword summaries only (no LLM synthesis).
      For full synthesis, invoke /dispatch as a slash command from an agent surface
      (Claude Code Task tool, Codex sub-agent, etc.).
    ```
  - The event renderer already prints `note` events to stdout/stderr — this surfaces the notice at the very top.
- In `synthesizeInProcess`, replace the trailing parenthetical (`(In-process synthesis — no LLM available. Agent-driven dispatch can produce a true synthesis answering the user intent directly.)`) with a more explicit header at the TOP of the synthesis block:
  ```
  > **MODE: CLI / in-process — keyword summaries only.**
  > For LLM synthesis, invoke /dispatch via an agent slash command.
  ```
- In `renderArtifact`, render the mode notice as a `> [!NOTE]` admonition immediately below the `**Mode:**` line.
- Add test `tests/dispatch-cli-banner.test.js` — captures emitter events from a dispatch run with mock scout; asserts a `note` event with the mode-notice prefix appears before `started`.

---

## Group 5 — `momentum ecosystem initiative create` CLI ships (Parallel)

**Parallel** with G1, G2, G3, G4. Depends only on Group 0.

External deps: none.

**Commit:** `feat(ecosystem): ship `momentum ecosystem initiative create` CLI`

### Tasks

- Add `initiative` subcommand to `runEcosystem` dispatch in `bin/ecosystem.js`. Subsubcommands: `create <slug>` (the only one shipped this phase; `list` / `status` / `close` stay as slash-command-only for now — out of scope).
- `cmdInitiative(rest)` parses `rest[0]` as subsubcommand, dispatches to `cmdInitiativeCreate(rest.slice(1))`.
- `cmdInitiativeCreate(args)`:
  - Parse positional `<slug>` (validated against `/^[a-z][a-z0-9-]*$/`).
  - Parse flags: `--why "<text>"`, `--repos r1,r2,r3`, `--owner <name>`, `--ecosystem <path>`.
  - Resolve ecosystem root via existing `resolveEcosystemRoot(opts.ecosystem, 'initiative create')`.
  - Load manifest; default `--repos` to all member ids; default `--owner` to `git config user.name` fallback to `$USER`.
  - Call `core/ecosystem/lib/initiative.js`:
    - `nextInitiativeId(root)` for the integer ID.
    - Render frontmatter + body using `core/ecosystem/templates/initiative-template.md`.
    - `writeInitiative(filePath, frontmatter, content)`.
    - `setActive(root, slug)`.
  - Print success message: `Created initiatives/<NNNN-slug>.md (id N). Set as active initiative.`
- Update `printUsage` in `bin/ecosystem.js` to list the `initiative create` subsubcommand.
- Update `initiativesReadme()` template — drop "(coming with Group 2 of Phase 9)"; describe the now-shipped CLI: `momentum ecosystem initiative create <slug> [--why "..."] [--repos r1,r2] [--owner name]`.
- Add test `tests/ecosystem-initiative-cli.test.js` — runs `cmdInitiativeCreate` against a temp ecosystem; asserts file written with correct frontmatter, `.state/active-initiative` set to slug.

---

## Group 6 — Test suite + tarball shape (Sequential, after G1–G5)

**Sequential.** Depends on G1–G5 all green.

External deps: none.

**Commit:** `chore(tests): verify phase 15 — full suite + tarball shape green`

### Tasks

- `npm test` green — all existing + new tests pass.
- `tests/tarball.test.js` updated to assert `core/ecosystem/templates/ecosystem-claude.md` + `ecosystem-agents.md` ship in the npm tarball.
- Manual smoke: `cd /tmp && mkdir test-eco && cd test-eco && node /Volumes/.../momentum/bin/momentum.js ecosystem init test-eco` produces CLAUDE.md + AGENTS.md with the right content.
- Manual smoke: `momentum ecosystem initiative create smoke-test --why "smoke" --owner test` writes the file + sets active.

---

## Group 7 — Doc sync + release v0.18.0 (Sequential, after G6)

**Sequential.** Depends on G6 green.

**Approval required for:** merge → main, tag, gh release create, npm publish.

### Tasks

- `/sync-docs` — flush this phase's `[FEATURE]` / `[DECISION]` / `[ARCH_CHANGE]` entries from `history.md` into the appropriate specs.
- `/complete-phase` — produce `retrospective.md` with verification evidence (test output captured).
- Bump package.json version → `0.18.0`.
- PR `phase-15-ecosystem-discoverability` → `main`. Squash-merge with summary cherry-picked from retrospective.
- Tag `v0.18.0` + push.
- `gh release create v0.18.0 --title "v0.18.0 — Phase 15: Ecosystem Agent Discoverability" --notes "<from retrospective>" --latest --verify-tag`.
- `npm publish --access public`.
- Verify: `gh release list --limit 3` shows v0.18.0 Latest; `npm view @avinash-singh-io/momentum version` → `0.18.0`.
- Update `specs/status.md` → Phase 15 Complete, next active = (between phases).
