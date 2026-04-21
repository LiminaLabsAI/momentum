# Phase 1 Tasks — Tool-Agnostic Architecture

> **Status**: Not Started
> Legend: `[ ]` todo · `[/]` in-progress · `[x]` done

---

## Group 0 — Core Restructure

- [ ] Create `core/commands/` directory
- [ ] Move 8 command files: `template/.claude/commands/*.md` → `core/commands/`
- [ ] Create `core/scripts/` directory
- [ ] Move `template/scripts/check-history-reminder.sh` → `core/scripts/`
- [ ] Create `core/agent-rules/` directory
- [ ] Move `template/.agent/rules/project.md` → `core/agent-rules/`
- [ ] Create `adapters/claude-code/` directory
- [ ] Move `template/.claude/settings.json` → `adapters/claude-code/settings.json`
- [ ] Remove now-empty `template/` directory
- [ ] Commit: `refactor: move template/ into core/ + adapters/ skeleton`

---

## Group 1 — Claude Code Adapter

- [ ] Create `adapters/claude-code/adapter.sh` with `run_install()` function
- [ ] Verify `adapter.sh` is not executable (sourced, not run directly)
- [ ] Commit: `feat(adapters): add claude-code adapter.sh`

---

## Group 2 — Update install.sh

- [ ] Rewrite `install.sh` with `--coding-agent` flag parsing
- [ ] Fix BUG-001: `mkdir -p "$TARGET"` before `realpath`
- [ ] Add adapter validation (error if adapter.sh not found)
- [ ] Source adapter and call `run_install "$TARGET" "$SCRIPT_DIR"`
- [ ] Commit: `feat(install): --coding-agent flag, fix BUG-001`

---

## Group 3 — Docs, Backlog, Verification

- [ ] Update `README.md` — add `--coding-agent` flag to install example
- [ ] Update `specs/backlog/backlog.md` — mark BUG-001 resolved
- [ ] Add FEAT-007: Cursor adapter (P2) to backlog
- [ ] Add FEAT-008: Gemini CLI adapter (P2) to backlog
- [ ] Add FEAT-009: OpenCode adapter (P2) to backlog
- [ ] Add FEAT-010: VS Code Copilot adapter (P2) to backlog
- [ ] Smoke test A: `./install.sh /tmp/test-p1` — verify 8 commands, hook wiring
- [ ] Smoke test B: `./install.sh /tmp/test-p1b --coding-agent claude-code` — passes
- [ ] Smoke test C: `./install.sh /tmp/test-p1c --coding-agent unknown` — exits non-zero, clear error
- [ ] Update `specs/phases/index.json` — add phase-1, mark phase-0 complete
- [ ] Update `specs/status.md` — Phase 1 complete, v0.2.0
- [ ] Commit: `docs: update README + backlog for Phase 1`
