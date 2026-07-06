---
type: Phase
status: complete
tags: [opencode, multi-adapter, installed-json, skills, ecosystem-session-log]
---

# Phase 22c — Opencode Polish & Multi-Adapter Support

## Goal

Fix the multi-adapter upgrade destruction bug (BUG-020) and complete opencode adapter parity with additive enhancements.

## Problem Statement

**BUG-020 (P1)**: `momentum upgrade --agent <X>` destroys other adapter's managed files because `installed.json` has a single `agent` lock field. Projects cannot have claude-code + opencode + codex simultaneously — upgrading one orphan-removes the others.

**Opencode Gaps (A1-A4)**: Opencode adapter is live-validated (Phase 22) but lacks:
- Project-specific skills beyond `momentum-orient`
- Ecosystem session log integration in plugin
- Run-mode sessionStartHook limitation documentation

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Restructure `installed.json` to per-agent manifests | Only way to support independent upgrade per adapter without destruction |
| Option A for file tracking (only momentum-owned files) | Safer — never removes user additions to adapter directories |
| One-time migration on load | Automatic, no user action required |
| ADR-0007 for schema change | Contract change requires documented rationale |

## Scope

### In Scope
1. **BUG-020 Fix**: Multi-adapter `installed.json` schema + per-agent upgrade logic
2. **A1**: Three new opencode skills (`momentum-track`, `momentum-lanes`, `momentum-validate`)
3. **A2**: Plugin wires ecosystem session log on bash completions (commits/PRs)
4. **A3**: Document run-mode sessionStartHook caveat in AGENTS.md
4. **A4**: Live swarm validation (manual, operator-driven when env available)

### Out of Scope
- Cursor/Gemini adapters (FEAT-007/008/010)
- Distribution strategy decision (ENH-009)
- Skill authoring CLI (Phase 26)
- MCP server (Phase 26)

## Deliverables & Verification

| Deliverable | Verification Command |
|-------------|---------------------|
| ADR-0007 written | `cat specs/decisions/0007-multi-adapter-installed-state.md` |
| New `installed.json` schema + migration | `npm test` (migration tests pass) |
| Per-agent upgrade preserves other adapters | Manual test: init claude-code → upgrade opencode → verify .claude/ preserved |
| 3 new opencode skills install | `opencode skill list` shows 4 skills |
| Plugin appends to ecosystem session log | Commit in ecosystem repo → check session log |
| AGENTS.md documents run-mode caveat | Visual check |
| Full test suite passes | `npm test` (769+ tests green) |

## Acceptance Criteria

1. **Multi-adapter coexistence**: A project can have claude-code + opencode + codex installed simultaneously; upgrading any one preserves the others
2. **No data loss**: Orphan cleanup only removes momentum-owned files for the agent being upgraded
3. **Backward compatible**: Legacy `installed.json` (single agent) auto-migrates on first `upgrade`/`init`
4. **Opencode skills**: All 4 skills discovered by opencode (`orient`, `track`, `lanes`, `validate`)
5. **Ecosystem integration**: Bash completions for `git commit`/`git push`/`gh pr create` append to ecosystem session log
6. **Docs accurate**: AGENTS.md reflects run-mode sessionStartHook limitation
7. **Tests pass**: Full suite green including new migration + multi-adapter tests