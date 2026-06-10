'use strict';

// Antigravity adapter for momentum.
//
// Antigravity is a chat-based advanced agentic AI coding assistant.
// It uses AGENTS.md as its primary instruction surface.
// Commands install into .antigravity/commands/ for tool guidance.

const fs = require('fs');
const path = require('path');

module.exports = {
  displayName: 'Antigravity',

  destinations: {
    // Phase 16: realigned from `.antigravity/` to `.agents/` to match
    // the `agy` CLI's documented plugin/project layout. The previous path
    // was invisible to `agy`.
    commands: ['.agents', 'commands'],
    'agent-rules': ['.agent', 'rules'],
    scripts: ['scripts'],
    engines: ['.agent', 'engines'],
    agents: ['.agents', 'agents'],
    skills: ['.agents', 'skills'],
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
      destination: ['.agents', 'hooks.json'],
      label: '.agents/hooks.json',
    },
  ],

  capabilities: {
    hooks: true,
    slashCommands: false, // `agy` ships built-in slash commands; custom per-project not a documented surface
    subagents: true,      // Native subagents (parallel parent → child delegation)
    parallelSubagents: true,
    sessionStartHook: false, // Hook event not yet confirmed; AGENTS.md text is the fallback path
    skills: true,         // `.agents/skills/` SKILL.md surface — momentum ships momentum-orient at install
    browser: false,
    computerUse: false,
    artifacts: true,      // Antigravity-specific planning artifacts (task.md / implementation_plan.md / walkthrough.md)
    planningMode: true,   // Agent-Assisted Mode + Planning Mode
  },

  roadmap: {
    slashCommands:
      '`agy` ships built-in slash commands; custom per-project slash commands are not yet a documented vendor surface. Orchestration primitives reach Antigravity users via natural-language inference + the momentum CLI floor. Flip to true if `agy` later documents a custom-slash-command discovery path.',
    sessionStartHook:
      'SessionStart hook event support not yet confirmed in current `agy` docs. The hooks.json entry ships anyway; handoff pickup hint also lives in AGENTS.md primary-instruction text as a fallback. Group 4 dogfood will verify whether the wired SessionStart actually fires; flip when confirmed.',
  },

  runInstall(targetDir, adapterDir, helpers) {
    const { copyFile, fileExists } = helpers;

    console.log('→ Configuring Antigravity hooks...');
    const hooksDest = path.join(targetDir, '.agents', 'hooks.json');
    if (!fileExists(hooksDest)) {
      copyFile(path.join(adapterDir, 'hooks.json'), hooksDest);
    } else {
      console.log('  ⚠️  .agents/hooks.json already exists.');
      console.log(`     Merge hooks manually from: ${path.join(adapterDir, 'hooks.json')}`);
    }
  },

  runUpgrade(targetDir, adapterDir, helpers) {
    const { copyFile, fileExists } = helpers;

    console.log('→ Upgrading Antigravity hooks...');
    const src = path.join(adapterDir, 'hooks.json');
    const dest = path.join(targetDir, '.agents', 'hooks.json');

    if (fileExists(dest)) {
      const srcContent = fs.readFileSync(src, 'utf8');
      const destContent = fs.readFileSync(dest, 'utf8');
      if (srcContent !== destContent) {
        fs.copyFileSync(dest, dest + '.bak');
        copyFile(src, dest);
        console.log('  ↑ upgraded: .agents/hooks.json (original saved as .bak)');
      }
    } else {
      copyFile(src, dest);
      console.log('  + added:    .agents/hooks.json');
    }
  },
};
