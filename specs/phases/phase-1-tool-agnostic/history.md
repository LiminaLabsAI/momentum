---
type: Phase History
---

# Phase 1 — Tool-Agnostic Architecture: Implementation History

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

### [DECISION] 2026-04-21 — Claude Code only for Phase 1
Topics: adapters, scope, coding-agent
Affects-phases: phase-2-npx-cli
Affects-specs: specs/backlog/backlog.md, specs/planning/roadmap.md
Detail: Brainstorm session decided to ship only the Claude Code adapter in Phase 1. Other coding agents (Cursor, Gemini CLI, OpenCode, VS Code Copilot) added to backlog as P2. Keeps phase focused and shippable as v0.2.0.

---

### [DECISION] 2026-04-21 — Full restructure: template/ removed, replaced by core/ + adapters/
Topics: dip, architecture, core, adapters
Affects-phases: none
Affects-specs: specs/phases/phase-1-tool-agnostic/overview.md
Detail: Chose Option A (full restructure) over Option B (keep template/ alongside adapters/). template/ will be deleted; all content migrates to core/ (tool-agnostic) and adapters/claude-code/ (Claude Code-specific). Cleaner long-term architecture.

---

### [DECISION] 2026-04-21 — adapter.sh pattern (sourced bash) over JSON manifest
Topics: adapters, install, bash
Affects-phases: phase-2-npx-cli
Affects-specs: specs/phases/phase-1-tool-agnostic/plan.md
Detail: Each adapter defines adapter.sh with a run_install() function, sourced by install.sh. Chosen over a JSON manifest + parser to avoid requiring jq or writing bash JSON parsing. Phase 2 (npx CLI in Node.js) can read a JSON manifest natively if desired.

---

### [DECISION] 2026-04-21 — --coding-agent flag on install.sh, default claude-code
Topics: install, cli, coding-agent
Affects-phases: phase-2-npx-cli
Affects-specs: specs/phases/phase-1-tool-agnostic/overview.md
Detail: install.sh gains --coding-agent <name> flag. Defaults to claude-code. Phase 2 npx CLI will inherit the concept with auto-detection. The flag name "coding-agent" was chosen over "tool" or "adapter" as more descriptive of what it selects.

---

### [SCOPE_CHANGE] 2026-04-21 — BUG-001 fix included in Phase 1
Topics: bug, install, realpath
Affects-phases: none
Affects-specs: specs/backlog/backlog.md
Detail: BUG-001 (realpath called before mkdir -p) will be fixed opportunistically in Group 2 while rewriting install.sh. Low effort since we're touching the file anyway. BUG-001 marked resolved at end of phase.

---
