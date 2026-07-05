#!/bin/bash
# Usage: capture.sh <EventName>  — tee stdin payload, respond per event contract.
EV="$1"
DIR="$(cd "$(dirname "$0")" && pwd)"
cat > "$DIR/captures/$EV-$(date +%s%N).json"
case "$EV" in
  PreToolUse) echo '{"decision": "allow"}' ;;
  Stop)       echo '{}' ;;
  *)          echo '{}' ;;
esac
exit 0
