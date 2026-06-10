#!/usr/bin/env bash
# brainstorm-gate.sh — PreToolUse hook for Claude Code
#
# Blocks Write/Edit/MultiEdit calls targeting paths under specs/ while a
# brainstorm session is active (indicated by the .momentum/brainstorm-active
# sentinel file).
#
# Implements the PreToolUse Hook Contract in
# specs/phases/phase-7a-planning-contracts/contracts.md.
#
# Exit codes:
#   0 — allow the tool call (default; also used for fail-open paths)
#   2 — block the tool call (stderr is shown to the model)

set -euo pipefail

# ---------------------------------------------------------------------------
# 1. Read hook input (JSON on stdin)
# ---------------------------------------------------------------------------
input=$(cat)

# ---------------------------------------------------------------------------
# 2. Extract tool_name and tool_input.file_path
#    Prefer jq when available; fall back to a regex extractor that handles
#    the canonical Claude Code hook JSON shape.
# ---------------------------------------------------------------------------
if command -v jq >/dev/null 2>&1; then
  tool_name=$(printf '%s' "$input" | jq -r '.tool_name // empty' 2>/dev/null || true)
  file_path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)
else
  # Fallback: grep + sed. Brittle for nested JSON but adequate for the
  # canonical {"tool_name":"X","tool_input":{"file_path":"Y",...}} shape.
  tool_name=$(printf '%s' "$input" \
    | grep -oE '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' \
    | head -1 \
    | sed -E 's/.*:[[:space:]]*"([^"]+)"$/\1/' || true)
  file_path=$(printf '%s' "$input" \
    | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' \
    | head -1 \
    | sed -E 's/.*:[[:space:]]*"([^"]+)"$/\1/' || true)
fi

# ---------------------------------------------------------------------------
# 3. Allow non-write tool calls
# ---------------------------------------------------------------------------
case "${tool_name:-}" in
  Write|Edit|MultiEdit) ;;
  *) exit 0 ;;
esac

# ---------------------------------------------------------------------------
# 4. Fail-open if environment is incomplete (CLAUDE_PROJECT_DIR unset, etc.)
#    A broken hook must not block legitimate work.
# ---------------------------------------------------------------------------
if [[ -z "${CLAUDE_PROJECT_DIR:-}" ]]; then
  exit 0
fi

# ---------------------------------------------------------------------------
# 5. Sentinel check — if the brainstorm-active sentinel is missing, allow
# ---------------------------------------------------------------------------
sentinel="${CLAUDE_PROJECT_DIR}/.momentum/brainstorm-active"
if [[ ! -e "$sentinel" ]]; then
  exit 0
fi

# ---------------------------------------------------------------------------
# 6. Path check — only block writes under specs/
# ---------------------------------------------------------------------------
if [[ -z "${file_path:-}" ]]; then
  exit 0  # fail-open if path missing
fi

# Resolve relative paths against CLAUDE_PROJECT_DIR
case "$file_path" in
  /*) abs_path="$file_path" ;;
  *)  abs_path="${CLAUDE_PROJECT_DIR}/${file_path}" ;;
esac

specs_dir="${CLAUDE_PROJECT_DIR}/specs/"
case "$abs_path" in
  "${specs_dir}"*)
    cat >&2 <<EOF
[brainstorm-gate] Blocked: cannot write to specs/ during active brainstorm.
[brainstorm-gate] Path: ${file_path}
[brainstorm-gate]
[brainstorm-gate] The conversation IS the draft. Get explicit user approval, then:
[brainstorm-gate]   rm .momentum/brainstorm-active
[brainstorm-gate] and retry the write.
EOF
    exit 2
    ;;
  *)
    exit 0
    ;;
esac
