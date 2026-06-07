#!/usr/bin/env bash
# Read-only hook: reminds Claude to log history when significant files
# change, AND best-effort appends to today's ecosystem session log when
# this repo is a registered member.

set -euo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null || echo "")
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null || echo "")
TOOL_COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")

# ── Phase-history reminder (file edits) ──────────────────────────────────

if [ -n "$FILE_PATH" ]; then
  SIGNIFICANT=false
  case "$FILE_PATH" in
    specs/decisions/*.md)       SIGNIFICANT=true ;;
    specs/phases/*/tasks.md)    SIGNIFICANT=true ;;
    specs/backlog/backlog.md)   SIGNIFICANT=true ;;
    specs/status.md)            SIGNIFICANT=true ;;
    specs/architecture/*.md)    SIGNIFICANT=true ;;
  esac

  if [ "$SIGNIFICANT" = "true" ]; then
    echo "PHASE HISTORY REMINDER: '$FILE_PATH' was modified — if this reflects a decision, scope change, or discovery, append an entry to the active phase history file (specs/phases/<active-phase>/history.md)."
  fi
fi

# ── Ecosystem session-log auto-append (best-effort) ─────────────────────
# When this hook fires after a `git commit` or `gh pr ...` Bash command,
# record one line to today's session log if this repo is a registered
# ecosystem member. Silent no-op otherwise (no ecosystem, no member id,
# no helper script — all cases just exit cleanly).

session_append() {
  local script_dir
  script_dir=$(dirname "$(readlink -f "$0" 2>/dev/null || echo "$0")")
  local session_script=""
  # Try common locations: peer ecosystem/scripts/ dir,
  # in-repo nested copy, or sibling.
  for candidate in \
    "$script_dir/../ecosystem/scripts/session-append.sh" \
    "$script_dir/ecosystem/scripts/session-append.sh" \
    "$script_dir/session-append.sh"; do
    if [ -x "$candidate" ]; then
      session_script="$candidate"
      break
    fi
  done
  [ -z "$session_script" ] && return 0
  "$session_script" "$@" 2>/dev/null || true
}

if [ "$TOOL_NAME" = "Bash" ] && [ -n "$TOOL_COMMAND" ]; then
  case "$TOOL_COMMAND" in
    *"git commit"*)
      sha=$(git rev-parse --short HEAD 2>/dev/null || echo "")
      subject=$(git log -1 --pretty=%s 2>/dev/null || echo "")
      if [ -n "$sha" ] && [ -n "$subject" ]; then
        session_append "commit" "$subject" "$sha"
      fi
      ;;
    *"gh pr merge"*|*"gh pr create"*)
      session_append "pr" "$(echo "$TOOL_COMMAND" | head -c 80)" ""
      ;;
  esac
fi

exit 0
