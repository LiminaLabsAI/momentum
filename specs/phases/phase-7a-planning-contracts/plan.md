# Phase 7a — Implementation Plan

# Execution order:
# Sequential:  Group 0 → (Groups 1 + 2 in parallel) → Group 3 → Group 4 → Group 5

## Reference contracts

The two contract texts authored in Group 0 are the source of truth for every downstream group. They are embedded verbatim into the command files in Groups 1 and 3.

---

## Group 0 — Author contract text

**Sequential.** Blocks everything else; downstream groups embed this content verbatim.

External dependencies: none.

Tasks:
- Author the **Brainstorm Gate Contract** text — to be embedded in `/brainstorm-phase`, `/brainstorm-idea`, `/start-project`:
  - "Draft in conversation only" rule
  - Sentinel file lifecycle: `.momentum/brainstorm-active` touch on entry; `rm` on approval or session end
  - "All writes happen below this line" gate marker
  - Red-flag table mirroring CLAUDE.md style ("If you find yourself thinking ... STOP and ...")
  - Approval phrasing the command must ask before proceeding
- Author the **Autonomous Execution Contract** text — to be embedded in `/start-phase`:
  - Hard stop (always): merge to staging/main + release
  - Discretionary stop: when continuing would cause real harm or a wrong result hard to undo
  - Pre-authorized actions list: commits, pushes to feature branch, running tests, updating tracking, creating ADRs from discoveries, branch creation
  - Explicit "do NOT pause between groups" line
  - Cross-references to Rule 6 (Git Lifecycle), Rule 8 (History), Rule 12 (Verify Before Claim)
- Define the **PreToolUse hook contract**:
  - Triggers on tool calls: `Write`, `Edit`, `MultiEdit`
  - Reads `$CLAUDE_PROJECT_DIR/.momentum/brainstorm-active`
  - If sentinel exists AND the tool's target path matches `specs/**`, exit non-zero with stderr message: "Brainstorm gate active: cannot write to specs/ until user approves. Remove `.momentum/brainstorm-active` after approval."
  - Otherwise exit 0

Commit message: `docs(phase-7a): author brainstorm-gate and autonomy contracts`

---

## Group 1 — Brainstorm command hardening

**Parallel with Group 2.** Edits three distinct command files; no shared lines with Group 2's hook work.

External dependencies: Group 0 contract text (frozen).

Tasks:
- Update `core/commands/brainstorm-phase.md`:
  - Step 6 → "Draft phase files **in conversation only** — do NOT call `Write`/`Edit`/`MultiEdit` yet"
  - Insert new Step 6.5 → create sentinel: `mkdir -p .momentum && touch .momentum/brainstorm-active`
  - Step 7 (existing approval step) → unchanged
  - Step 8 → "On approval: `rm .momentum/brainstorm-active`, then write all phase files"
  - Add **Brainstorm Gate Contract** section (verbatim from Group 0)
  - Add red-flag table
- Update `core/commands/brainstorm-idea.md`:
  - Same pattern, adapted for the "explore an idea" flow (no phase files written until approval; intermediate notes stay in conversation)
- Update `core/commands/start-project.md`:
  - Same pattern, adapted for "scaffold from idea" (don't scaffold project files until user approves the project name + structure)
- Verify no overlay duplicates: `ls adapters/claude-code/commands/` should contain only files that legitimately differ per-adapter (today: `review-code.md`); no `brainstorm-phase.md` etc. in the adapter overlay

Commit message: `feat(commands): brainstorm write-gate discipline across planning commands`

---

## Group 2 — Hook + sentinel + .gitignore

**Parallel with Group 1.** Touches different files entirely.

External dependencies: Group 0 hook contract (frozen).

Tasks:
- Create `adapters/claude-code/scripts/brainstorm-gate.sh`:
  - Shebang `#!/usr/bin/env bash`
  - `set -euo pipefail`
  - Read tool name from hook input (Claude Code hook stdin protocol: JSON on stdin)
  - Read target path from hook input
  - If sentinel `$CLAUDE_PROJECT_DIR/.momentum/brainstorm-active` exists AND tool is `Write`/`Edit`/`MultiEdit` AND target path matches `specs/`, print error to stderr and exit 2 (blocking)
  - Otherwise exit 0
- `chmod +x adapters/claude-code/scripts/brainstorm-gate.sh`
- Update `adapters/claude-code/settings.json`: add PreToolUse hook entry pointing at `brainstorm-gate.sh` (use `$CLAUDE_PROJECT_DIR` for portable path)
- Create root `.gitignore`:
  ```
  # macOS AppleDouble metadata (external drive artifact)
  ._*
  .DS_Store

  # momentum sentinel directory
  .momentum/

  # Node
  node_modules/
  *.log
  ```
- Create `core/specs-templates/.gitignore` with the same content so projects scaffolded by `momentum init` get it too
- Update `package.json` `files` field if needed (verify `core/**` includes the new template `.gitignore`)

Commit message: `feat(claude-code): brainstorm-gate PreToolUse hook + .gitignore hygiene`

---

## Group 3 — /start-phase autonomy contract

**Sequential.** Runs after Groups 1 and 2 land (no actual file conflicts, but logically follows the brainstorm-side contract).

External dependencies: Group 0 autonomy contract text (frozen).

Tasks:
- Rewrite `core/commands/start-phase.md` to embed the **Autonomous Execution Contract** section:
  - Move existing scaffold + branch steps below the contract section
  - Cross-reference Rule 6 (Git Lifecycle — already says "auto-commit," "auto-create feature branch"; consistent)
  - Cross-reference Rule 8 (History — append per group, do NOT skip)
  - Cross-reference Rule 12 (Verify Before Claim — every group ends with a verification step before marking `[x]`)
  - Explicit anti-pattern callouts: "DO NOT ask 'should I commit?' between groups" / "DO NOT pause after Group 0"
  - Single hard-stop instruction: "After Group 4 verification passes, STOP and ask the user before merging to staging/main and running `npm publish`"
- Verify no overlay duplicate at `adapters/claude-code/commands/start-phase.md`

Commit message: `feat(commands): start-phase autonomous-execution contract`

---

## Group 4 — Tests + dogfood verification

**Sequential.** Runs after Groups 1, 2, 3 land.

External dependencies: working `node --test` (Node ≥18).

Tasks:
- Create `tests/brainstorm-gate.test.js`:
  - Scenario A — sentinel present, Write attempt to `specs/foo.md` → hook exits non-zero
  - Scenario B — sentinel absent, Write attempt to `specs/foo.md` → hook exits 0
  - Scenario C — sentinel present, Write attempt to `src/foo.js` (non-specs path) → hook exits 0
  - Scenario D — sentinel cleanup: simulate session abort, assert `.momentum/brainstorm-active` is treatable as stale (covered by user re-running the command which re-creates the sentinel; document the cleanup expectation)
- Create `tests/start-phase-contract.test.js`:
  - Assert `core/commands/start-phase.md` contains `## Autonomous Execution Contract`
  - Assert the hard-stop line is present
  - Assert the pre-authorized actions list is present
- Create `tests/command-gates.test.js`:
  - Assert each of `brainstorm-phase.md`, `brainstorm-idea.md`, `start-project.md` contains `## Brainstorm Gate Contract`
  - Assert each has the sentinel-create line
  - Assert each has the sentinel-remove line in its approval step
- Run `npm test`. Expected: 24 existing tests + new tests all pass.
- **Manual dogfood**: in a scratch dir, simulate the gate:
  ```bash
  mkdir -p /tmp/momentum-dogfood && cd /tmp/momentum-dogfood
  mkdir -p .momentum specs && touch .momentum/brainstorm-active
  echo '{"tool_name":"Write","tool_input":{"file_path":"/tmp/momentum-dogfood/specs/x.md"}}' | bash <repo>/adapters/claude-code/scripts/brainstorm-gate.sh
  # Expect: exit 2, stderr message
  rm .momentum/brainstorm-active
  echo '{"tool_name":"Write","tool_input":{"file_path":"/tmp/momentum-dogfood/specs/x.md"}}' | bash <repo>/adapters/claude-code/scripts/brainstorm-gate.sh
  # Expect: exit 0
  ```
- Capture stdout/stderr from `npm test` for the retrospective evidence section (per Phase 6's evidence rigor)

Commit message: `test(phase-7a): brainstorm gate + autonomy contract coverage`

---

## Group 5 — Roadmap update + STOP for merge/release

**Sequential.** Final group. Per autonomy contract: this is where the engine (future) stops and asks the human.

External dependencies: passing test suite from Group 4.

Tasks:
- Update `specs/planning/roadmap.md`:
  - Replace Phase 7 row with three rows: 7a (this phase), 7b, 7c
  - Per-row deliverables: 7a — brainstorm gate + autonomy contract (this phase); 7b — autonomous execution engine + TDD Rule 13 + retry budget; 7c — parallel worktree orchestration
  - Reach (Cursor + Gemini adapters) shifts to Phase 9
- Update `specs/changelog/2026-05.md` with phase completion entry (or `2026-06.md` if month rolls over)
- **STOP — ask user**:
  - "All groups complete and verified. Ready to:
    1. Merge `phase-7a-planning-contracts` → `staging` (then `main`)
    2. Tag `v0.8.0` and run `npm publish --access public`
    Approve to proceed?"
- On approval: proceed via `/complete-phase`
