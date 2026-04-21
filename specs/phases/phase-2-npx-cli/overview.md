# Phase 2: npx CLI Distribution

> **Status**: Planned
> **Version Target**: v0.3.0
> **Depends On**: Phase 1 — Tool-Agnostic Architecture (complete, v0.2.0)

## Goal

Ship `npx momentum init` so users can scaffold momentum into any project with a single command — no curl, no manual file copying. The npm package bundles `core/` and `adapters/claude-code/` and exposes a Node.js CLI that replicates the install.sh logic.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| CLI runtime | Node.js | Required for npm/npx distribution |
| Dependencies | Zero (Node.js built-ins only) | No `commander`, no `chalk` — keeps package lean and install fast |
| Adapter scope | Claude Code only | Consistent with Phase 1 decision; other adapters remain in backlog |
| Tool auto-detection | Deferred | Phase 2 installs Claude Code only; detection added when more adapters land |
| npm package name | TBD — `@cerebrio/momentum` (scoped, safe) or `momentum` (check availability) | Scoped name is always available; unscoped is friendlier for `npx` |
| install.sh | Kept, unchanged | No regression; npx is additive |

> **Decision needed before Group 0:** Confirm the npm package name. Run `npm view momentum` to check availability. If taken, use `@cerebrio/momentum`.

## Directory Structure (After Phase 2)

```
momentum/
  bin/
    momentum.js         ← CLI entry point (#!/usr/bin/env node)
  core/                 ← unchanged from Phase 1
  adapters/
    claude-code/        ← unchanged from Phase 1
  package.json          ← NEW: name, version, bin, files
  .npmignore            ← NEW: exclude specs/, docs/, scripts/, *.sh
  install.sh            ← unchanged
  README.md             ← updated: add npx install instructions
```

## Scope

### In Scope
- `package.json` with `bin` field pointing to `bin/momentum.js`
- `bin/momentum.js` — zero-dependency Node.js CLI implementing `init [target-dir]`
- `.npmignore` — exclude dev/spec files from the published package
- Smoke test: `npm pack` → local tarball → `npx <tarball> init /tmp/test-p2`
- README update: add npx instructions alongside existing bash install
- Version bump to v0.3.0
- npm publish

### Out of Scope
- Tool auto-detection
- New adapters (Cursor, Gemini CLI, OpenCode, VS Code Copilot)
- Interactive prompts / wizard UI
- `/migrate` or `/validate` commands
- Changes to `core/` content or `install.sh`

## Deliverables & Verification

| Deliverable | Verification |
|-------------|-------------|
| `package.json` with bin field | `node -e "const p=require('./package.json'); console.log(p.bin)"` |
| `bin/momentum.js` executable | `node bin/momentum.js --help` |
| `.npmignore` excludes non-package files | `npm pack --dry-run` — check listed files |
| Init works locally | `node bin/momentum.js init /tmp/test-p2` → files in place |
| Init via packed tarball | `npm pack && npx ./momentum-*.tgz init /tmp/test-p2b` |
| Claude Code files installed | `ls /tmp/test-p2/.claude/commands/` → 8 commands present |
| Hook config installed | `cat /tmp/test-p2/.claude/settings.json` → hook present |
| install.sh unchanged | `./install.sh /tmp/test-p2c` → still works |

## Acceptance Criteria

- [ ] `node bin/momentum.js init /tmp/test-p2` completes without errors
- [ ] All 8 commands present in `/tmp/test-p2/.claude/commands/`
- [ ] `.claude/settings.json` present with hook config
- [ ] `.agent/rules/project.md` present
- [ ] `scripts/check-history-reminder.sh` present and executable
- [ ] `npm pack --dry-run` lists only package files (no specs/, docs/, *.sh)
- [ ] `npx <local-tarball> init /tmp/test-p2b` works end-to-end
- [ ] `./install.sh /tmp/test-p2c` still works (no regression)
- [ ] Package published to npm and `npx <package-name> init` works from registry
