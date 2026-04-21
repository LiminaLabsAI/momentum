'use strict';

const fs = require('fs');
const path = require('path');

module.exports = {
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
