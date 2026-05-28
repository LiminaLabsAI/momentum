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
    subagents: 'codex-specific; not used by momentum v0.9.0',
    skills: 'future',
    browser: 'future',
    computerUse: 'future',
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
