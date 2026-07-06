'use strict';

/**
 * Swarm inbox protocol.
 *
 * Supervisors write `<eco>/swarms/<id>/inbox/NNNN-<slug>.md` when they
 * need a user decision they can't make alone. The conductor surfaces
 * these per turn and resolves them interactively. After resolution the
 * item is moved to `inbox/resolved/` (preserved for audit) and the
 * INDEX is regenerated.
 *
 * Numbering: monotonic across the swarm's lifetime, including
 * resolved. Filename: `NNNN-<slug>.md` matching the regex
 * `/^\d{4}-[a-z][a-z0-9-]*\.md$/`.
 *
 * Concurrency: writes use the same mkdir-lock as manifest.js.
 */

const fs = require('fs');
const path = require('path');

const manifestLib = require('./lib/manifest');

const INBOX_DIR = 'inbox';
const RESOLVED_DIR = 'resolved';
const INDEX_FILENAME = 'INDEX.md';

const FILENAME = /^(\d{4})-([a-z][a-z0-9-]*)\.md$/;

function inboxDir(ecosystemRoot, swarmId) {
  return path.join(manifestLib.swarmDir(ecosystemRoot, swarmId), INBOX_DIR);
}

function resolvedDir(ecosystemRoot, swarmId) {
  return path.join(inboxDir(ecosystemRoot, swarmId), RESOLVED_DIR);
}

function indexPath(ecosystemRoot, swarmId) {
  return path.join(inboxDir(ecosystemRoot, swarmId), INDEX_FILENAME);
}

function ensureLayout(ecosystemRoot, swarmId) {
  manifestLib.ensureSwarmLayout(ecosystemRoot, swarmId);
  fs.mkdirSync(resolvedDir(ecosystemRoot, swarmId), { recursive: true });
}

function nextInboxId(ecosystemRoot, swarmId) {
  ensureLayout(ecosystemRoot, swarmId);
  let max = 0;
  for (const name of fs.readdirSync(inboxDir(ecosystemRoot, swarmId))) {
    const m = name.match(FILENAME);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  for (const name of fs.readdirSync(resolvedDir(ecosystemRoot, swarmId))) {
    const m = name.match(FILENAME);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return String(max + 1).padStart(4, '0');
}

/**
 * Supervisor-side write. Returns { id, slug, filePath }.
 *
 * @param {object} args
 * @param {string} args.ecosystemRoot
 * @param {string} args.swarmId
 * @param {string} args.repo            ecosystem member id
 * @param {string} args.slug            kebab slug summarizing the question
 * @param {string} args.question        markdown body (full question)
 * @param {string[]} [args.options]     optional structured choices (each one line)
 * @param {string} args.nowIso
 */
function writeInboxItem(args) {
  const { ecosystemRoot, swarmId, repo, slug, question, options = [], nowIso } = args;
  if (typeof slug !== 'string' || !/^[a-z][a-z0-9-]*$/.test(slug)) {
    throw new TypeError(`writeInboxItem: invalid slug ${JSON.stringify(slug)}`);
  }
  if (typeof question !== 'string' || question.length === 0) {
    throw new TypeError('writeInboxItem: question required');
  }
  if (typeof repo !== 'string' || !/^[a-z][a-z0-9-]*$/.test(repo)) {
    throw new TypeError(`writeInboxItem: invalid repo ${JSON.stringify(repo)}`);
  }
  ensureLayout(ecosystemRoot, swarmId);
  const id = nextInboxId(ecosystemRoot, swarmId);
  const filePath = path.join(inboxDir(ecosystemRoot, swarmId), `${id}-${slug}.md`);
  const lines = [
    `# ${id} — ${slug}`,
    '',
    `- Repo: \`${repo}\``,
    `- Asked at: ${nowIso}`,
    `- Status: pending`,
    '',
    '## Question',
    '',
    question.trim(),
    '',
  ];
  if (options.length) {
    lines.push('## Options');
    lines.push('');
    for (const o of options) lines.push(`- ${o}`);
    lines.push('');
  }
  manifestLib.withLock(filePath, () => {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  });

  rebuildIndex(ecosystemRoot, swarmId);
  return { id, slug, filePath };
}

/**
 * Conductor-side: list pending items (excluding resolved/).
 */
function listPendingInboxItems(ecosystemRoot, swarmId) {
  const dir = inboxDir(ecosystemRoot, swarmId);
  if (!fs.existsSync(dir)) return [];
  const items = [];
  for (const name of fs.readdirSync(dir)) {
    const m = name.match(FILENAME);
    if (!m) continue;
    const filePath = path.join(dir, name);
    items.push(parseItemHeader(filePath, m[1], m[2]));
  }
  items.sort((a, b) => a.id.localeCompare(b.id));
  return items;
}

function parseItemHeader(filePath, id, slug) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n');
  let repo = '';
  let asked = '';
  let status = 'pending';
  for (const line of lines) {
    let m;
    if ((m = line.match(/^- Repo:\s*`([^`]+)`/))) repo = m[1];
    else if ((m = line.match(/^- Asked at:\s*(.+)$/))) asked = m[1].trim();
    else if ((m = line.match(/^- Status:\s*(.+)$/))) status = m[1].trim();
  }
  return { id, slug, repo, asked, status, filePath };
}

/**
 * Conductor-side: resolve an item with the user's answer. Moves the
 * file into resolved/ with the answer + ts appended.
 */
function resolveInboxItem(args) {
  const { ecosystemRoot, swarmId, id, answer, nowIso } = args;
  if (typeof id !== 'string' || !/^\d{4}$/.test(id)) {
    throw new TypeError(`resolveInboxItem: invalid id ${JSON.stringify(id)}`);
  }
  if (typeof answer !== 'string' || answer.length === 0) {
    throw new TypeError('resolveInboxItem: answer required');
  }
  ensureLayout(ecosystemRoot, swarmId);
  const dir = inboxDir(ecosystemRoot, swarmId);
  const match = fs.readdirSync(dir).find((n) => n.startsWith(`${id}-`) && n.endsWith('.md'));
  if (!match) throw new Error(`resolveInboxItem: no pending inbox item ${id}`);
  const fromPath = path.join(dir, match);
  const toPath = path.join(resolvedDir(ecosystemRoot, swarmId), match);

  const raw = fs.readFileSync(fromPath, 'utf8');
  const updated =
    raw.replace(/^- Status: pending\b/m, '- Status: resolved') +
    `\n## Answer (resolved at ${nowIso})\n\n${answer.trim()}\n`;

  manifestLib.withLock(fromPath, () => {
    fs.writeFileSync(toPath, updated, 'utf8');
    fs.unlinkSync(fromPath);
  });
  rebuildIndex(ecosystemRoot, swarmId);

  manifestLib.appendAudit(ecosystemRoot, swarmId, {
    ts: nowIso, actor: 'conductor', event: 'inbox-resolved',
    detail: `${id} — ${answer.slice(0, 200)}`,
  });
  return { id, resolvedPath: toPath };
}

/**
 * Regenerate inbox/INDEX.md from pending items. Cheap — runs on every
 * write/resolve.
 */
function rebuildIndex(ecosystemRoot, swarmId) {
  ensureLayout(ecosystemRoot, swarmId);
  const items = listPendingInboxItems(ecosystemRoot, swarmId);
  const lines = ['# Inbox — pending items', ''];
  if (items.length === 0) {
    lines.push('_(no pending items)_');
  } else {
    lines.push('| ID | Repo | Slug | Asked at |');
    lines.push('|----|------|------|----------|');
    for (const it of items) {
      lines.push(`| ${it.id} | ${it.repo} | ${it.slug} | ${it.asked} |`);
    }
  }
  lines.push('');
  fs.writeFileSync(indexPath(ecosystemRoot, swarmId), lines.join('\n'), 'utf8');
}

module.exports = {
  INBOX_DIR,
  RESOLVED_DIR,
  INDEX_FILENAME,
  inboxDir,
  resolvedDir,
  indexPath,
  ensureLayout,
  nextInboxId,
  writeInboxItem,
  listPendingInboxItems,
  resolveInboxItem,
  rebuildIndex,
};
