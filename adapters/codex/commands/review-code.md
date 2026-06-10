Run a multi-perspective code review of the pending changes on the current branch.

> **This command is Codex-specific.** It dispatches three role-based subagents
> defined as TOML files under `.codex/agents/` (installed by momentum), fanning
> out in parallel when the runtime supports it. Equivalent functionality for
> Claude Code uses the Task tool; for Antigravity, the `.agents/agents/`
> overlay. Do not generalize this into `core/commands/` — generalization loses
> the parallel-subagent value.

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
- `AGENTS.md` (Codex primary instructions — rules and constraints)
- `.agent/rules/project.md` (condensed rules)
- `specs/status.md` (current phase context)

This ensures every reviewer scores the diff against THIS project's rules,
not generic best practices alone.

### Step 3 — Dispatch the three subagents

The reviewers are pre-defined TOML subagents shipped by momentum at:
- `.codex/agents/momentum-reviewer-security.toml`
- `.codex/agents/momentum-reviewer-qa.toml`
- `.codex/agents/momentum-reviewer-architecture.toml`

Each takes the same inputs (diff + rules excerpt) and returns findings
in the same Critical/Important/Minor format.

Dispatch all three subagents in ONE turn so Codex can fan them out in
parallel. If the runtime is configured with `agents.max_threads >= 3`
(default 6), all three run concurrently and you collect results when
the slowest returns. If parallel fan-out is unavailable, they run
sequentially.

Use this pattern (natural language to Codex):

> Run these three subagents in parallel against the diff from Step 1:
> 1. `momentum-reviewer-security`
> 2. `momentum-reviewer-qa`
> 3. `momentum-reviewer-architecture`
>
> Each gets the full diff plus the relevant project rules excerpt as
> input. Collect all three reports before continuing.

If the runtime degrades to sequential (you'll see a banner from
`momentum dispatch` when run via that path), the consolidation step
below still works — only wall-clock time differs.

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

### Step 5 — Present to user, ask what to act on

Show the consolidated report. Then ask:
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

## Constraints

- The TOML subagents are **read-only**: their `developer_instructions`
  explicitly forbid file modification and code-modifying commands.
- Dispatch all three subagents in a **single turn** so Codex can run them
  in parallel. Do not sequence them across turns.
- The review NEVER auto-fixes findings. The user always decides what to act
  on (Step 5).
- Findings tied to specific lines should include `file:line` so the user can
  navigate quickly.
- If a reviewer's output is malformed (missing severity headers), re-dispatch
  that single reviewer with a stricter format reminder. Do not silently
  reformat — that hides reviewer mistakes.
