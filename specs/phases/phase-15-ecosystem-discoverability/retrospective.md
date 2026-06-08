# Phase 15 — Ecosystem Agent Discoverability: Retrospective

## What shipped

Five discoverability + degradation fixes that close the gap between the
orchestration primitives existing and agents reaching for them by default:

1. **ENH-025 — Managed ecosystem `CLAUDE.md` + `AGENTS.md` on `ecosystem init`.**
   Two new templates under `core/ecosystem/templates/`. `cmdInit` writes both
   (idempotent — never overwrites existing files). Content: "you are in a
   coordination layer, NOT a project"; orchestration primitives index;
   cross-repo routing rule ("write an initiative — never plan implementation
   here"); explicit warning against `momentum dispatch` CLI for synthesis;
   `## Project Extensions` marker for upgrade-safety.

2. **ENH-032 — Action-bearing pointer block (v=2).** `core/ecosystem/lib/pointer.js`
   bumped to v=2 sentinel `<!-- ecosystem:begin v=2 -->`. New 13-line block
   lists `/scout`, `/dispatch`, `/handoff`, `/continue`, plus the cross-repo
   routing rule, plus the dispatch-CLI caveat. Auto-migrates legacy v=1 blocks
   in place on next touch (`ensurePointerInjected`). `stripPointer` matches
   both versions.

3. **ENH-033 — SessionStart hook prints ecosystem context.**
   `core/scripts/sessionstart-handoff.sh` extended (renamed not needed — same
   path works for both Claude Code and Codex adapters). Walks up + scans
   siblings mirroring `session-append.sh`. Prints `▸ Ecosystem: <name>
   (<N> member[s])` + `▸ Active initiative: <slug>` (when set) before the
   handoff banner.

4. **ENH-034 — Dispatch CLI surfaces degraded-mode notice upfront.**
   Single `CLI_MODE_NOTICE` string used in three places:
   `note` event emitted BEFORE `started` (first line of stdout via default
   renderer), `> [!NOTE]` admonition at the TOP of the in-process synthesis
   body, and same admonition between `**Mode:**` and `## Synthesis` in the
   dispatch-NNN.md artifact. Skipped on agent-driven `record()` runs via
   new `isAgentDriven` param.

5. **ENH-035 — `momentum ecosystem initiative create` CLI ships.**
   Wires existing `core/ecosystem/lib/initiative.js` to a new
   `cmdInitiative` / `cmdInitiativeCreate` in `bin/ecosystem.js`.
   Non-interactive: `--why "<text>"`, `--repos r1,r2,...`, `--owner <name>`,
   `--ecosystem <path>`. Smart defaults (all members for `--repos`;
   git user.name for `--owner`). Substitutes template placeholders and sets
   `.state/active-initiative`.

Plus site-doc updates (ecosystem.mdx) reflecting the new managed CLAUDE.md
and the new initiative-create CLI.

## Verification Evidence

Captured in `artifacts/verification.txt`:

- `npm test` — 288/288 PASS (254 baseline → +34 new tests across 5 new
  test files: `ecosystem-init-claude-md.test.js`, `pointer-block-content.test.js`,
  `sessionstart-ecosystem-banner.test.js`, `dispatch-cli-banner.test.js`,
  `ecosystem-initiative-cli.test.js`).
- Manual smoke: end-to-end `init → add → initiative create` produces the
  expected managed CLAUDE.md, action-bearing pointer block, and initiative
  file with active marker.
- Manual smoke: SessionStart hook from a member sibling correctly prints
  ecosystem context.

## What surprised us

- **The fixture had a v=1 sentinel baked into `tests/helpers/adapter-smoke.js`.**
  Exact-match on `/<!-- ecosystem:begin -->/` would have been an interpretation
  hazard: would silently pass on a "no pointer at all" install, since the
  v=1 string just wouldn't be there to match. Caught only when the v=2
  install path produced a v=2 sentinel that didn't match the v=1 regex.
  Updated 9 sites across 6 test files to substring-match the prefix instead.

- **The initiative template's "Why" paragraph ends in `?` not `.`** — my
  substitution regex had `\.` and failed silently in the first test run.
  Caught immediately by the test assertion. The template body's literal
  characters matter for substitution; documented in the regex.

## What we'd do differently

- Cross-adapter validation for Codex / Antigravity is implicit (shared core
  code) but not explicit. A targeted smoke per adapter would catch
  per-adapter regressions earlier — filed as a follow-up for Phase 16.

- The action-bearing pointer block migrates on the next `ensurePointerInjected`
  call. Members not touched again will keep the v=1 block until someone
  cycles them. A `momentum ecosystem doctor --fix-pointers` (or similar)
  would close this — filed as a follow-up.

## Backlog filings during phase

| ID | Type | What |
|---|---|---|
| ENH-032 | Enhancement | Action-bearing pointer block (resolved in this phase) |
| ENH-033 | Enhancement | SessionStart hook ecosystem-context banner (resolved) |
| ENH-034 | Enhancement | Dispatch CLI degraded-mode notice upfront (resolved) |
| ENH-035 | Enhancement | `momentum ecosystem initiative create` CLI (resolved) |

ENH-025 (the original P1 from 2026-06-07 dogfood) also resolved as part of
this phase.

## Highlights for release notes

- **`momentum ecosystem init` now writes managed `CLAUDE.md` + `AGENTS.md`**
  telling agents the directory is a coordination layer (NOT a project) and
  listing the orchestration primitives. Closes ENH-025.
- **Pointer block (v=2) is action-bearing** — lists `/scout`, `/dispatch`,
  `/handoff`, `/continue` plus the cross-repo routing rule. Existing members
  auto-migrate on next pointer touch. Closes ENH-032.
- **SessionStart hook surfaces ecosystem context** — `▸ Ecosystem: <name>
  (N members)` + `▸ Active initiative: <slug>` printed automatically when
  reachable from CWD. Closes ENH-033.
- **`momentum dispatch` CLI prints `▸ MODE NOTICE` upfront** when running in
  keyword-summary mode; same admonition rendered at the top of the synthesis
  body and the dispatch-NNN.md artifact. No more silent degradation. Closes
  ENH-034.
- **`momentum ecosystem initiative create <slug>` CLI ships** (promised for
  Phase 9 Group 2; finally landed). Non-interactive — works from any agent
  context. Closes ENH-035.
- Site docs updated to reflect the new init behaviour and the initiative
  create CLI.
- Test suite: 288/288 pass (+34 over 254 baseline across five new test files).
