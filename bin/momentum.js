#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// ── Version ───────────────────────────────────────────────────────────────────

const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

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
          const rel = path.relative(opts.root || process.cwd(), dest);
          console.log(`  ↑ upgraded: ${rel} (original saved as .bak)`);
        }
        // identical — silent skip
      } else {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
        const rel = path.relative(opts.root || process.cwd(), dest);
        console.log(`  + added:    ${rel}`);
      }
    } else {
      if (opts.skipIfExists && fileExists(dest)) {
        console.log(`  ⚠️  ${dest} already exists — skipping.`);
      } else {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
      }
    }
  }
}

function fileExists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

// ── Marker-based upgrade (ENH-010 / FEAT-011) ────────────────────────────────

const MARKER = '## Project Extensions';

/**
 * Split a file's content at the `## Project Extensions` heading.
 * Returns `{managed, extensions}` where `extensions` is null if no marker.
 */
function partitionByMarker(content) {
  const idx = content.indexOf('\n' + MARKER);
  if (idx === -1) return { managed: content, extensions: null };
  return {
    managed: content.slice(0, idx).replace(/\s+$/, '') + '\n',
    extensions: content.slice(idx + 1),
  };
}

/**
 * Upgrade a marker-aware file. Three paths:
 *   - target missing → write source as-is
 *   - target has marker → replace managed section, preserve extensions
 *   - target lacks marker → backup as .bak, write source, append old content under marker
 *
 * Returns one of: 'added', 'updated', 'unchanged', 'migrated'.
 */
function upgradeMarkedFile(srcPath, destPath, label, root) {
  const rel = path.relative(root || process.cwd(), destPath);

  if (!fileExists(destPath)) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    console.log(`  + added:    ${rel}`);
    return 'added';
  }

  const srcContent = fs.readFileSync(srcPath, 'utf8');
  const destContent = fs.readFileSync(destPath, 'utf8');
  const destParts = partitionByMarker(destContent);

  if (destParts.extensions === null) {
    // Pre-marker file — back up, write fresh, append old content under marker.
    fs.copyFileSync(destPath, destPath + '.bak');
    const migrated =
      srcContent.replace(/\s+$/, '') +
      '\n\n<!-- migrated from pre-marker version on ' +
      new Date().toISOString().slice(0, 10) +
      ' — original at ' +
      path.basename(destPath) +
      '.bak -->\n' +
      destContent.replace(/\s+$/, '') +
      '\n';
    fs.writeFileSync(destPath, migrated);
    console.log(`  ↻ migrated: ${rel} (no marker — original saved as .bak)`);
    return 'migrated';
  }

  const srcParts = partitionByMarker(srcContent);
  const newContent = srcParts.managed + MARKER + destParts.extensions;

  if (newContent === destContent) {
    return 'unchanged';
  }

  fs.copyFileSync(destPath, destPath + '.bak');
  fs.writeFileSync(destPath, newContent);
  console.log(
    `  ↑ upgraded: ${rel} (managed section replaced; extensions preserved; original saved as .bak)`
  );
  return 'updated';
}

// ── Init command ──────────────────────────────────────────────────────────────

function init(targetDir, codingAgent) {
  const target = path.resolve(targetDir);
  const src = path.join(__dirname, '..');

  // Validate adapter
  const adapterDir = path.join(src, 'adapters', codingAgent);
  if (!fs.existsSync(adapterDir)) {
    console.error(`Error: Unknown coding agent '${codingAgent}'.`);
    console.error(`Available: claude-code`);
    process.exit(1);
  }

  // Load adapter
  const adapterJs = path.join(adapterDir, 'adapter.js');
  const adapter = require(adapterJs);

  console.log(`Installing momentum into: ${target} [coding-agent: ${codingAgent}]`);
  console.log('');

  // .claude/commands/
  console.log('→ Installing slash commands...');
  copyDir(
    path.join(src, 'core', 'commands'),
    path.join(target, '.claude', 'commands')
  );

  // scripts/
  console.log('→ Installing hook scripts...');
  const hookSrc = path.join(src, 'core', 'scripts', 'check-history-reminder.sh');
  const hookDest = path.join(target, 'scripts', 'check-history-reminder.sh');
  copyFile(hookSrc, hookDest);
  fs.chmodSync(hookDest, 0o755);

  // .agent/rules/project.md
  console.log('→ Installing agent rules...');
  const rulesDest = path.join(target, '.agent', 'rules', 'project.md');
  if (!fileExists(rulesDest)) {
    copyFile(
      path.join(src, 'core', 'agent-rules', 'project.md'),
      rulesDest
    );
  } else {
    console.log('  ⚠️  .agent/rules/project.md already exists — skipping (not overwriting).');
  }

  // specs/ skeleton + CLAUDE.md
  console.log('→ Scaffolding project specs...');
  const specsSrc = path.join(src, 'core', 'specs-templates');
  copyDir(specsSrc, target, { skipIfExists: true });

  // Coding-agent-specific steps
  adapter.runInstall(target, adapterDir, { copyFile, copyDir, fileExists });

  console.log('');
  console.log('✓ momentum installed successfully.');
  console.log('');
  console.log('Next steps:');
  console.log('');
  console.log('  Explore an idea first:');
  console.log('    Open Claude Code and run: /brainstorm-idea');
  console.log('');
  console.log('  Ready to scaffold a project:');
  console.log('    Open Claude Code and run: /start-project');
  console.log('');
  console.log('  Existing project — plan your next phase:');
  console.log('    Open Claude Code and run: /brainstorm-phase');
  console.log('');
  console.log('  See docs: https://github.com/avinash-singh-io/momentum');
}

// ── Upgrade command ───────────────────────────────────────────────────────────

function upgrade(targetDir, codingAgent) {
  const target = path.resolve(targetDir);
  const src = path.join(__dirname, '..');

  // Validate adapter
  const adapterDir = path.join(src, 'adapters', codingAgent);
  if (!fs.existsSync(adapterDir)) {
    console.error(`Error: Unknown coding agent '${codingAgent}'.`);
    console.error(`Available: claude-code`);
    process.exit(1);
  }

  // Load adapter
  const adapter = require(path.join(adapterDir, 'adapter.js'));

  console.log(`Upgrading momentum in: ${target} [coding-agent: ${codingAgent}]`);
  console.log('');

  const upgradeOpts = { upgradeMode: true, root: target };

  // Upgrade slash commands
  console.log('→ Upgrading slash commands...');
  copyDir(
    path.join(src, 'core', 'commands'),
    path.join(target, '.claude', 'commands'),
    upgradeOpts
  );

  // Upgrade hook scripts
  console.log('→ Upgrading hook scripts...');
  copyDir(
    path.join(src, 'core', 'scripts'),
    path.join(target, 'scripts'),
    upgradeOpts
  );
  // Re-apply executable bit to all .sh scripts
  const scriptsDir = path.join(target, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    for (const f of fs.readdirSync(scriptsDir)) {
      if (f.endsWith('.sh')) fs.chmodSync(path.join(scriptsDir, f), 0o755);
    }
  }

  // Upgrade agent rules — marker-aware (preserves Project Extensions block)
  console.log('→ Upgrading agent rules...');
  const agentRulesResult = upgradeMarkedFile(
    path.join(src, 'core', 'agent-rules', 'project.md'),
    path.join(target, '.agent', 'rules', 'project.md'),
    'agent-rules',
    target
  );

  // Upgrade CLAUDE.md — marker-aware (preserves Project Extensions block)
  console.log('→ Upgrading CLAUDE.md...');
  const claudeMdResult = upgradeMarkedFile(
    path.join(src, 'core', 'specs-templates', 'CLAUDE.md'),
    path.join(target, 'CLAUDE.md'),
    'CLAUDE.md',
    target
  );

  // Delegate adapter-specific upgrade
  adapter.runUpgrade(target, adapterDir, { copyFile, copyDir, fileExists });

  console.log('');
  console.log('✓ Upgrade complete.');
  console.log(`  CLAUDE.md:           ${claudeMdResult}`);
  console.log(`  agent-rules:         ${agentRulesResult}`);
  console.log('');
}

// ── Update check ─────────────────────────────────────────────────────────────

/** Returns true if version `a` is strictly greater than version `b` (semver). */
function isNewerVersion(a, b) {
  const parse = (v) => v.replace(/^v/, '').split('.').map(Number);
  const [aMaj, aMin, aPatch] = parse(a);
  const [bMaj, bMin, bPatch] = parse(b);
  if (aMaj !== bMaj) return aMaj > bMaj;
  if (aMin !== bMin) return aMin > bMin;
  return aPatch > bPatch;
}

function checkForUpdates() {
  return new Promise((resolve) => {
    const https = require('https');
    const os = require('os');
    const cacheFile = path.join(os.tmpdir(), '.momentum-version-check');

    // Use cache — skip network if checked within 24 hours
    try {
      const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (Date.now() - cache.checkedAt < 24 * 60 * 60 * 1000) {
        resolve(isNewerVersion(cache.latestVersion, pkg.version) ? cache.latestVersion : null);
        return;
      }
    } catch { /* no cache or unreadable — proceed to network check */ }

    const req = https.get(
      'https://registry.npmjs.org/@avinash-singh-io/momentum/latest',
      { timeout: 3000 },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const latestVersion = JSON.parse(data).version;
            try {
              fs.writeFileSync(cacheFile, JSON.stringify({ latestVersion, checkedAt: Date.now() }));
            } catch { /* ignore cache write failures */ }
            resolve(isNewerVersion(latestVersion, pkg.version) ? latestVersion : null);
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

// ── Usage ─────────────────────────────────────────────────────────────────────

function usage() {
  console.log(`
momentum v${pkg.version} — Spec-driven development toolkit for AI coding agents

Usage:
  momentum init [target-dir]          Scaffold momentum into a project directory
                                      (defaults to current directory)
  momentum upgrade [target-dir]       Upgrade momentum files in an existing project
                                      (defaults to current directory)

Options:
  --coding-agent <name>               Coding agent to install for (default: claude-code)
                                      Available: claude-code
  -h, --help                          Show this help message
  -v, --version                       Show version number

Examples:
  npx @avinash-singh-io/momentum init
  npx @avinash-singh-io/momentum init ./my-project
  npx @avinash-singh-io/momentum init ./my-project --coding-agent claude-code
  npx @avinash-singh-io/momentum upgrade
  npx @avinash-singh-io/momentum upgrade ./my-project
`.trim());
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  // Extract --coding-agent flag before command dispatch
  let codingAgent = 'claude-code';
  const agentFlagIdx = args.indexOf('--coding-agent');
  if (agentFlagIdx !== -1) {
    codingAgent = args[agentFlagIdx + 1];
    args.splice(agentFlagIdx, 2);
  }

  // Start update check concurrently — runs while command executes
  const updateCheckPromise = checkForUpdates();

  let exitCode = 0;

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    usage();
    exitCode = args.length === 0 ? 1 : 0;
  } else if (args[0] === '--version' || args[0] === '-v') {
    console.log(pkg.version);
  } else if (args[0] === 'init') {
    const targetDir = args[1] || process.cwd();
    try {
      init(targetDir, codingAgent);
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else if (args[0] === 'upgrade') {
    const targetDir = args[1] || process.cwd();
    try {
      upgrade(targetDir, codingAgent);
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else {
    console.error(`Unknown command: ${args[0]}`);
    console.error('Run "momentum --help" for usage.');
    exitCode = 1;
  }

  // Show update notice after command output (non-blocking — result from concurrent check)
  try {
    const latestVersion = await updateCheckPromise;
    if (latestVersion) {
      console.log('');
      console.log(`  ┌──────────────────────────────────────────────────────┐`);
      console.log(`  │  Update available: ${pkg.version} → ${latestVersion}`);
      console.log(`  │  Run: npm install -g @avinash-singh-io/momentum@latest`);
      console.log(`  └──────────────────────────────────────────────────────┘`);
      console.log('');
    }
  } catch { /* ignore update check errors */ }

  process.exit(exitCode);
}

main();
