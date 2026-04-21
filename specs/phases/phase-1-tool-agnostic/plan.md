# Phase 1 Implementation Plan — Tool-Agnostic Architecture

# Sequential: Group 0 → Group 1 → Group 2 → Group 3

---

## Group 0 — Core Restructure
**Sequential. Blocks all subsequent groups.**
External dependencies: none
Commit: `refactor: move template/ into core/ + adapters/ skeleton`

Move all tool-agnostic content out of `template/` into `core/`. Create the `adapters/` directory skeleton.

### Tasks

1. Create `core/commands/` and move all 8 command files from `template/.claude/commands/`:
   - `brainstorm-phase.md`
   - `brainstorm-project.md`
   - `complete-phase.md`
   - `log.md`
   - `review.md`
   - `start-phase.md`
   - `sync-docs.md`
   - `track.md`

2. Create `core/scripts/` and move `template/scripts/check-history-reminder.sh`

3. Create `core/agent-rules/` and move `template/.agent/rules/project.md`

4. Create `adapters/claude-code/` directory

5. Move `template/.claude/settings.json` → `adapters/claude-code/settings.json`

6. Remove `template/` (now empty)

7. Commit Group 0

---

## Group 1 — Claude Code Adapter
**Sequential. Requires Group 0.**
External dependencies: none
Commit: `feat(adapters): add claude-code adapter.sh`

Create the `adapter.sh` for Claude Code. This script defines a `run_install()` function that `install.sh` sources and calls.

### Tasks

1. Create `adapters/claude-code/adapter.sh`:
   ```bash
   #!/usr/bin/env bash
   # Claude Code adapter for momentum
   # Sourced by install.sh — do not execute directly.
   # Defines: run_install(target, src_dir)

   run_install() {
     local target="$1"
     local src="$2"

     # .claude/commands/
     echo "→ Installing slash commands..."
     mkdir -p "$target/.claude/commands"
     cp "$src/core/commands/"* "$target/.claude/commands/"

     # scripts/
     echo "→ Installing hook scripts..."
     mkdir -p "$target/scripts"
     cp "$src/core/scripts/check-history-reminder.sh" "$target/scripts/"
     chmod +x "$target/scripts/check-history-reminder.sh"

     # .claude/settings.json
     echo "→ Configuring Claude Code hooks..."
     if [ ! -f "$target/.claude/settings.json" ]; then
       mkdir -p "$target/.claude"
       cp "$src/adapters/claude-code/settings.json" "$target/.claude/settings.json"
     else
       echo "  ⚠️  .claude/settings.json already exists."
       echo "     Merge hooks manually from: $src/adapters/claude-code/settings.json"
     fi

     # .agent/rules/
     echo "→ Installing agent rules..."
     mkdir -p "$target/.agent/rules"
     if [ ! -f "$target/.agent/rules/project.md" ]; then
       cp "$src/core/agent-rules/project.md" "$target/.agent/rules/"
     else
       echo "  ⚠️  .agent/rules/project.md already exists — skipping."
     fi
   }
   ```

2. Verify `adapter.sh` is not marked executable (it's sourced, not executed)

3. Commit Group 1

---

## Group 2 — Update install.sh
**Sequential. Requires Group 1.**
External dependencies: none
Commit: `feat(install): --coding-agent flag, fix BUG-001`

Rewrite `install.sh` to parse `--coding-agent`, fix BUG-001 (mkdir before realpath), source the adapter, and delegate install logic to `run_install()`.

### Tasks

1. Rewrite `install.sh`:
   ```bash
   #!/usr/bin/env bash
   # momentum installer
   # Usage: ./install.sh [target-directory] [--coding-agent <name>]
   # Default target: current directory
   # Default coding agent: claude-code

   set -euo pipefail

   TARGET="."
   CODING_AGENT="claude-code"

   while [[ $# -gt 0 ]]; do
     case "$1" in
       --coding-agent)
         CODING_AGENT="$2"
         shift 2
         ;;
       -*)
         echo "Unknown flag: $1" >&2
         exit 1
         ;;
       *)
         TARGET="$1"
         shift
         ;;
     esac
   done

   SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
   ADAPTER="$SCRIPT_DIR/adapters/$CODING_AGENT"

   if [ ! -f "$ADAPTER/adapter.sh" ]; then
     echo "Error: Unknown coding agent '$CODING_AGENT'." >&2
     echo "No adapter found at: $ADAPTER/adapter.sh" >&2
     exit 1
   fi

   # Fix BUG-001: create target before realpath
   mkdir -p "$TARGET"
   echo "Installing momentum into: $(realpath "$TARGET") [coding-agent: $CODING_AGENT]"
   echo ""

   # Source adapter and run
   # shellcheck source=/dev/null
   source "$ADAPTER/adapter.sh"
   run_install "$TARGET" "$SCRIPT_DIR"

   echo ""
   echo "✓ momentum installed successfully."
   echo ""
   echo "Next steps:"
   echo ""
   echo "  New project from an idea:"
   echo "    /brainstorm-project"
   echo ""
   echo "  Existing project — plan your next phase:"
   echo "    /brainstorm-phase"
   echo ""
   echo "  Or start a phase directly:"
   echo "    /start-phase"
   echo ""
   echo "  See docs: https://github.com/cerebrio/momentum"
   ```

2. Commit Group 2

---

## Group 3 — Docs, Backlog, Verification
**Sequential. Requires Group 2.**
External dependencies: none
Commit: `docs: update README + backlog for Phase 1`

### Tasks

1. Update `README.md` install section — show `--coding-agent` flag in example

2. Update `specs/backlog/backlog.md`:
   - Mark BUG-001 as `resolved`
   - Add 4 new adapter features (P2):
     - FEAT-007: Adapter — Cursor (`.cursor/rules/`)
     - FEAT-008: Adapter — Gemini CLI (`GEMINI.md`)
     - FEAT-009: Adapter — OpenCode
     - FEAT-010: Adapter — VS Code Copilot (`.github/copilot-instructions.md`)

3. Smoke test A — default agent:
   ```bash
   rm -rf /tmp/test-p1 && ./install.sh /tmp/test-p1
   ls /tmp/test-p1/.claude/commands/    # 8 files
   ls /tmp/test-p1/scripts/             # check-history-reminder.sh
   cat /tmp/test-p1/.claude/settings.json
   ```

4. Smoke test B — explicit flag:
   ```bash
   rm -rf /tmp/test-p1b && ./install.sh /tmp/test-p1b --coding-agent claude-code
   ```

5. Smoke test C — unknown agent errors cleanly:
   ```bash
   ./install.sh /tmp/test-p1c --coding-agent unknown 2>&1 | grep "Error:"
   echo "Exit: $?"
   ```

6. Update `specs/phases/index.json` — add phase-1-tool-agnostic entry, set phase-0 to complete

7. Update `specs/status.md` — Phase 1 complete, v0.2.0

8. Commit Group 3
