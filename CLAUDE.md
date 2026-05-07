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

#### Why
Tracking debt compounds invisibly. A task list one day stale is recoverable; one week stale is fiction. Status drift is how phases silently lose direction.

#### Red Flags — STOP and update tracking now

| If you find yourself thinking… | …STOP and update before doing anything else |
|---|---|
| "I'll batch the tracking updates at the end" | The end never comes — context fades and details get lost |
| "This change is too small to log" | Small changes accumulate into invisible drift |
| "The diff makes it obvious what changed" | The diff shows *what*; the changelog explains *why* |
| "The user can read git log" | Git log doesn't index by phase or backlog ID |
| "I'll log this as part of the next bigger update" | Bigger updates conflate decisions and lose per-step reasoning |

#### Anti-Rationalization Counters

- "It's faster to do the work first and track at the end" — wrong: reconstruction takes 2-3× longer than real-time logging.
- "TodoWrite is enough" — TodoWrite is in-session only; `tasks.md` is the durable record.
- "Mid-task tracking interrupts flow" — a one-line update costs <30s; reconstructing a day later costs 30 minutes.

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
  - `feat(scope):` | `fix(scope):` | `docs:` | `refactor(scope):` | `chore:` | `infra:`
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
| Delete merged feature branch | Yes (after confirmed merge) | No |
| Merge to `staging` | No | **Yes** |
| Merge to `main` | No | **Yes** |
| Tag a release | No | **Yes** |

#### Why
Direct commits to `main` bypass review, history, and rollback. A single rushed commit on `main` is harder to revert than ten commits on a branch. The branch convention is the cheapest possible insurance against catastrophic mistakes.

#### Red Flags — STOP and check the branch

| If you find yourself thinking… | …STOP and switch to a branch |
|---|---|
| "Just one tiny commit to main" | One becomes ten — branch first, decide later |
| "I'll create the branch after these edits" | The edits are the work; the branch is non-optional |
| "The hook is in the way, --no-verify just this once" | Hooks exist because the underlying check failed before. Fix the cause. |
| "Force push is fine, nobody else is on this branch" | Future you is on this branch. `--force-with-lease` at minimum. |

#### Anti-Rationalization Counters

- "It's a one-line typo fix on main" — branches are free; revert is cheap; main is sacred.
- "The branch protection isn't set up yet" — that's a reason to be more careful, not less.
- "I'll squash-merge later, so the intermediate commits don't matter" — they matter for `git bisect` and for narrating *why*.

### Rule 7: Plan Before Implementing

For any non-trivial implementation (new feature, architectural change):
- Use `/brainstorm-phase` to design the approach first
- Present the plan for user approval before making changes

### Rule 8: Record Phase History

During any active phase, append meaningful changes to `specs/phases/<active-phase>/history.md`.

#### What counts as "meaningful"

Append a history entry when ANY of these occur:

| Trigger | Entry type |
|---|---|
| ADR was created or its status/decision changed | `[DECISION]` |
| Phase scope was added to or reduced | `[SCOPE_CHANGE]` |
| Bug, tech debt, or enhancement was added to backlog | `[DISCOVERY]` |
| New feature was added to the phase plan | `[FEATURE]` |
| Architectural pattern or integration approach changed | `[ARCH_CHANGE]` |
| Locked evaluator was defined or its evaluation set changed | `[EVALUATOR]` |
| Anything else worth a future reader's time | `[NOTE]` |

After writing a history entry, check `specs/decisions/impact-map.json` and add any new topics so `/sync-docs` can find affected files.

The hook script `scripts/check-history-reminder.sh` runs after edits as a safety net — heed its prompts.

#### Format (APPEND ONLY)

```
### [TYPE] YYYY-MM-DD — Short title
Topics: topic-1, topic-2
Affects-phases: phase-N-name (or "none")
Affects-specs: path/to/file.md#section (or "none")
Detail: One to three sentences describing what changed and why.

---
```

#### Why
The history log is the only place that preserves *why* a decision was made at the moment it was made. Specs document the current state; commits document mechanical changes; only history captures motivation. Without it, six months later nobody can reconstruct whether a constraint is load-bearing or accidental.

#### Red Flags — STOP and log

| If you find yourself thinking… | …STOP and append the entry now |
|---|---|
| "I'll write the history at the end of the phase" | You won't remember the *why*. Log when the decision is fresh. |
| "This decision isn't important enough to log" | If it's not worth logging, it's not worth deciding — log it or revert it. |
| "I already mentioned it in the commit message" | Commit messages get buried; history.md is the canonical source. |
| "The change is obvious from the diff" | Diffs show *what*; history shows *why*. |

#### Anti-Rationalization Counters

- "We didn't decide anything — just discovered an issue" — that's `[DISCOVERY]`, log it.
- "It's a minor scope tweak, not a real `[SCOPE_CHANGE]`" — every scope change is real, log it.
- "I'll consolidate entries later" — consolidation loses per-decision context.

### Rule 9: Doc Sync Protocol — Never Mid-Phase, Always at Completion

- **During a phase**: Record to history. Do NOT update other specs.
- **At phase completion**: Run `/sync-docs` BEFORE `/complete-phase`.

### Rule 10: Architecture Specs Stability (monorepo only)

Files under `specs/architecture/` are constitutional documents. Treat them as a stable reference *during* phase work. The key distinction is **additive bookkeeping** vs **architectural decisions**.

**During phase implementation (both types — no spec changes):**
- READ specs as stable reference
- NEVER modify them based on implementation discoveries
- Log all gaps and changes as `[ARCH_CHANGE]` in phase history with `Affects-specs:`

**At phase completion (via `/sync-docs`):**
- **Additive changes** (new fields, new ports, new modes — extending an existing design): update specs directly. No ADR required.
- **Decisional changes** (approach changes, trade-off choices, design direction shifts): require an ADR amendment **before** any spec update.

#### Why
The original "all spec changes via ADR" rule worked when the architecture was stabilizing and every change was a decision. By mid-to-late phases, the architecture is proven — most changes are additive extensions, not decisions. Requiring ADRs for bookkeeping creates spec staleness while adding no value. ADRs capture *why* a path was chosen; they're not required when you're just recording *what was added*.

#### Red Flags — STOP and route correctly

| If you find yourself thinking… | …STOP |
|---|---|
| "I just need to update one field, not a real change" | Additive — fine at completion; not now. Log `[ARCH_CHANGE]`. |
| "It's faster to fix the spec than to log the gap" | Faster locally, catastrophic globally — specs out of sync with rationale. |
| "The implementation diverged because the spec was wrong" | That's a decision — ADR first, spec update second. Don't silently rewrite. |
| "I'll log it as `[NOTE]` instead of `[ARCH_CHANGE]`" | If it touches `specs/architecture/`, it's `[ARCH_CHANGE]`. |

#### Anti-Rationalization Counters

- "Specs are wrong, code is right, so update specs" — only after an ADR documents *why* the design shifted.
- "Mid-phase spec edits are fine if I'm careful" — the rule isn't about care; it's about preventing reference instability while you're depending on the reference.
- "This is just renaming, not redesigning" — renames are decisions when others read the spec.

### Rule 11: Evaluator Discipline — Lock Evaluators Before Loops

Before building any learning, optimization, or self-improvement loop:

1. Define the **evaluation set** — a fixed corpus with known-good outputs
2. Define the **scalar** — a single number that improves or doesn't
3. Commit the evaluator to `tests/benchmarks/` with a version tag
4. Build the loop **AFTER** the evaluator is committed
5. **NEVER** change the evaluator while the loop is being optimized

#### Why
Optimization loops with mutable evaluators don't measure progress — they measure motion. Every "small fix" to the eval set silently rewrites the score history and makes A-vs-B comparisons meaningless. Locking the evaluator first costs an hour; not locking it costs the entire experiment.

#### Red Flags — STOP and freeze

| If you find yourself thinking… | …STOP |
|---|---|
| "Just one tweak to the eval so this run looks better" | That's exactly the failure mode. Freeze first; tweak in a v2 evaluator. |
| "We'll lock the evaluator after we know what works" | You can't know what works without a locked evaluator. |
| "The current eval doesn't measure what we actually care about" | Correct — but freeze it before optimizing, then version-bump to a new locked eval. |
| "It's just an internal experiment, locking is overkill" | Internal experiments produce internal beliefs that drive external decisions. Lock. |

#### Anti-Rationalization Counters

- "The eval set is too small, I'll just add a few more cases" — version-bump the evaluator (`v1` → `v2`); don't mutate `v1`.
- "I noticed a bug in the scorer mid-run" — fix it in `v2`; rerun the prior runs against `v2`; don't backfill `v1` scores.
- "Production data drifted, I should refresh the eval" — that's a `v2` decision, not a `v1` patch.

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
| Level | Meaning | SLA |
|-------|---------|-----|
| `P0` | Critical — blocks current phase | < 1 day |
| `P1` | High — current/next phase | < 1 week |
| `P2` | Medium — within 2 phases | < 1 phase |
| `P3` | Low — nice to have | best-effort |

### Git Branches
| Type | Pattern |
|------|---------|
| Phase | `phase-N-shortname` |
| Feature | `feat/description` |
| Bug fix | `fix/description` |
| Refactor | `refactor/description` |
| Infrastructure | `infra/description` |
| Delete after merge | `git push origin --delete <branch>` once merged |

### Git Commits (Conventional)
`feat:` | `fix:` | `docs:` | `refactor:` | `chore:` | `infra:`

Use `infra:` for CI, build, deploy, tooling, and release-pipeline changes that don't ship code.

---

## Constraints

1. **No secrets in code** — all credentials via env vars
2. **Never commit to main** — always use feature/phase branches
3. **Plan before implementing** — use `/brainstorm-phase` for non-trivial work

---

## Project Extensions

> Everything below this heading is preserved across `momentum upgrade`.
> Add project-specific navigation, rules, cross-repo references, etc. here.
> Anything above this heading is managed by momentum and may be replaced on upgrade.

### Project-Specific: npm Publish on Every Release

momentum is itself an npm package. After every `/complete-phase` release, run:
```bash
npm publish --access public
```
This is project-specific — it is NOT part of the global `/complete-phase` command.

Approval required: `npm publish` is a "shared system" action — never run it without an explicit user OK.

### Project-Specific Constraint

**Template files must be generic** — anything in `core/specs-templates/`, `core/agent-rules/`, `core/commands/`, or `core/scripts/` must contain no project-specific names, paths, or references. Project-specific content for momentum itself goes here, under `## Project Extensions`, not into the templates.
