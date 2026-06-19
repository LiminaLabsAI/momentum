'use strict';

// Antigravity adapter for momentum.
//
// Antigravity is a chat-based advanced agentic AI coding assistant.
// It uses AGENTS.md as its primary instruction surface.
// Commands install into .antigravity/commands/ for tool guidance.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

module.exports = {
  displayName: 'Antigravity',

  destinations: {
    // Phase 16 Rework: native Antigravity surfaces.
    // Antigravity has no commands/ concept — recipes are workflows.
    // Workflows live at .agent/workflows/ (singular per official docs;
    //   Google codelab uses .agents/workflows/ — gated on Group 4 smoke).
    // Skills live at .agents/skills/ (shared convention with Codex).
    // agents/ declared but unused — personas live as skills on Antigravity.
    commands: ['.agent', 'workflows'], // legacy commands key reused — overlay still feeds via destinations[commands]
    'agent-rules': ['.agent', 'rules'],
    scripts: ['scripts'],
    engines: ['.agent', 'engines'],
    workflows: ['.agent', 'workflows'],
    skills: ['.agents', 'skills'],
    agents: ['.agents', 'agents'],
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
    slashCommands: true,  // Phase 16 Rework: workflows at .agent/workflows/<name>.md auto-register as /<name> per official docs
    subagents: true,
    parallelSubagents: true,
    sessionStartHook: false, // Phase 16 Rework: hook is wired; SessionStart event support pending VAL-002 confirmation
    skills: true,         // Phase 16 Rework: .agents/skills/ overlay ships momentum-orient + 3 reviewers
    browser: false,
    computerUse: false,
    artifacts: true,
    planningMode: true,
  },

  roadmap: {
    sessionStartHook:
      'Phase 16 Rework: hook is wired in .agents/hooks.json. Whether `agy` actually fires the SessionStart event is pending VAL-002 live confirmation; AGENTS.md text carries fallback handoff hint.',
  },

  runInstall(targetDir, adapterDir, helpers) {
    const { copyFile, fileExists, recordManaged } = helpers;

    console.log('→ Configuring Antigravity hooks...');
    const hooksDest = path.join(targetDir, '.agents', 'hooks.json');
    if (recordManaged) recordManaged(hooksDest); // managed regardless of write
    if (!fileExists(hooksDest)) {
      copyFile(path.join(adapterDir, 'hooks.json'), hooksDest);
    } else {
      console.log('  ⚠️  .agents/hooks.json already exists.');
      console.log(`     Merge hooks manually from: ${path.join(adapterDir, 'hooks.json')}`);
    }
  },

  runUpgrade(targetDir, adapterDir, helpers) {
    const { copyFile, fileExists, recordManaged, dryRun } = helpers;

    console.log('→ Upgrading Antigravity hooks...');
    const src = path.join(adapterDir, 'hooks.json');
    const dest = path.join(targetDir, '.agents', 'hooks.json');
    if (recordManaged) recordManaged(dest); // managed even when identical-skip

    if (fileExists(dest)) {
      const srcContent = fs.readFileSync(src, 'utf8');
      const destContent = fs.readFileSync(dest, 'utf8');
      if (srcContent !== destContent) {
        if (dryRun) {
          console.log('  ✋ would upgrade: .agents/hooks.json');
        } else {
          fs.copyFileSync(dest, dest + '.bak');
          copyFile(src, dest);
          console.log('  ↑ upgraded: .agents/hooks.json (original saved as .bak)');
        }
      }
    } else {
      copyFile(src, dest);
      console.log('  + added:    .agents/hooks.json');
    }
  },

  // Phase 18 G2 — adapter.spawn(directive) for Antigravity.
  // Shells `agy` via the Agent Manager primitive, passing the
  // supervisor skill as the persona and the directive's repoPath as
  // the cwd. Exploits Antigravity's `parallelSubagents: true`
  // capability — one supervisor per repo can run concurrently.
  // See `bin/momentum.js` for the directive contract.
  spawn(directive) {
    if (!directive || directive.platform !== 'antigravity') {
      return {
        repoId: directive && directive.repoId,
        status: -1,
        detail: `non-antigravity platform: ${directive && directive.platform}`,
      };
    }
    const agyBin = process.env.AGY_BIN || 'agy';
    const args = ['--cwd', directive.repoPath, '--skill', 'swarm-supervisor'];
    const prompt = [
      `You are a swarm supervisor. Recipe: ${directive.recipePath}`,
      `Read the recipe and the brief at specs/phases/${directive.phaseSlug}/overview.md.`,
      `Your repo: ${directive.repoId}. Your swarm: ${directive.swarmId} wave ${directive.wave}.`,
      `Begin the boot sequence.`,
    ].join('\n');
    const r = spawnSync(agyBin, args, {
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
