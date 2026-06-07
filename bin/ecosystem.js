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
  ensurePointerInjected,
  stripPointer,
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
    default:
      throw new Error(
        `unknown ecosystem subcommand "${sub}". ` +
        `Try: init | add | remove | status`,
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

Location:
  add / remove / status auto-locate the ecosystem root by walking up
  from CWD (bounded by MOMENTUM_MAX_PARENT_WALK, default 5). Use
  --ecosystem <path> to override explicitly.

Subcommands:
  init       Scaffold a new ecosystem root in the CWD (or under [name]/).
             Writes ecosystem.json, initiatives/, sessions/, .state/,
             .gitignore, README.md. Runs \`git init\` and an initial commit.

  add        Register a momentum-installed repo as a member. Writes the
             member into ecosystem.json AND injects one fenced line into
             the target's CLAUDE.md / AGENTS.md pointing back here.
             Idempotent — re-running is a no-op when the state already
             matches.

  remove     Inverse of \`add\`. Strips the member from ecosystem.json and
             removes the fenced pointer from the target's primary
             instruction file.

  status     Print the manifest summary plus \`git status --short\` and
             the most recent commit for each member.

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
  const name = args[0] || path.basename(process.cwd());
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new Error(
      `init: ecosystem name "${name}" must match /^[a-z][a-z0-9-]*$/ ` +
      `(lowercase letters, digits, hyphens; start with a letter).`,
    );
  }

  // If [name] is given, scaffold under ./<name>/. Otherwise scaffold in CWD.
  const cliGaveName = args[0] !== undefined;
  const root = cliGaveName ? path.resolve(process.cwd(), name) : process.cwd();

  if (fs.existsSync(path.join(root, lib.MANIFEST_FILENAME))) {
    throw new Error(
      `init: ${path.join(root, lib.MANIFEST_FILENAME)} already exists. ` +
      `Refusing to overwrite.`,
    );
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
  console.log(`Next steps:`);
  console.log(`  cd ${cliGaveName ? name : '.'}`);
  console.log(`  momentum ecosystem add ../<repo-name>`);
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
      ensurePointerInjected(absRepo, primary, root, manifest.name);
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

  // Inject the fenced pointer into the target's primary instruction.
  ensurePointerInjected(absRepo, primary, root, manifest.name);

  console.log(`Added member "${id}" (${role}) at ${relPath}.`);
  console.log(`Pointer injected into ${path.relative(root, path.join(absRepo, primary))}.`);
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
    const primary = findPrimaryInstructionFile(absRepo);
    if (primary) {
      stripPointer(path.join(absRepo, primary));
    }
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
  const found = lib.findRoot(process.cwd());
  if (!found) {
    throw new Error(
      `${subcommand}: no ecosystem.json found in this or any parent directory. ` +
        `Pass --ecosystem <path>, or cd to an ecosystem root before running.`,
    );
  }
  return found;
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

Use \`momentum ecosystem initiative create <slug>\` to start a new one
(coming with Group 2 of Phase 9). Until then, create files by hand
following the template at
\`core/ecosystem/templates/initiative-template.md\` in the momentum
repo.
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
  ensurePointerInjected,
  stripPointer,
  findPrimaryInstructionFile,
  sanitizeId,
  POINTER_BEGIN,
  POINTER_END,
};
