# Phase 0 — Bootstrap: Implementation History

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

### [DECISION] 2026-04-21 — Template-based install for Phase 0
Topics: install, distribution, npm
Affects-phases: phase-1-plugin
Affects-specs: specs/planning/roadmap.md#phase-1
Detail: Chose file-copy install (install.sh) over npm package for Phase 0. Simpler, no build tooling, works immediately. npm packaging deferred to Phase 1.

---

### [DECISION] 2026-04-21 — Repo eats its own cooking
Topics: project-structure, momentum-project
Affects-phases: none
Affects-specs: specs/vision/principles.md
Detail: Momentum uses its own spec-driven workflow (specs/, CLAUDE.md, commands) for its own development. This validates the toolkit and surfaces problems immediately.

---

### [ARCH_CHANGE] 2026-04-21 — DIP architecture: core/ + adapters/ for tool-agnosticism
Topics: dip, tool-agnostic, adapters, core, architecture
Affects-phases: phase-1-tool-agnostic
Affects-specs: specs/planning/roadmap.md#phase-1
Detail: Decided to restructure momentum using the Dependency Inversion Principle — workflow logic lives in core/ (tool-agnostic), tool-specific wiring lives in adapters/ (claude-code, cursor, gemini-cli, opencode, vscode-copilot). Phase 1 is now this restructure, not npx CLI. npx CLI moves to Phase 2 and gains tool auto-detection as a result.

---

### [SCOPE_CHANGE] 2026-04-21 — Phase 1 is Tool-Agnostic Architecture (was npx CLI)
Topics: roadmap, phase-1, distribution
Affects-phases: phase-1-tool-agnostic, phase-2-npx-cli
Affects-specs: specs/planning/roadmap.md, specs/status.md
Detail: Roadmap updated to 4 phases. Phase 1 = DIP restructure + adapters. Phase 2 = npx CLI (now benefits from tool auto-detection built in Phase 1). Phase 3 = enhanced commands.

---
