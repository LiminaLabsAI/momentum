---
type: Vision
---

# Engineering Principles

1. **Generic over specific** — Template files must work for any project. No hardcoded names, paths, or framework assumptions.
2. **Commands as documentation** — Every slash command is readable prose. An agent reading it cold should know exactly what to do.
3. **Additive installs** — The installer never overwrites existing files without warning. It adds, not replaces.
4. **The repo eats its own cooking** — Momentum is developed using the momentum workflow. If the workflow is broken, we feel it immediately.
5. **Minimal dependencies** — Phase 0 install requires only bash and git. No npm, no Python, no build step.
