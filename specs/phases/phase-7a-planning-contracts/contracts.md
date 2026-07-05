---
type: Note
---

# Phase 7a — Canonical Contracts

> **Status**: Frozen at Group 0. Downstream groups embed these verbatim.
> **Source of truth**: this file. Command files MUST contain the section text exactly. Tests verify alignment.

This document holds the three canonical contract texts authored in Group 0:

1. **Brainstorm Gate Contract** — embedded in `core/commands/brainstorm-phase.md`, `brainstorm-idea.md`, `start-project.md` (Group 1)
2. **Autonomous Execution Contract** — embedded in `core/commands/start-phase.md` (Group 3)
3. **PreToolUse Hook Contract** — implemented by `adapters/claude-code/scripts/brainstorm-gate.sh` (Group 2)

If you need to amend a contract during phase implementation, edit THIS file first, then propagate to the embedding sites and re-run tests.

---

## 1. Brainstorm Gate Contract

### Section text (embedded verbatim in brainstorm-phase.md, brainstorm-idea.md, start-project.md)

````markdown
## Brainstorm Gate Contract

This command runs in two phases: **brainstorm** (conversational, no disk writes) and **commit** (writes files to disk on explicit approval).

### Sentinel-driven enforcement

A file `.momentum/brainstorm-active` exists for the lifetime of the brainstorm phase. While it exists, the Claude Code `brainstorm-gate.sh` PreToolUse hook blocks any `Write`/`Edit`/`MultiEdit` call whose target lives under `specs/`. The hook is the safety net; the discipline below is the primary contract.

### Sequence

1. **Enter brainstorm** — `mkdir -p .momentum && touch .momentum/brainstorm-active`
2. **Draft in conversation only** — all overview/plan/tasks/history content lives in the chat. NEVER call `Write`/`Edit`/`MultiEdit` on `specs/` paths during this phase. The hook will block such calls; the contract makes the intent visible.
3. **Present for approval** — show the user the full draft. Ask: "Does this look right? Any changes before I write the phase files?"
4. **Exit brainstorm on approval** — `rm .momentum/brainstorm-active`, then write all files in one batch and commit.

### Red flags — STOP and stay in conversation

| If you find yourself thinking… | …STOP and stay in conversation |
|---|---|
| "I'll just write a quick draft to disk so I can see it" | The conversation IS the draft. The hook will block this. |
| "The user will approve, no point waiting" | Approval changes the conversation. Don't pre-commit to text the user might still revise. |
| "I'll create the directory now to save a step later" | Don't. Wait for approval. |
| "The brainstorm session was interrupted; I'll just remove the sentinel" | Only remove it when you have explicit approval AND are about to write. Premature removal recreates the failure mode. |

### Anti-rationalization counters

- "Drafting to disk is faster than drafting in chat" — false: revisions in chat are free; revisions on disk require re-edits.
- "Only writing scratch files, not the real specs" — the hook can't tell scratch from real; keep both in conversation.
- "It's fine, the user said proceed" — proceed only AFTER the explicit approval step, not before.
````

### Adaptations per command

- **brainstorm-phase.md**: full version above. Step numbering: Step 6 marks "draft in conversation only"; insert new Step 6.5 for sentinel creation; existing Step 7 (present for approval) unchanged; Step 8 updated for sentinel removal + writes.
- **brainstorm-idea.md**: "idea exploration" lacks phase-files-write, but the discipline still applies — no scratch files, no `idea-notes.md`, until the user picks a direction. Same sentinel mechanism. Final "write the project files" step is what crosses the gate.
- **start-project.md**: "scaffold from idea" — no scaffolding (no directory creation, no file generation) until the user has approved the project name + structure. Sentinel created on command entry, removed on approval.

---

## 2. Autonomous Execution Contract

### Section text (embedded verbatim in start-phase.md)

````markdown
## Autonomous Execution Contract

Once a phase plan is approved, this command executes the plan end-to-end without per-group approvals. The contract below defines what proceeds silently and where the engine MUST stop.

### Hard stop — always

**Merge to staging/main + release.** After the final group's verification passes, STOP. Ask the user:

> "All groups complete and verified. Ready to merge `<phase-branch>` → staging (then main), tag `v<version>`, and run `npm publish --access public`. Approve to proceed?"

This is the only place the engine asks. Do NOT skip it.

### Discretionary stop — rare, judgment-based

Interrupt only when continuing would cause real harm or a wrong result that's hard to undo. Examples:

- Destructive git operation not in the plan (force-push to main, `git reset --hard origin/...`, branch deletion of unmerged work)
- A discovery that invalidates the agreed plan (not just adds to it — `[DISCOVERY]` + backlog entry handles additions silently)
- A required external action the engine can't perform (paid API spend, credential setup, account configuration)
- Repeated unresolved failure on the same task (Phase 7b will codify a 3-strikes retry budget; before 7b, use judgment)

A discretionary stop is rare. The default is to proceed.

### Pre-authorized actions — proceed silently

The engine does all of these without asking:

- Create the phase feature branch
- Commit per the conventional commit style and the per-group commit message in `plan.md`
- Push the phase branch to origin
- Run tests, lint, typecheck, build commands
- Update `specs/status.md`, `specs/phases/index.json`, `specs/phases/README.md`, the active phase's `tasks.md` and `history.md`
- Append to `specs/changelog/YYYY-MM.md`
- Create ADRs from discoveries (per Rule 8 / Rule 10)
- Add backlog entries from discoveries (per Rule 3)
- Read any file in the repo

### Anti-patterns — DO NOT

| Anti-pattern | Correct behavior |
|---|---|
| Asking "should I commit Group N now?" after each group | Commit per the plan's per-group commit message. Do not ask. |
| Asking "should I push?" after the first commit | Push immediately after the first commit; thereafter on milestones. Do not ask. |
| Asking "ready for Group 1?" after Group 0 | Proceed to Group 1 immediately when Group 0 verification passes. |
| Pausing to summarize progress between groups | Update `tasks.md` and move on. Summaries are for the user when they ask. |
| Asking "ready for tests?" before Group N's verification step | Verification is part of Group N. Run it. |

### Cross-references

- **Rule 6 (Git Lifecycle)**: pre-authorizes branch creation, commits, pushes to feature branch. The autonomy contract is the execution-time application of Rule 6.
- **Rule 8 (History)**: every group ends with a history append. Do this silently.
- **Rule 12 (Verify Before Claim)**: every group's last task is verification. Run the command, read the output, mark `[x]` only if passing.
````

---

## 3. PreToolUse Hook Contract

### Implemented by `adapters/claude-code/scripts/brainstorm-gate.sh`

**Trigger**: Claude Code `PreToolUse` hook event.

**Tools matched**: `Write`, `Edit`, `MultiEdit`. All other tools pass through.

**Input** (JSON on stdin, Claude Code hook input schema):
```json
{
  "session_id": "...",
  "transcript_path": "...",
  "cwd": "...",
  "hook_event_name": "PreToolUse",
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/abs/path/to/file",
    "content": "..."
  }
}
```

**Environment**: `$CLAUDE_PROJECT_DIR` is set to the project root.

**Logic**:
1. Read stdin JSON.
2. Extract `tool_name`. If not in `{Write, Edit, MultiEdit}` → exit 0.
3. Check sentinel: `${CLAUDE_PROJECT_DIR}/.momentum/brainstorm-active`. If missing → exit 0.
4. Extract `tool_input.file_path`. Resolve relative to `$CLAUDE_PROJECT_DIR` if relative.
5. If the resolved path is under `${CLAUDE_PROJECT_DIR}/specs/` → block.
6. Otherwise → exit 0.

**Blocking output** (when blocking, write to stderr then exit 2):

```
[brainstorm-gate] Blocked: cannot write to specs/ during active brainstorm.
[brainstorm-gate] Path: <file_path>
[brainstorm-gate] To proceed: get explicit user approval, then run:
[brainstorm-gate]   rm .momentum/brainstorm-active
[brainstorm-gate] Then retry the write.
```

**Exit codes**:
- `0` — allow the tool call
- `2` — block the tool call (Claude Code convention: non-zero exit blocks; stderr is shown to the model)

**Dependencies**: bash, `jq` if available; falls back to a `sed`/`grep` JSON parser if `jq` is missing (to avoid adding a required external dependency).

**Failure modes**:
- Malformed JSON on stdin → exit 0 (fail-open; don't block on parse errors, log to stderr)
- `$CLAUDE_PROJECT_DIR` unset → exit 0 (can't enforce without project root)
- Sentinel exists but `specs/` doesn't → exit 0 (no harm; path mismatch)

The fail-open posture for parse / env errors is intentional: a broken hook should not block legitimate work. The markdown discipline is the primary contract; the hook is a safety net for the dominant failure mode (model attempting Write/Edit on specs/ during brainstorm).
