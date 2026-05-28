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
    if (entry.name.startsWith('._') || entry.name === '.DS_Store') continue;
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    const rel = path.relative(srcDir, src);
    if (opts.skipRelPaths && opts.skipRelPaths.has(rel)) continue;
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

function listAvailableAgents(src = path.join(__dirname, '..')) {
  const adaptersDir = path.join(src, 'adapters');
  if (!fs.existsSync(adaptersDir)) return [];
  return fs.readdirSync(adaptersDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(adaptersDir, name, 'adapter.js')))
    .sort();
}

function formatAvailableAgents(src = path.join(__dirname, '..')) {
  return listAvailableAgents(src).join(', ');
}

function loadAdapter(src, agent) {
  const adapterDir = path.join(src, 'adapters', agent);
  if (!fs.existsSync(adapterDir)) {
    console.error(`Error: Unknown agent '${agent}'.`);
    console.error(`Available: ${formatAvailableAgents(src)}`);
    process.exit(1);
  }
  return {
    adapterDir,
    adapter: require(path.join(adapterDir, 'adapter.js')),
  };
}

function resolveAdapterSource(srcRoot, adapterDir, fileSpec) {
  const sourceBase = fileSpec.sourceBase || 'adapter';
  const base = sourceBase === 'package' ? srcRoot : adapterDir;
  return path.join(base, ...fileSpec.source);
}

function installPrimaryInstruction(srcRoot, targetDir, adapterDir, primaryInstruction) {
  if (!primaryInstruction) return null;
  const srcPath = resolveAdapterSource(srcRoot, adapterDir, primaryInstruction);
  const destPath = path.join(targetDir, ...primaryInstruction.destination);
  const label = primaryInstruction.label || primaryInstruction.destination.join('/');

  console.log(`→ Installing ${label}...`);
  if (!fileExists(destPath)) {
    copyFile(srcPath, destPath);
    return 'added';
  }

  console.log(`  ⚠️  ${label} already exists — skipping.`);
  return 'skipped';
}

function upgradePrimaryInstruction(srcRoot, targetDir, adapterDir, primaryInstruction) {
  if (!primaryInstruction) return null;
  const srcPath = resolveAdapterSource(srcRoot, adapterDir, primaryInstruction);
  const destPath = path.join(targetDir, ...primaryInstruction.destination);
  const label = primaryInstruction.label || primaryInstruction.destination.join('/');

  console.log(`→ Upgrading ${label}...`);
  if (primaryInstruction.markerAware) {
    return upgradeMarkedFile(srcPath, destPath, label, targetDir);
  }

  if (!fileExists(destPath)) {
    copyFile(srcPath, destPath);
    console.log(`  + added:    ${path.relative(targetDir, destPath)}`);
    return 'added';
  }

  const srcContent = fs.readFileSync(srcPath, 'utf8');
  const destContent = fs.readFileSync(destPath, 'utf8');
  if (srcContent === destContent) return 'unchanged';

  fs.copyFileSync(destPath, destPath + '.bak');
  copyFile(srcPath, destPath);
  console.log(`  ↑ upgraded: ${path.relative(targetDir, destPath)} (original saved as .bak)`);
  return 'updated';
}

// ── Adapter overlay (FEAT-012, Phase 6) ──────────────────────────────────────
//
// Adapters may ship per-agent commands/agent-rules/scripts under
// `adapters/<name>/{commands,agent-rules,scripts}/`. These overlay onto the
// same destinations as the corresponding `core/<sub>/` content.
//
// Contract: additive-only. A given filename lives in EITHER `core/` OR exactly
// one adapter, never both. Duplicates are a hard error caught before any
// files are written. Generic content goes in `core/`; agent-specific in
// `adapters/<name>/`.

const DEFAULT_OVERLAY_DESTS = {
  commands: ['.claude', 'commands'],
  'agent-rules': ['.agent', 'rules'],
  scripts: ['scripts'],
  engines: ['.agent', 'engines'],
};

function listFilesRecursive(dir) {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  const walk = (d, prefix) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.name.startsWith('._') || entry.name === '.DS_Store') continue;
      const rel = prefix ? path.join(prefix, entry.name) : entry.name;
      if (entry.isDirectory()) walk(path.join(d, entry.name), rel);
      else result.push(rel);
    }
  };
  walk(dir, '');
  return result;
}

function detectOverlayConflicts(coreRoot, adapterRoot, subdirs) {
  const conflicts = [];
  for (const sub of subdirs) {
    const adapterSubdir = path.join(adapterRoot, sub);
    if (!fs.existsSync(adapterSubdir)) continue;
    const coreFiles = new Set(listFilesRecursive(path.join(coreRoot, sub)));
    for (const f of listFilesRecursive(adapterSubdir)) {
      if (coreFiles.has(f)) conflicts.push({ subdir: sub, file: f });
    }
  }
  return conflicts;
}

function failOnOverlayConflicts(coreRoot, adapterRoot, agent, dests) {
  const conflicts = detectOverlayConflicts(
    coreRoot,
    adapterRoot,
    Object.keys(dests)
  );
  if (conflicts.length === 0) return;
  console.error(
    `Error: duplicate overlay files in core/ and adapters/${agent}/.`
  );
  console.error('Each file may live in EITHER core/ OR exactly one adapter, never both.');
  for (const c of conflicts) {
    console.error(`  - ${c.subdir}/${c.file}`);
  }
  console.error('');
  console.error(
    'Resolution: keep the file in core/ if it is generic across agents, ' +
    'or in adapters/<agent>/ if it exploits an agent-specific capability. ' +
    'Delete the duplicate from the other location.'
  );
  process.exit(1);
}

function applyOverlay(adapterRoot, targetDir, dests, opts = {}) {
  for (const [sub, destParts] of Object.entries(dests)) {
    const overlaySrc = path.join(adapterRoot, sub);
    if (!fs.existsSync(overlaySrc)) continue;
    const dest = path.join(targetDir, ...destParts);
    const label = opts.upgradeMode ? 'Overlaying (upgrade)' : 'Overlaying';
    console.log(`→ ${label} ${sub} from adapter...`);
    copyDir(overlaySrc, dest, opts);
    if (sub === 'scripts' && fs.existsSync(dest)) {
      for (const f of fs.readdirSync(dest)) {
        if (f.endsWith('.sh')) fs.chmodSync(path.join(dest, f), 0o755);
      }
    }
  }
}

// ── Marker-based upgrade (ENH-010 / FEAT-011) ────────────────────────────────

const MARKER = '## Project Extensions';

/**
 * Split a file's content at the `## Project Extensions` heading.
 * Lossless: `managed + extensions === content` when marker is present.
 * Returns `{managed, extensions}` where `extensions` is null if no marker.
 */
function partitionByMarker(content) {
  const idx = content.indexOf('\n' + MARKER);
  if (idx === -1) return { managed: content, extensions: null };
  return {
    managed: content.slice(0, idx),
    extensions: content.slice(idx), // starts with '\n## Project Extensions'
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
    // Pre-marker file — back up, write fresh template, append old content
    // under the marker so nothing is lost. The user can manually de-dupe.
    fs.copyFileSync(destPath, destPath + '.bak');
    const today = new Date().toISOString().slice(0, 10);
    const migrated =
      srcContent.replace(/\s+$/, '') +
      `\n\n<!-- migrated from pre-marker version on ${today}` +
      ` — original at ${path.basename(destPath)}.bak -->\n` +
      destContent.replace(/\s+$/, '') +
      '\n';
    fs.writeFileSync(destPath, migrated);
    console.log(`  ↻ migrated: ${rel} (no marker — original saved as .bak)`);
    return 'migrated';
  }

  const srcParts = partitionByMarker(srcContent);
  const newContent = srcParts.managed + destParts.extensions;

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

function init(targetDir, agent) {
  const target = path.resolve(targetDir);
  const src = path.join(__dirname, '..');

  // Load adapter
  const { adapterDir, adapter } = loadAdapter(src, agent);
  const dests = adapter.destinations || DEFAULT_OVERLAY_DESTS;
  const coreRoot = path.join(src, 'core');

  // Pre-flight: error before any writes if adapter overlay duplicates a core filename
  failOnOverlayConflicts(coreRoot, adapterDir, agent, dests);

  console.log(`Installing momentum into: ${target} [agent: ${agent}]`);
  console.log('');

  // .claude/commands/
  console.log('→ Installing slash commands...');
  copyDir(
    path.join(src, 'core', 'commands'),
    path.join(target, ...dests.commands)
  );

  // scripts/
  console.log('→ Installing hook scripts...');
  const hookSrc = path.join(src, 'core', 'scripts', 'check-history-reminder.sh');
  const hookDest = path.join(target, ...dests.scripts, 'check-history-reminder.sh');
  copyFile(hookSrc, hookDest);
  fs.chmodSync(hookDest, 0o755);

  // core/engines/
  console.log('→ Installing execution engines...');
  if (fs.existsSync(path.join(src, 'core', 'engines'))) {
    copyDir(
      path.join(src, 'core', 'engines'),
      path.join(target, ...(dests.engines || ['.agent', 'engines']))
    );
  }

  // .agent/rules/project.md
  console.log('→ Installing agent rules...');
  const rulesDest = path.join(target, ...dests['agent-rules'], 'project.md');
  if (!fileExists(rulesDest)) {
    copyFile(
      path.join(src, 'core', 'agent-rules', 'project.md'),
      rulesDest
    );
  } else {
    console.log('  ⚠️  .agent/rules/project.md already exists — skipping (not overwriting).');
  }

  // specs/ skeleton (root instruction file is adapter-owned)
  console.log('→ Scaffolding project specs...');
  const specsSrc = path.join(src, 'core', 'specs-templates');
  copyDir(specsSrc, target, {
    skipIfExists: true,
    skipRelPaths: new Set(['CLAUDE.md']),
  });

  installPrimaryInstruction(src, target, adapterDir, adapter.primaryInstruction);

  // Adapter overlay — per-agent commands/agent-rules/scripts (additive)
  applyOverlay(adapterDir, target, dests);

  // Coding-agent-specific steps
  adapter.runInstall(target, adapterDir, { copyFile, copyDir, fileExists });

  console.log('');
  console.log('✓ momentum installed successfully.');
  console.log('');
  console.log('Next steps:');
  console.log('');
  const displayName = adapter.displayName || agent;
  console.log('  Explore an idea first:');
  console.log(`    Open ${displayName} and run: /brainstorm-idea`);
  console.log('');
  console.log('  Ready to scaffold a project:');
  console.log(`    Open ${displayName} and run: /start-project`);
  console.log('');
  console.log('  Existing project — plan your next phase:');
  console.log(`    Open ${displayName} and run: /brainstorm-phase`);
  console.log('');
  console.log('  See docs: https://github.com/avinash-singh-io/momentum');
}

// ── Upgrade command ───────────────────────────────────────────────────────────

function upgrade(targetDir, agent) {
  const target = path.resolve(targetDir);
  const src = path.join(__dirname, '..');

  // Load adapter
  const { adapterDir, adapter } = loadAdapter(src, agent);
  const dests = adapter.destinations || DEFAULT_OVERLAY_DESTS;
  const coreRoot = path.join(src, 'core');

  // Pre-flight: error before any writes if adapter overlay duplicates a core filename
  failOnOverlayConflicts(coreRoot, adapterDir, agent, dests);

  console.log(`Upgrading momentum in: ${target} [agent: ${agent}]`);
  console.log('');

  const upgradeOpts = { upgradeMode: true, root: target };

  // Upgrade slash commands
  console.log('→ Upgrading slash commands...');
  copyDir(
    path.join(src, 'core', 'commands'),
    path.join(target, ...dests.commands),
    upgradeOpts
  );

  // Upgrade hook scripts
  console.log('→ Upgrading hook scripts...');
  copyDir(
    path.join(src, 'core', 'scripts'),
    path.join(target, ...dests.scripts),
    upgradeOpts
  );
  // Re-apply executable bit to all .sh scripts
  const scriptsDir = path.join(target, ...dests.scripts);
  if (fs.existsSync(scriptsDir)) {
    for (const f of fs.readdirSync(scriptsDir)) {
      if (f.endsWith('.sh')) fs.chmodSync(path.join(scriptsDir, f), 0o755);
    }
  }

  // Upgrade execution engines
  console.log('→ Upgrading execution engines...');
  if (fs.existsSync(path.join(src, 'core', 'engines'))) {
    copyDir(
      path.join(src, 'core', 'engines'),
      path.join(target, ...(dests.engines || ['.agent', 'engines'])),
      upgradeOpts
    );
  }

  // Upgrade agent rules — marker-aware (preserves Project Extensions block)
  console.log('→ Upgrading agent rules...');
  const agentRulesResult = upgradeMarkedFile(
    path.join(src, 'core', 'agent-rules', 'project.md'),
    path.join(target, ...dests['agent-rules'], 'project.md'),
    'agent-rules',
    target
  );

  // Upgrade adapter-owned root instruction file
  const primaryInstructionResult = upgradePrimaryInstruction(
    src,
    target,
    adapterDir,
    adapter.primaryInstruction
  );

  // Adapter overlay upgrade — per-agent commands/agent-rules/scripts (additive)
  applyOverlay(adapterDir, target, dests, upgradeOpts);

  // Delegate adapter-specific upgrade
  adapter.runUpgrade(target, adapterDir, { copyFile, copyDir, fileExists });

  console.log('');
  console.log('✓ Upgrade complete.');
  if (adapter.primaryInstruction) {
    const label = adapter.primaryInstruction.label ||
      adapter.primaryInstruction.destination.join('/');
    console.log(`  ${label}:           ${primaryInstructionResult}`);
  }
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
  --agent <name>                      Agent to install for (default: claude-code)
                                      Available: ${formatAvailableAgents()}
  -h, --help                          Show this help message
  -v, --version                       Show version number

Examples:
  npx @avinash-singh-io/momentum init
  npx @avinash-singh-io/momentum init ./my-project
  npx @avinash-singh-io/momentum init ./my-project --agent claude-code
  npx @avinash-singh-io/momentum upgrade
  npx @avinash-singh-io/momentum upgrade ./my-project
`.trim());
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  // Reject the deprecated --coding-agent flag with a clear rename message.
  if (args.includes('--coding-agent')) {
    console.error('Error: --coding-agent has been renamed to --agent in v0.6.0.');
    console.error('       Re-run with: --agent <name> (e.g., --agent claude-code)');
    process.exit(1);
  }

  // Extract --agent flag before command dispatch
  let agent = 'claude-code';
  const agentFlagIdx = args.indexOf('--agent');
  if (agentFlagIdx !== -1) {
    agent = args[agentFlagIdx + 1];
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
      init(targetDir, agent);
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else if (args[0] === 'upgrade') {
    const targetDir = args[1] || process.cwd();
    try {
      upgrade(targetDir, agent);
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

// Run only when invoked as a CLI, not when required by tests.
if (require.main === module) {
  main();
}

module.exports = {
  // Pure helpers (unit-testable)
  partitionByMarker,
  listFilesRecursive,
  detectOverlayConflicts,
  isNewerVersion,
  MARKER,
  DEFAULT_OVERLAY_DESTS,
  listAvailableAgents,
  formatAvailableAgents,
  // Side-effectful but testable with a tmp dir
  upgradeMarkedFile,
  copyDir,
  copyFile,
  fileExists,
  init,
  upgrade,
};
