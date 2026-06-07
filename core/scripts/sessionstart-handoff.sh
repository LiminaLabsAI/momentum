#!/usr/bin/env bash
# SessionStart hook — handoff auto-greet.
#
# When a new agent session starts in a momentum-managed repo, this
# script detects pending handoffs in `.momentum/inbox/handoff-*.md` and
# prints a one-line banner per pending handoff. Final line prompts the
# user `Read now? [y/skip]`; on `y` the script exits 10 to signal the
# adapter that the next agent action should be `/continue` (or
# `momentum continue`). On any other input or non-TTY runs, exits 0
# silently — the handoff stays in the inbox until the user runs
# `/continue` themselves.
#
# Adapter wiring:
#   - Claude Code:  .claude/settings.json SessionStart entry → this script
#   - Codex:        .codex/hooks.json SessionStart entry → this script
#   - Antigravity:  no SessionStart hook surface; banner ships via
#                   primary instruction text (see overlay).

set -eu

INBOX_DIR=".momentum/inbox"

# No inbox dir → no pending handoffs.
[ -d "$INBOX_DIR" ] || exit 0

# Walk the inbox and collect pending handoff files.
shopt -s nullglob 2>/dev/null || true
pending=( "$INBOX_DIR"/handoff-*.md )
if [ "${#pending[@]}" -eq 0 ]; then
  exit 0
fi

count="${#pending[@]}"
if [ "$count" -eq 1 ]; then
  plural=""
else
  plural="s"
fi
banner_lines=()
banner_lines+=( "▸ ${count} pending handoff${plural}:" )

for f in "${pending[@]}"; do
  base=$(basename "$f" .md)
  # Pull a one-line summary from the inbox file. Use awk to grab the
  # line after `## Summary` heading. Fallback to filename if missing.
  summary=$(awk '/^## Summary$/{getline; print; exit}' "$f" 2>/dev/null || true)
  [ -z "$summary" ] && summary="(no summary)"
  from=$(awk -F': *' '/^\*\*fromRepo:\*\*/ {print $2; exit}' "$f" 2>/dev/null || true)
  if [ -n "$from" ]; then
    from_label=$(basename "$from")
  else
    from_label="(unknown)"
  fi
  banner_lines+=( "  ▸ ${base} from ${from_label}: ${summary}" )
done

banner_lines+=( "▸ Read now? [y/skip]  (or run: /continue / momentum continue)" )

# Emit the banner. Use stderr so the agent's primary stdout stays
# clean for normal output; adapters that route hook output anywhere
# will still surface it.
for line in "${banner_lines[@]}"; do
  printf '%s\n' "$line" >&2
done

# If stdin is not a TTY (CI, agent harness without interactive surface)
# just exit 0 — the banner has informed the user (or downstream
# adapter) without forcing a blocking read.
if [ ! -t 0 ]; then
  exit 0
fi

# Read a single character with a short timeout so we don't hang an
# unattended session start.
ans=""
if IFS= read -t 5 -r -n 1 ans 2>/dev/null; then
  : # read succeeded (ans may be empty if user hit Enter)
fi
printf '\n' >&2

case "$ans" in
  y|Y) exit 10 ;;
  *)   exit 0  ;;
esac
