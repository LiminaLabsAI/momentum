# Phase 2: npx CLI Distribution — Task Checklist

> Mirrors plan.md. Check off as you go.

## Group 0 — Package Config

- [ ] Resolve npm package name (`npm view momentum`)
- [ ] Create `package.json` with name, version, bin, files, engines, license
- [ ] Create `.npmignore` (exclude specs/, docs/, scripts/, *.sh, keep bin/, core/, adapters/, README.md, LICENSE)

## Group 1 — CLI Implementation

- [ ] Create `bin/momentum.js` with `#!/usr/bin/env node` shebang
- [ ] Implement arg parsing: `init [target]`, `--help`, `--version`, unknown → error
- [ ] Implement `init(targetDir)`: copy commands, scripts, settings.json, agent-rules
- [ ] Warn (don't overwrite) existing settings.json and project.md
- [ ] Print success message (matching install.sh style)
- [ ] Handle missing src files gracefully
- [ ] `chmod +x bin/momentum.js`

## Group 2 — Smoke Test

- [ ] `npm pack --dry-run` → verify included files
- [ ] `node bin/momentum.js init /tmp/test-p2` → clean output
- [ ] Verify: 8 commands, settings.json, project.md, check-history-reminder.sh (executable)
- [ ] `npm pack` → creates tarball
- [ ] `npx <tarball> init /tmp/test-p2b` → works end-to-end
- [ ] Idempotency: second run → warnings, no crash
- [ ] Regression: `./install.sh /tmp/test-p2c` → still works
- [ ] Clean up /tmp test dirs

## Group 3 — Docs + Publish

- [ ] Update README.md: add npx install section
- [ ] Confirm `package.json` version = `0.3.0`
- [ ] `npm publish` (add `--access public` if scoped)
- [ ] Verify from registry: `npx <package-name> init /tmp/test-final`
- [ ] `git tag v0.3.0` + push tag
