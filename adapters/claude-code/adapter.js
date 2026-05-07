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

module.exports = {
  destinations: {
    commands: ['.claude', 'commands'],
    'agent-rules': ['.agent', 'rules'],
    scripts: ['scripts'],
  },

  runInstall(targetDir, adapterDir, helpers) {
    const { copyFile, fileExists } = helpers;

    // .claude/settings.json
    console.log('→ Configuring Claude Code hooks...');
    const settingsDest = path.join(targetDir, '.claude', 'settings.json');
    if (!fileExists(settingsDest)) {
      copyFile(path.join(adapterDir, 'settings.json'), settingsDest);
    } else {
      console.log('  ⚠️  .claude/settings.json already exists.');
      console.log(`     Merge hooks manually from: ${path.join(adapterDir, 'settings.json')}`);
    }
  },

  runUpgrade(targetDir, adapterDir, helpers) {
    const { copyFile, fileExists } = helpers;

    // .claude/settings.json
    console.log('→ Upgrading Claude Code hooks...');
    const src = path.join(adapterDir, 'settings.json');
    const dest = path.join(targetDir, '.claude', 'settings.json');

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
};
