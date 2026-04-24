# Momentum v2 — Improvement Ideas from Competitive Research

> Compiled 2026-04-25. Ideas sourced from all researched alternatives.
> Use this as the starting input for Phase 5+ planning.

---

## Tier 1: Intelligence & Self-Awareness (High Impact)

### 1.1 Self-Learning Hooks
**Inspired by:** claude-reflect, claude-self-reflect, claude-mem

Auto-capture what worked/failed during phases. Build a `learnings.md` per project that agents read on every session start. The agent gets smarter over time.

- Hook-based observation during development (no manual effort)
- Session-to-session memory persistence
- Compress and re-inject context from prior sessions
- Retrospective-driven: extract patterns from phase retrospectives automatically

### 1.2 Self-Healing / Self-Curing
**Inspired by:** Original idea

When a phase hits repeated failures, auto-analyze patterns, suggest fixes, update rules:
- If a test keeps failing the same way, recognize the pattern and adjust approach
- If a debugging approach fails 3 times, escalate to architecture review (borrowing Superpowers' 3-strikes rule)
- Auto-update phase plan when blocked tasks are identified

### 1.3 Context-Window-Aware Task Sizing
**Inspired by:** GSD

Auto-split large phase tasks into context-window-sized chunks:
- Estimate token budget per task group
- Start fresh context per chunk to prevent context rot
- Plans limited to fit ~50% of context window
- Auto-detect when context is getting stale and recommend fresh start

### 1.4 Retrospective-Driven Rule Evolution
**Inspired by:** Original idea

After each phase retrospective, auto-extract new rules and update agent behavior:
- The process literally improves itself
- New anti-patterns discovered → new rules added
- Successful patterns → reinforced in future phases

---

## Tier 2: Execution Power (High Impact)

### 2.1 Subagent Execution Engine
**Inspired by:** Superpowers (`subagent-driven-development`)

Phase plan groups dispatched to subagents with review loops:
- Fresh subagent per task group (isolated context)
- 2-stage adversarial review (spec compliance + code quality)
- Controller extracts tasks upfront, provides full text to subagents
- Four statuses: DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED
- Model selection: cheap for mechanical, capable for architecture
- Review loops until both reviewers pass

### 2.2 TDD Enforcement
**Inspired by:** Superpowers (`test-driven-development`)

Add as autonomous Rule 11 with anti-rationalization:
- Iron Law: NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
- RED-GREEN-REFACTOR cycle enforced
- 12+ rationalization counters
- Red Flags list triggers "STOP and Start Over"
- Testing anti-patterns reference

### 2.3 Verification Rigor
**Inspired by:** Superpowers (`verification-before-completion`)

Strengthen `/complete-phase`:
- Run actual tests, linting, type checks — not just check boxes
- "NO COMPLETION CLAIMS WITHOUT FRESH EVIDENCE"
- Catch "should work now" and "I'm confident" rationalizations
- Require verification command output before marking tasks done

### 2.4 Debugging Methodology
**Inspired by:** Superpowers (`systematic-debugging`)

Add as skill/command that auto-activates on repeated failures:
- 4-phase root cause process: Investigation → Pattern Analysis → Hypothesis → Implementation
- 3-strikes rule: if 3+ fixes fail, question the architecture
- NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST

### 2.5 Code Review System
**Inspired by:** Superpowers (`requesting-code-review` + `receiving-code-review`), gstack (role-based)

Add `/review-code` command at phase boundaries:
- Structured review with severity levels (Critical/Important/Minor)
- Adversarial spec reviewer (explicitly distrusts implementer)
- Role-based perspectives: security (OWASP/STRIDE), QA, architecture
- No performative agreement — technical verification before implementing suggestions

---

## Tier 3: Platform & Integration (Medium Impact)

### 3.1 MCP Server
**Inspired by:** TaskMaster AI

Expose momentum's tracking as MCP tools:
- Query/update backlog, phases, status, history programmatically
- Any MCP-compatible agent can interact with project state
- Selective tool loading for context window efficiency
- PRD parsing to generate task breakdowns

### 3.2 Auto-Spec Generation (`/specify`)
**Inspired by:** Kiro, GitHub Spec Kit

Generate structured specs from high-level prompts:
- "Build a user auth system" → requirements doc + system design + task list
- EARS notation for requirements writing
- Auto-generates three artifacts: Requirements, System Design, Task List

### 3.3 Multi-Agent Adapters
**Inspired by:** GSD, Spec Kit, Superpowers

Extend existing adapter architecture beyond Claude Code:
- Cursor (`.cursor/rules/`)
- Gemini CLI (`GEMINI.md`)
- VS Code Copilot (`.github/copilot-instructions.md`)
- Codex CLI
- OpenCode
- Platform-specific tool mappings (following Superpowers' pattern)

### 3.4 Auto-Activation via SessionStart Hook
**Inspired by:** Superpowers

Add session-start hook that loads rules + triggers orientation:
- On session start: auto-read `specs/status.md`
- Inject active phase context + relevant rules
- Skills auto-trigger without manual invocation
- No re-injection on `--resume`

---

## Tier 4: Smartness & Process (Lower Priority)

### 4.1 Bidirectional Spec Sync
**Inspired by:** Augment Code Intent

Specs auto-update to reflect what was actually built:
- After implementation, scan code and update specs to match reality
- Catch drift between planned and actual implementation
- Two-way: specs drive code AND code drives specs

### 4.2 Dependency-Aware Task Ordering
**Inspired by:** Kiro, TaskMaster

Auto-detect task dependencies and enforce correct execution order:
- Parse task descriptions for dependency signals
- Block tasks whose dependencies aren't met
- Visualize dependency graph

### 4.3 Scale-Adaptive Process
**Inspired by:** BMAD-METHOD

Lighter process for solo devs, fuller ceremony for teams:
- Auto-detect team size from git contributors
- Solo: skip formal reviews, lightweight retrospectives
- Team: full review gates, detailed retrospectives, approval workflows
- Enterprise: compliance checkpoints, audit trails

### 4.4 Skill/Command Authoring
**Inspired by:** Superpowers (`writing-skills`)

Let users create project-specific commands:
- TDD applied to documentation: write pressure scenarios, write skill, close loopholes
- Custom commands stored in `.claude/commands/` (already supported)
- Template + guide for creating effective commands

### 4.5 YAML Workflow Definitions
**Inspired by:** BMAD-METHOD

Formalize phase transitions and dependencies as declarative YAML:
- Define approval gates, handoff points, review requirements
- Machine-readable phase lifecycle
- Enables automation and tooling

### 4.6 Persuasion-Hardened Rules
**Inspired by:** Superpowers

Harden existing autonomous rules with anti-rationalization counters:
- For each rule, list common ways agents circumvent it
- Add Red Flags tables
- Preemptively close "spirit vs letter" arguments
- Apply Cialdini's principles to rule design

---

## The Winning Formula

```
Momentum v2 = 
    Momentum's lifecycle management (phases, backlog, decisions, releases)
  + Superpowers' execution engine (subagents, TDD, review, debugging)
  + GSD's context awareness (task sizing, fresh context per chunk)
  + Self-learning/self-healing (gets smarter each phase)
  + MCP integration (programmatic access to project state)
  + Multi-agent support (works with any coding agent)
```

### What Makes This Unique (No Competitor Has All Of These)

1. **Full lifecycle** — backlog → plan → implement → track → release
2. **Self-learning** — gets smarter each phase
3. **Self-healing** — detects failure patterns, auto-adjusts
4. **Context-aware** — sizes work to fit the agent's limits
5. **Multi-agent** — works with any coding agent
6. **MCP-native** — programmatic access to project state
7. **Execution excellence** — TDD, subagent review, debugging methodology

---

## Suggested Phase Sequencing

| Phase | Focus | Key Deliverables |
|-------|-------|-----------------|
| Phase 5 | Execution Engine | Subagent execution, TDD rule, verification rigor, debugging methodology |
| Phase 6 | Intelligence | Self-learning hooks, self-healing, context-aware task sizing |
| Phase 7 | Integration | MCP server, auto-spec generation, multi-agent adapters |
| Phase 8 | Polish | Scale-adaptive process, persuasion-hardened rules, skill authoring |

> This sequencing is a suggestion. Use `/brainstorm-phase` to validate and refine before committing.
