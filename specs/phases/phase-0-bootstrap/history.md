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
