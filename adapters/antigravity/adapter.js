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
    commands: ['.antigravity', 'commands'],
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

  configFiles: [],

  capabilities: {
    hooks: true,
    slashCommands: false, // Chat-driven UI rather than a local terminal slash executor
    subagents: true,      // Native subagents capability (invoke_subagent, define_subagent)
    artifacts: true,      // Planning artifacts (task.md, implementation_plan.md, walkthrough.md)
    planningMode: true,   // High-level planning workflow
  },

  runInstall(targetDir, adapterDir, helpers) {
    console.log('→ Configuring Antigravity workspace settings...');
    // Antigravity is dynamically configured by the environment; no local hook config file needed.
  },

  runUpgrade(targetDir, adapterDir, helpers) {
    console.log('→ Upgrading Antigravity workspace settings...');
  },
};
