'use strict';

// Codex adapter for momentum.
//
// Codex uses AGENTS.md as its primary repository instruction surface. Generic
// momentum command recipes install into .codex/commands/ via the standard
// overlay, then are transformed in `runInstall` into native Codex skills at
// .agents/skills/<name>/SKILL.md so each recipe becomes a first-class
// auto-discoverable skill (per https://developers.openai.com/codex/skills).
// The .codex/commands/ directory is removed post-transform — skills are the
// canonical surface, not lookup fragments.

const fs = require('fs');
const path = require('path');

module.exports = {
  displayName: 'Codex',

  destinations: {
    commands: ['.codex', 'commands'],
    'agent-rules': ['.agent', 'rules'],
    scripts: ['scripts'],
    engines: ['.agent', 'engines'],
    // Phase 16 Rework: native Codex surfaces.
    // Skills live at .agents/skills/ (shared with Antigravity; NOT .codex/skills/)
    // Subagents live at .codex/agents/ (TOML files)
    // workflows declared but unused on Codex (no native workflow surface)
    workflows: ['.codex', 'workflows'],
    skills: ['.agents', 'skills'],
    agents: ['.codex', 'agents'],
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
    skills: true,
    browser: true,
    computerUse: true,
  },

  roadmap: {
    subagents:
      'Codex declares a subagent surface; parallel-fanout not yet validated by momentum smoke tests. ' +
      'capability-routing treats this as sequential until proven.',
    parallelSubagents:
      'Promote to true once dispatch parallel mode is exercised against Codex in CI (VAL-001).',
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

    console.log('→ Transforming recipes into native Codex skills...');
    transformCommandsIntoSkills(targetDir);
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

    console.log('→ Re-generating Codex skills from recipes...');
    transformCommandsIntoSkills(targetDir);
  },

  // Phase 18 G0 — adapter.spawn(directive) contract stub.
  // Real Codex implementation lands in G1; until then return the
  // canonical "not implemented" per-repo result so the conductor
  // stays robust and a single dispatch failure does not abort the
  // wave. See `bin/momentum.js` for the directive contract.
  spawn(directive) {
    return {
      repoId: directive && directive.repoId,
      status: -1,
      detail: 'codex adapter.spawn() not yet implemented (Phase 18 G1)',
    };
  },
};

// ─── Recipes → Skills transform (ENH-036) ────────────────────────────────────
//
// Per https://developers.openai.com/codex/skills the canonical project-scope
// skill surface is $REPO_ROOT/.agents/skills/<name>/SKILL.md with YAML
// frontmatter declaring `name` + `description`. Each momentum recipe becomes
// one such skill so Codex auto-discovers and dispatches them natively (rather
// than the AGENTS.md-lookup-then-follow-instructions pattern that shipped in
// v0.19.0).
function transformCommandsIntoSkills(targetDir) {
  const commandsDir = path.join(targetDir, '.codex', 'commands');
  const skillsRoot = path.join(targetDir, '.agents', 'skills');
  if (!fs.existsSync(commandsDir)) {
    console.log('  (no .codex/commands/ to transform — skipping)');
    return;
  }
  fs.mkdirSync(skillsRoot, { recursive: true });

  let count = 0;
  for (const file of fs.readdirSync(commandsDir)) {
    if (!file.endsWith('.md')) continue;
    const name = file.replace(/\.md$/, '');
    const body = fs.readFileSync(path.join(commandsDir, file), 'utf8');
    const description = extractRecipeDescription(body, name);

    const skillDir = path.join(skillsRoot, name);
    fs.mkdirSync(skillDir, { recursive: true });
    const skillBody = renderSkillMarkdown(name, description, body);
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillBody);
    count++;
  }

  // Remove the lookup-fragment directory — skills are now the canonical
  // surface. Keep .codex/agents/ + .codex/hooks.json + .codex/swarm/ etc.
  fs.rmSync(commandsDir, { recursive: true, force: true });
  console.log(`  + ${count} skill(s) generated at .agents/skills/ from recipes`);
  console.log('  - .codex/commands/ removed (skills replace lookup fragments)');
}

// Extract the first non-heading, non-blank line of the recipe as the skill
// description. Recipes follow a consistent house-style where line 1 is a
// one-sentence "what it does" — well suited to Codex's "describe when to
// trigger" requirement.
function extractRecipeDescription(body, name) {
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    // Strip wrapping markdown emphasis if present.
    return trimmed
      .replace(/^[*_]+|[*_]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return `Run the momentum ${name} recipe.`;
}

function renderSkillMarkdown(name, description, recipeBody) {
  // YAML frontmatter must escape colons / newlines. The description is one
  // line by construction (extractRecipeDescription guarantees this), so a
  // simple double-quoted string is safe — but we still escape embedded
  // double-quotes and backslashes.
  const safeDescription = description.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return [
    '---',
    `name: ${name}`,
    `description: "${safeDescription} Activates when the user invokes /${name} or asks momentum to run the ${name} recipe."`,
    '---',
    '',
    recipeBody.endsWith('\n') ? recipeBody : recipeBody + '\n',
  ].join('\n');
}
