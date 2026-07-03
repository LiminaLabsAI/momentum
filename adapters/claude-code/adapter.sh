#!/usr/bin/env bash
# Claude Code adapter for momentum (legacy bash installer path).
# Sourced by install.sh — do not execute directly.
# Defines: run_install(target, src_dir)
#
# Overlay convention (Phase 6 / FEAT-012): per-agent files in
#   adapters/claude-code/commands/
#   adapters/claude-code/agent-rules/
#   adapters/claude-code/scripts/
# are overlaid onto the same destinations as the corresponding core/<sub>/.
# A filename may exist in EITHER core/<sub>/ OR adapters/claude-code/<sub>/,
# never both. Conflicts are caught and reported before any writes.
#
# The npx CLI (`bin/momentum.js`) is the canonical install path and is what
# gets full overlay support. This bash installer mirrors basic overlay copy
# behavior for parity but is not the recommended path for new projects.

_overlay_conflicts() {
  local core_root="$1"
  local adapter_root="$2"
  local conflicts=""
  local sub
  for sub in commands agent-rules scripts; do
    local adapter_sub="$adapter_root/$sub"
    local core_sub="$core_root/$sub"
    [ -d "$adapter_sub" ] || continue
    [ -d "$core_sub" ] || continue
    while IFS= read -r f; do
      local rel="${f#$adapter_sub/}"
      if [ -e "$core_sub/$rel" ]; then
        conflicts+="  - $sub/$rel"$'\n'
      fi
    done < <(find "$adapter_sub" -type f 2>/dev/null)
  done
  printf '%s' "$conflicts"
}

_overlay_copy() {
  local adapter_root="$1"
  local target="$2"
  local src_sub dest_sub
  for entry in "commands:.claude/commands" "agent-rules:.agent/rules" "scripts:scripts"; do
    src_sub="${entry%%:*}"
    dest_sub="${entry#*:}"
    local overlay="$adapter_root/$src_sub"
    [ -d "$overlay" ] || continue
    echo "→ Overlaying $src_sub from adapter..."
    mkdir -p "$target/$dest_sub"
    cp -R "$overlay/." "$target/$dest_sub/"
    if [ "$src_sub" = "scripts" ]; then
      find "$target/$dest_sub" -name '*.sh' -exec chmod +x {} +
    fi
  done
}

run_install() {
  local target="$1"
  local src="$2"
  local adapter_dir="$src/adapters/claude-code"

  # Pre-flight conflict detection — error before any writes
  local conflicts
  conflicts="$(_overlay_conflicts "$src/core" "$adapter_dir")"
  if [ -n "$conflicts" ]; then
    echo "Error: duplicate overlay files in core/ and adapters/claude-code/." >&2
    echo "Each file may live in EITHER core/ OR exactly one adapter, never both." >&2
    echo "$conflicts" >&2
    echo "" >&2
    echo "Resolution: keep the file in core/ if generic, or in adapters/<agent>/ if agent-specific." >&2
    exit 1
  fi

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

  # .agent/rules/project.md is retired (Phase 23 / ADR-0004) — the full rules
  # ride CLAUDE.md now. Nothing to install here.

  # Adapter overlay — per-agent commands/agent-rules/scripts (additive)
  _overlay_copy "$adapter_dir" "$target"
}
