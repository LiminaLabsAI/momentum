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
    echo "  ⚠️  .agent/rules/project.md already exists — skipping (not overwriting)."
  fi
}
