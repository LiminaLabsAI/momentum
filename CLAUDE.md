# Project Rules: momentum

> Claude Code configuration for developing the momentum toolkit itself.
> Agent rules live in `.agent/rules/project.md`.

## Navigation (Where to Find Things)

| Question | File |
|----------|------|
| Current state / what phase? | `specs/status.md` |
| What's in the backlog? | `specs/backlog/backlog.md` |
| Phase tasks/progress? | `specs/phases/phase-N-*/tasks.md` |
| Why was X chosen? | `specs/decisions/NNNN-*.md` |
| Roadmap / timeline? | `specs/planning/roadmap.md` |
| How to contribute? | `docs/developer-guide.md` |

> **First file to read: ALWAYS `specs/status.md`.**

---

## Autonomous Behaviors (Always-On Rules)

### Rule 1: Always Orient First

Before ANY work, read `specs/status.md`. This tells you:
- What phase is active
- What's blocking progress
- What P0 items need attention

### Rule 2: Auto-Update Tracking After Changes

After completing ANY meaningful work, automatically update:

1. **Active phase `tasks.md`** — mark completed `[x]`, in-progress `[/]`
2. **`specs/status.md`** — if phase progress, blockers, or P0 items changed
3. **`specs/changelog/YYYY-MM.md`** — log what changed (one line per change)

Use the built-in **TodoWrite** tool to track in-session task progress. Do NOT wait for the user to ask you to update tracking.

### Rule 3: Auto-Track Discoveries

When you discover a bug, tech debt, or enhancement during work:
- Add it to `specs/backlog/backlog.md` immediately with appropriate priority
- Mention it to the user: "I found [issue] and added it as [ID] to backlog"

### Rule 4: Pre-Phase Bug Check

Before starting work on a new phase:
- Scan `specs/backlog/backlog.md` for P0/P1 bugs
- If any exist, recommend addressing them first
- Present: "N open bugs (X critical), recommend fixing before proceeding"

### Rule 5: Phase Boundary Awareness

When completing the last task in a phase:
- Prompt the user: "All tasks in Phase N are complete. Run `/complete-phase` to verify and release?"
- Do NOT auto-complete a phase without user confirmation

### Rule 6: Git Lifecycle (Automatic)

#### Starting Work
- **Before ANY code change**, check current branch
- If on `main` or `staging`, **auto-create a feature branch**:
  - Phase work: `phase-N-shortname`
  - Bug fix: `fix/BUG-NNN-short-desc`
  - Feature: `feat/short-desc`
  - Tech debt: `refactor/TD-NNN-short-desc`

#### During Work
- **Auto-commit** after each logical unit with conventional commits:
  - `feat(scope):` | `fix(scope):` | `docs:` | `refactor(scope):` | `chore:`
- Keep commits atomic — one logical change per commit
- Push to remote after significant milestones

#### Completing Work
- Commit all remaining changes, push branch
- **ASK the user** before merging to `staging` or `main`

| Action | Auto? | Requires Approval? |
|--------|-------|--------------------|
| Create feature branch | Yes | No |
| Commit to feature branch | Yes | No |
| Push feature branch | Yes | No |
| Merge to `staging` | No | **Yes** |
| Merge to `main` | No | **Yes** |
| Tag a release | No | **Yes** |
| `npm publish` | No | **Yes** |

### Rule 7: Plan Before Implementing

For any non-trivial implementation (new command, new template, architectural change):
- Use `/brainstorm-phase` to design the approach first
- Present the plan for user approval before making changes

### Rule 8: Record Phase History

During any active phase, append meaningful changes to `specs/phases/<active-phase>/history.md`.

**Entry types:** `[DECISION]` | `[SCOPE_CHANGE]` | `[DISCOVERY]` | `[FEATURE]` | `[ARCH_CHANGE]` | `[NOTE]`

**Format (APPEND ONLY):**
```
### [TYPE] YYYY-MM-DD — Short title
Topics: topic-1, topic-2
Affects-phases: phase-N-name (or "none")
Affects-specs: path/to/file.md#section (or "none")
Detail: One to three sentences describing what changed and why.

---
```

### Rule 9: npm Publish on Every Release

momentum is an npm package. After every `/complete-phase` release, run:
```bash
npm publish --access public
```
This is project-specific — it is NOT part of the global `/complete-phase` command.

### Rule 10: Doc Sync Protocol — Never Mid-Phase, Always at Completion

- **During a phase**: Record to history. Do NOT update other specs.
- **At phase completion**: Run `/sync-docs` BEFORE `/complete-phase`.

---

## Naming Conventions

### Backlog IDs
| Type | Prefix | Example |
|------|--------|---------|
| Bug | `BUG-` | `BUG-001` |
| Feature | `FEAT-` | `FEAT-001` |
| Tech Debt | `TD-` | `TD-001` |
| Enhancement | `ENH-` | `ENH-001` |

### Priorities
| Level | Meaning |
|-------|---------|
| `P0` | Critical — blocks current phase |
| `P1` | High — current/next phase |
| `P2` | Medium — within 2 phases |
| `P3` | Low — nice to have |

### Git Branches
| Type | Pattern |
|------|---------|
| Phase | `phase-N-shortname` |
| Feature | `feat/description` |
| Bug fix | `fix/description` |
| Refactor | `refactor/description` |

### Git Commits (Conventional)
`feat:` | `fix:` | `docs:` | `refactor:` | `chore:`

---

## Constraints

1. **Template files must be generic** — no project-specific names, paths, or references
2. **No secrets in code** — all credentials via env vars
3. **Never commit to main** — always use feature/phase branches
4. **Plan before implementing** — use `/brainstorm-phase` for non-trivial work
