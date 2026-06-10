Run a multi-perspective code review of the pending changes on the current branch.

> **This command is Antigravity-specific.** It dispatches three role-based
> subagents defined under `.agents/agents/` (installed by momentum), using
> Antigravity's native parent → child subagent delegation. Equivalent
> functionality for Claude Code uses the Task tool; for Codex, `.codex/agents/`
> TOMLs. Do not generalize into `core/commands/` — generalization loses the
> parallel-subagent value.

## When to use

- Before `/sync-docs` and `/complete-phase` at the end of a phase
- After a non-trivial commit on a feature branch, before opening a PR
- Whenever you want a fresh, independent read on what was just built

This command does NOT modify code. It produces a consolidated review and asks
you which findings to act on.

## Steps

### Step 1 — Determine review scope

Default scope: the diff between the current branch and `main`. Run:
```bash
git diff main...HEAD --stat
git diff main...HEAD
```

If the user passed an argument, honor it:
- `staged` → `git diff --cached`
- `working` → `git diff` (unstaged changes)
- `<commit-sha>` → `git diff <commit-sha>...HEAD`
- `<file-path>` → restrict review to that path within the default scope

If no diff exists, report "no changes to review" and stop.

### Step 2 — Read the rules of the project

Before dispatching reviewers, read:
- `AGENTS.md` (primary instructions — rules and constraints)
- `.agent/rules/project.md` (condensed rules)
- `specs/status.md` (current phase context)

This ensures every reviewer scores the diff against THIS project's rules,
not generic best practices alone.

### Step 3 — Dispatch the three subagents in parallel

The reviewers are pre-defined subagents shipped by momentum at:
- `.agents/agents/momentum-reviewer-security.toml`
- `.agents/agents/momentum-reviewer-qa.toml`
- `.agents/agents/momentum-reviewer-architecture.toml`

Use Antigravity's native subagent delegation to spawn all three concurrently.
Each takes the same inputs (diff + rules excerpt) and returns findings in
the same Critical/Important/Minor format. Collect results when the slowest
returns.

### Step 4 — Consolidate

Once all three subagents return:

1. Merge findings into a single report ordered:
   ```
   ## Code Review

   ### Critical (N)
   - [security] finding (file:line)
   - [arch] finding (file:line)

   ### Important (N)
   - [qa] finding (file:line)
   - [security] finding (file:line)

   ### Minor (N)
   - [arch] finding (file:line)
   ```
2. Tag each finding with its reviewer (`[security]`, `[qa]`, `[arch]`).
3. De-duplicate findings that multiple reviewers raised — combine into one
   line and tag with all reviewers (`[security][arch]`).
4. If a finding is at Critical and conflicts with a Minor finding from a
   different reviewer, surface BOTH and note the disagreement.

### Step 5 — Surface findings as a planning artifact

Antigravity's planning workflow uses native artifacts (`task.md`,
`implementation_plan.md`, `walkthrough.md`). Update the active `task.md`
artifact with each Critical and Important finding as a task entry, then
present the consolidated report to the user with the question:

> "Which findings should I act on now? Options:
>   1. All Critical
>   2. All Critical + Important
>   3. Specific items (list IDs)
>   4. None — log all findings to backlog only
>   5. Cancel"

For findings the user wants to act on now: implement them as separate commits
on the current branch (each commit ≤ one finding).

For findings the user wants to defer: add each as a backlog item via the
`/track` flow with appropriate priority (Critical → P0/P1, Important → P1/P2,
Minor → P2/P3).

### Step 6 — Honor Rule 12 on any fixes

If you implement any fix in Step 5, run the relevant verification (test,
lint, typecheck) BEFORE marking it done — per Rule 12 (Verify Before Claim).
Append the verification evidence to the active `walkthrough.md` artifact.

## Constraints

- The TOML subagents are **read-only**: their `developer_instructions`
  explicitly forbid file modification and code-modifying commands.
- Dispatch all three subagents using Antigravity's parallel-subagent
  delegation — do not sequence them.
- The review NEVER auto-fixes findings. The user always decides what to act
  on (Step 5).
- Findings tied to specific lines should include `file:line` so the user can
  navigate quickly.
- If a reviewer's output is malformed (missing severity headers), re-dispatch
  that single reviewer with a stricter format reminder. Do not silently
  reformat — that hides reviewer mistakes.
