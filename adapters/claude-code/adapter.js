'use strict';

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
};
