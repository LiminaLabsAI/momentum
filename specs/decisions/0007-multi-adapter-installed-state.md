# ADR-0007: Multi-Adapter Installed State Schema

## Status
Accepted

## Context

Momentum supports multiple coding agents (Claude Code, Codex, Antigravity, Opencode). Projects may want multiple adapters installed simultaneously (e.g., team members use different IDEs, or a single developer switches between agents).

**Problem**: The previous `installed.json` had a single `agent` lock field:
```json
{
  "agent": "opencode",
  "version": "0.29.0",
  "files": [...]
}
```

When running `momentum upgrade --agent <X>`, the orphan cleanup diffed the previous manifest (single agent's files) against the new agent's write-set, and the single `agent` field flipped to the new agent. This **destroyed all other adapters' managed files** (moved to `.bak`), making true multi-adapter coexistence impossible.

BUG-020 (P1) documents this: layering opencode onto a claude-code install orphan-removed ALL 25 claude-code managed files.

## Decision

Restructure `installed.json` to per-agent manifests with an `agents` map:

```json
{
  "version": "0.29.0",
  "agents": {
    "claude-code": {
      "version": "0.29.0",
      "files": [".claude/commands/brainstorm-idea.md", "CLAUDE.md", ...]
    },
    "opencode": {
      "version": "0.29.0",
      "files": [".opencode/commands/brainstorm-idea.md", ".opencode/plugins/momentum.js", ...]
    }
  }
}
```

### Key Design Points

1. **Per-agent upgrade**: `upgrade --agent <X>` only modifies `agents[X]`. Orphan cleanup is scoped to that agent's tracked files only.

2. **Option A file tracking** (chosen): The `files` array tracks **only momentum-owned files** (what momentum actually wrote during init/upgrade), not all files in destination directories. This prevents orphan cleanup from removing user additions to `.claude/commands/` or `.opencode/commands/`. The manifest represents "what momentum owns for this agent," not "what's in the directory."

3. **One-time migration on load**: `loadInstalledState()` detects legacy format (has `agent` + `files` at root) and converts to new `agents` map automatically. Migration is idempotent and saves the new format immediately.

4. **Top-level `version`**: Maintained as the maximum of all agent versions for backward compatibility with any external tooling reading this field.

5. **`init()` behavior**: Adds the agent to the `agents` map without removing other agents.

## Consequences

### Positive
- ✅ Multiple adapters coexist in one project
- ✅ Independent upgrade per adapter — no destruction
- ✅ Backward compatible — legacy installs auto-migrate on first `upgrade`/`init`
- ✅ Clear ownership model — each agent's file set is explicit

### Negative
- ⚠️ `installed.json` schema change — external tools reading it need update (mitigated: top-level `version` preserved)
- ⚠️ `doctor` / status commands need update to show all installed agents
- ⚠️ Slightly more complex state management (mitigated: encapsulated in load/save functions)

## Migration Strategy

1. **Automatic on load**: First `momentum upgrade` or `momentum init` after this change detects legacy format and converts in-place.
2. **Idempotent**: Running migration twice produces identical output.
3. **No user action required**: Transparent to users.

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Keep single agent, skip orphan cleanup when `--agent` differs from lock | Doesn't solve root cause; lock still flips; inconsistent state |
| Separate `.momentum/installed-<agent>.json` files | More files, harder to query "what's installed", no atomic updates |
| Per-agent lock files in `.momentum/agents/<agent>/installed.json` | Over-engineering; single JSON with map is simpler |

## Implementation Notes

- `loadInstalledState(targetDir)` — reads, migrates if needed, returns `{ version, agents }`
- `saveInstalledState(targetDir, state)` — writes atomically (temp + rename)
- `upgrade(targetDir, { agent })` — computes newFileSet from adapter.destinations, diffs against `agents[agent].files`, scoped orphan cleanup, updates only that agent
- `init(targetDir, { agent })` — adds agent to map, computes file set, writes files

## References
- BUG-020: Multi-adapter upgrade destruction
- Phase 22c: Opencode Polish & Multi-Adapter Support
- `core/adapter-contract.md` — Adapter destinations (source of truth for file sets)