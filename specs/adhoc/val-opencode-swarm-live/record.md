---
type: AdHoc
id: val-opencode-swarm-live
---

# Live Swarm Validation — Opencode Adapter

**Date**: 2026-07-06
**Phase**: 22c Group 4 (deferred at start, completed on operator request)

## Validation Steps

### 1. Ecosystem Setup

```bash
ROOT="/tmp/swarm-live-validate"
mkdir -p "$ROOT/m1" "$ROOT/m2"
cd "$ROOT"
momentum ecosystem init eco --agent opencode
```

Result: ✓ Ecosystem "eco" initialized at `/tmp/swarm-live-validate/eco` with opencode command surface (9 commands + 2 session scripts + AGENTS.md).

### 2. Add Members

```bash
momentum init "$ROOT/m1" --agent opencode
momentum init "$ROOT/m2" --agent opencode
momentum ecosystem add "$ROOT/m1" --name member1 --ecosystem "$ROOT/eco"
momentum ecosystem add "$ROOT/m2" --name member2 --ecosystem "$ROOT/eco"
```

Result: ✓ Both members added (ids: `m1`, `m2`). Pointer injected into each member's AGENTS.md.

### 3. Scout

```bash
momentum scout "$ROOT/m1" "list files ."
```

Result: ✓ Scout ran successfully — read 12 relevant files from `/tmp/swarm-live-validate/m1`, returned 5 relevant sections, wrote run artifact to `.momentum/runs/scout-001.md`. Took 5ms.

### 4. Dispatch

```bash
cd "$ROOT/eco"
momentum dispatch m1 m2 --prompt "list files"
```

Result: ✓ Dispatch resolved both member IDs from the ecosystem root, fanned out to both repos.

### 5. Ecosystem Status

```bash
momentum ecosystem status --ecosystem "$ROOT/eco"
```

Result: ✓ Displayed 2 members (m1 `[other]`, m2 `[other]`) with correct relative paths.

## Evidence

- **Ecosystem init**: created correct opencode command surface (scout, dispatch, handoff, continue, swarm, ecosystem, initiative, session)
- **Scout**: read-only context fetch returned meaningful file selections
- **Dispatch**: multi-repo fan-out resolved both members
- **Status**: accurate member listing

## Conclusion

The opencode adapter's swarm/orchestration surface is fully operational when invoked through the momentum CLI. All ecosystem commands (init, add, status, scout, dispatch) work correctly with the opencode adapter. Group 4 validated successfully.
