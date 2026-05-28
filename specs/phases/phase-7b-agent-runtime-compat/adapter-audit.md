# Phase 7b — Adapter Runtime Audit

## Capability Matrix

| Capability | Core contract | Claude Code adapter | Codex adapter |
|------------|---------------|---------------------|---------------|
| Primary instructions | Adapter declares root instruction file | `CLAUDE.md` | `AGENTS.md` |
| Commands | Generic recipes originate in `core/commands/`; destination is adapter-owned | `.claude/commands/*.md` slash commands | Codex-owned command recipes, referenced from `AGENTS.md` |
| Condensed agent rules | Generic file can be installed wherever adapter declares | `.agent/rules/project.md` | `.agent/rules/project.md` |
| Shared scripts | Generic shell scripts live in `core/scripts/` | Installed to `scripts/` and wired by `.claude/settings.json` | Installed to `scripts/` and wired by `.codex/hooks.json` where verified |
| Hook config | Adapter owns config format and event names | `.claude/settings.json` with PreToolUse/PostToolUse | `.codex/hooks.json` |
| Subagents | Not a core assumption | Claude Task tool, `/review-code` overlay | Future Codex-specific subagent surface; out of scope for 7b |
| Browser/computer use | Not a core assumption | Out of scope | Future Codex capability; adapter-only |

## File Classification

| Path | Classification | Notes |
|------|----------------|-------|
| `core/commands/*.md` | Core generic | Agent-neutral command recipes; adapters choose destination. |
| `core/agent-rules/project.md` | Core generic | Condensed rules for non-root instruction surfaces. |
| `core/scripts/check-history-reminder.sh` | Shared script | Reusable if adapter hook schema can invoke shell scripts. |
| `core/specs-templates/**` | Core generic | Project scaffold. `CLAUDE.md` is currently generic template input but Phase 7b makes root instructions adapter-declared. |
| `adapters/claude-code/adapter.js` | Claude-specific | Declares Claude destinations and hook config install/upgrade. |
| `adapters/claude-code/settings.json` | Claude-specific | Claude hook schema; not reused directly by Codex. |
| `adapters/claude-code/commands/review-code.md` | Claude-specific | Uses Claude Task subagents; must remain in Claude overlay. |
| `adapters/claude-code/scripts/brainstorm-gate.sh` | Claude-specific hook script | Reads Claude hook JSON shape; Codex gets a separate script only if needed after hook schema verification. |
| `AGENTS.md` | Codex-specific root instruction | Primary Codex instruction surface. Installed by Codex adapter. |
| `.codex/hooks.json` | Codex-specific config | Codex hook wiring. Installed by Codex adapter. |

## Adapter Contract v3

Adapters declare:

- `displayName` — user-facing name.
- `destinations` — destination paths for `commands`, `agent-rules`, and `scripts`.
- `primaryInstruction` — root instruction source/destination and marker-aware upgrade behavior.
- `configFiles` — adapter-owned config files copied or upgraded by the adapter.
- `capabilities` — booleans or strings documenting supported agent features; informational in 7b.

Rules:

1. Generic behavior belongs in `core/`.
2. Agent-specific capabilities belong in `adapters/<agent>/`.
3. Claude-specific files are not rewritten for Codex compatibility.
4. Adapter overlays remain additive-only; duplicate filenames across `core/<sub>/` and `adapters/<agent>/<sub>/` are errors.
5. Unsupported agent capability is documented, not guessed.
