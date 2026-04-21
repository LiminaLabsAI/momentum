# Phase 1 Tasks — Tool-Agnostic Architecture

> **Status**: Complete
> Legend: `[ ]` todo · `[/]` in-progress · `[x]` done

---

## Group 0 — Core Restructure

- [x] Create `core/commands/` directory
- [x] Move 8 command files: `template/.claude/commands/*.md` → `core/commands/`
- [x] Create `core/scripts/` directory
- [x] Move `template/scripts/check-history-reminder.sh` → `core/scripts/`
- [x] Create `core/agent-rules/` directory
- [x] Move `template/.agent/rules/project.md` → `core/agent-rules/`
- [x] Create `adapters/claude-code/` directory
- [x] Move `template/.claude/settings.json` → `adapters/claude-code/settings.json`
- [x] Remove now-empty `template/` directory
- [x] Commit: `refactor: move template/ into core/ + adapters/ skeleton`

---

## Group 1 — Claude Code Adapter

- [x] Create `adapters/claude-code/adapter.sh` with `run_install()` function
- [x] Verify `adapter.sh` is not executable (sourced, not run directly)
- [x] Commit: `feat(adapters): add claude-code adapter.sh`

---

## Group 2 — Update install.sh

- [x] Rewrite `install.sh` with `--coding-agent` flag parsing
- [x] Fix BUG-001: `mkdir -p "$TARGET"` before `realpath`
- [x] Add adapter validation (error if adapter.sh not found)
- [x] Source adapter and call `run_install "$TARGET" "$SCRIPT_DIR"`
- [x] Commit: `feat(install): --coding-agent flag, fix BUG-001`

---

## Group 3 — Docs, Backlog, Verification

- [x] Update `README.md` — add `--coding-agent` flag to install example
- [x] Update `specs/backlog/backlog.md` — mark BUG-001 resolved
- [x] Add FEAT-007: Cursor adapter (P2) to backlog
- [x] Add FEAT-008: Gemini CLI adapter (P2) to backlog
- [x] Add FEAT-009: OpenCode adapter (P2) to backlog
- [x] Add FEAT-010: VS Code Copilot adapter (P2) to backlog
- [x] Smoke test A: `./install.sh /tmp/test-p1` — 8 commands, hook wiring ✓
- [x] Smoke test B: `./install.sh /tmp/test-p1b --coding-agent claude-code` ✓
- [x] Smoke test C: `./install.sh /tmp/test-p1c --coding-agent unknown` → exits 1, clear error ✓
- [x] Update `specs/phases/index.json` — add phase-1, mark phase-0 complete
- [x] Update `specs/status.md` — Phase 1 complete, v0.2.0
- [x] Commit: `docs: update README + backlog for Phase 1`
