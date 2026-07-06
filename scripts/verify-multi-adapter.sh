#!/usr/bin/env bash
# Multi-adapter coexistence verification for BUG-020.
# Creates a fresh project, inits claude-code, upgrades opencode on top,
# then upgrades claude-code — asserts both adapters' surfaces survive.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$(mktemp -d /tmp/momentum-verify-XXXX)
TARGET="$ROOT/proj"
trap 'rm -rf "$ROOT"' EXIT

PASS=0 FAIL=0
pass() { echo "  ✓ $1"; PASS=$((PASS+1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL+1)); }

echo "=== Multi-adapter coexistence verification ==="

# 1. init claude-code
echo "--- Step 1: init --agent claude-code ---"
node bin/momentum.js init "$TARGET" --agent claude-code
test -d "$TARGET/.claude" && pass ".claude/ exists after init" || fail ".claude/ missing after init"

# 2. upgrade opencode
echo "--- Step 2: upgrade --agent opencode ---"
node bin/momentum.js upgrade "$TARGET" --agent opencode
test -d "$TARGET/.opencode" && pass ".opencode/ exists after upgrade" || fail ".opencode/ missing after upgrade"
test -d "$TARGET/.claude" && pass ".claude/ still exists after opencode upgrade" || fail ".claude/ deleted by opencode upgrade"

# 3. check installed.json
echo "--- Step 3: verify installed.json ---"
INSTALLED=$(cat "$TARGET/.momentum/installed.json")
echo "$INSTALLED" | node -e "
const j = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const agents = Object.keys(j.agents || {});
if (agents.includes('claude-code') && agents.includes('opencode')) {
  console.log('  ✓ both agents in map: ' + agents.join(', '));
} else {
  console.log('  ✗ missing agents. found: ' + agents.join(', '));
  process.exit(1);
}
" || fail "installed.json agents check failed"
pass "installed.json contains both agents"

# 4. upgrade claude-code
echo "--- Step 4: upgrade --agent claude-code (symmetry) ---"
node bin/momentum.js upgrade "$TARGET" --agent claude-code
test -d "$TARGET/.claude" && pass ".claude/ still exists after claude-code upgrade" || fail ".claude/ deleted by claude-code upgrade"
test -d "$TARGET/.opencode" && pass ".opencode/ still exists after claude-code upgrade" || fail ".opencode/ deleted by claude-code upgrade"

# summary
echo "=== Results: $PASS pass, $FAIL fail ==="
[ "$FAIL" -eq 0 ] || exit 1
