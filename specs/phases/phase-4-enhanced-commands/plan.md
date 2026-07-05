---
type: Plan
---

# Phase 4 — Enhanced Commands: Implementation Plan

```
# Sequential: Group 0 → Group 1 → (Groups 2 + 3 in parallel) → Group 4
```

---

## Group 0 — Upgrade Infrastructure
**Sequential. Blocks Group 1.**
External dependencies: none
Commit: `feat(cli): add upgradeMode to copyDir and scaffold upgrade() function`

### 0a. Add `upgradeMode` to `copyDir()` in `bin/momentum.js`

Current `copyDir()` has a `skipIfExists` mode (for `init`). Add `upgradeMode`:

```js
function copyDir(srcDir, destDir, opts = {}) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dest, opts);
    } else if (opts.upgradeMode) {
      if (fileExists(dest)) {
        const srcContent = fs.readFileSync(src, 'utf8');
        const destContent = fs.readFileSync(dest, 'utf8');
        if (srcContent !== destContent) {
          fs.copyFileSync(dest, dest + '.bak');
          fs.copyFileSync(src, dest);
          console.log(`  ↑ upgraded: ${path.relative(process.cwd(), dest)} (backed up as .bak)`);
        }
        // identical — silent skip
      } else {
        fs.copyFileSync(src, dest);
        console.log(`  + added:    ${path.relative(process.cwd(), dest)}`);
      }
    } else {
      if (opts.skipIfExists && fileExists(dest)) {
        console.log(`  ⚠️  ${dest} already exists — skipping.`);
      } else {
        fs.copyFileSync(src, dest);
      }
    }
  }
}
```

### 0b. Scaffold `upgrade()` function in `bin/momentum.js`

```js
function upgrade(targetDir, codingAgent) {
  const src = path.join(__dirname, '..');
  const adapterDir = path.join(src, 'adapters', codingAgent);

  if (!fs.existsSync(adapterDir)) {
    console.error(`Error: Unknown coding agent '${codingAgent}'.`);
    process.exit(1);
  }

  console.log(`\n→ Upgrading momentum in ${targetDir}...\n`);

  // Upgrade commands
  copyDir(
    path.join(src, 'core', 'commands'),
    path.join(targetDir, '.claude', 'commands'),
    { upgradeMode: true }
  );

  // Upgrade agent rules
  copyDir(
    path.join(src, 'core', 'agent-rules'),
    path.join(targetDir, '.agent', 'rules'),
    { upgradeMode: true }
  );

  // Upgrade hook scripts
  copyDir(
    path.join(src, 'core', 'scripts'),
    path.join(targetDir, 'scripts'),
    { upgradeMode: true }
  );

  // Delegate adapter-specific upgrade
  const adapter = require(path.join(adapterDir, 'adapter.js'));
  adapter.runUpgrade(targetDir, adapterDir, { copyDir, copyFile, fileExists });

  console.log('\n✓ Upgrade complete.\n');
}
```

### 0c. Wire `upgrade` subcommand in CLI entry point

In the command dispatch block:
```js
case 'upgrade':
  upgrade(targetDir, codingAgent);
  break;
```

Target dir resolution — default to CWD, accept optional positional arg:
```
momentum upgrade [path]
```

Update `--help` to include:
```
  upgrade [path]           Upgrade momentum files in [path] (default: current directory)
```

---

## Group 1 — Claude Code Adapter: `runUpgrade()`
**Sequential. Runs after Group 0.**
External dependencies: Group 0 complete
Commit: `feat(adapters): add runUpgrade() to claude-code adapter`

Add `runUpgrade()` alongside existing `runInstall()` in `adapters/claude-code/adapter.js`:

```js
runUpgrade(targetDir, adapterDir, helpers) {
  const { copyFile, fileExists } = helpers;
  const dest = path.join(targetDir, '.claude', 'settings.json');
  const src = path.join(adapterDir, 'settings.json');

  if (fileExists(dest)) {
    const srcContent = fs.readFileSync(src, 'utf8');
    const destContent = fs.readFileSync(dest, 'utf8');
    if (srcContent !== destContent) {
      fs.copyFileSync(dest, dest + '.bak');
      copyFile(src, dest);
      console.log(`  ↑ upgraded: .claude/settings.json (backed up as .bak)`);
    }
  } else {
    copyFile(src, dest);
    console.log(`  + added:    .claude/settings.json`);
  }
}
```

---

## Group 2 — `/validate` Command
**Parallel with Group 3.**
External dependencies: none
Commit: `docs(commands): add validate slash command`

### 2a. Write `core/commands/validate.md`

The validate command instructs the agent to check the spec structure health of the current project.

**Default mode (index-first):**

1. Read `specs/status.md` — verify required fields present: `Last Updated`, `Current Phase`, `Latest Release`, `Health`
2. Read `specs/backlog/backlog.md` — verify all 4 section tables present: Bugs, Features, Tech Debt, Enhancements
3. Read `specs/phases/index.json` — for each phase listed, verify:
   - Phase directory exists at `specs/phases/<phase-id>/`
   - All 4 files present: `overview.md`, `plan.md`, `tasks.md`, `history.md`
4. Cross-check: active phase in `status.md` is listed in `index.json` and its directory exists
5. Check `.claude/commands/` contains all standard momentum commands: `brainstorm-phase`, `start-phase`, `complete-phase`, `brainstorm-idea`, `start-project`, `log`, `sync-docs`, `track`, `migrate`, `validate`
6. Report: `✓ N checks passed` and `✗ N issues found` with specific file paths for each failure

**`--deep` flag (additionally):**

7. Walk ALL directories under `specs/phases/` — flag any not listed in `index.json` as orphaned
8. For each phase directory: read `tasks.md`, extract all backlog ID references (`BUG-NNN`, `FEAT-NNN`, `TD-NNN`, `ENH-NNN`) — verify each ID exists in `backlog.md`
9. For each phase directory: read `history.md` — verify each entry has all required fields: type tag `[TYPE]`, date `YYYY-MM-DD`, `Topics:`, `Affects-phases:`, `Affects-specs:`, `Detail:`
10. Check `specs/changelog/` — verify at least one entry file exists for each completed phase listed in `index.json`

### 2b. Register `validate` in `adapters/claude-code/settings.json`

Add `validate` to the commands list so it installs into `.claude/commands/` on `momentum init`.

---

## Group 3 — `/migrate` Command
**Parallel with Group 2.**
External dependencies: none
Commit: `docs(commands): add migrate slash command`

### 3a. Write `core/commands/migrate.md`

The migrate command onboards an existing project with manual/outdated momentum-like structure into proper momentum format.

**Steps:**

1. **Detect existing structure** — scan for what momentum expects vs what is present:
   - `specs/` and all required subdirectories
   - `specs/status.md`, `specs/backlog/backlog.md`, `specs/phases/index.json`
   - `.claude/commands/` — which momentum commands are missing?
   - `.agent/rules/project.md`
   - Hook scripts in `scripts/`

2. **Report gap summary before making changes** — present to user:
   - "Found X / Missing Y items" with a list
   - What will be added vs what will be skipped (already exists)
   - Ask user to confirm before proceeding

3. **Fill gaps (skip-if-exists for all files)**:
   - Copy missing `specs-templates` files — never overwrite files the user already has
   - Add missing momentum commands to `.claude/commands/`
   - Add `.agent/rules/project.md` if absent
   - Add missing hook scripts if absent

4. **Phase index reconciliation** — if `specs/phases/index.json` is missing or empty:
   - Scan `specs/phases/` for existing phase directories
   - Add each discovered phase to `index.json` with status `unknown`
   - Note to user: "Added N phases to index.json — verify status fields manually"

5. **Report result** — what was added, what was left unchanged (already existed), what requires manual attention (e.g. incomplete phase files, unrecognized directory names)

### 3b. Register `migrate` in `adapters/claude-code/settings.json`

Add `migrate` to the commands list so it installs into `.claude/commands/` on `momentum init`.

---

## Group 4 — Verification + Release
**Sequential. Runs after Groups 1, 2, and 3.**
External dependencies: Node.js ≥ 18
Commit: `chore: verify Phase 4 enhanced commands; bump to v0.5.0`

### 4a. Smoke test upgrade — backup behavior

```bash
mkdir /tmp/test-upgrade
node bin/momentum.js init /tmp/test-upgrade

# Simulate a modified command file
echo "# modified" >> /tmp/test-upgrade/.claude/commands/brainstorm-phase.md

# Run upgrade
node bin/momentum.js upgrade /tmp/test-upgrade

# Verify backup created
ls /tmp/test-upgrade/.claude/commands/brainstorm-phase.md.bak

# Verify file restored to latest
diff /tmp/test-upgrade/.claude/commands/brainstorm-phase.md \
     .claude/commands/brainstorm-phase.md
```

### 4b. Smoke test upgrade — new file behavior

```bash
# Simulate a file that didn't exist in an older install
rm /tmp/test-upgrade/.claude/commands/validate.md

node bin/momentum.js upgrade /tmp/test-upgrade

# Verify file now exists
ls /tmp/test-upgrade/.claude/commands/validate.md
```

### 4c. Smoke test upgrade — identical file skipped silently

```bash
# Run upgrade again with no modifications
node bin/momentum.js upgrade /tmp/test-upgrade
# Should output nothing (all files identical) or minimal summary
```

### 4d. Read-check `/validate` command file

Manually verify `core/commands/validate.md`:
- Default mode steps 1–6 present
- `--deep` flag section (steps 7–10) present
- Report format with pass/fail counts specified

### 4e. Read-check `/migrate` command file

Manually verify `core/commands/migrate.md`:
- Gap detection step present
- Confirmation before changes step present
- Skip-if-exists behavior specified
- Phase index reconciliation step present

### 4f. Verify both commands registered in settings.json

```bash
cat adapters/claude-code/settings.json | grep -E '"validate"|"migrate"'
```

### 4g. Bump version to v0.5.0

Update `package.json`: `"version": "0.5.0"`

### 4h. npm publish dry run

```bash
npm pack --dry-run 2>&1
# Verify no unexpected files; confirm validate.md and migrate.md included
```
