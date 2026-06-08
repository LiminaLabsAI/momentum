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
    case 'initiative':
      return cmdInitiative(rest);
    default:
      throw new Error(
        `unknown ecosystem subcommand "${sub}". ` +
        `Try: init | add | remove | status | initiative`,
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
  momentum ecosystem initiative create <slug> [--why "<text>"] [--repos r1,r2] [--owner <name>] [--ecosystem <path>]

Location:
  add / remove / status / initiative auto-locate the ecosystem root by
  walking up from CWD (bounded by MOMENTUM_MAX_PARENT_WALK, default 5)
  AND scanning siblings (so member-repo CWDs work). Use --ecosystem <path>
  to override explicitly.

Subcommands:
  init        Scaffold a new ecosystem root in the CWD (or under [name]/).
              Writes ecosystem.json, initiatives/, sessions/, .state/,
              .gitignore, README.md, CLAUDE.md, AGENTS.md. Runs \`git init\`
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
  sanitizeId,
  POINTER_BEGIN,
  POINTER_END,
};
