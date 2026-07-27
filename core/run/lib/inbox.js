'use strict';

/**
 * Phase 32a G2 — the park primitive.
 *
 * Extracted from `core/swarm/inbox.js`, which is now a thin adapter over this
 * file (ADR-0003's one-engine/thin-adapter pattern). Swarm's public surface is
 * unchanged and its 236 tests are the gate.
 *
 * WHY THIS EXISTS AT THIS TIER: parking is the classifier's DEFAULT branch
 * (ADR-0019 §4) — when authority is ambiguous the run parks rather than
 * guessing. A park must therefore be available to a run at any tier, not only
 * to a cross-repo swarm. It is also what makes an operator-authority decision
 * *non-blocking*: the thread that needs the answer freezes, everything
 * independent keeps moving, and questions batch for one reading.
 *
 * TIER-AGNOSTIC BY CONSTRUCTION: this module knows a directory, not a swarm.
 * The swarm-specific concepts it used to carry (`ecosystemRoot`, `swarmId`,
 * `repo`) collapse into `baseDir` and a generic `scope`. The field label is
 * parametrizable so swarm keeps writing `- Repo:` byte-for-byte while runs
 * write `- Scope:`, and the reader accepts both (back-compat for inbox items
 * written before this extraction).
 *
 * Numbering is monotonic across the inbox's lifetime, resolved items included.
 * Filenames match /^\d{4}-[a-z][a-z0-9-]*\.md$/.
 */

const fs = require('fs');
const path = require('path');

const { withLock: defaultWithLock } = require('./lock');

const INBOX_DIR = 'inbox';
const RESOLVED_DIR = 'resolved';
const INDEX_FILENAME = 'INDEX.md';
const DEFAULT_FIELD_LABEL = 'Scope';

const FILENAME = /^(\d{4})-([a-z][a-z0-9-]*)\.md$/;
const SLUG = /^[a-z][a-z0-9-]*$/;

function inboxDir(baseDir) {
  return path.join(baseDir, INBOX_DIR);
}

function resolvedDir(baseDir) {
  return path.join(inboxDir(baseDir), RESOLVED_DIR);
}

function indexPath(baseDir) {
  return path.join(inboxDir(baseDir), INDEX_FILENAME);
}

function ensureLayout(baseDir) {
  fs.mkdirSync(resolvedDir(baseDir), { recursive: true });
}

function nextInboxId(baseDir) {
  ensureLayout(baseDir);
  let max = 0;
  for (const dir of [inboxDir(baseDir), resolvedDir(baseDir)]) {
    for (const name of fs.readdirSync(dir)) {
      const m = name.match(FILENAME);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > max) max = n;
      }
    }
  }
  return String(max + 1).padStart(4, '0');
}

/**
 * Write a parked question. Returns { id, slug, filePath }.
 *
 * @param {object} args
 * @param {string} args.baseDir      directory containing `inbox/`
 * @param {string} args.scope        who/what is blocked — a member id, a unit id
 * @param {string} args.slug         kebab slug summarizing the question
 * @param {string} args.question     markdown body
 * @param {string[]} [args.options]  optional structured choices, one line each
 * @param {string} args.nowIso
 * @param {string} [args.fieldLabel] header label for `scope` (swarm passes 'Repo')
 * @param {Function} [args.withLock] lock strategy; defaults to the shared mkdir lock
 * @param {string} [args.reason]     ADR-0019 classification: operator-authority | ambiguous
 */
function writeItem(args) {
  const {
    baseDir, scope, slug, question, options = [], nowIso,
    fieldLabel = DEFAULT_FIELD_LABEL, withLock = defaultWithLock, reason,
  } = args;

  if (typeof slug !== 'string' || !SLUG.test(slug)) {
    throw new TypeError(`writeItem: invalid slug ${JSON.stringify(slug)}`);
  }
  if (typeof question !== 'string' || question.length === 0) {
    throw new TypeError('writeItem: question required');
  }
  if (typeof scope !== 'string' || !SLUG.test(scope)) {
    throw new TypeError(`writeItem: invalid scope ${JSON.stringify(scope)}`);
  }

  ensureLayout(baseDir);
  const id = nextInboxId(baseDir);
  const filePath = path.join(inboxDir(baseDir), `${id}-${slug}.md`);

  const lines = [
    `# ${id} — ${slug}`,
    '',
    `- ${fieldLabel}: \`${scope}\``,
    `- Asked at: ${nowIso}`,
    `- Status: pending`,
  ];
  // Only runs carry a classification reason; swarm items must stay byte-identical.
  if (reason) lines.push(`- Reason: ${reason}`);
  lines.push('', '## Question', '', question.trim(), '');

  if (options.length) {
    lines.push('## Options', '');
    for (const o of options) lines.push(`- ${o}`);
    lines.push('');
  }

  withLock(filePath, () => {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  });

  rebuildIndex(baseDir, { fieldLabel });
  return { id, slug, filePath };
}

/** List pending items (excludes `resolved/`). */
function listPending(baseDir) {
  const dir = inboxDir(baseDir);
  if (!fs.existsSync(dir)) return [];
  const items = [];
  for (const name of fs.readdirSync(dir)) {
    const m = name.match(FILENAME);
    if (!m) continue;
    items.push(parseItemHeader(path.join(dir, name), m[1], m[2]));
  }
  items.sort((a, b) => a.id.localeCompare(b.id));
  return items;
}

function parseItemHeader(filePath, id, slug) {
  const raw = fs.readFileSync(filePath, 'utf8');
  let scope = '';
  let asked = '';
  let status = 'pending';
  let reason = '';

  for (const line of raw.split('\n')) {
    let m;
    // Back-compat: `Repo:` is what every inbox item written before this
    // extraction carries, and swarm keeps writing it.
    if ((m = line.match(/^- (?:Scope|Repo):\s*`([^`]+)`/))) scope = m[1];
    else if ((m = line.match(/^- Asked at:\s*(.+)$/))) asked = m[1].trim();
    else if ((m = line.match(/^- Status:\s*(.+)$/))) status = m[1].trim();
    else if ((m = line.match(/^- Reason:\s*(.+)$/))) reason = m[1].trim();
  }
  return { id, slug, scope, asked, status, reason, filePath };
}

/**
 * Resolve an item with the operator's answer. Moves it into `resolved/` with
 * the answer appended — resolved items are preserved for audit, never deleted.
 *
 * @param {Function} [args.onResolved] side-effect hook (swarm appends to its audit log)
 */
function resolveItem(args) {
  const {
    baseDir, id, answer, nowIso,
    fieldLabel = DEFAULT_FIELD_LABEL, withLock = defaultWithLock, onResolved,
  } = args;

  if (typeof id !== 'string' || !/^\d{4}$/.test(id)) {
    throw new TypeError(`resolveItem: invalid id ${JSON.stringify(id)}`);
  }
  if (typeof answer !== 'string' || answer.length === 0) {
    throw new TypeError('resolveItem: answer required');
  }

  ensureLayout(baseDir);
  const dir = inboxDir(baseDir);
  const match = fs.readdirSync(dir).find((n) => n.startsWith(`${id}-`) && n.endsWith('.md'));
  if (!match) throw new Error(`resolveItem: no pending inbox item ${id}`);

  const fromPath = path.join(dir, match);
  const toPath = path.join(resolvedDir(baseDir), match);

  const raw = fs.readFileSync(fromPath, 'utf8');
  const updated =
    raw.replace(/^- Status: pending\b/m, '- Status: resolved') +
    `\n## Answer (resolved at ${nowIso})\n\n${answer.trim()}\n`;

  withLock(fromPath, () => {
    fs.writeFileSync(toPath, updated, 'utf8');
    fs.unlinkSync(fromPath);
  });
  rebuildIndex(baseDir, { fieldLabel });

  if (typeof onResolved === 'function') onResolved({ id, answer, nowIso, resolvedPath: toPath });

  return { id, resolvedPath: toPath };
}

/** Regenerate `inbox/INDEX.md` from pending items. Cheap; runs on every write/resolve. */
function rebuildIndex(baseDir, opts = {}) {
  const fieldLabel = opts.fieldLabel || DEFAULT_FIELD_LABEL;
  ensureLayout(baseDir);
  const items = listPending(baseDir);
  const lines = ['# Inbox — pending items', ''];
  if (items.length === 0) {
    lines.push('_(no pending items)_');
  } else {
    lines.push(`| ID | ${fieldLabel} | Slug | Asked at |`);
    lines.push('|----|------|------|----------|');
    for (const it of items) {
      lines.push(`| ${it.id} | ${it.scope} | ${it.slug} | ${it.asked} |`);
    }
  }
  lines.push('');
  fs.writeFileSync(indexPath(baseDir), lines.join('\n'), 'utf8');
}

module.exports = {
  INBOX_DIR,
  RESOLVED_DIR,
  INDEX_FILENAME,
  DEFAULT_FIELD_LABEL,
  inboxDir,
  resolvedDir,
  indexPath,
  ensureLayout,
  nextInboxId,
  writeItem,
  listPending,
  resolveItem,
  rebuildIndex,
  parseItemHeader,
};
