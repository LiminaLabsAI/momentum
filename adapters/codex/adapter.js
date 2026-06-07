'use strict';

// Codex adapter for momentum.
//
// Codex uses AGENTS.md as its primary repository instruction surface. Generic
// momentum command recipes install into .codex/commands/ so Codex users have a
// Codex-owned command surface instead of reusing Claude Code's .claude/commands.

const fs = require('fs');
const path = require('path');

module.exports = {
  displayName: 'Codex',

  destinations: {
    commands: ['.codex', 'commands'],
    'agent-rules': ['.agent', 'rules'],
    scripts: ['scripts'],
    engines: ['.agent', 'engines'],
  },

  primaryInstruction: {
    source: ['instructions', 'AGENTS.md'],
    destination: ['AGENTS.md'],
    label: 'AGENTS.md',
    markerAware: true,
  },

  configFiles: [
    {
      source: ['hooks.json'],
      destination: ['.codex', 'hooks.json'],
      label: '.codex/hooks.json',
    },
  ],

  capabilities: {
    hooks: true,
    slashCommands: true,
    subagents: true,
    parallelSubagents: false,
    sessionStartHook: true,
    skills: false,
    browser: false,
    computerUse: false,
  },

  roadmap: {
    subagents:
      'Codex declares a subagent surface; parallel-fanout not yet validated by momentum smoke tests. ' +
      'capability-routing treats this as sequential until proven.',
    parallelSubagents:
      'Promote to true once dispatch parallel mode is exercised against Codex in CI.',
    skills: 'Planned for a future Codex feature drop.',
    browser: 'Planned for a future Codex feature drop.',
    computerUse: 'Planned for a future Codex feature drop.',
  },

  runInstall(targetDir, adapterDir, helpers) {
    const { copyFile, fileExists } = helpers;

    console.log('→ Configuring Codex hooks...');
    const hooksDest = path.join(targetDir, '.codex', 'hooks.json');
    if (!fileExists(hooksDest)) {
      copyFile(path.join(adapterDir, 'hooks.json'), hooksDest);
    } else {
      console.log('  ⚠️  .codex/hooks.json already exists.');
      console.log(`     Merge hooks manually from: ${path.join(adapterDir, 'hooks.json')}`);
    }
  },

  runUpgrade(targetDir, adapterDir, helpers) {
    const { copyFile, fileExists } = helpers;

    console.log('→ Upgrading Codex hooks...');
    const src = path.join(adapterDir, 'hooks.json');
    const dest = path.join(targetDir, '.codex', 'hooks.json');

    if (fileExists(dest)) {
      const srcContent = fs.readFileSync(src, 'utf8');
      const destContent = fs.readFileSync(dest, 'utf8');
      if (srcContent !== destContent) {
        fs.copyFileSync(dest, dest + '.bak');
        copyFile(src, dest);
        console.log('  ↑ upgraded: .codex/hooks.json (original saved as .bak)');
      }
    } else {
      copyFile(src, dest);
      console.log('  + added:    .codex/hooks.json');
    }
  },
};
