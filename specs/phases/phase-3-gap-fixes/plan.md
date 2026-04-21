# Phase 3 — Gap Fixes: Implementation Plan

```
# Mixed: Group 0 → (Groups 1 + 2 in parallel) → Group 3
```

---

## Group 0 — Spec Templates Tree
**Sequential. Blocks Groups 1 and 2.**
External dependencies: none
Commit: `feat(core): add specs-templates tree for momentum init scaffold`

Create `core/specs-templates/` with all generic project template files. These are copied verbatim (or with minimal substitution) into the user's project by `momentum init`.

### Files to create

```
core/specs-templates/
  CLAUDE.md                            ← generic rules template (<Project Name> placeholder)
  README.md                            ← generic project README
  specs/
    README.md                          ← index of spec sections
    status.md                          ← Phase 0 — Bootstrap (not started)
    backlog/
      backlog.md                       ← empty backlog with all four tables
      details/
        .gitkeep
    changelog/
      .gitkeep
    decisions/
      README.md
      0000-template.md                 ← blank ADR template
      impact-map.json                  ← empty topics map: {"topics": {}}
    phases/
      README.md
      index.json                       ← empty phases map: {"phases": {}}
    planning/
      roadmap.md                       ← placeholder roadmap
    vision/
      project-charter.md
      principles.md
      success-criteria.md
```

### Template content notes

- `CLAUDE.md`: use the content from `core/agent-rules/project.md` wrapped with a navigation table header and `<Project Name>` as the title. The user fills in the project name after install.
- `specs/status.md`: `Current Phase: Phase 0 — Bootstrap (not started)`, empty blockers/P0 tables
- `specs/backlog/backlog.md`: four empty tables (Bugs, Features, Tech Debt, Enhancements) with header and priority legend
- `specs/decisions/impact-map.json`: `{"topics": {}}`
- `specs/phases/index.json`: `{"phases": {}}`
- All other files: minimal placeholder content with clear section headers

---

## Group 1 — CLI Updates
**Parallel with Group 2.**
External dependencies: Group 0 complete (specs-templates tree must exist)
Commit: `feat(cli): add --coding-agent flag, recursive copyDir, specs-templates scaffold`

### 1a. Make `copyDir()` recursive in `bin/momentum.js`

Current `copyDir()` only copies flat directories (no subdirectory recursion). Extend it:

```js
function copyDir(srcDir, destDir, opts = {}) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dest, opts);
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

### 1b. Add `--coding-agent` flag parsing to entry point

```js
// After slicing argv, before command dispatch:
let codingAgent = 'claude-code';
const agentFlagIdx = args.indexOf('--coding-agent');
if (agentFlagIdx !== -1) {
  codingAgent = args[agentFlagIdx + 1];
  args.splice(agentFlagIdx, 2);
}
```

Pass `codingAgent` into `init(targetDir, codingAgent)`.

### 1c. Add adapter validation + dynamic adapter loading

```js
function init(targetDir, codingAgent) {
  const adapterDir = path.join(__dirname, '..', 'adapters', codingAgent);
  if (!fs.existsSync(adapterDir)) {
    console.error(`Error: Unknown coding agent '${codingAgent}'.`);
    console.error(`Available: claude-code`);
    process.exit(1);
  }

  // Load adapter.js
  const adapterJs = path.join(adapterDir, 'adapter.js');
  const adapter = require(adapterJs);

  // ... copy core files ...
  adapter.runInstall(target, adapterDir, { copyFile, copyDir, fileExists });
}
```

### 1d. Add `adapters/claude-code/adapter.js`

Extracts the Claude Code-specific install steps out of `init()`:

```js
'use strict';

module.exports = {
  runInstall(targetDir, adapterDir, helpers) {
    const { copyFile, copyDir, fileExists } = helpers;

    // .claude/settings.json
    console.log('→ Configuring Claude Code hooks...');
    const settingsDest = path.join(targetDir, '.claude', 'settings.json');
    if (!fileExists(settingsDest)) {
      copyFile(path.join(adapterDir, 'settings.json'), settingsDest);
    } else {
      console.log('  ⚠️  .claude/settings.json already exists.');
      console.log(`     Merge hooks manually from: ${path.join(adapterDir, 'settings.json')}`);
    }
  }
};
```

The `init()` function in `bin/momentum.js` handles the tool-agnostic parts (commands, scripts, agent rules, specs-templates); `adapter.js` handles coding-agent-specific parts (settings.json, etc.).

### 1e. Add specs-templates copy to `init()`

After existing installs, copy the specs tree with skip-if-exists for user-data files:

```js
// specs/ skeleton + CLAUDE.md
console.log('→ Scaffolding project specs...');
const specsSrc = path.join(src, 'core', 'specs-templates');
copyDir(specsSrc, target, { skipIfExists: true });
// Always overwrite tooling-only files:
copyFile(path.join(specsSrc, 'specs/decisions/0000-template.md'),
         path.join(target, 'specs/decisions/0000-template.md'));
```

Files that skip-if-exist: `CLAUDE.md`, `specs/status.md`, `specs/backlog/backlog.md`, `specs/decisions/impact-map.json`

### 1f. Update success message (ENH-004)

Replace current multi-option message:

```
✓ momentum installed successfully.

Next steps:

  New project:
    Open Claude Code and run: /brainstorm-project

  Existing project — plan your next phase:
    Open Claude Code and run: /brainstorm-phase
```

Remove the `/start-phase` option from the message — it was misleading.

### 1g. Update `--help` output

```
Options:
  --coding-agent <name>    Coding agent to install for (default: claude-code)
                           Available: claude-code
  -h, --help               Show this help message
  -v, --version            Show version number
```

### 1h. Add `.npmignore` (TD-001)

Create `.npmignore` at project root:

```
# Exclude bash adapter scripts — only needed by install.sh, not the Node.js CLI
adapters/**/adapter.sh
```

---

## Group 2 — Command Content Fixes
**Parallel with Group 1.**
External dependencies: none
Commit: `docs(commands): fix start-phase, brainstorm-project, track command gaps`

### 2a. ENH-005 — `start-phase.md`: Add explicit `history.md` creation step

In step 3 ("Create the phase directory if it doesn't exist"), add a note that `/brainstorm-phase` should have already created these files, but if running `/start-phase` directly, history.md must be created manually:

Add after the directory structure block:
```
   Note: if files don't exist (running /start-phase without /brainstorm-phase first),
   create history.md now — an empty append-only log with the entry-types table.
```

### 2b. ENH-006 — `brainstorm-project.md`: Add Group Execution Pattern section

After step 7 ("Create Phase 0 files using the Group Execution Pattern"), add `(see Group Execution Pattern below)`. Then append the full section at the bottom — identical to the section in `brainstorm-phase.md`.

### 2c. ENH-007 — `track.md`: Add auto-decide criteria

Replace step 3's current "If complex, create..." with an explicit decision table:

**One-liner (no detail file needed):**
- Clear, self-contained issue (< 2 sentences to describe)
- No design choices to make
- Single file or single function affected
- Fix is obvious from the description

**Detail file required (`specs/backlog/details/{ID}.md`):**
- Requires design or multiple options to evaluate
- Touches multiple files, commands, or systems
- Has a non-obvious implementation path
- Cross-cutting impact (affects other phases or specs)
- Estimated > 30 min of work

---

## Group 3 — Verification
**Sequential. Runs after Groups 1 and 2.**
External dependencies: Node.js ≥ 18
Commit: `chore: verify Phase 3 gap fixes`

### 3a. Smoke test `momentum init`

```bash
mkdir /tmp/test-momentum-init
node bin/momentum.js init /tmp/test-momentum-init
find /tmp/test-momentum-init -type f | sort
```

Expected: all specs template files present alongside `.claude/`, `.agent/`, `scripts/`

### 3b. Verify skip-if-exists behaviour

```bash
# Run init a second time — no files should be overwritten
node bin/momentum.js init /tmp/test-momentum-init
# Should show ⚠️ warnings, not overwrite user-data files
```

### 3c. Verify `--coding-agent` flag

```bash
node bin/momentum.js init /tmp/test-momentum-agent --coding-agent claude-code
# Should succeed

node bin/momentum.js init /tmp/test-momentum-bad --coding-agent cursor
# Should fail with: "Error: Unknown coding agent 'cursor'."
```

### 3d. Verify npm package excludes `adapter.sh`

```bash
npm pack --dry-run 2>&1 | grep adapter.sh
# Should produce no output
```

### 3e. Read-check command files

Manually verify:
- `core/commands/start-phase.md` — history.md creation note present
- `core/commands/brainstorm-project.md` — Group Execution Pattern section present
- `core/commands/track.md` — decision table present
