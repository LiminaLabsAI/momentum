'use strict';

// Claude Code adapter for momentum.
//
// Two responsibilities:
//
//   1. Declare destinations — where overlay subdirs (commands, agent-rules,
//      scripts) land in the target project. The CLI uses these for both core
//      copies AND any adapter overlay files placed at:
//        adapters/claude-code/commands/      → .claude/commands/
//        adapters/claude-code/agent-rules/   → .agent/rules/
//        adapters/claude-code/scripts/       → scripts/
//
//   2. runInstall / runUpgrade — anything that isn't a plain file copy
//      (currently: wiring `.claude/settings.json` for hooks).
//
// Overlay contract (Phase 6 / FEAT-012): a given filename lives in EITHER
// `core/<sub>/` OR `adapters/claude-code/<sub>/`, never both. The CLI errors
// before any writes if a duplicate is detected.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

module.exports = {
  displayName: 'Claude Code',

  destinations: {
    commands: ['.claude', 'commands'],
    'agent-rules': ['.agent', 'rules'],
    scripts: ['scripts'],
    engines: ['.agent', 'engines'],
    // Phase 16 Rework: uniform contract — declared but unused on Claude
    // Code (no overlay content shipped). Claude Code has no per-project
    // workflows/skills/subagent file-discovery surface today; the
    // destinations are reserved for cross-adapter contract consistency.
    workflows: ['.claude', 'workflows'],
    skills: ['.claude', 'skills'],
    agents: ['.claude', 'agents'],
  },

  primaryInstruction: {
    source: ['core', 'specs-templates', 'CLAUDE.md'],
    sourceBase: 'package',
    destination: ['CLAUDE.md'],
    label: 'CLAUDE.md',
    markerAware: true,
  },

  configFiles: [
    {
      source: ['settings.json'],
      destination: ['.claude', 'settings.json'],
      label: '.claude/settings.json',
    },
  ],

  capabilities: {
    hooks: true,
    slashCommands: true,
    subagents: true,
    parallelSubagents: true,
    sessionStartHook: true,
    skills: false,
    browser: false,
    computerUse: false,
  },

  roadmap: {},

  runInstall(targetDir, adapterDir, helpers) {
    const { copyFile, fileExists, recordManaged } = helpers;

    // .claude/settings.json
    console.log('→ Configuring Claude Code hooks...');
    const settingsDest = path.join(targetDir, '.claude', 'settings.json');
    // Record as adapter-managed regardless of whether we write it, so the
    // lock file is complete and orphan cleanup never drops it (Phase 20).
    if (recordManaged) recordManaged(settingsDest);
    if (!fileExists(settingsDest)) {
      copyFile(path.join(adapterDir, 'settings.json'), settingsDest);
    } else {
      console.log('  ⚠️  .claude/settings.json already exists.');
      console.log(`     Merge hooks manually from: ${path.join(adapterDir, 'settings.json')}`);
    }
  },

  runUpgrade(targetDir, adapterDir, helpers) {
    const { copyFile, fileExists, recordManaged } = helpers;

    // .claude/settings.json
    console.log('→ Upgrading Claude Code hooks...');
    const src = path.join(adapterDir, 'settings.json');
    const dest = path.join(targetDir, '.claude', 'settings.json');
    if (recordManaged) recordManaged(dest); // managed even when identical-skip

    if (fileExists(dest)) {
      const srcContent = fs.readFileSync(src, 'utf8');
      const destContent = fs.readFileSync(dest, 'utf8');
      if (srcContent !== destContent) {
        fs.copyFileSync(dest, dest + '.bak');
        copyFile(src, dest);
        console.log(`  ↑ upgraded: .claude/settings.json (original saved as .bak)`);
      }
      // identical — silent skip
    } else {
      copyFile(src, dest);
      console.log(`  + added:    .claude/settings.json`);
    }
  },

  // Phase 18 — adapter.spawn(directive) contract.
  // Launch ONE Claude Code background session for this directive via
  // `claude --bg --cwd <repoPath>`. Pipes the supervisor recipe + brief
  // pointer over stdin. Returns the canonical per-repo result shape.
  // See `bin/momentum.js` for the directive contract.
  spawn(directive) {
    if (!directive || directive.platform !== 'claude-code') {
      return {
        repoId: directive && directive.repoId,
        status: -1,
        detail: `non-claude-code platform: ${directive && directive.platform}`,
      };
    }
    const claudeBin = process.env.CLAUDE_CODE_BIN || 'claude';
    const args = ['--bg', '--cwd', directive.repoPath];
    const prompt = [
      `You are a swarm supervisor. Recipe: ${directive.recipePath}`,
      `Read the recipe and the brief at specs/phases/${directive.phaseSlug}/overview.md.`,
      `Begin the boot sequence.`,
    ].join('\n');
    const r = spawnSync(claudeBin, args, {
      input: prompt,
      env: Object.assign({}, process.env, directive.env),
      encoding: 'utf8',
      timeout: 5000,
    });
    return {
      repoId: directive.repoId,
      status: r.status == null ? -1 : r.status,
      detail: (r.error && r.error.message) || (r.stderr || '').slice(0, 200),
    };
  },
};
