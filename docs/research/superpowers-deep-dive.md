# Superpowers — Deep Dive Analysis

> Research conducted 2026-04-25. Reference for momentum v2 planning.
> GitHub: github.com/obra/superpowers | Stars: ~166K | v5.0.7

---

## Architecture

### File Structure

```
superpowers/
  .claude-plugin/plugin.json     # Plugin manifest (v5.0.7)
  .codex-plugin/                 # Codex adapter
  .cursor-plugin/                # Cursor adapter
  .opencode/                     # OpenCode adapter
  hooks/
    hooks.json                   # SessionStart hook definition
    hooks-cursor.json            # Cursor-specific hooks
    session-start                # Bash script — injects using-superpowers skill
  skills/
    <skill-name>/
      SKILL.md                   # YAML frontmatter + markdown body
      <supporting-files>/        # Optional references, prompts, examples
  commands/
    brainstorm.md                # Deprecated (redirects to skill)
    write-plan.md                # Deprecated (redirects to skill)
    execute-plan.md              # Deprecated (redirects to skill)
  agents/
    code-reviewer.md             # Named agent definition
  tests/                         # Integration tests
  docs/                          # Documentation
```

### Activation Mechanism

1. **SessionStart hook** fires on `startup`, `clear`, `compact` (NOT `--resume`)
2. Hook reads `using-superpowers` skill
3. Injects it wrapped in `<EXTREMELY_IMPORTANT>` tags
4. Meta-skill makes agent check for relevant skills before EVERY action
5. Skills auto-trigger — users never invoke them manually

### Skill Format

```markdown
---
name: skill-name
description: "Use when [trigger condition]..."
---

# Skill content with sections, checklists, flowcharts, code examples,
# rationalization tables, red flags
```

- YAML frontmatter: `name` + `description` (description starts with "Use when..." for discovery)
- Skills loaded via platform's Skill tool (not file reading)
- Only `using-superpowers` loaded at session start; all others on demand

---

## All 14 Skills — Detailed

### 1. using-superpowers (Meta-Skill)

Loaded at session start. Establishes that the agent MUST check for and invoke relevant skills before ANY action. Contains:
- Red Flags rationalization table
- Skill priority rules
- Platform adaptation instructions (tool name mappings for Codex, Cursor, Gemini, Copilot)

### 2. brainstorming

Socratic design refinement:
- One question at a time, multiple choice preferred
- Proposes 2-3 approaches with tradeoffs
- Presents design in sections for validation
- Writes spec to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
- Runs self-review, gets user sign-off
- Includes visual companion (browser-based mockup server)

### 3. writing-plans

Converts approved specs into bite-sized implementation plans:
- Each task is 2-5 minutes
- Every step has exact file paths, complete code, verification commands
- "Assume the engineer has zero context and questionable taste"
- Plans saved to `docs/superpowers/plans/`
- Includes self-review checklist

### 4. executing-plans

Inline plan execution (same session, no subagents):
- Load plan, review critically
- Execute tasks sequentially with TodoWrite tracking
- Batch execution with checkpoints
- Fallback when subagents unavailable

### 5. subagent-driven-development (Flagship)

Dispatches fresh subagent per task:
- Controller reads plan ONCE, extracts all tasks with full text
- Never makes subagent read plan files — pastes full task text
- Two-stage review after each task:
  1. Spec compliance review (explicitly told "Do Not Trust the Report")
  2. Code quality review
- Review loops until both pass
- Four implementer statuses: DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED
- Model selection guidance: cheap models for mechanical tasks, capable for architecture
- Never dispatches multiple implementation subagents in parallel (conflict risk)

**Subagent Prompt Templates** (separate markdown files):
- `implementer-prompt.md` — Full task dispatch with escalation paths
- `spec-reviewer-prompt.md` — Spec compliance (explicitly distrusts implementer)
- `code-quality-reviewer-prompt.md` — Code quality dispatch

### 6. test-driven-development (Rigid)

**The Iron Law:** `NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST`

Enforcement:
- Write code before test? "Delete it. Start over. No exceptions."
- Cannot keep deleted code as "reference" or "adapt" it
- Must WATCH each test fail (RED) before writing implementation (GREEN)
- Must verify failure is for the RIGHT reason
- Minimal code to pass — no over-engineering
- Refactor only after green

**Anti-rationalization:** 12+ common excuses countered:
- "Too simple to test"
- "I'll test after"
- "TDD will slow me down"
- etc.

Red Flags list triggers "STOP and Start Over."
The "spirit vs letter" argument is preemptively closed.

**Testing Anti-Patterns Reference:** Covers mocking behavior instead of real behavior, adding test-only methods to production classes, mocking without understanding dependencies.

### 7. systematic-debugging

4-phase root cause process:
1. Root Cause Investigation
2. Pattern Analysis
3. Hypothesis and Testing
4. Implementation

"NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST."

3-strikes rule: if 3+ fixes fail, question the architecture.

Supporting files: root-cause-tracing, defense-in-depth, condition-based-waiting.

### 8. requesting-code-review

Template for dispatching code-reviewer subagents:
- Includes git SHAs, plan references, structured output
- Issues categorized as Critical/Important/Minor

### 9. receiving-code-review

How to RESPOND to review feedback:
- Forbids performative agreement ("You're absolutely right!", "Great point!")
- Requires technical verification before implementing suggestions
- Handles unclear feedback: ask about ALL unclear items before implementing any

### 10. verification-before-completion

"NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE."
- Must run actual verification commands and read output
- Catches "should work now" and "I'm confident" rationalizations

### 11. using-git-worktrees

Creates isolated workspaces for parallel development:
- Smart directory selection (checks `.worktrees/`, `worktrees/`, CLAUDE.md preferences, asks user)
- Safety verification ensures worktree dirs are gitignored

### 12. finishing-a-development-branch

Completion workflow:
- Verify tests pass
- Present 4 options: merge locally, create PR, keep branch, discard
- Execute chosen path
- Clean up worktree

### 13. dispatching-parallel-agents

For 2+ independent tasks:
- One agent per problem domain
- Concurrent execution
- Review and integration after all return

### 14. writing-skills (Meta-Skill)

Creating new skills using TDD for documentation:
1. Write pressure scenarios (RED) — how will the agent try to circumvent?
2. Write the skill (GREEN) — address each pressure scenario
3. Close loopholes (REFACTOR) — bulletproof against rationalization

Includes anti-patterns and complete creation checklist.

---

## Workflow Pipeline

```
Brainstorm → Design Spec → Write Plan → Set Up Worktree → Execute (subagents) → Review → Finish Branch
```

1. **Brainstorming** — Socratic dialogue, explore alternatives, write spec doc
2. **Plan Writing** — Spec → bite-sized tasks (2-5 min each) with exact code
3. **Worktree Setup** — Isolated git worktree on new branch
4. **Execution** — Subagent per task OR inline execution
5. **Code Review** — Between tasks and at completion
6. **Branch Finishing** — Verify tests, merge/PR/keep/discard

---

## Persuasion Engineering

The creator deliberately applied Cialdini's persuasion principles to skill design:
- **Authority** — skills speak with confidence and finality
- **Commitment** — once started, the process is hard to abandon
- **Scarcity** — red flags create urgency ("STOP and Start Over")
- **Social proof** — implied best practices

Rationalization tables preemptively counter every known shortcut the agent might take. This is why TDD and debugging skills actually stick — they are psychologically designed to resist the agent's natural tendency to take shortcuts.

---

## Cost Profile

Real integration test data (5-task plan):
- Total: ~$4.67
- Individual subagents: $0.07-$0.09 each
- Heavy: 3 subagents per task (implementer + 2 reviewers) + review loops

---

## Context Management Strategy

- **Subagent isolation** — fresh context per task (primary mechanism)
- **Controller extracts tasks upfront** — reads plan once, avoids re-reading
- **Full task text provided** — subagents never read files to find their task
- **SessionStart hook only on new sessions** — no re-injection on resume
- **v5.0.6:** Replaced subagent review loops with inline self-review for specs/plans (saves ~25 min)

No explicit context window monitoring or compaction strategy.

---

## What It Does NOT Have

1. **No persistent memory** — no cross-session learning capture
2. **No project tracking** — no backlog, phases, status, decisions, changelogs
3. **No release management** — basic branch finishing only (no tags, no GitHub Releases)
4. **No architecture governance** — no read-only specs, no ADR process
5. **No context-window monitoring** — relies on subagent isolation
6. **No validation** — no project health checks
7. **No migration** — install-and-go only
8. **No customization path** — all-or-nothing skill activation
9. **No incremental adoption** — meta-skill forces all skills to trigger
