---
type: Phase
status: complete
tags: [phase-7a, brainstorm-gate, autonomous-execution, contract, sentinel, pre-tool-use-hook, claude-code, start-phase, brainstorm-phase, brainstorm-idea, start-project, write-discipline, gitignore, appledouble, test-glob, filemode]
---

# Phase 7a — Planning Contracts

> **Target release**: v0.8.0
> **Phase shortname**: `phase-7a-planning-contracts`
> **Pillars**: Brainstorm write-gate · Autonomous-execution contract

## Goal

Make momentum's planning commands behave the way developers expect:

1. **Brainstorm first, write later.** Conversational drafting only; never hit the disk before explicit human approval.
2. **Once started, run end-to-end.** Once the plan is agreed, execute every group without per-step approvals. Only stop at the merge + release gate.

Phase 7a establishes the **contracts**. Phase 7b builds the autonomous execution engine that implements them. Phase 7c adds parallel worktree orchestration.

## Why now

Two friction points surfaced in dogfooding Phase 6:

1. **Premature writes during brainstorm.** Today's `/brainstorm-phase` says "draft phase files directly" at Step 6 and "write on approval" at Step 8 — but in practice the drafting hits the disk during Step 6, making the approval gate a no-op. Same drift in `/brainstorm-idea` and `/start-project`. The model needs explicit, mechanical separation between "draft in conversation" and "commit to disk."

2. **Over-cautious mid-execution interruptions.** Today's `/start-phase` only scaffolds dirs + branch. The implicit dogfooding expectation is that the agent pauses for approval between every group. The user explicitly wants the opposite: once a plan is agreed, execute end-to-end. The contract needs to declare this so the future engine (7b) has a fixed target.

## Key decisions

| Decision | Rationale |
|----------|-----------|
| Split Phase 7 → 7a / 7b / 7c | Original Phase 7 wishlist + the three new themes = ~7 items, 2-3× any prior phase. Split ships value sooner and keeps each release reviewable. |
| Write-gate enforcement = markdown discipline + Claude Code PreToolUse hook | Markdown alone drifts (Phase 6 dogfood proved this). Hook alone divorces intent from enforcement. Two layers. |
| Sentinel = `.momentum/brainstorm-active` | Touch on command entry, `rm` on approval or session end. Hook blocks `Write`/`Edit`/`MultiEdit` to `specs/**` while it exists. |
| Hook lives in `adapters/claude-code/scripts/` | Per Adapter Contract v2 (Phase 6). PreToolUse is a Claude Code feature; other adapters can ship equivalents in their own overlays later. Not 7a's job. |
| Autonomy contract = one hard stop + judgment elsewhere | Per explicit user guidance: hard stop only on merge + release. Discretionary stop when continuing would cause real harm or a wrong result hard to undo. Everything else (commits, pushes to feature branch, tests, tracking updates, ADR-from-discovery, branch creation) proceeds silently. |
| Autonomy contract ships as **spec only** in 7a | Engine code is 7b. Decoupling the contract from the implementation lets users see the intended behavior committed before engine work begins. |
| Defer to Phase 8: systematic-debugging skill, SessionStart auto-activation, persuasion-hardening Rules 1/3/4/5/7/9 | Not in user's three themes. Reach (Cursor + Gemini adapters) shifts to Phase 9. |

## In scope

1. Harden `core/commands/brainstorm-phase.md`, `brainstorm-idea.md`, `start-project.md` — explicit "draft in conversation only" instructions, mechanical "all writes happen below this line" gate at the approval step, red-flag table mirroring CLAUDE.md style
2. Sentinel file lifecycle (`.momentum/brainstorm-active`) — defined in the command spec and implemented by the hook
3. PreToolUse hook (`adapters/claude-code/scripts/brainstorm-gate.sh`) blocking `Write`/`Edit`/`MultiEdit` on `specs/**` during active brainstorm with a clear error message
4. Hook registration in `adapters/claude-code/settings.json`
5. Rewrite `core/commands/start-phase.md` to embed the autonomous-execution contract (spec only — no engine)
6. Tests: gate blocks during active brainstorm, gate allows after sentinel removal, contract sections present in `/start-phase`
7. Roadmap update: split Phase 7 row into 7a / 7b / 7c with deliverables per row
8. `.gitignore` hygiene: ignore `._*` (AppleDouble metadata) and `.momentum/` (sentinel dir) at repo root and in `core/specs-templates/`

## Out of scope (explicit)

- **Phase 7b**: autonomous execution engine (subagent runner), TDD opt-in Rule 13, retry budget enforcement
- **Phase 7c**: parallel worktree orchestration (multi-stream concurrent development, worktree-manager command)
- **Cursor / Gemini adapters** — Phase 9 (Reach, shifted from Phase 8)
- **systematic-debugging skill, SessionStart auto-activation, Rules 1/3/4/5/7/9 hardening** — Phase 8 candidates after 7c lands
- Backward-compat flag to disable the hook — not needed; users who don't want it can edit `settings.json`
- Hooks for non-Claude-Code adapters — each adapter ships its own enforcement in its own overlay later

## Deliverables (each with verification)

### 1. Hardened command files
- `core/commands/brainstorm-phase.md` — explicit gate
- `core/commands/brainstorm-idea.md` — explicit gate
- `core/commands/start-project.md` — explicit gate
- `core/commands/start-phase.md` — autonomy contract

**Verify**:
```bash
grep -l "Brainstorm Gate" core/commands/brainstorm-phase.md core/commands/brainstorm-idea.md core/commands/start-project.md
grep -l "Autonomous Execution Contract" core/commands/start-phase.md
```

### 2. Sentinel + hook
- `adapters/claude-code/scripts/brainstorm-gate.sh` — PreToolUse hook
- `adapters/claude-code/settings.json` — hook registered

**Verify**:
```bash
test -x adapters/claude-code/scripts/brainstorm-gate.sh
grep -q "brainstorm-gate" adapters/claude-code/settings.json
```

### 3. Test coverage
- `tests/brainstorm-gate.test.js` — at least 3 scenarios: (a) sentinel present + Write blocked, (b) sentinel removed + Write allowed, (c) sentinel cleaned up after a simulated session abort
- `tests/start-phase-contract.test.js` — assert the autonomous-contract section exists in `core/commands/start-phase.md`
- `tests/command-gates.test.js` — assert each brainstorm command has the gate marker

**Verify**: `npm test` passes (existing 24 + new).

### 4. Roadmap + hygiene
- `specs/planning/roadmap.md` — Phase 7 row split into 7a / 7b / 7c
- `.gitignore` (new) — ignore `._*` and `.momentum/`
- `core/specs-templates/.gitignore` (new) — same for projects scaffolded by `momentum init`

**Verify**:
```bash
grep -E "7a|7b|7c" specs/planning/roadmap.md | head
grep -q '_\\*' .gitignore && grep -q '.momentum/' .gitignore
```

## Acceptance criteria

- All five command files have new gate/contract sections (grep-verifiable as above).
- Hook blocks `Write`/`Edit`/`MultiEdit` to `specs/**` during active brainstorm; allows after sentinel removal.
- All existing 24 tests still pass + 3 new test files pass.
- Roadmap reflects the 7a / 7b / 7c split with deliverables per row.
- Repo root + template have `.gitignore` covering `._*` and `.momentum/`.
- **Dogfood**: invoking `/brainstorm-phase` on a scratch project and attempting a Write before approval is blocked with a clear stderr message.

## Reference (downstream phases)

- **Phase 7b — Autonomous Execution & TDD** (target v0.9.0)
  - Subagent execution engine (Claude Code overlay) that reads the autonomy contract authored here
  - TDD opt-in Rule 13
  - Retry budget per task (3-strikes systematic-debugging primitive)

- **Phase 7c — Parallel Worktree Orchestration** (target v0.10.0)
  - Multiple concurrent streams (feature + fix + enhancement, or N parallel modules) via git worktrees
  - `momentum worktree-manager` command (name TBD)
  - Branch-per-stream conventions and conflict avoidance
  - Status visibility across active streams
