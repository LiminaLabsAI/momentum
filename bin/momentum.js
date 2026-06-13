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
  // Phase 16 Rework: copy the entire core/scripts/ tree. Previously only
  // check-history-reminder.sh was copied explicitly; brainstorm-gate.sh
  // lived in adapters/claude-code/scripts/ and reached the target via
  // the overlay. brainstorm-gate.sh now ships from core so Codex and
  // Antigravity also pick it up via the same scripts/ destination.
  copyDir(
    path.join(src, 'core', 'scripts'),
    path.join(target, ...dests.scripts)
  );
  for (const f of fs.readdirSync(path.join(target, ...dests.scripts))) {
    if (f.endsWith('.sh')) {
      fs.chmodSync(path.join(target, ...dests.scripts, f), 0o755);
    }
  }
  // Phase 9 — ecosystem session-append helper, sourced by check-history-reminder.
  const sessionSrc = path.join(src, 'core', 'ecosystem', 'scripts', 'session-append.sh');
  if (fs.existsSync(sessionSrc)) {
    const sessionDest = path.join(target, ...dests.scripts, 'session-append.sh');
    copyFile(sessionSrc, sessionDest);
    fs.chmodSync(sessionDest, 0o755);
  }

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
  // Phase 9 — ecosystem session-append helper lives outside core/scripts/
  // (it belongs to the ecosystem subsystem) but ships alongside the hook.
  const sessionUpgradeSrc = path.join(src, 'core', 'ecosystem', 'scripts', 'session-append.sh');
  if (fs.existsSync(sessionUpgradeSrc)) {
    const sessionUpgradeDest = path.join(target, ...dests.scripts, 'session-append.sh');
    copyFile(sessionUpgradeSrc, sessionUpgradeDest);
  }
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
momentum v${pkg.version} — Agent-agnostic, specs-driven development framework

Use momentum for a single project, or to orchestrate multiple related
projects as one ecosystem from a single agent session.

Single-project use:
  momentum init [target-dir]          Scaffold momentum into one project
                                      (defaults to current directory)
  momentum upgrade [target-dir]       Update momentum files in an existing project

Ecosystem use — entry/exit commands (run from any repo):
  momentum init --ecosystem <name>    Scaffold an ecosystem in a sibling dir
                                      and register this repo as the first member
  momentum join <ecosystem-path>      Register THIS repo as a member of an
                                      existing ecosystem
  momentum leave                      Detach THIS repo from its ecosystem
  momentum doctor                     Diagnose state + list available transitions

Ecosystem use — operator toolkit (advanced):
  momentum ecosystem <sub> [...]      Subcommands: init | add | remove | status

Orchestration — work across ecosystem members from one session:
  momentum scout <repo> "<prompt>"    Read-only context fetch from one member
  momentum dispatch <r1> <r2> ...     Parallel multi-repo fan-out + synthesis
    --prompt "<text>"                 (require --prompt; --sequential for testing)
  momentum handoff <repo>             Write a context block for <repo> to pick up
  momentum continue [--handoff <id>]  Pick up a pending handoff in this repo

Swarm — sustained parallel multi-project feature delivery (Phase 17+, Claude Code):
  momentum swarm <sub> [...]          Subcommands: start | status | tell | broadcast |
                                       verify | complete | resume | cancel | budget |
                                       claim | release | focus

Options:
  --agent <name>                      Agent to install for (default: claude-code)
                                      Available: ${formatAvailableAgents()}
  --no-ecosystem                      Skip the post-init auto-detect prompt
  -h, --help                          Show this help message
  -v, --version                       Show version number

Examples:
  # Single project (unchanged from v0.12.0):
  npx @avinash-singh-io/momentum init
  npx @avinash-singh-io/momentum init ./my-project --agent codex

  # Ecosystem from scratch:
  npx @avinash-singh-io/momentum init --ecosystem my-eco

  # Add THIS repo to an existing ecosystem:
  npx @avinash-singh-io/momentum join ../my-eco

  # Where am I?
  npx @avinash-singh-io/momentum doctor
`.trim());
}

// ── Phase 10 init extensions: --ecosystem + auto-detect ──────────────────────

/**
 * Parse Phase 10 init-only flags out of argv in place.
 * Removes the matched tokens; returns the parsed options + remaining target.
 *
 * Supported flags:
 *   --ecosystem <name>     Scaffold ecosystem in sibling dir, register this repo.
 *   --no-ecosystem         Bypass the post-init auto-detect prompt.
 */
function extractInitFlags(args) {
  // args[0] === 'init' — leave it; consume the rest.
  const out = { target: undefined, ecosystem: undefined, noEcosystem: false };
  const filtered = ['init'];
  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === '--ecosystem') {
      out.ecosystem = args[i + 1];
      i++;
    } else if (a === '--no-ecosystem') {
      out.noEcosystem = true;
    } else if (!out.target && !a.startsWith('--')) {
      out.target = a;
    } else {
      filtered.push(a);
    }
  }
  // Splice in place so any downstream consumers see the cleaned args.
  args.length = 0;
  for (const a of filtered) args.push(a);
  return out;
}

/**
 * After `init` succeeds, optionally:
 *   - scaffold an ecosystem (when --ecosystem <name> was passed)
 *   - prompt the user to register as a member (auto-detect)
 *
 * Single-project usage (no flags, no adjacent ecosystem) is a no-op.
 */
async function postInitEcosystem(targetDir, opts) {
  const target = path.resolve(targetDir);
  if (opts.ecosystem) {
    return scaffoldEcosystemAndJoin(target, opts.ecosystem);
  }
  if (opts.noEcosystem) return;
  return maybePromptForAutoEcosystem(target);
}

function scaffoldEcosystemAndJoin(target, ecosystemName) {
  if (!/^[a-z][a-z0-9-]*$/.test(ecosystemName)) {
    throw new Error(
      `init --ecosystem: name "${ecosystemName}" must match /^[a-z][a-z0-9-]*$/.`,
    );
  }
  const parentDir = path.dirname(target);
  const ecosystemDir = path.join(parentDir, ecosystemName);
  if (fs.existsSync(ecosystemDir)) {
    throw new Error(
      `init --ecosystem: ${ecosystemDir} already exists. Refusing to overwrite.`,
    );
  }

  const { runEcosystem } = require('./ecosystem');
  const pointer = require('../core/ecosystem/lib/pointer');

  let createdEcosystem = false;
  let injectedPointer = false;
  const cwd0 = process.cwd();
  try {
    // Scaffold the ecosystem root via existing CLI surface, run from parentDir
    // so cmdInit creates ./<name>/ under it.
    process.chdir(parentDir);
    runEcosystem(['init', ecosystemName]);
    createdEcosystem = true;

    // Now register this repo as a member, using realpathed absolutes so
    // path.relative produces a clean ../target instead of a cross-symlink
    // monstrosity (on macOS where /tmp → /private/tmp).
    process.chdir(target);
    let targetReal = target;
    let ecosystemReal = ecosystemDir;
    try { targetReal = fs.realpathSync(target); } catch (_e) {}
    try { ecosystemReal = fs.realpathSync(ecosystemDir); } catch (_e) {}
    runEcosystem(['add', targetReal, '--ecosystem', ecosystemReal]);
    injectedPointer = true;
  } catch (err) {
    // Rollback partial state.
    if (createdEcosystem && fs.existsSync(ecosystemDir)) {
      try {
        fs.rmSync(ecosystemDir, { recursive: true, force: true });
      } catch (_e) { /* best-effort */ }
    }
    if (injectedPointer) {
      const primary = pointer.findPrimaryInstructionFile(target);
      if (primary) {
        try {
          pointer.stripPointer(path.join(target, primary));
        } catch (_e) { /* best-effort */ }
      }
    }
    throw err;
  } finally {
    process.chdir(cwd0);
  }

  console.log('');
  console.log(`✓ Ecosystem "${ecosystemName}" created at ${ecosystemDir}`);
  console.log(`  This project is registered as the first member.`);
  console.log('');
  console.log('  Add another repo:');
  console.log(`    cd <other-repo> && momentum join ${path.relative(process.cwd(), ecosystemDir) || ecosystemDir}`);
}

async function maybePromptForAutoEcosystem(target) {
  const skipFile = path.join(target, '.momentum', 'skip-ecosystem-prompt');
  if (fs.existsSync(skipFile)) return;

  const parentDir = path.dirname(target);
  let entries;
  try {
    entries = fs.readdirSync(parentDir, { withFileTypes: true });
  } catch (_e) {
    return;
  }

  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const candidate = path.join(parentDir, e.name);
    if (candidate === target) continue;
    const manifestPath = path.join(candidate, 'ecosystem.json');
    if (!fs.existsSync(manifestPath)) continue;
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (_err) {
      continue;
    }
    if (!manifest || !manifest.name) continue;

    // Non-interactive: silently skip (no skip-file written; a future
    // interactive session can still prompt).
    if (!process.stdin.isTTY) return;

    const accepted = await promptYesNo(
      `Detected ecosystem "${manifest.name}" at ${path.relative(target, candidate) || candidate}.\n` +
        `Register this project as a member? [y/N] `,
    );
    if (accepted) {
      const { runEcosystem } = require('./ecosystem');
      const cwd0 = process.cwd();
      try {
        process.chdir(target);
        let targetReal = target;
        let candidateReal = candidate;
        try { targetReal = fs.realpathSync(target); } catch (_e) {}
        try { candidateReal = fs.realpathSync(candidate); } catch (_e) {}
        runEcosystem(['add', targetReal, '--ecosystem', candidateReal]);
        console.log(`✓ Registered as a member of "${manifest.name}".`);
      } finally {
        process.chdir(cwd0);
      }
    } else {
      try {
        fs.mkdirSync(path.dirname(skipFile), { recursive: true });
        fs.writeFileSync(skipFile, 'declined at init time\n');
      } catch (_e) { /* best-effort */ }
    }
    return;
  }
}

function promptYesNo(question) {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test((answer || '').trim()));
    });
  });
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
    const initOpts = extractInitFlags(args);
    const targetDir = initOpts.target || process.cwd();
    try {
      init(targetDir, agent);
      await postInitEcosystem(targetDir, initOpts);
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
  } else if (args[0] === 'ecosystem') {
    try {
      const { runEcosystem } = require('./ecosystem');
      runEcosystem(args.slice(1));
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else if (args[0] === 'join') {
    try {
      const { cmdJoin } = require('./state-commands');
      cmdJoin(args.slice(1));
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else if (args[0] === 'leave') {
    try {
      const { cmdLeave } = require('./state-commands');
      cmdLeave(args.slice(1));
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else if (args[0] === 'doctor') {
    try {
      const { cmdDoctor } = require('./state-commands');
      cmdDoctor(args.slice(1));
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else if (args[0] === 'scout') {
    try {
      const { cmdScout } = require('./orchestration-commands');
      await cmdScout(args.slice(1));
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else if (args[0] === 'dispatch') {
    try {
      const { cmdDispatch } = require('./orchestration-commands');
      await cmdDispatch(args.slice(1));
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else if (args[0] === 'handoff') {
    try {
      const { cmdHandoff } = require('./orchestration-commands');
      await cmdHandoff(args.slice(1));
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else if (args[0] === 'continue') {
    try {
      const { cmdContinue } = require('./orchestration-commands');
      await cmdContinue(args.slice(1));
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      exitCode = 1;
    }
  } else if (args[0] === 'swarm') {
    try {
      const { runSwarm } = require('./swarm');
      runSwarm(args.slice(1));
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
