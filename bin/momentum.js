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

function copyDir(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    const src = path.join(srcDir, file);
    const dest = path.join(destDir, file);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dest);
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

function init(targetDir) {
  const target = path.resolve(targetDir);
  const src = path.join(__dirname, '..');

  console.log(`Installing momentum into: ${target} [coding-agent: claude-code]`);
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

  // .claude/settings.json
  console.log('→ Configuring Claude Code hooks...');
  const settingsDest = path.join(target, '.claude', 'settings.json');
  if (!fileExists(settingsDest)) {
    copyFile(
      path.join(src, 'adapters', 'claude-code', 'settings.json'),
      settingsDest
    );
  } else {
    console.log('  ⚠️  .claude/settings.json already exists.');
    console.log(`     Merge hooks manually from: ${path.join(src, 'adapters', 'claude-code', 'settings.json')}`);
  }

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

  console.log('');
  console.log('✓ momentum installed successfully.');
  console.log('');
  console.log('Next steps:');
  console.log('');
  console.log('  New project from an idea:');
  console.log('    /brainstorm-project');
  console.log('');
  console.log('  Existing project — plan your next phase:');
  console.log('    /brainstorm-phase');
  console.log('');
  console.log('  Or start a phase directly:');
  console.log('    /start-phase');
  console.log('');
  console.log('  See docs: https://github.com/avinash-singh-io/momentum');
}

// ── Usage ─────────────────────────────────────────────────────────────────────

function usage() {
  console.log(`
momentum v${pkg.version} — Spec-driven development toolkit for AI coding agents

Usage:
  momentum init [target-dir]   Scaffold momentum into a project directory
                               (defaults to current directory)

Options:
  -h, --help                   Show this help message
  -v, --version                Show version number

Examples:
  npx @avinash-singh-io/momentum init
  npx @avinash-singh-io/momentum init ./my-project
`.trim());
}

// ── Entry point ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

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
    init(targetDir);
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  }
  process.exit(0);
}

console.error(`Unknown command: ${args[0]}`);
console.error('Run "momentum --help" for usage.');
process.exit(1);
