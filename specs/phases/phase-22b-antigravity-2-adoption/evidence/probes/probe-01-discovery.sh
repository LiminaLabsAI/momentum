#!/bin/bash
# Probe 01 — discovery: AGENTS.md auto-load (sentinel), skills listing,
# workflows/slash-command listing, plus the CLI's own config-scan log.
# Usage: probe-01-discovery.sh <fixture-dir> <out-dir>
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"
FIX="$1"; OUT="$2"; mkdir -p "$OUT"
grep -q MOMENTUM-SENTINEL "$FIX/AGENTS.md" || \
  printf '\n<!-- probe marker -->\nSentinel token: MOMENTUM-SENTINEL-73194\n' >> "$FIX/AGENTS.md"
cd "$FIX"
agy --version > "$OUT/agy-version.txt"
agy --log-file "$OUT/probe-01.log" --print-timeout 180s -p 'Answer the three numbered questions precisely, as plain text, nothing else:
1. Quote any sentinel token present in your loaded project instructions.
2. List the exact names of all skills currently available to you (one per line).
3. List the exact names of all workflows or custom slash commands currently available to you (one per line).' \
  | tee "$OUT/probe-01.stdout.txt"
