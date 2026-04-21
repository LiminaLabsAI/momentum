# Phase 2: npx CLI Distribution — Task Checklist

> Mirrors plan.md. Check off as you go.

## Group 0 — Package Config

- [x] Resolve npm package name (`npm view momentum`) → `@cerebrio/momentum`
- [x] Create `package.json` with name, version, bin, files, engines, license
- [x] Create `.npmignore` (exclude specs/, docs/, scripts/, *.sh, keep bin/, core/, adapters/, README.md, LICENSE)

## Group 1 — CLI Implementation

- [x] Create `bin/momentum.js` with `#!/usr/bin/env node` shebang
- [x] Implement arg parsing: `init [target]`, `--help`, `--version`, unknown → error
- [x] Implement `init(targetDir)`: copy commands, scripts, settings.json, agent-rules
- [x] Warn (don't overwrite) existing settings.json and project.md
- [x] Print success message (matching install.sh style)
- [x] Handle missing src files gracefully
- [x] `chmod +x bin/momentum.js`

## Group 2 — Smoke Test

- [x] `npm pack --dry-run` → verified included files (no specs/, docs/, install.sh)
- [x] `node bin/momentum.js init /tmp/test-p2` → clean output
- [x] Verified: 8 commands, settings.json, project.md, check-history-reminder.sh (executable)
- [x] `npm pack` → created `cerebrio-momentum-0.3.0.tgz`
- [x] `npx <tarball> init /tmp/test-p2b` → worked end-to-end
- [x] Idempotency: second run → warnings for existing files, no crash
- [x] Regression: `./install.sh /tmp/test-p2c` → still works
- [x] Cleaned up /tmp test dirs

## Group 3 — Docs + Publish

- [x] Update README.md: npx install section (primary), bash install (alternative)
- [ ] Confirm `package.json` version = `0.3.0`
- [ ] `npm publish --access public`
- [ ] Verify from registry: `npx @cerebrio/momentum init /tmp/test-final`
- [ ] `git tag v0.3.0` + push tag
