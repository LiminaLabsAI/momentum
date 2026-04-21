#!/usr/bin/env bash
# momentum installer
# Usage: ./install.sh [target-directory]
# Default target: current directory

set -euo pipefail

TARGET="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$SCRIPT_DIR/template"

echo "Installing momentum into: $(realpath "$TARGET")"
echo ""

# .claude/commands/
echo "→ Installing slash commands..."
mkdir -p "$TARGET/.claude/commands"
cp "$TEMPLATE/.claude/commands/"* "$TARGET/.claude/commands/"

# scripts/
echo "→ Installing hook scripts..."
mkdir -p "$TARGET/scripts"
cp "$TEMPLATE/scripts/check-history-reminder.sh" "$TARGET/scripts/"
chmod +x "$TARGET/scripts/check-history-reminder.sh"

# .claude/settings.json
echo "→ Configuring Claude Code hooks..."
if [ ! -f "$TARGET/.claude/settings.json" ]; then
  mkdir -p "$TARGET/.claude"
  cp "$TEMPLATE/.claude/settings.json" "$TARGET/.claude/settings.json"
else
  echo "  ⚠️  .claude/settings.json already exists."
  echo "     Merge hooks manually from: $TEMPLATE/.claude/settings.json"
fi

# .agent/rules/
echo "→ Installing agent rules..."
mkdir -p "$TARGET/.agent/rules"
if [ ! -f "$TARGET/.agent/rules/project.md" ]; then
  cp "$TEMPLATE/.agent/rules/project.md" "$TARGET/.agent/rules/"
else
  echo "  ⚠️  .agent/rules/project.md already exists — skipping (not overwriting)."
fi

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
