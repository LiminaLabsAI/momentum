# Competitive Landscape — AI Agent Frameworks

> Research conducted 2026-04-25. Reference for momentum v2 planning.

## Overview

Momentum is a **spec-driven project lifecycle manager** for AI coding agents. This document maps the competitive landscape — what exists, what each tool does well, and where momentum fits.

---

## 1. Superpowers (by Jesse Vincent / obra)

**GitHub:** github.com/obra/superpowers
**Stars:** ~166K | **License:** MIT | **Version:** v5.0.7 (2026-03-31)
**Platforms:** Claude Code, Codex CLI/App, Cursor, Gemini CLI, Copilot CLI, OpenCode

### What It Does

An agentic skills framework that makes AI coding agents execute better. 14 skills covering brainstorming, planning, TDD, subagent execution, debugging, code review, and verification.

### Key Features

- **14 structured skills** installed as slash commands / auto-triggered skills
- **Seven-phase workflow:** Brainstorm → Spec → Plan → Worktree → Execute (subagents) → Review → Finish
- **Subagent-driven development:** Fresh subagent per task, 2-stage adversarial review (spec compliance + code quality)
- **Rigid TDD enforcement:** RED-GREEN-REFACTOR with 12+ anti-rationalization counters
- **Systematic debugging:** 4-phase root cause process, 3-strikes rule
- **Code review system:** Structured review with severity levels, adversarial spec reviewer
- **Verification rigor:** "No completion claims without fresh evidence"
- **Auto-activation:** SessionStart hook injects meta-skill; skills trigger without manual invocation
- **Persuasion engineering:** Skills use Cialdini's principles, red-flag tables, rationalization counters
- **Skill authoring:** Users can create new skills using TDD-for-documentation methodology
- **Visual companion:** Browser-based mockup server during brainstorming

### Architecture

```
superpowers/
  .claude-plugin/plugin.json     # Plugin manifest
  hooks/
    hooks.json                   # SessionStart hook definition
    session-start                # Injects using-superpowers skill
  skills/
    <skill-name>/
      SKILL.md                   # YAML frontmatter + markdown
      <supporting-files>         # References, prompts, examples
  commands/                      # Deprecated slash commands
  agents/
    code-reviewer.md             # Named agent definition
```

### All 14 Skills

| Skill | Purpose |
|-------|---------|
| using-superpowers | Meta-skill: loaded at session start, routes to other skills |
| brainstorming | Socratic design refinement, writes spec to `docs/superpowers/specs/` |
| writing-plans | Converts specs into bite-sized (2-5 min) implementation plans |
| executing-plans | Inline plan execution (fallback when subagents unavailable) |
| subagent-driven-development | Flagship: fresh subagent per task, 2-stage review loop |
| test-driven-development | Rigid TDD with Iron Law and anti-rationalization |
| systematic-debugging | 4-phase root cause process with 3-strikes rule |
| requesting-code-review | Template for dispatching code-reviewer subagents |
| receiving-code-review | How to respond to review feedback (no performative agreement) |
| verification-before-completion | Requires fresh evidence before claiming completion |
| using-git-worktrees | Isolated workspaces for parallel development |
| finishing-a-development-branch | Completion: verify tests, merge/PR/keep/discard options |
| dispatching-parallel-agents | Concurrent subagent dispatch for independent tasks |
| writing-skills | Meta-skill for creating new skills (TDD applied to docs) |

### Strengths

- Execution quality is best-in-class (subagent + adversarial review)
- TDD enforcement actually works (psychologically designed)
- Multi-platform support (6+ agents)
- Zero-config activation (SessionStart hook)
- Massive community (166K stars, active Discord)

### Weaknesses

- **No persistent memory** — stateless between sessions
- **No project tracking** — no backlog, phases, status, decisions
- **No release management** — basic branch finishing only
- **No context-window management** — relies on subagent isolation
- **Rigid methodology** — all-or-nothing, even for trivial changes
- **Heavy token usage** — 3 subagents per task (~$4.67 per 5-task plan)
- **No architecture governance** — no read-only specs, no ADR process

---

## 2. GSD (Get Stuff Done)

**GitHub:** github.com/gsd-build/get-shit-done
**Stars:** ~35K | **Releases:** 47 | **Commits:** 1,693

### What It Does

Lightweight meta-prompting and spec-driven development system that prevents "context rot" by keeping tasks small.

### Key Features

- **Three-phase cycle:** Plan, Execute, Review — each in a clean context window
- **Context-rot prevention:** Tasks sized to ~50% of context window
- **Atomic git commits** per task
- **Plans limited to 2-3 tasks** each
- **12+ agent support** (Claude Code, Codex, Gemini CLI, Cursor, etc.)
- **npx install**

### Strengths

- Context-window-aware task sizing (unique innovation)
- Fresh context per phase prevents accumulated confusion
- Agent-agnostic from day one
- Simple install path

### Weaknesses

- No backlog, phases, or tracking
- No persistent project state
- Narrow scope (context management only)

---

## 3. gstack (by Garry Tan)

**GitHub:** github.com/garrytan/gstack
**Stars:** ~50K

### What It Does

Turns Claude Code into a virtual software development team with 23+ role-based slash commands.

### Key Features

- **Role-based skills:** CEO, Designer, Eng Manager, Release Manager, Doc Engineer, QA
- **Each skill = specialized perspective/persona**
- **Security officer:** Runs OWASP + STRIDE audits
- **Focus on startup-style solo development**

### Strengths

- Role-based perspectives during reviews (security, QA, architecture)
- "CEO rethinks the product" skill for strategic reassessment
- Good for quality audits at milestones

### Weaknesses

- No process structure (phases, backlog, tracking)
- No persistent state
- Role-based only — no lifecycle management

---

## 4. Kiro (by Amazon/AWS)

**URL:** kiro.dev

### What It Does

VS Code fork IDE with Claude Sonnet integrated, enforcing spec-driven development as a first-class workflow.

### Key Features

- **Auto-generates three artifacts** before code: Requirements (EARS notation), System Design, Task List
- **Agent hooks:** Event-driven automations on file save/create/delete
- **Pre/Post tool use hooks** for blocking or automating actions
- **Dependency-ordered task implementation**

### Strengths

- Spec-first enforced at IDE level (can't skip it)
- EARS notation for requirements
- Agent hooks as enforcement mechanism
- Auto-generates specs from prompts

### Weaknesses

- Locked to one IDE (not portable)
- No phase management or backlog
- Commercial product, not a toolkit

---

## 5. BMAD-METHOD

**GitHub:** github.com/bmad-code-org/BMAD-METHOD

### What It Does

Multi-agent orchestration framework mirroring a real agile development team with 12+ specialized AI agent personas.

### Key Features

- **YAML-based workflow blueprints** defining task sequences, dependencies, handoff points
- **12+ specialized agents:** Analyst, PM, Architect, Scrum Master, Developer, QA
- **Four-phase cycle:** Analysis, Planning, Solutioning, Implementation
- **Scale Adaptive Framework** (solo to team to enterprise)
- **Agent-agnostic** (any AI tool supporting custom system prompts)

### Strengths

- Closest conceptual match to momentum (phases, planning, tracking)
- YAML workflows formalize phase transitions
- Scale-adaptive process weight (lighter for solo, heavier for teams)
- Scrum Master agent transforms plans into dev stories

### Weaknesses

- Heavier process than momentum
- More complex setup (custom language, custom agent definitions)
- Less developer-friendly

---

## 6. GitHub Spec Kit

**GitHub:** github.com/github/spec-kit

### What It Does

Official GitHub toolkit for spec-driven development. Three commands that work with 30+ AI coding agents.

### Key Features

- **Three commands:** `/specify` (generate spec), `/plan` (architecture), `/tasks` (break down)
- **CLI bootstrapper** for SDD structure
- **Living specifications** that evolve with the project
- **30+ agent compatibility**

### Strengths

- GitHub backing and ecosystem
- Multi-agent compatibility
- `/specify` auto-generates specs from prompts
- Simple, focused scope

### Weaknesses

- Narrow (spec-to-tasks pipeline only)
- No lifecycle tracking, backlog, or releases

---

## 7. Augment Code Intent

**URL:** augmentcode.com/product/intent

### What It Does

Workspace platform for multi-agent orchestration with living specs at the center.

### Key Features

- **Three-tier architecture:** Coordinator → Specialist agents (parallel) → Verifier
- **Bidirectional specs** (specs update to reflect what was actually built)
- **Git worktree isolation** per workspace
- **Six specialist personas** executing in parallel waves

### Strengths

- Bidirectional spec updates (unique innovation)
- Parallel specialist agents
- Git worktree isolation

### Weaknesses

- Commercial product, not open source
- Not a portable toolkit

---

## 8. TaskMaster AI

**GitHub:** github.com/eyaltoledano/claude-task-master

### What It Does

AI-powered task management with MCP server integration.

### Key Features

- **36 MCP tools** for task management
- **PRD parsing** to generate task breakdowns
- **Selective tool loading** for context window efficiency
- **Task dependency tracking**
- **Subtask decomposition**

### Strengths

- MCP server approach (programmatic access to project state)
- PRD-to-task automatic decomposition
- Selective tool loading reduces context usage

### Weaknesses

- Task management only — no phases, decisions, or releases
- No execution quality features (TDD, review, debugging)

---

## 9. Self-Learning / Memory Tools

| Tool | GitHub | What It Does |
|------|--------|-------------|
| claude-reflect | BayramAnnakov/claude-reflect | Captures corrections, syncs learnings to CLAUDE.md |
| claude-self-reflect | ramakay/claude-self-reflect | Persistent memory across sessions via hooks |
| claude-mem | thedotmack/claude-mem | Auto-captures session activity, compresses, re-injects context |

### Borrowable Ideas

- Automatic learning capture during development
- Session-to-session memory persistence
- Hook-based observation without manual effort

---

## 10. Backlog.md

**GitHub:** MrLesk/Backlog.md

### What It Does

Plain-text project management in markdown, AI agents as first-class citizens.

### Key Features

- Zero-configuration npm package
- Structured plain-text with AGENTS.md instruction files
- Git-native (lives in repo)
- AI agents can read/update backlog directly

### Strengths

- Zero-config approach
- AGENTS.md pattern for instructing AI agents

### Weaknesses

- Backlog only — no phases, releases, or lifecycle

---

## Summary Matrix

| Tool | Lifecycle | Execution | Tracking | Review | TDD | Debug | Multi-Agent | Memory |
|------|-----------|-----------|----------|--------|-----|-------|-------------|--------|
| **Momentum** | Full | None | Full | None | None | None | Claude only | Specs |
| **Superpowers** | None | Best | None | Best | Best | Best | 6+ agents | None |
| **GSD** | Minimal | Good | None | None | None | None | 12+ agents | None |
| **gstack** | None | Good | None | Good | None | None | Claude only | None |
| **Kiro** | Minimal | Good | Minimal | None | None | None | IDE only | None |
| **BMAD** | Good | Good | Good | Good | None | None | Any agent | None |
| **Spec Kit** | Minimal | None | None | None | None | None | 30+ agents | None |
| **Intent** | Minimal | Good | Minimal | Good | None | None | Platform | None |
| **TaskMaster** | None | None | Good | None | None | None | MCP-based | None |
| **Self-learn** | None | None | None | None | None | None | Claude only | Best |
