'use strict';

/**
 * `momentum ecosystem` subcommand handler.
 *
 * Subcommands:
 *   init [name]               — scaffold a new ecosystem root in the CWD
 *   add <repo-path>           — register a momentum-installed repo as a member
 *   remove <id>               — strip a member by id
 *   status                    — print manifest + per-member git state
 *
 * The ecosystem layer is strictly additive to single-repo momentum.
 * Member repos receive exactly one fenced line in their CLAUDE.md /
 * AGENTS.md pointing back at the ecosystem; nothing else is touched.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const lib = require('../core/ecosystem/lib');
const {
  POINTER_BEGIN,
  POINTER_END,
  PRIMARY_INSTRUCTION_CANDIDATES,
  findPrimaryInstructionFile,
  findAllInstructionFiles,
  ensurePointerInjected,
  ensurePointerInjectedAll,
  stripPointer,
  stripPointerAll,
} = require('../core/ecosystem/lib/pointer');

// ─────────────────────────────────────────────────────────────────────────────
// Public entrypoint
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dispatch a `momentum ecosystem <subcommand> [...]` invocation.
 *
 * `args` is the full argv tail starting at the subcommand
 * (i.e. caller has already shifted off `momentum` and `ecosystem`).
 *
 * Returns void; throws Error on failure with a human-readable message.
 */
function runEcosystem(args) {
  if (!args || args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    return printUsage();
  }
  const sub = args[0];
  const rest = args.slice(1);

  switch (sub) {
    case 'init':
      return cmdInit(rest);
    case 'add':
      return cmdAdd(rest);
    case 'remove':
    case 'rm':
      return cmdRemove(rest);
    case 'status':
      return cmdStatus(rest);
    case 'upgrade':
      return cmdUpgrade(rest);
    case 'initiative':
      return cmdInitiative(rest);
    default:
      throw new Error(
        `unknown ecosystem subcommand "${sub}". ` +
        `Try: init | add | remove | status | upgrade | initiative`,
      );
  }
}

function printUsage() {
  console.log(`
momentum ecosystem — Cross-repo coordination layer (Tier 1).

Usage:
  momentum ecosystem init [name]
  momentum ecosystem add <repo-path> [--role <role>] [--id <id>] [--ecosystem <path>]
  momentum ecosystem remove <member-id> [--ecosystem <path>]
  momentum ecosystem status [--no-git] [--ecosystem <path>]
  momentum ecosystem upgrade [--dry-run] [--force|--autostash] [--agent <name>] [--ecosystem <path>]
  momentum ecosystem initiative create <slug> [--why "<text>"] [--repos r1,r2] [--owner <name>] [--ecosystem <path>]

Location:
  add / remove / status / initiative auto-locate the ecosystem root by
  walking up from CWD (bounded by MOMENTUM_MAX_PARENT_WALK, default 5)
  AND scanning siblings (so member-repo CWDs work). Use --ecosystem <path>
  to override explicitly.

Subcommands:
  init        Scaffold a new ecosystem root in the CWD (or under [name]/).
              Writes ecosystem.json, initiatives/, sessions/, .state/,
              .gitignore, README.md, CLAUDE.md, AGENTS.md, plus the
              coordination command surface those instructions advertise
              (/scout /dispatch /handoff /continue /initiative /session
              /ecosystem /swarm + session scripts + hook wiring) for
              --agent <name> (default: claude-code). Runs \`git init\`
              and an initial commit.

  add         Register a momentum-installed repo as a member. Writes the
              member into ecosystem.json AND injects an action-bearing
              pointer block into the target's CLAUDE.md / AGENTS.md.
              Idempotent — re-running is a no-op when the state already
              matches.

  remove      Inverse of \`add\`. Strips the member from ecosystem.json and
              removes the pointer block from the target's primary
              instruction file.

  status      Print the manifest summary plus \`git status --short\` and
              the most recent commit for each member.

  upgrade     Sweep \`momentum upgrade\` across every member (PULL model).
              Per repo: skips a dirty working tree, detects the adapter from
              its lock file, runs the upgrade, and reports the momentum version
              before → after. Tolerates partial failure — one bad repo never
              aborts the fleet. Dirty repos:
                --autostash  stash the in-flight work, upgrade, restore it
                             (your work comes back exactly as it was)
                --force      upgrade in place without stashing
              Use --dry-run to preview the whole sweep without writing anything.
              Note: the CLI's OWN version bounds the result — update the CLI
              first (\`npm i -g @limina-labs/momentum@latest\`).

  initiative  Manage cross-repo initiatives. Currently only \`create\` is
              wired as a CLI subcommand (other operations stay slash-only
              for now). Non-interactive — takes flags so it works from
              any agent context. Defaults: --repos all members; --owner
              git user.name (or \$USER); --why "" (write later).

Roles:
  platform | client | library | infra | bench | other

This command must be run from inside an ecosystem root (or, for
\`init\`, from where you want the root created).
`.trim());
}

// ─────────────────────────────────────────────────────────────────────────────
// init
// ─────────────────────────────────────────────────────────────────────────────

function cmdInit(args) {
  const opts = parseFlags(args, { agent: 'string' });
  // Positionals = args minus flags and their values (parseFlags doesn't strip).
  const positionals = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      if (args[i] === '--agent') i++;
      continue;
    }
    positionals.push(args[i]);
  }
  const agent = opts.agent || 'claude-code';
  rootCommandDest(agent); // validates the agent name before any writes

  const name = positionals[0] || path.basename(process.cwd());
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new Error(
      `init: ecosystem name "${name}" must match /^[a-z][a-z0-9-]*$/ ` +
      `(lowercase letters, digits, hyphens; start with a letter).`,
    );
  }

  // If [name] is given, scaffold under ./<name>/. Otherwise scaffold in CWD.
  const cliGaveName = positionals[0] !== undefined;
  const root = cliGaveName ? path.resolve(process.cwd(), name) : process.cwd();

  if (fs.existsSync(path.join(root, lib.MANIFEST_FILENAME))) {
    throw new Error(
      `init: ${path.join(root, lib.MANIFEST_FILENAME)} already exists. ` +
      `Refusing to overwrite.`,
    );
  }

  // BUG-021: an ecosystem root is a COORDINATION directory, not a code repo.
  // Scaffolding into an existing project overwrites its README.md and
  // .gitignore with ecosystem templates (observed live — destructive).
  // Refuse when the target looks like an existing project; --force overrides.
  if (!args.includes('--force')) {
    const projectMarkers = [
      ['.momentum', 'a momentum project install (.momentum/)'],
      ['package.json', 'a package.json'],
      ['specs', 'a specs/ tree'],
      ['.git', 'a git repository'],
      ['README.md', 'an existing README.md'],
    ].filter(([marker]) => fs.existsSync(path.join(root, marker)));
    if (projectMarkers.length > 0) {
      throw new Error(
        `init: ${root} looks like an existing project — it contains ` +
        `${projectMarkers.map(([, label]) => label).join(', ')}.\n` +
        `  An ecosystem root must be its own directory (a SIBLING of member repos).\n` +
        `  Use: momentum ecosystem init <name>   (creates ./<name>/)\n` +
        `  or:  momentum init --ecosystem <name> (creates ../<name>/ and registers this repo)\n` +
        `  Pass --force only if you really want an ecosystem root here.`,
      );
    }
  }

  fs.mkdirSync(root, { recursive: true });
  fs.mkdirSync(path.join(root, 'initiatives'), { recursive: true });
  fs.mkdirSync(path.join(root, 'sessions'), { recursive: true });
  fs.mkdirSync(path.join(root, '.state'), { recursive: true });

  // ecosystem.json
  const manifest = {
    name,
    version: 1,
    created: today(),
    members: [],
    dependencies: [],
  };
  fs.writeFileSync(
    path.join(root, lib.MANIFEST_FILENAME),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8',
  );

  // README
  fs.writeFileSync(
    path.join(root, 'README.md'),
    readmeTemplate(name),
    'utf8',
  );

  // initiatives/README
  fs.writeFileSync(
    path.join(root, 'initiatives', 'README.md'),
    initiativesReadme(),
    'utf8',
  );

  // sessions/.gitkeep + .state/.gitkeep
  fs.writeFileSync(path.join(root, 'sessions', '.gitkeep'), '', 'utf8');
  fs.writeFileSync(path.join(root, '.state', '.gitkeep'), '', 'utf8');

  // .gitignore
  fs.writeFileSync(
    path.join(root, '.gitignore'),
    gitignoreTemplate(),
    'utf8',
  );

  // ENH-025: managed CLAUDE.md + AGENTS.md so any agent opening this
  // directory immediately learns it is a coordination layer (NOT a
  // project) and discovers the orchestration primitives. We write
  // both because at ecosystem-init time we don't know which adapter
  // the consuming agents will use; both surfaces are cheap. Idempotent:
  // never overwrite if either file already exists.
  writeManagedInstructionFile(
    path.join(root, 'CLAUDE.md'),
    renderEcosystemInstruction('ecosystem-claude.md', name),
  );
  writeManagedInstructionFile(
    path.join(root, 'AGENTS.md'),
    renderEcosystemInstruction('ecosystem-agents.md', name),
  );

  // ENH-049: the command surface those instruction files advertise.
  ensureRootCommandSurface(root, agent, false);

  // git init + initial commit (best-effort; if git is unavailable the
  // user can do it themselves).
  try {
    execSync('git init -q', { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    execSync('git add .', { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    // Allow commit to fail silently if user.email / user.name not set —
    // the scaffold is still valid.
    try {
      execSync(
        'git commit -q -m "chore(ecosystem): initial scaffold"',
        { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] },
      );
    } catch (_e) {
      // Likely missing git identity — user can commit manually.
    }
  } catch (_e) {
    // git not available — scaffold is still usable.
  }

  console.log(`Initialized ecosystem "${name}" at ${root}`);
  console.log(`  + CLAUDE.md (managed; tells agents this is a coordination layer, not a project)`);
  console.log(`  + AGENTS.md (same content, for AGENTS.md-aware agents)`);
  console.log(`  + ${rootCommandDest(agent).join('/')}/ (coordination commands, agent: ${agent})`);
  console.log(`Next steps:`);
  console.log(`  cd ${cliGaveName ? name : '.'}`);
  console.log(`  momentum ecosystem add ../<repo-name>`);
}

/**
 * Render an ecosystem CLAUDE.md / AGENTS.md template by substituting
 * {{NAME}} for the ecosystem name. Templates live under
 * `core/ecosystem/templates/`. Substitution is intentionally tiny —
 * the templates are markdown content, not a programmable surface.
 */
function renderEcosystemInstruction(filename, ecosystemName) {
  const src = path.join(
    __dirname,
    '..',
    'core',
    'ecosystem',
    'templates',
    filename,
  );
  const raw = fs.readFileSync(src, 'utf8');
  return raw.replace(/\{\{NAME\}\}/g, ecosystemName);
}

/**
 * Write a managed agent-instruction file. Skip if the file already
 * exists — agents may have customised it (or another tool may own
 * the surface). Idempotent: re-running init in a directory that already
 * has CLAUDE.md / AGENTS.md leaves them untouched.
 */
function writeManagedInstructionFile(destPath, content) {
  if (fs.existsSync(destPath)) return;
  fs.writeFileSync(destPath, content, 'utf8');
}

/**
 * Ensure the coordination root's own CLAUDE.md / AGENTS.md exist and carry
 * the ecosystem instructions (BUG-016 self-heal; also retrofits pre-Phase-15
 * roots that were scaffolded before ENH-025 wrote these files). Per file:
 *   - missing → write the rendered template
 *   - momentum-managed (ecosystem template, or the project template — the
 *     BUG-016 signature) → replace the managed section above the
 *     `## Project Extensions` marker, preserving user extensions; `.bak`
 *     saved first. A boilerplate-only extensions tail (heading + blockquote,
 *     no user lines) is swapped for the template's own tail.
 *   - anything else (user-owned surface) → leave untouched, warn
 */
function refreshRootInstructions(root, ecosystemName, dryRun) {
  // Lazy require avoids a load-time cycle (momentum.js requires this module).
  const { partitionByMarker } = require('./momentum');
  const surfaces = [
    { file: 'CLAUDE.md', template: 'ecosystem-claude.md' },
    { file: 'AGENTS.md', template: 'ecosystem-agents.md' },
  ];
  console.log('Coordination-root instructions:');
  for (const s of surfaces) {
    const dest = path.join(root, s.file);
    const rendered = renderEcosystemInstruction(s.template, ecosystemName);
    if (!fs.existsSync(dest)) {
      if (dryRun) {
        console.log(`  ✋ would add: ${s.file} (ecosystem instructions)`);
        continue;
      }
      fs.writeFileSync(dest, rendered, 'utf8');
      console.log(`  + added: ${s.file} (ecosystem instructions)`);
      continue;
    }
    const existing = fs.readFileSync(dest, 'utf8');
    if (existing === rendered) {
      console.log(`  = ${s.file} up to date`);
      continue;
    }
    const firstLine = existing.split('\n', 1)[0];
    const isEcosystemManaged = /— Ecosystem \(Coordination Layer\)\s*$/.test(firstLine);
    const isProjectTemplate = /^# Project Rules:/.test(firstLine);
    if (!isEcosystemManaged && !isProjectTemplate) {
      console.log(`  ⚠️  ${s.file} exists but is not momentum-managed — left untouched.`);
      continue;
    }
    const renderedParts = partitionByMarker(rendered);
    const existingParts = partitionByMarker(existing);
    const tail = hasExtensionContent(existingParts.extensions)
      ? existingParts.extensions
      : renderedParts.extensions;
    const next = renderedParts.managed + (tail || '');
    if (next === existing) {
      console.log(`  = ${s.file} up to date`);
      continue;
    }
    const isRepair = isProjectTemplate;
    const why = isRepair
      ? ' — project template found in a coordination root (BUG-016)'
      : '';
    if (dryRun) {
      console.log(`  ✋ would ${isRepair ? 'repair' : 'refresh'}: ${s.file}${why}`);
      continue;
    }
    fs.copyFileSync(dest, dest + '.bak');
    fs.writeFileSync(dest, next, 'utf8');
    console.log(
      `  ↻ ${isRepair ? 'repaired' : 'refreshed'}: ${s.file}${why} (original saved as .bak)`,
    );
  }
}

/**
 * True when an extensions tail (as returned by partitionByMarker) carries
 * user content — any non-blank line that isn't the marker heading itself,
 * a `>` blockquote line, or a horizontal rule.
 */
function hasExtensionContent(extensions) {
  if (!extensions) return false;
  return extensions.split('\n').some((line) => {
    const t = line.trim();
    return (
      t !== '' && !t.startsWith('>') && !t.startsWith('## Project Extensions') && t !== '---'
    );
  });
}

// ── Coordination-root command surface (ENH-049) ──────────────────────────────
//
// The ecosystem CLAUDE.md/AGENTS.md advertise slash-command primitives
// (/scout /dispatch /handoff /continue /initiative /session plus the
// /ecosystem and /swarm operator doors). Before ENH-049 nothing shipped
// them: a fresh coordination root promised commands that did not resolve
// (the cerebrio root only had a working surface by accident of the BUG-016
// project-mode mis-install). `ecosystem init` installs the curated fileset
// below; `ecosystem upgrade` retrofits/refreshes it. Strictly the
// coordination layer — project/phase commands are the BUG-016 anti-pattern:
// warned about, never shipped, never deleted.

const ROOT_SURFACE_COMMANDS = [
  // adapter-overlay recipes (per-agent copies under adapters/<agent>/)
  'scout.md', 'dispatch.md', 'handoff.md', 'continue.md', 'swarm.md',
  // agent-neutral recipes (core/commands/)
  'ecosystem.md', 'initiative.md', 'session.md',
];

const ROOT_SURFACE_SCRIPTS = [
  ['core', 'scripts', 'sessionstart-handoff.sh'],
  ['core', 'ecosystem', 'scripts', 'session-append.sh'],
];

// Project-layer commands that must not live in a coordination root.
const PROJECT_LAYER_COMMANDS = new Set([
  'brainstorm-idea.md', 'brainstorm-phase.md', 'start-project.md',
  'start-phase.md', 'complete-phase.md', 'sync-docs.md', 'hotfix.md',
  'track.md', 'validate.md', 'log.md', 'migrate.md', 'review.md',
  'review-code.md', 'systematic-debug.md', 'lanes.md',
]);

function listRootAgents() {
  const dir = path.join(__dirname, '..', 'adapters');
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, 'adapter.js')))
    .map((e) => e.name);
}

/** Commands destination for an agent, e.g. ['.claude','commands']. */
function rootCommandDest(agent) {
  const adapterPath = path.join(__dirname, '..', 'adapters', agent, 'adapter.js');
  if (!fs.existsSync(adapterPath)) {
    throw new Error(
      `unknown agent "${agent}" (available: ${listRootAgents().join(', ')})`,
    );
  }
  const adapter = require(adapterPath);
  return (adapter.destinations && adapter.destinations.commands) || ['.claude', 'commands'];
}

/** Recipe source: adapter overlay first (commands/ or workflows/), then core. */
function resolveRootCommandSource(agent, file) {
  const src = path.join(__dirname, '..');
  const candidates = [
    path.join(src, 'adapters', agent, 'commands', file),
    path.join(src, 'adapters', agent, 'workflows', file), // Antigravity ships recipes as workflows
    path.join(src, 'core', 'commands', file),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

/** Agents whose command surface already exists in the root (for upgrade). */
function detectRootAgents(root) {
  return listRootAgents().filter((agent) =>
    fs.existsSync(path.join(root, ...rootCommandDest(agent))),
  );
}

/**
 * Install/refresh the coordination-root command surface for one agent:
 * add when missing; refresh differing momentum-owned files with a `.bak`
 * (house upgrade semantics); count identical files as up to date. The
 * Claude Code hook wiring (`.claude/settings.json`) is written only when
 * absent — settings are user-owned once they exist.
 */
function ensureRootCommandSurface(root, agent, dryRun) {
  const destRel = rootCommandDest(agent);
  const destDir = path.join(root, ...destRel);
  let upToDate = 0;

  const place = (srcContent, destPath, { exec = false } = {}) => {
    const rel = path.relative(root, destPath);
    if (!fs.existsSync(destPath)) {
      if (dryRun) {
        console.log(`  ✋ would add: ${rel}`);
        return;
      }
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, srcContent);
      if (exec) fs.chmodSync(destPath, 0o755);
      console.log(`  + added: ${rel}`);
      return;
    }
    if (fs.readFileSync(destPath, 'utf8') === srcContent) {
      if (exec) {
        try { fs.chmodSync(destPath, 0o755); } catch (_e) { /* best-effort */ }
      }
      upToDate++;
      return;
    }
    if (dryRun) {
      console.log(`  ✋ would refresh: ${rel}`);
      return;
    }
    fs.copyFileSync(destPath, destPath + '.bak');
    fs.writeFileSync(destPath, srcContent);
    if (exec) fs.chmodSync(destPath, 0o755);
    console.log(`  ↑ refreshed: ${rel} (original saved as .bak)`);
  };

  for (const file of ROOT_SURFACE_COMMANDS) {
    const srcPath = resolveRootCommandSource(agent, file);
    if (!srcPath) {
      console.log(`  ⚠️  no source for ${file} (agent: ${agent}) — skipped.`);
      continue;
    }
    place(fs.readFileSync(srcPath, 'utf8'), path.join(destDir, file));
  }

  for (const relParts of ROOT_SURFACE_SCRIPTS) {
    const srcPath = path.join(__dirname, '..', ...relParts);
    place(fs.readFileSync(srcPath, 'utf8'), path.join(root, 'scripts', relParts[relParts.length - 1]), { exec: true });
  }

  if (agent === 'claude-code') {
    const settingsPath = path.join(root, '.claude', 'settings.json');
    if (!fs.existsSync(settingsPath)) {
      if (dryRun) {
        console.log(`  ✋ would add: .claude/settings.json (SessionStart hook wiring)`);
      } else {
        fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
        fs.writeFileSync(
          settingsPath,
          renderEcosystemInstruction('ecosystem-settings-claude.json', ''),
        );
        console.log(`  + added: .claude/settings.json (SessionStart hook wiring)`);
      }
    } else {
      upToDate++; // user-owned once present — never rewritten
    }
  }

  if (upToDate > 0) {
    console.log(`  = ${destRel.join('/')} [${agent}]: ${upToDate} file(s) up to date`);
  }

  const offenders = fs.existsSync(destDir)
    ? fs.readdirSync(destDir).filter((f) => PROJECT_LAYER_COMMANDS.has(f))
    : [];
  if (offenders.length) {
    console.log(
      `  ⚠️  project-layer commands in the coordination root (BUG-016 anti-pattern — ` +
        `remove them; they mis-orient agents): ${offenders.join(', ')}`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// add
// ─────────────────────────────────────────────────────────────────────────────

function cmdAdd(args) {
  if (args.length === 0) {
    throw new Error('add: missing <repo-path> argument.');
  }
  const repoPath = args[0];
  const opts = parseFlags(args.slice(1), {
    role: 'string',
    id: 'string',
    ecosystem: 'string',
  });

  const root = resolveEcosystemRoot(opts.ecosystem, 'add');

  const absRepo = path.resolve(root, repoPath);
  if (!fs.existsSync(absRepo)) {
    throw new Error(`add: repo path does not exist: ${absRepo}`);
  }

  // Pre-flight: target must look momentum-installed.
  const primary = findPrimaryInstructionFile(absRepo);
  if (!primary) {
    throw new Error(
      `add: ${absRepo} doesn't look momentum-installed ` +
      `(no CLAUDE.md or AGENTS.md found). Run \`momentum init\` there first.`,
    );
  }

  const id = opts.id || sanitizeId(path.basename(absRepo));
  if (!/^[a-z][a-z0-9-]*$/.test(id)) {
    throw new Error(
      `add: derived/explicit id "${id}" must match /^[a-z][a-z0-9-]*$/. ` +
      `Use --id to override.`,
    );
  }
  const role = opts.role || 'other';
  const validRoles = ['platform', 'client', 'library', 'infra', 'bench', 'other'];
  if (!validRoles.includes(role)) {
    throw new Error(
      `add: invalid --role "${role}". Must be one of: ${validRoles.join(', ')}`,
    );
  }

  const relPath = path.relative(root, absRepo) || '.';

  // Mutate manifest.
  const manifest = lib.loadManifest(root);
  const existing = lib.findMember(manifest, id);
  if (existing) {
    // Idempotent: if the path matches, do nothing. If it differs, fail loud.
    if (existing.path === relPath) {
      console.log(`add: "${id}" is already registered (path ${relPath}). No changes.`);
      ensurePointerInjectedAll(absRepo, root, manifest.name);
      return;
    }
    throw new Error(
      `add: member id "${id}" already registered with a different path ` +
      `(${existing.path}). Use --id to register under a different id, ` +
      `or \`remove ${id}\` first.`,
    );
  }
  manifest.members.push({ id, path: relPath, role });

  const v = lib.validateManifest(manifest);
  if (!v.ok) {
    throw new Error(
      `add: resulting manifest fails validation:\n` +
      v.errors.map((e) => `  ${e.path}: ${e.message}`).join('\n'),
    );
  }

  fs.writeFileSync(
    path.join(root, lib.MANIFEST_FILENAME),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8',
  );

  // Inject the fenced pointer into EVERY instruction file (Phase 28 — every
  // agent, not just the preferred one).
  const injected = ensurePointerInjectedAll(absRepo, root, manifest.name);

  console.log(`Added member "${id}" (${role}) at ${relPath}.`);
  console.log(`Pointer injected into ${injected.map((f) => path.relative(root, path.join(absRepo, f))).join(', ')}.`);
}

// ─────────────────────────────────────────────────────────────────────────────
// remove
// ─────────────────────────────────────────────────────────────────────────────

function cmdRemove(args) {
  if (args.length === 0) {
    throw new Error('remove: missing <member-id> argument.');
  }
  const opts = parseFlags(args.slice(1), { ecosystem: 'string' });
  const id = args[0];

  const root = resolveEcosystemRoot(opts.ecosystem, 'remove');

  const manifest = lib.loadManifest(root);
  const member = lib.findMember(manifest, id);
  if (!member) {
    throw new Error(`remove: no member with id "${id}".`);
  }

  // Strip from manifest.
  manifest.members = manifest.members.filter((m) => m.id !== id);
  // Also strip any dependency edges referencing the removed member.
  if (Array.isArray(manifest.dependencies)) {
    manifest.dependencies = manifest.dependencies.filter(
      (d) => d.from !== id && d.to !== id,
    );
  }
  fs.writeFileSync(
    path.join(root, lib.MANIFEST_FILENAME),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8',
  );

  // Best-effort: strip the fenced pointer from the target's CLAUDE.md /
  // AGENTS.md. If the target no longer exists on disk we skip silently —
  // remove must succeed even when the member repo is gone.
  const absRepo = path.resolve(root, member.path);
  if (fs.existsSync(absRepo)) {
    stripPointerAll(absRepo); // Phase 28 — strip from every instruction file
  }

  console.log(`Removed member "${id}".`);
}

// ─────────────────────────────────────────────────────────────────────────────
// status
// ─────────────────────────────────────────────────────────────────────────────

function cmdStatus(args) {
  const opts = parseFlags(args, {
    'no-git': 'boolean',
    ecosystem: 'string',
  });
  const root = resolveEcosystemRoot(opts.ecosystem, 'status');
  const manifest = lib.loadManifest(root);

  console.log(`Ecosystem: ${manifest.name} (root: ${root})`);
  console.log(`Members: ${manifest.members.length}`);
  if (manifest.members.length === 0) {
    console.log('  (none registered yet — try `momentum ecosystem add ../<repo>`)');
    return;
  }

  for (const m of manifest.members) {
    const absRepo = path.resolve(root, m.path);
    const exists = fs.existsSync(absRepo);
    console.log('');
    console.log(`  ${m.id}  [${m.role}]  ${m.path}${exists ? '' : '  (MISSING)'}`);
    if (exists && !opts['no-git']) {
      printGitState(absRepo);
    }
  }

  // Print active initiative if any.
  const activeFile = path.join(root, '.state', 'active-initiative');
  if (fs.existsSync(activeFile)) {
    const slug = fs.readFileSync(activeFile, 'utf8').trim();
    if (slug) {
      console.log('');
      console.log(`Active initiative: ${slug}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// upgrade — PULL-model fleet sweep (Phase 20)
// ─────────────────────────────────────────────────────────────────────────────
//
// Runs `momentum upgrade` across every ecosystem member in one pass. Chosen
// over a PUSH-model bot (Renovate/Dependabot) because momentum is forge-neutral
// (DIP) and operates on local git checkouts. Fleet-safety: clean-tree gate per
// repo, partial-failure tolerance, per-repo version reporting, dry-run.

/** True when the repo has uncommitted changes. Non-git repos count as clean. */
function isWorkingTreeDirty(repoPath) {
  try {
    const out = execSync('git status --porcelain', {
      cwd: repoPath,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out.length > 0;
  } catch (_e) {
    return false; // not a git repo — nothing to protect, let the upgrade proceed
  }
}

/** Read the recorded momentum version from a member's lock file. */
function readMemberVersion(repoPath) {
  try {
    const m = JSON.parse(
      fs.readFileSync(path.join(repoPath, '.momentum', 'installed.json'), 'utf8'),
    );
    return (m && (m.momentumVersion || m.version)) || 'unknown'; // ADR-0007: new schema uses `version`; momentumVersion kept as compat mirror
  } catch (_e) {
    return 'none'; // pre-Phase-20 install (no lock file)
  }
}

/** Detect which adapter a member uses. Lock file is authoritative; else heuristic. */
function detectMemberAgent(repoPath) {
  try {
    const m = JSON.parse(
      fs.readFileSync(path.join(repoPath, '.momentum', 'installed.json'), 'utf8'),
    );
    // ADR-0007: the lock is `{ agents: { <id>: … } }`; the pre-0007 lock was
    // `{ agent }`. Read the map first (else every AGENTS.md agent — opencode,
    // Antigravity, Codex — falls through to the `AGENTS.md ⇒ codex` heuristic
    // below and is misidentified). ADR-0011.
    if (m && m.agents && typeof m.agents === 'object') {
      const ids = Object.keys(m.agents);
      if (ids.length) return ids.includes('claude-code') ? 'claude-code' : ids.sort()[0];
    }
    if (m && m.agent) return m.agent; // legacy single-agent lock
  } catch (_e) { /* fall through to heuristic */ }
  if (fs.existsSync(path.join(repoPath, '.codex'))) return 'codex';
  if (fs.existsSync(path.join(repoPath, '.opencode'))) return 'opencode';
  if (fs.existsSync(path.join(repoPath, '.claude'))) return 'claude-code';
  if (
    fs.existsSync(path.join(repoPath, '.agents', 'hooks.json')) ||
    fs.existsSync(path.join(repoPath, '.agent', 'workflows'))
  ) {
    return 'antigravity';
  }
  if (fs.existsSync(path.join(repoPath, 'CLAUDE.md'))) return 'claude-code';
  if (fs.existsSync(path.join(repoPath, 'AGENTS.md'))) return 'codex';
  return null;
}

function cmdUpgrade(args) {
  const opts = parseFlags(args, {
    ecosystem: 'string',
    'dry-run': 'boolean',
    force: 'boolean',
    autostash: 'boolean',
    agent: 'string',
  });
  const dryRun = !!opts['dry-run'];
  const root = resolveEcosystemRoot(opts.ecosystem, 'upgrade');
  const manifest = lib.loadManifest(root);

  console.log(`Ecosystem: ${manifest.name} (root: ${root})`);

  // BUG-016: the root's own instruction surfaces are upgraded here — the
  // project-mode `momentum upgrade` refuses to run in a coordination root,
  // so this is the only refresh/retrofit path they have.
  refreshRootInstructions(root, manifest.name, dryRun);

  // ENH-049: the command surface those instructions advertise. Manage every
  // agent surface already present in the root; retrofit the default (or
  // --agent) surface when none exists yet (pre-ENH-049 roots).
  const rootAgents = detectRootAgents(root);
  const surfaceAgents = rootAgents.length ? rootAgents : [opts.agent || 'claude-code'];
  console.log('Coordination-root command surface:');
  for (const agent of surfaceAgents) {
    ensureRootCommandSurface(root, agent, dryRun);
  }

  console.log('');
  console.log(`Sweeping \`momentum upgrade\` across ${manifest.members.length} member(s)${dryRun ? '  [dry run — no writes]' : ''}`);
  if (manifest.members.length === 0) {
    console.log('  (none registered yet — try `momentum ecosystem add ../<repo>`)');
    return;
  }

  // Lazy require avoids a load-time cycle (momentum.js requires this module).
  const { upgrade, withAutostash } = require('./momentum');
  const results = [];

  for (const m of manifest.members) {
    const absRepo = path.resolve(root, m.path);
    console.log('');
    console.log(`── ${m.id}  [${m.role}]  ${m.path} ─────────────────────`);

    if (!fs.existsSync(absRepo)) {
      console.log('  ⚠️  missing on disk — skipped.');
      results.push({ id: m.id, status: 'missing' });
      continue;
    }
    const dirty = isWorkingTreeDirty(absRepo);
    // Dirty repos are skipped UNLESS --force (plow through) or --autostash
    // (stash → upgrade → restore). Both are explicit opt-ins.
    if (dirty && !opts.force && !opts.autostash) {
      console.log('  ⚠️  working tree not clean — skipped. Commit/stash, --force, or --autostash.');
      results.push({ id: m.id, status: 'dirty-skip' });
      continue;
    }
    const agent = opts.agent || detectMemberAgent(absRepo);
    if (!agent) {
      console.log('  ⚠️  could not detect adapter — skipped. Re-run with --agent <name>.');
      results.push({ id: m.id, status: 'no-agent' });
      continue;
    }

    const before = readMemberVersion(absRepo);
    const useAutostash = opts.autostash && dirty && !dryRun;
    try {
      let conflict = false;
      if (useAutostash) {
        const r = withAutostash(absRepo, () => upgrade(absRepo, agent, { dryRun }));
        conflict = r.conflict;
      } else {
        upgrade(absRepo, agent, { dryRun });
      }
      const after = dryRun ? before : readMemberVersion(absRepo);
      results.push({
        id: m.id,
        status: dryRun ? 'would-upgrade' : 'upgraded',
        agent,
        before,
        after,
        autostashed: useAutostash,
        conflict,
      });
    } catch (err) {
      // Partial-failure tolerance — one bad repo never aborts the fleet.
      console.log(`  ❌ upgrade failed: ${err.message}`);
      results.push({ id: m.id, status: 'failed', error: err.message });
    }
  }

  printSweepSummary(results, dryRun);
}

function printSweepSummary(results, dryRun) {
  const icon = {
    upgraded: '✓', 'would-upgrade': '✋', 'dirty-skip': '⊘', missing: '∅',
    'no-agent': '?', failed: '✗',
  };
  console.log('');
  console.log('── Sweep summary ───────────────────────────────');
  for (const r of results) {
    const ver = r.before ? `  ${r.before} → ${r.after}` : '';
    const ag = r.agent ? `  [${r.agent}]` : '';
    const tag = r.conflict ? '  (autostash CONFLICT — work safe in stash)'
      : r.autostashed ? '  (autostashed)' : '';
    const err = r.status === 'failed' && r.error ? `  — ${r.error}` : '';
    console.log(`  ${icon[r.status] || '•'} ${r.id}: ${r.status}${ver}${ag}${tag}${err}`);
  }
  const counts = {};
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
  console.log('');
  console.log('  ' + Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', '));
  if (dryRun) console.log('  (dry run — no files were written)');
  const conflicts = results.filter((r) => r.conflict);
  if (conflicts.length) {
    console.log('');
    console.log(`  ⚠️  ${conflicts.length} repo(s) had an autostash conflict — your work is`);
    console.log('     preserved in each repo\'s `git stash list`; resolve with `git stash pop`.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// initiative
// ─────────────────────────────────────────────────────────────────────────────
//
// ENH-035 — promised "coming with Group 2 of Phase 9" and never shipped
// until Phase 15. Wires the existing core/ecosystem/lib/initiative.js
// (nextInitiativeId / writeInitiative / setActive) to a CLI subcommand.
// Non-interactive (flag-driven) so it works from any agent context.

function cmdInitiative(args) {
  if (args.length === 0) {
    throw new Error(
      'initiative: missing subsubcommand. Try: ' +
      '`momentum ecosystem initiative create <slug>`',
    );
  }
  const sub = args[0];
  const rest = args.slice(1);
  switch (sub) {
    case 'create':
      return cmdInitiativeCreate(rest);
    default:
      throw new Error(
        `initiative: unknown subsubcommand "${sub}". ` +
        `Only \`create\` is currently wired as a CLI; ` +
        `\`list\` / \`status\` / \`close\` stay as slash-only for now.`,
      );
  }
}

function cmdInitiativeCreate(args) {
  if (args.length === 0 || args[0].startsWith('--')) {
    throw new Error(
      'initiative create: missing <slug> positional argument. ' +
      'Usage: momentum ecosystem initiative create <slug> ' +
      '[--why "<text>"] [--repos r1,r2] [--owner <name>]',
    );
  }
  const slug = args[0];
  if (!/^[a-z][a-z0-9-]*$/.test(slug)) {
    throw new Error(
      `initiative create: slug "${slug}" must match /^[a-z][a-z0-9-]*$/ ` +
      `(lowercase letters, digits, hyphens; start with a letter).`,
    );
  }
  const opts = parseFlags(args.slice(1), {
    why: 'string',
    repos: 'string',
    owner: 'string',
    ecosystem: 'string',
  });

  const root = resolveEcosystemRoot(opts.ecosystem, 'initiative create');
  const manifest = lib.loadManifest(root);

  // Default repos to all member ids; parse the --repos CSV if given.
  let reposList;
  if (opts.repos) {
    reposList = opts.repos
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (reposList.length === 0) {
      throw new Error(
        'initiative create: --repos was provided but empty after parsing.',
      );
    }
    // Validate every named repo is a registered member.
    const known = new Set(manifest.members.map((m) => m.id));
    const unknown = reposList.filter((r) => !known.has(r));
    if (unknown.length) {
      throw new Error(
        `initiative create: unknown member id(s): ${unknown.join(', ')}. ` +
        `Known: ${[...known].join(', ') || '(none)'}.`,
      );
    }
  } else {
    reposList = manifest.members.map((m) => m.id);
    if (reposList.length === 0) {
      throw new Error(
        'initiative create: ecosystem has no registered members yet. ' +
        '`--repos` defaults to all members but the manifest is empty. ' +
        'Register members via `momentum ecosystem add <repo>` first, ' +
        'or pass --repos explicitly.',
      );
    }
  }

  // Default owner: explicit > git user.name > $USER > "(unknown)".
  let owner = opts.owner;
  if (!owner) {
    try {
      owner = execSync('git config user.name', {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    } catch (_e) {
      // git not configured — fall through.
    }
  }
  if (!owner) owner = process.env.USER || '(unknown)';

  const why = (opts.why || '').trim();

  // Allocate next id, render the file from template, write it.
  const initLib = require('../core/ecosystem/lib/initiative');
  const id = initLib.nextInitiativeId(root);
  const filePath = initLib.initiativePath(root, id, slug);

  const templateSrc = path.join(
    __dirname,
    '..',
    'core',
    'ecosystem',
    'templates',
    'initiative-template.md',
  );
  const rawTemplate = fs.readFileSync(templateSrc, 'utf8');

  // Discard the template's stub frontmatter; we generate our own. Keep
  // the body (## Why, ## Per-repo contributions, etc).
  const { content: bodyTemplate } = initLib.parseFrontmatter(rawTemplate);

  // Substitute the few placeholders the template body carries.
  const title = slugToTitle(slug);
  let body = bodyTemplate
    .replace(/\{\{ID\}\}/g, String(id))
    .replace(/\{\{TITLE\}\}/g, title)
    .replace(/\{\{REPOS\}\}/g, reposList.join(', '))
    .replace(/\{\{STARTED\}\}/g, today())
    .replace(/\{\{OWNER\}\}/g, owner);

  // Inject the user-provided "Why" if any (replacing the placeholder
  // paragraph in the template). The template's "Why" section reads
  // "One short paragraph that captures the motivation…" — when the
  // user passes --why we replace that placeholder; otherwise we leave
  // the template's prompt in place so they know what to fill in later.
  if (why) {
    body = body.replace(
      /(## Why\n\n)One short paragraph that captures the motivation for this initiative\.\nWhat problem are we solving\? Why does it span multiple repos\? What\nbecomes possible once it ships\?/,
      `$1${why}`,
    );
  }

  // Expand the per-repo contributions stubs.
  body = body.replace(
    /- \*\*\{\{REPO_1\}\}\*\*: …\n- \*\*\{\{REPO_2\}\}\*\*: …/,
    reposList.map((r) => `- **${r}**: …`).join('\n'),
  );

  const frontmatter = {
    id,
    slug,
    title,
    status: 'in-progress',
    started: today(),
    owner,
    repos: reposList,
  };

  initLib.writeInitiative(filePath, frontmatter, body);
  initLib.setActive(root, slug);

  console.log(`Created ${path.relative(root, filePath)} (id ${id}).`);
  console.log(`Set as active initiative.`);
  if (!why) {
    console.log(
      `Note: --why was not provided — the template "Why" section is a ` +
      `placeholder. Edit ${path.relative(root, filePath)} to fill it in.`,
    );
  }
}

function slugToTitle(slug) {
  return slug
    .split('-')
    .map((s) => (s.length ? s[0].toUpperCase() + s.slice(1) : s))
    .join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
//
// findPrimaryInstructionFile / ensurePointerInjected / stripPointer moved
// to core/ecosystem/lib/pointer.js in Phase 10 Group 0 for reuse by
// `momentum join` and `momentum leave`. Imported above.

/**
 * ENH-021 — resolve the ecosystem root from any directory.
 *
 * Resolution order:
 *   1. explicit `--ecosystem <path>` (highest precedence)
 *   2. ecosystem.json in CWD
 *   3. walk up via findRoot() bounded by MOMENTUM_MAX_PARENT_WALK
 *   4. error with a remediation message naming the subcommand
 */
function resolveEcosystemRoot(explicitPath, subcommand) {
  if (explicitPath) {
    const abs = path.resolve(process.cwd(), explicitPath);
    if (!fs.existsSync(path.join(abs, lib.MANIFEST_FILENAME))) {
      throw new Error(
        `${subcommand}: --ecosystem ${explicitPath} → ${abs} has no ecosystem.json. ` +
          `Did you mean a different path?`,
      );
    }
    return abs;
  }
  // First try parent walk-up — succeeds when CWD is inside the ecosystem root.
  const found = lib.findRoot(process.cwd());
  if (found) return found;
  // Then try sibling walk — succeeds when CWD is inside a member repo
  // whose ecosystem root is a sibling directory. This mirrors the
  // session-append.sh hook's discovery pattern and is what makes
  // ENH-021 actually feel location-agnostic from inside a member repo.
  const stateLib = require('../core/ecosystem/lib/state');
  const reg = stateLib.findRegistration(process.cwd());
  if (reg) return reg.rootPath;
  throw new Error(
    `${subcommand}: no ecosystem.json found in this or any parent directory, ` +
      `nor in any reachable sibling. Pass --ecosystem <path>, or cd to an ` +
      `ecosystem root before running.`,
  );
}

function printGitState(repoPath) {
  // Suppress stderr from git so "fatal: not a git repository" doesn't
  // leak through to the user when the member isn't yet under git.
  const gitOpts = { cwd: repoPath, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] };
  let gitOk = false;
  try {
    const status = execSync('git status --short', gitOpts).trim();
    gitOk = true;
    if (status) {
      console.log('    git: ' + status.split('\n').slice(0, 5).map((l) => l.trim()).join(' | '));
    } else {
      console.log('    git: clean');
    }
  } catch (_e) {
    console.log('    git: (not a git repo)');
  }
  if (!gitOk) return;
  try {
    const log = execSync('git log -1 --pretty=format:"%h %s"', gitOpts).trim();
    if (log) console.log(`    last: ${log}`);
  } catch (_e) {
    // ignore — no commits yet
  }
}

function parseFlags(args, spec) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    if (spec[key] === 'boolean') {
      out[key] = true;
    } else if (spec[key] === 'string') {
      out[key] = args[i + 1];
      i++;
    }
  }
  return out;
}

function sanitizeId(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function today() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────────────────────────────────────

function readmeTemplate(name) {
  return `# ${name} — Ecosystem

> Coordination layer for the ${name} family of repos.
> Created by \`momentum ecosystem init\`.

## What lives here

| Path | Purpose |
|---|---|
| \`ecosystem.json\` | Manifest: members, roles, dependency edges. |
| \`initiatives/\` | Cross-repo feature files (\`NNNN-slug.md\`). |
| \`sessions/\` | Daily activity log (\`YYYY-MM-DD.md\`), auto-appended by member-repo hooks. |
| \`.state/\` | Runtime state (gitignored). |

## Quick commands

\`\`\`
momentum ecosystem status                    # show members + git state
momentum ecosystem add ../<repo>             # register a member
momentum ecosystem remove <id>               # unregister a member
\`\`\`

## Members

Run \`momentum ecosystem status\` to see the current registered members.

## Conventions

- The ecosystem layer is strictly additive. It never writes into a
  member's \`specs/\`. The only touch on a member repo is one fenced
  line in its \`CLAUDE.md\` / \`AGENTS.md\` pointing back here.
- Add members via \`momentum ecosystem add\`. Don't hand-edit
  \`ecosystem.json\` unless you know what you're doing — validation runs
  on every CLI write.
`;
}

function initiativesReadme() {
  return `# Initiatives

> Cross-repo features that span multiple member repos.

Each initiative is one markdown file named \`NNNN-<slug>.md\` with YAML
frontmatter (id, slug, status, started, owner, repos) and a body of
fixed sections: Why · Per-repo contributions · Linked decisions ·
Deploy chronology · Close.

Numbering is monotonically increasing across the ecosystem. The
filename slug is for human readability; the \`id\` integer is canonical.

## Create a new initiative

\`\`\`
momentum ecosystem initiative create <slug> \\
  --why "<one-paragraph motivation>" \\
  --repos <member-id-1>,<member-id-2> \\
  --owner <you>
\`\`\`

Flags are optional:
- \`--why\` — defaults to a placeholder you can fill in later
- \`--repos\` — defaults to all registered members
- \`--owner\` — defaults to \`git config user.name\` (or \`\$USER\`)

The slash-command door \`/initiative create <slug>\` does the same
work via the same code path; both end up calling
\`core/ecosystem/lib/initiative.js\`.
`;
}

function gitignoreTemplate() {
  return `# Ecosystem runtime state
.state/

# Standard noise
.DS_Store
._*
*.swp
Thumbs.db
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  runEcosystem,
  // Exported for tests:
  cmdInit,
  cmdAdd,
  cmdRemove,
  cmdStatus,
  cmdInitiative,
  cmdInitiativeCreate,
  ensurePointerInjected,
  stripPointer,
  findPrimaryInstructionFile,
  detectMemberAgent,
  sanitizeId,
  POINTER_BEGIN,
  POINTER_END,
};
