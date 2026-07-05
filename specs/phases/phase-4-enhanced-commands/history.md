---
type: Phase History
---

# Phase 4 — Enhanced Commands: Implementation History

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

### [DECISION] 2026-04-21 — momentum upgrade uses backup + overwrite conflict strategy
Topics: cli, upgrade, conflict-resolution
Affects-phases: none
Affects-specs: specs/phases/phase-4-enhanced-commands/plan.md
Detail: When upgrading, if a momentum-owned file in the project differs from the latest version, it is backed up as `filename.bak` and overwritten. New files are added silently. Identical files are skipped silently. No interactive prompts — works cleanly in terminal without user intervention.

---

### [DECISION] 2026-04-21 — upgrade file discovery via directory walk, no separate manifest
Topics: cli, upgrade
Affects-phases: none
Affects-specs: none
Detail: `momentum upgrade` walks the same source directories as `init` (core/commands, core/agent-rules, core/scripts, adapters/<agent>/). No separate manifest file is maintained — discovery stays automatically in sync with whatever `init` would install. This avoids manifest drift when new files are added to momentum.

---

### [DECISION] 2026-04-21 — /validate default mode is index-first; --deep for full scan
Topics: validate, commands, performance
Affects-phases: none
Affects-specs: specs/phases/phase-4-enhanced-commands/plan.md
Detail: Default mode reads only index files (status.md, backlog.md, index.json) and the active phase — fast and scales to large projects. The `--deep` flag enables full directory walk, backlog ID cross-references, history.md field validation, and changelog checks. Chosen to avoid expensive full scans on large projects unless explicitly requested.

---

### [DECISION] 2026-04-21 — /migrate scope limited to momentum-like manual structures
Topics: migrate, commands
Affects-phases: none
Affects-specs: none
Detail: `/migrate` is a one-time onboarding tool for projects that were manually set up with a momentum-like structure before momentum existed. It fills gaps using skip-if-exists and reconciles the phase index. It is not a general migration framework from arbitrary project structures — scope is intentionally narrow to keep the command reliable and predictable.

---

### [DISCOVERY] 2026-04-21 — No command registration in settings.json needed
Topics: cli, commands, settings
Affects-phases: none
Affects-specs: specs/phases/phase-4-enhanced-commands/tasks.md
Detail: The plan included steps to register validate/migrate in `adapters/claude-code/settings.json`. On implementation, discovered settings.json only contains hooks — commands are auto-installed by `copyDir` from `core/commands/` during both `init` and `upgrade`. No separate registration step is needed; adding the file to `core/commands/` is sufficient.

---

### [NOTE] 2026-04-21 — ENH-008 and ENH-009 explicitly deferred out of Phase 4
Topics: flag-naming, distribution
Affects-phases: phase-5 (future)
Affects-specs: specs/backlog/backlog.md, specs/planning/roadmap.md
Detail: User confirmed: flag naming (ENH-008, `--coding-agent` term) and distribution strategy (ENH-009, npx vs native plugins) are explicitly out of scope for Phase 4. Both remain open in backlog for a future phase.

---
