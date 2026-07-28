#!/usr/bin/env bash
# verify-published.sh — smoke the PUBLISHED artifact, not the working tree.
#
# WHY THIS EXISTS (BUG-033, 2026-07-28):
#
#   v0.43.0 shipped the governor INERT in every installed project. `run-governor.sh`
#   invokes `hook.js` by PATH; the runtime-closure walker follows only static
#   requires; so the script shipped and the file it invokes did not. Fail-open by
#   design, so nothing errored — sessions just ended normally and nobody would
#   ever have learned why.
#
#   1420 tests were green. The orphan guard was green. The call-path guard was
#   green. Every one of them runs against the WORKING TREE. None ran against the
#   thing users actually download.
#
#   That is the gap this closes. It is the fourth variant of "green here, dead
#   where it ships" in one epic (BUG-002, BUG-030, BUG-031, BUG-033), and the
#   only check that would have caught all four is this one: install what you
#   published and use it.
#
# Usage:
#   scripts/verify-published.sh [version]     # default: the version in package.json
#   scripts/verify-published.sh --local       # pack this tree instead (pre-publish)
#
# Exit 0 = the published artifact works. Non-zero = do not announce the release.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PKG_NAME="$(node -p "require('$REPO_ROOT/package.json').name")"
if [ "${1:-}" = "--local" ]; then
  VERSION="$(node -p "require('$REPO_ROOT/package.json').version") (local pack)"
else
  VERSION="${1:-$(node -p "require('$REPO_ROOT/package.json').version")}"
fi
WORK="$(mktemp -d)"
FAILED=0

cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

pass() { printf '  ✓ %s\n' "$1"; }
fail() { printf '  ✗ %s\n' "$1"; FAILED=1; }

echo "▸ Verifying $PKG_NAME@$VERSION as an installed project"

# ── Obtain the artifact ──────────────────────────────────────────────────────
cd "$WORK" || exit 1
if [ "${1:-}" = "--local" ]; then
  echo "  (packing the working tree)"
  TARBALL="$(cd "$REPO_ROOT" && npm pack --silent 2>/dev/null | tail -1)"
  TARBALL="$REPO_ROOT/$TARBALL"
else
  npm pack "$PKG_NAME@$VERSION" --silent >/dev/null 2>&1 \
    || { echo "  ✗ could not fetch $PKG_NAME@$VERSION from the registry"; exit 1; }
  TARBALL="$WORK/$(ls ./*.tgz | head -1)"
fi

MO_BIN="node_modules/$PKG_NAME/bin/momentum.js"

# ── Both INTERCEPTOR adapters, not just the one that happens to be convenient ──
#
# v0.43.1 verified claude-code only. Antigravity — the OTHER interceptor — was
# dead: it exports no *_PROJECT_DIR and invokes hooks with cwd = `.agents/`, so
# the script resolved the project from PWD, found no run.json, and exited 0.
# Silently, exactly like BUG-033. A smoke that covers one adapter proves one
# adapter.
for AGENT in claude-code antigravity; do
  echo
  echo "  ── $AGENT ──"
  rm -rf "$WORK/t-$AGENT" && mkdir -p "$WORK/t-$AGENT" && cd "$WORK/t-$AGENT" || exit 1
  git init -q .
  git config user.email smoke@local
  npm i --silent --no-save "$TARBALL" >/dev/null 2>&1 || { fail "$AGENT: npm install"; continue; }

  MO="node $MO_BIN"
  $MO init . --agent "$AGENT" >/dev/null 2>&1 || { fail "$AGENT: momentum init"; continue; }

  for rel in scripts/run-governor.sh \
             .momentum/runtime/run/lib/hook.js \
             .momentum/runtime/run/lib/governor.js \
             .momentum/runtime/run/lib/manifest.js \
             .momentum/runtime/run/lib/grant.js; do
    [ -f "$rel" ] && pass "$AGENT: $rel" || fail "$AGENT: $rel MISSING"
  done

  # THE CHECK THAT MATTERS. Presence is not function — BUG-033 passed every file
  # check and still shipped inert. And it is run the way THIS agent invokes it:
  # from the hook's real cwd, with no env override, because that is precisely
  # what was broken on Antigravity.
  $MO run start phase smoke --unit G0 --turns 5 >/dev/null 2>&1
  case "$AGENT" in
    antigravity) HOOK_CWD=".agents" ;;
    *)           HOOK_CWD="." ;;
  esac
  mkdir -p "$HOOK_CWD"
  ( cd "$HOOK_CWD" && env -u MOMENTUM_PROJECT_DIR -u CLAUDE_PROJECT_DIR \
      bash "$WORK/t-$AGENT/scripts/run-governor.sh" </dev/null >/dev/null 2>"$WORK/gov-$AGENT.err" )
  if [ $? -eq 2 ] && grep -q "continue without asking" "$WORK/gov-$AGENT.err"; then
    pass "$AGENT: governor FIRES from its real hook cwd (exit 2)"
  else
    fail "$AGENT: governor did NOT fire — BUG-033 shape"
  fi

  # A repo with no run must be untouched.
  $MO run stop >/dev/null 2>&1; rm -f .momentum/run.json
  ( cd "$HOOK_CWD" && env -u MOMENTUM_PROJECT_DIR -u CLAUDE_PROJECT_DIR \
      bash "$WORK/t-$AGENT/scripts/run-governor.sh" </dev/null >/dev/null 2>&1 )
  [ $? -eq 0 ] && pass "$AGENT: no run ⇒ exit 0 (invariance)" || fail "$AGENT: no-run case"
done

echo
[ "$FAILED" -eq 0 ] \
  && echo "▸ PASS — $PKG_NAME@$VERSION works as an installed project on both interceptor adapters." \
  || echo "▸ FAIL — do NOT announce this release."
exit "$FAILED"
