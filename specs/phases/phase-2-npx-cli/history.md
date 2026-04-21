# Phase 2 — npx CLI Distribution: Implementation History

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

### [DECISION] 2026-04-21 — Zero-dependency Node.js CLI
Topics: cli, npm, dependencies
Affects-phases: none
Affects-specs: specs/phases/phase-2-npx-cli/overview.md
Detail: CLI uses only Node.js built-ins (fs, path, process). No commander, no chalk. Keeps the package lean and install fast via npx. Sufficient for a single `init` command with minimal flags.

---

### [DECISION] 2026-04-21 — Claude Code only, no auto-detection
Topics: adapters, auto-detection, scope
Affects-phases: phase-3-enhanced-commands
Affects-specs: specs/backlog/backlog.md
Detail: Phase 2 installs Claude Code adapter only. Tool auto-detection deferred until more adapters are available (Phase 3+). Consistent with Phase 1 decision to stay focused and ship.

---

### [DECISION] 2026-04-21 — install.sh kept unchanged
Topics: install, regression
Affects-phases: none
Affects-specs: none
Detail: install.sh remains fully functional. npx CLI is additive — two install paths coexist. No migration of bash logic required.

---

### [NOTE] 2026-04-21 — npm package name is a pre-work decision
Topics: npm, package-name
Affects-phases: none
Affects-specs: specs/phases/phase-2-npx-cli/overview.md
Detail: Must check `npm view momentum` before starting Group 0. If `momentum` is taken, use `@cerebrio/momentum` (scoped, always available). This affects the `npx` command users will type.

---
