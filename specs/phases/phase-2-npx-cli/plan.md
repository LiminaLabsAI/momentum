---
type: Plan
---

# Phase 2: npx CLI Distribution — Implementation Plan

```
# Execution order
# Sequential: Group 0 → Group 1 → Group 2 → Group 3
```

---

## Group 0 — Package Config
**Sequential. Blocks everything.**
External dependencies: none
Commit: `chore: scaffold npm package (package.json, .npmignore)`

### Tasks
- [ ] Resolve npm package name: run `npm view momentum` to check availability
  - If available: use `momentum`
  - If taken: use `@avinash-singh-io/momentum`
- [ ] Create `package.json`:
  - `name`: resolved above
  - `version`: `0.3.0`
  - `description`: `Spec-driven development toolkit for AI coding agents`
  - `bin`: `{ "momentum": "./bin/momentum.js" }`
  - `files`: `["bin/", "core/", "adapters/"]`
  - `engines`: `{ "node": ">=18" }`
  - `license`: `MIT`
  - `keywords`: `["claude-code", "ai", "spec-driven", "momentum"]`
- [ ] Create `.npmignore`:
  - Exclude: `specs/`, `docs/`, `scripts/`, `*.sh`, `.claude/`, `.agent/`, `*.md` at root (keep `README.md` — use negation)
  - Pattern: exclude everything not in `bin/`, `core/`, `adapters/`, `README.md`, `LICENSE`

---

## Group 1 — CLI Implementation
**Sequential. Requires Group 0.**
External dependencies: none (Node.js built-ins: `fs`, `path`, `process`)
Commit: `feat(cli): implement npx momentum init command`

### Tasks
- [ ] Create `bin/momentum.js` with shebang `#!/usr/bin/env node`
- [ ] Implement arg parsing (no dependencies):
  - `momentum init [target-dir]` — target defaults to `process.cwd()`
  - `momentum --help` / `momentum -h` — print usage
  - `momentum --version` / `momentum -v` — print version from package.json
  - Unknown command → print usage + exit 1
- [ ] Implement `init(targetDir)` function — replicates `run_install()` from `adapter.sh`:
  - Resolve `srcDir` = directory of `bin/momentum.js` (i.e., package root)
  - Create `<target>/.claude/commands/` — copy all files from `src/core/commands/`
  - Create `<target>/scripts/` — copy `src/core/scripts/check-history-reminder.sh`, chmod +x
  - Copy `src/adapters/claude-code/settings.json` → `<target>/.claude/settings.json`
    - If already exists: print warning, skip (do not overwrite)
  - Copy `src/core/agent-rules/project.md` → `<target>/.agent/rules/project.md`
    - If already exists: print warning, skip (do not overwrite)
- [ ] Print success message matching install.sh output (→ and ✓ formatting)
- [ ] Handle errors: if `srcDir` files are missing, print clear error and exit 1
- [ ] Make `bin/momentum.js` executable: `chmod +x bin/momentum.js`

---

## Group 2 — Smoke Test
**Sequential. Requires Group 1.**
External dependencies: npm (for pack), node
Commit: `test: smoke test npx momentum init end-to-end`

### Tasks
- [ ] Run `npm pack --dry-run` — verify listed files contain only `bin/`, `core/`, `adapters/`, `README.md`, `LICENSE`
- [ ] Run `node bin/momentum.js init /tmp/test-p2` — verify clean output
- [ ] Verify installed files:
  - `ls /tmp/test-p2/.claude/commands/` → 8 `.md` files
  - `cat /tmp/test-p2/.claude/settings.json` → hook config present
  - `ls /tmp/test-p2/.agent/rules/project.md` → exists
  - `ls /tmp/test-p2/scripts/check-history-reminder.sh` → exists + executable
- [ ] Run `npm pack` → creates `momentum-0.3.0.tgz` (or `cerebrio-momentum-0.3.0.tgz`)
- [ ] Test via packed tarball: `npx ./momentum-0.3.0.tgz init /tmp/test-p2b` → same result
- [ ] Test idempotency: run `node bin/momentum.js init /tmp/test-p2` again → warnings for existing files, no crash
- [ ] Test regression: `./install.sh /tmp/test-p2c` → still works
- [ ] Clean up test dirs after verification

---

## Group 3 — Docs + Publish
**Sequential. Requires Group 2.**
External dependencies: npm account with publish access
Commit: `docs: update README for npx install` then `chore: release v0.3.0`

### Tasks
- [ ] Update `README.md`:
  - Add `npx` install section above the bash install section
  - Example: `npx momentum init` (or `npx @avinash-singh-io/momentum init`)
  - Keep existing bash install section
- [ ] Verify `package.json` version is `0.3.0`
- [ ] Run `npm publish` (or `npm publish --access public` for scoped package)
- [ ] Verify: `npx <package-name> init /tmp/test-final` works from registry
- [ ] Tag release: `git tag v0.3.0` and push
