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
          console.log(`  ↑ upgraded: ${path.relative(process.cwd(), dest)} (original saved as .bak)`);
        }
        // identical — silent skip
      } else {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
        console.log(`  + added:    ${path.relative(process.cwd(), dest)}`);
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

  // Upgrade slash commands
  console.log('→ Upgrading slash commands...');
  copyDir(
    path.join(src, 'core', 'commands'),
    path.join(target, '.claude', 'commands'),
    { upgradeMode: true }
  );

  // Upgrade hook scripts
  console.log('→ Upgrading hook scripts...');
  copyDir(
    path.join(src, 'core', 'scripts'),
    path.join(target, 'scripts'),
    { upgradeMode: true }
  );
  // Re-apply executable bit to all .sh scripts
  const scriptsDir = path.join(target, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    for (const f of fs.readdirSync(scriptsDir)) {
      if (f.endsWith('.sh')) fs.chmodSync(path.join(scriptsDir, f), 0o755);
    }
  }

  // Upgrade agent rules
  console.log('→ Upgrading agent rules...');
  copyDir(
    path.join(src, 'core', 'agent-rules'),
    path.join(target, '.agent', 'rules'),
    { upgradeMode: true }
  );

  // Delegate adapter-specific upgrade
  adapter.runUpgrade(target, adapterDir, { copyFile, copyDir, fileExists });

  console.log('');
  console.log('✓ Upgrade complete.');
  console.log('');
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

const args = process.argv.slice(2);

// Extract --coding-agent flag before command dispatch
let codingAgent = 'claude-code';
const agentFlagIdx = args.indexOf('--coding-agent');
if (agentFlagIdx !== -1) {
  codingAgent = args[agentFlagIdx + 1];
  args.splice(agentFlagIdx, 2);
}

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  usage();
  process.exit(args.length === 0 ? 1 : 0);
}

if (args[0] === '--version' || args[0] === '-v') {
  console.log(pkg.version);
  process.exit(0);
}

if (args[0] === 'init') {
  const targetDir = args[1] || process.cwd();
  try {
    init(targetDir, codingAgent);
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  }
  process.exit(0);
}

if (args[0] === 'upgrade') {
  const targetDir = args[1] || process.cwd();
  try {
    upgrade(targetDir, codingAgent);
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  }
  process.exit(0);
}

console.error(`Unknown command: ${args[0]}`);
console.error('Run "momentum --help" for usage.');
process.exit(1);
