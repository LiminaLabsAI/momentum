# Project Rules

## Navigation (Where to Find Things)

| Question | File |
|----------|------|
| Current state / what phase? | `specs/status.md` |
| What's in the backlog? | `specs/backlog/backlog.md` |
| Phase tasks/progress? | `specs/phases/phase-N-*/tasks.md` |
| Why was X chosen? | `specs/decisions/NNNN-*.md` |
| Roadmap / timeline? | `specs/planning/roadmap.md` |

> **First file to read: ALWAYS `specs/status.md`.**

---

## Autonomous Behaviors (Always-On Rules)

### Rule 1: Always Orient First
Before ANY work, read `specs/status.md`.

### Rule 2: Auto-Update Tracking After Changes
After completing ANY meaningful work, automatically update:
1. Active phase `tasks.md` — mark completed `[x]`, in-progress `[/]`
2. `specs/status.md` — if phase progress, blockers, or P0 items changed
3. `specs/changelog/YYYY-MM.md` — log what changed (one line per change)

### Rule 3: Auto-Track Discoveries
When you discover a bug, tech debt, or enhancement:
- Add it to `specs/backlog/backlog.md` immediately
- Mention it to the user

### Rule 4: Pre-Phase Bug Check
Before starting a new phase, scan backlog for P0/P1 bugs.

### Rule 5: Phase Boundary Awareness
When completing the last task: prompt user to run `/complete-phase`.

### Rule 6: Git Lifecycle (Automatic)
- Before ANY code change: check branch; auto-create feature branch if on main/staging
- Auto-commit after each logical unit with conventional commits
- Never auto-merge to staging or main — always ask user

### Rule 7: Plan Before Implementing
For non-trivial work: use `/brainstorm-phase` first.

### Rule 8: Record Phase History
Append to `specs/phases/<active-phase>/history.md` after meaningful changes.
Types: [DECISION] | [SCOPE_CHANGE] | [DISCOVERY] | [FEATURE] | [ARCH_CHANGE] | [NOTE]

Format (APPEND ONLY):
```
### [TYPE] YYYY-MM-DD — Short title
Topics: topic-1, topic-2
Affects-phases: phase-N-name (or "none")
Affects-specs: path/to/file.md#section (or "none")
Detail: One to three sentences.

---
```

### Rule 9: Doc Sync Protocol
- During a phase: record to history only. Do NOT update other specs.
- At phase completion: run `/sync-docs` BEFORE `/complete-phase`.

### Rule 10 (monorepo only): Architecture Specs Are Read-Only During Phases
- Never modify `specs/architecture/` during phase work
- Log gaps as [ARCH_CHANGE] in history

---

## Naming Conventions

Backlog IDs: `BUG-NNN` | `FEAT-NNN` | `TD-NNN` | `ENH-NNN`
Priorities: P0 (critical) | P1 (high) | P2 (medium) | P3 (low)
Branches: `phase-N-name` | `feat/desc` | `fix/desc` | `refactor/desc`
Commits: `feat:` | `fix:` | `docs:` | `refactor:` | `chore:`
