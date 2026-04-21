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

### [NOTE] 2026-04-21 — Naming and distribution deferred to roadmap
Topics: product, naming, distribution
Affects-phases: phase-4-enhanced-commands
Affects-specs: specs/planning/roadmap.md, specs/backlog/backlog.md
Detail: During brainstorm, user raised open questions: (1) Is "momentum" the right name? Alternatives considered: "salvit", "poly", others TBD. (2) Should distribution be npm/npx, native coding-agent plugins (Claude Code extension, Cursor rule-pack), or both? Both questions deferred — added to backlog as ENH-008 and ENH-009 for roadmap planning before Phase 4+.

---
