#!/usr/bin/env bash
# momentum installer
# Usage: ./install.sh [target-directory] [--agent <name>]
# Default target: current directory
# Default agent: claude-code

set -euo pipefail

TARGET="."
AGENT="claude-code"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --agent)
      AGENT="$2"
      shift 2
      ;;
    --coding-agent)
      echo "Error: --coding-agent has been renamed to --agent in v0.6.0." >&2
      echo "       Re-run with: --agent <name>" >&2
      exit 1
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
ADAPTER="$SCRIPT_DIR/adapters/$AGENT"

if [ ! -f "$ADAPTER/adapter.sh" ]; then
  echo "Error: Unknown agent '$AGENT'." >&2
  echo "No adapter found at: $ADAPTER/adapter.sh" >&2
  exit 1
fi

# Fix BUG-001: create target before realpath
mkdir -p "$TARGET"
echo "Installing momentum into: $(realpath "$TARGET") [agent: $AGENT]"
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
echo "  Explore an idea first:"
echo "    /brainstorm-idea"
echo ""
echo "  Ready to scaffold a project:"
echo "    /start-project"
echo ""
echo "  Existing project — plan your next phase:"
echo "    /brainstorm-phase"
echo ""
echo "  See docs: https://github.com/cerebrio/momentum"
