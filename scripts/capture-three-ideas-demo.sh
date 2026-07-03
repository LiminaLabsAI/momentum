#!/usr/bin/env bash
# One-shot evidence capture for the FEAT-028 three-ideas demo.
# Runs the e2e test with the evidence sink enabled and writes the
# sanitized transcript into the phase evidence dir. Dev-only (root
# scripts/ is not in package.json `files`). npm test never sets the env
# var, so the committed evidence is not rewritten by test runs (TD-006).
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-specs/phases/phase-21c-lanes-fly/evidence/three-ideas-demo.txt}"
MOMENTUM_DEMO_EVIDENCE="$(pwd)/$OUT" node --test tests/waves-e2e-demo.test.js
echo "evidence written to $OUT"
