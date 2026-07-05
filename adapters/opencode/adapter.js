'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// opencode adapter for momentum.
//
// opencode (https://opencode.ai) is a terminal-first AI coding agent with
// native project-level surfaces for every momentum concept: markdown
// commands (.opencode/commands/), JS plugins with blocking pre-tool hooks
// (.opencode/plugins/), markdown agents with per-agent permissions
// (.opencode/agents/), and skills (.opencode/skills/<name>/SKILL.md).
// AGENTS.md is its primary instruction surface. Every surface auto-loads
// from its directory — momentum ships NO opencode.json and never touches
// user-owned config.
//
// Recipes install via the standard overlay into .opencode/commands/ where
// each file IS a native slash command (filename → /<name>). runInstall then
// prepends a `description` frontmatter block (extracted from the recipe's
// first line, same heuristic as the Codex skills transform) so the TUI
// command picker shows what each recipe does.

module.exports = {
  displayName: 'opencode',

  destinations: {
    commands: ['.opencode', 'commands'],
    'agent-rules': ['.agent', 'rules'],
    scripts: ['scripts'],
    engines: ['.agent', 'engines'],
    // workflows declared but unused on opencode (no native workflow surface;
    // recipes are commands)
    workflows: ['.opencode', 'workflows'],
    skills: ['.opencode', 'skills'],
    agents: ['.opencode', 'agents'],
  },

  primaryInstruction: {
    source: ['instructions', 'AGENTS.md'],
    destination: ['AGENTS.md'],
    label: 'AGENTS.md',
    markerAware: true,
  },

  configFiles: [
    {
      source: ['plugins', 'momentum.js'],
      destination: ['.opencode', 'plugins', 'momentum.js'],
      label: '.opencode/plugins/momentum.js',
    },
  ],

  capabilities: {
    hooks: true, // .opencode/plugins/momentum.js — tool.execute.before/after + session.created
    slashCommands: true, // recipes at .opencode/commands/ register natively as /<name>
    subagents: true, // momentum-reviewer-* + swarm-supervisor at .opencode/agents/
    parallelSubagents: false, // flips only on live evidence of task-tool fan-out (Phase 22 G5)
    sessionStartHook: false, // wired via session.created; flips only on live evidence (Phase 22 G5)
    skills: false, // wired at .opencode/skills/; flips only on live skill-tool discovery evidence (Phase 22 G5)
    browser: false,
    computerUse: false,
    planningMode: true, // built-in read-only Plan agent (Tab-cycle primary)
  },

  roadmap: {
    parallelSubagents:
      'opencode docs describe task-tool parallel fan-out; promote on Phase 22 G5 live evidence, not docs.',
    sessionStartHook:
      'Wired via the session.created plugin event; promote on Phase 22 G5 live evidence of the event firing.',
    skills:
      'Shipped at .opencode/skills/<name>/SKILL.md (native surface, opencode ≥1.17); promote on Phase 22 G5 live skill-tool discovery evidence.',
  },

  runInstall(targetDir, adapterDir, helpers) {
    const { copyFile, fileExists, recordManaged, dryRun } = helpers;

    console.log('→ Configuring momentum plugin for opencode...');
    const pluginDest = path.join(targetDir, '.opencode', 'plugins', 'momentum.js');
    if (recordManaged) recordManaged(pluginDest); // managed regardless of write
    if (!fileExists(pluginDest)) {
      copyFile(path.join(adapterDir, 'plugins', 'momentum.js'), pluginDest);
    } else {
      console.log('  ⚠️  .opencode/plugins/momentum.js already exists.');
      console.log(`     Merge manually from: ${path.join(adapterDir, 'plugins', 'momentum.js')}`);
    }

    console.log('→ Adding command frontmatter for the opencode TUI picker...');
    if (dryRun) console.log('  ✋ would add description frontmatter to .opencode/commands/*.md');
    else ensureCommandFrontmatter(targetDir);
  },

  runUpgrade(targetDir, adapterDir, helpers) {
    const { copyFile, fileExists, recordManaged, dryRun } = helpers;

    console.log('→ Upgrading momentum plugin for opencode...');
    const src = path.join(adapterDir, 'plugins', 'momentum.js');
    const dest = path.join(targetDir, '.opencode', 'plugins', 'momentum.js');
    if (recordManaged) recordManaged(dest); // managed even when identical-skip

    if (fileExists(dest)) {
      const srcContent = fs.readFileSync(src, 'utf8');
      const destContent = fs.readFileSync(dest, 'utf8');
      if (srcContent !== destContent) {
        if (dryRun) {
          console.log('  ✋ would upgrade: .opencode/plugins/momentum.js');
        } else {
          fs.copyFileSync(dest, dest + '.bak');
          copyFile(src, dest);
          console.log('  ↑ upgraded: .opencode/plugins/momentum.js (original saved as .bak)');
        }
      }
    } else {
      copyFile(src, dest);
      console.log(`  ${dryRun ? '✋ would add:   ' : '+ added:   '} .opencode/plugins/momentum.js`);
    }

    console.log('→ Refreshing command frontmatter...');
    if (dryRun) console.log('  ✋ would refresh description frontmatter on .opencode/commands/*.md');
    else ensureCommandFrontmatter(targetDir);
  },

  // adapter.spawn(directive) — Phase 18 contract. Shells `opencode run` in
  // non-interactive mode with the supervisor agent; `--dir` pins the
  // supervisor's working directory to its repo (no MCP cwd shim needed,
  // unlike Codex). See `bin/momentum.js` for the directive contract.
  spawn(directive) {
    if (!directive || directive.platform !== 'opencode') {
      return {
        repoId: directive && directive.repoId,
        status: -1,
        detail: `non-opencode platform: ${directive && directive.platform}`,
      };
    }
    const opencodeBin = process.env.OPENCODE_BIN || 'opencode';
    const prompt = [
      `You are a swarm supervisor. Recipe: ${directive.recipePath}`,
      `Read the recipe and the brief at specs/phases/${directive.phaseSlug}/overview.md.`,
      `Your repo: ${directive.repoId}. Your swarm: ${directive.swarmId} wave ${directive.wave}.`,
      `Begin the boot sequence.`,
    ].join('\n');
    const args = ['run', '--dir', directive.repoPath, '--agent', 'swarm-supervisor', prompt];
    const r = spawnSync(opencodeBin, args, {
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

// ─── Command frontmatter transform ───────────────────────────────────────────
//
// opencode registers every .opencode/commands/*.md file as a /<name> command
// as-is; the optional YAML frontmatter `description` is what the TUI's
// command picker displays. Recipes follow the house style where line 1 is a
// one-sentence "what it does", so reuse it (same heuristic as the Codex
// skills transform). Idempotent: files that already start with frontmatter
// are left untouched.
function ensureCommandFrontmatter(targetDir) {
  const commandsDir = path.join(targetDir, '.opencode', 'commands');
  if (!fs.existsSync(commandsDir)) {
    console.log('  (no .opencode/commands/ to annotate — skipping)');
    return;
  }
  let count = 0;
  for (const file of fs.readdirSync(commandsDir)) {
    if (!file.endsWith('.md')) continue;
    const filePath = path.join(commandsDir, file);
    const body = fs.readFileSync(filePath, 'utf8');
    if (body.startsWith('---\n')) continue; // already has frontmatter
    const description = extractRecipeDescription(body, file.replace(/\.md$/, ''));
    const frontmatter = `---\ndescription: ${yamlQuote(description)}\n---\n\n`;
    fs.writeFileSync(filePath, frontmatter + body);
    count++;
  }
  console.log(`  + description frontmatter added to ${count} command(s)`);
}

// First non-heading, non-blank, non-blockquote line of the recipe.
function extractRecipeDescription(body, name) {
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#') || trimmed.startsWith('>')) continue;
    // Truncate to a single-sentence-ish length for the picker.
    return trimmed.length > 200 ? `${trimmed.slice(0, 197)}...` : trimmed;
  }
  return `momentum ${name} recipe`;
}

function yamlQuote(s) {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
