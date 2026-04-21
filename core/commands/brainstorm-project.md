Start a new project from an idea.

Run this on a NEW or EMPTY repository before anything else.
Turns a concept into a fully spec-driven project: vision, roadmap, Phase 0 ready to go.

## Steps

1. Understand the idea (one question at a time):
   - What problem does this project solve?
   - Who is the primary user or consumer?
   - What are the 3-5 core capabilities it must have?
   - What type of repository? (monorepo with architecture specs / standard library or package)
   - What is the primary tech stack / language?
   - Are there any hard constraints (performance, compliance, dependencies)?

2. Determine repo type from answers:
   - Monorepo → full architecture constitution in `specs/architecture/`
   - Standard → implementation tracking only

3. Scaffold directory structure:
   ```bash
   mkdir -p docs specs/backlog/details specs/changelog specs/decisions \
     specs/phases specs/planning specs/vision scripts \
     .claude/commands .agent/rules
   touch specs/backlog/details/.gitkeep
   # monorepo only:
   mkdir -p specs/architecture/adrs specs/benchmarks
   ```

4. Create vision files:
   - `specs/vision/project-charter.md` — problem, goals, non-goals, stakeholders
   - `specs/vision/principles.md` — engineering principles
   - `specs/vision/success-criteria.md` — measurable completion criteria

5. For monorepo — sketch initial architecture:
   - Create `specs/architecture/` with a first-pass architecture doc
   - Define core abstractions, interfaces, or contracts surfaced in dialogue
   - Note: this is a starting sketch — architecture evolves via ADR process

6. Design the phase roadmap:
   - What are the natural phases given the scope?
   - What are dependencies between phases?
   - Write `specs/planning/roadmap.md`

7. Create Phase 0 files using the Group Execution Pattern:
   - `specs/phases/phase-0-shortname/overview.md`
   - `specs/phases/phase-0-shortname/plan.md` (with group-based task breakdown)
   - `specs/phases/phase-0-shortname/tasks.md`
   - `specs/phases/phase-0-shortname/history.md` (log brainstorm decisions)

8. Create `CLAUDE.md` using the rules template from `.agent/rules/project.md`

9. Create all remaining tracking files:
   - `specs/phases/index.json`, `specs/decisions/impact-map.json`
   - `specs/status.md`, `specs/backlog/backlog.md`
   - `specs/decisions/0000-template.md`, `specs/decisions/README.md`
   - `specs/phases/README.md`, `specs/README.md`
   - `specs/changelog/YYYY-MM.md`

10. Initial git commit:
    ```bash
    git add .
    git commit -m "feat: initialize spec-driven project — {project name}

    - Vision, roadmap, Phase 0 brainstormed and ready
    - Full spec-driven structure: specs/, CLAUDE.md, commands, hooks
    - Ready for /start-phase"
    ```

11. Report to user:
    - Summary of what was created
    - Phase 0 goal and key deliverables
    - Prompt: "Project bootstrapped. Run `/start-phase` to begin Phase 0."

## Key Principles
- One question at a time — don't create anything until you understand the idea
- Phase 0 scope should be achievable in a focused sprint
- Architecture sketch is a starting point, not a commitment
- Record all key decisions from the dialogue in Phase 0's history.md
