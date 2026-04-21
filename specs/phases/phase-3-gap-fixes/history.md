# Phase 3 — Gap Fixes: Implementation History

> Append-only log. Do NOT edit existing entries.

## Entry Types
| Type | When to use |
|------|------------|
| [DECISION] | ADR created, technology choice made |
| [SCOPE_CHANGE] | Phase deliverables added or removed |
| [DISCOVERY] | Bug, tech debt, or enhancement found |
| [FEATURE] | New planned feature |
| [ARCH_CHANGE] | Architectural pattern changed |
| [NOTE] | Anything else worth recording |

## Entries

### [DECISION] 2026-04-21 — Option A for adapter.js pattern
Topics: cli, adapters, dip
Affects-phases: phase-4-enhanced-commands
Affects-specs: specs/phases/phase-3-gap-fixes/plan.md
Detail: `--coding-agent` flag uses Option A — each adapter ships an `adapter.js` with `runInstall(targetDir, adapterDir, helpers)`. Consistent with `adapter.sh` DIP boundary from Phase 1. Establishes the pattern for future adapters (Cursor, Gemini, etc.) even though only `claude-code` ships in this phase.

---

### [DECISION] 2026-04-21 — .npmignore to exclude adapter.sh (TD-001)
Topics: npm, packaging
Affects-phases: none
Affects-specs: none
Detail: Added `.npmignore` to exclude `adapters/**/adapter.sh` from the npm package. Simpler than restructuring the adapter directory or listing specific files in package.json. `adapter.sh` remains for `install.sh` users; only the Node.js CLI path is affected.

---

### [NOTE] 2026-04-21 — Flag name and distribution deferred to roadmap
Topics: cli, naming, distribution
Affects-phases: phase-4-enhanced-commands
Affects-specs: specs/planning/roadmap.md, specs/backlog/backlog.md
Detail: During brainstorm, user raised open questions: (1) Is `--coding-agent` the right flag name? Alternatives: `--agent`, `--for`, `--tool`, others TBD. Must decide before TD-002 ships so the flag lands with the right name. (2) Should distribution be npm/npx, native agent-ecosystem plugins (Claude Code extension, Cursor rule-pack), or both? Both questions added to backlog as ENH-008 and ENH-009.

---

### [NOTE] 2026-04-21 — Phase 3 started
Topics: phase-start, gap-fixes
Affects-phases: none
Affects-specs: specs/status.md, specs/phases/README.md, specs/phases/index.json
Detail: Phase 3 officially started. Branch `phase-3-gap-fixes` created. No P0 bugs; two P1 items (ENH-003, ENH-004) are in scope. Execution order: Group 0 (specs-templates tree) → Groups 1+2 in parallel (CLI + command content) → Group 3 (verification + v0.4.0 bump).

---

### [DISCOVERY] 2026-04-21 — .npmignore does not filter files within package.json files-listed dirs
Topics: npm, packaging, td-001
Affects-phases: none
Affects-specs: none
Detail: Root-level `.npmignore` patterns don't apply to subdirectories explicitly listed in the `files` field of `package.json`. Fixed TD-001 by switching `files` from `["adapters/"]` (broad glob) to `["adapters/**/adapter.js", "adapters/**/settings.json"]` (explicit allowlist), which is more reliable than trying to exclude from a broad include.

---
