---
type: Vision
---

# Success Criteria

## Phase 0 Complete When...
- [ ] install.sh copies all template files into a target directory correctly
- [ ] All 8 commands are present and have no project-specific content
- [ ] A blank repo + install.sh + /start-project produces a working spec structure
- [ ] momentum's own specs/ structure is up to date

## Phase 1 Complete When...
- [ ] `core/commands/` contains all workflow logic with zero tool-specific references
- [ ] Adapters exist for: Claude Code, Cursor, Gemini CLI, OpenCode, VS Code Copilot
- [ ] `install.sh` detects the tool (or prompts) and delegates to the right adapter
- [ ] Each adapter passes: install into blank repo → correct files in correct locations

## Project Complete When...
- [ ] `npx momentum init` auto-detects the tool and installs in under 60 seconds
- [ ] Any AI coding tool user can install and use momentum in under 5 minutes
- [ ] The momentum repo demonstrates its own workflow across multiple phases
