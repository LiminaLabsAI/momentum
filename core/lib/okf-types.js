'use strict';

/**
 * OKF v0.1 type taxonomy for momentum spec trees (ADR-0005).
 *
 * Maps a path RELATIVE TO THE specs/ ROOT (forward slashes) to the
 * frontmatter `type` momentum assigns that concept document. First match
 * wins. Types are producer-defined per OKF §frontmatter; consumers must
 * tolerate unknown types, so this vocabulary can grow freely.
 *
 * Single source of truth for: the upgrade migration (okf-migrate.js),
 * the conformance checker (`momentum okf check`), and the templates.
 */

/** Reserved OKF filenames — never concept documents (SPEC.md §reserved). */
const RESERVED = ['index.md', 'log.md'];

function isReserved(relPath) {
  const base = relPath.split('/').pop();
  return RESERVED.includes(base);
}

const RULES = [
  [/^status\.md$/, 'Status'],
  [/^config\.md$/, 'Config'],
  [/^project-rules\.md$/, 'Project Rules'],
  [/^backlog\/backlog\.md$/, 'Backlog'],
  [/^backlog\/details\/.+\.md$/, 'Backlog Detail'],
  [/^planning\/roadmap\.md$/, 'Roadmap'],
  [/^planning\/.+\.md$/, 'Planning Note'],
  [/^decisions\/impact-map\.md$/, 'Impact Map'],
  [/^decisions\/\d{4}-.+\.md$/, 'Decision'],
  [/^phases\/[^/]+\/overview\.md$/, 'Phase'],
  [/^phases\/[^/]+\/plan\.md$/, 'Plan'],
  [/^phases\/[^/]+\/tasks\.md$/, 'Task List'],
  [/^phases\/[^/]+\/history\.md$/, 'Phase History'],
  [/^phases\/[^/]+\/retrospective\.md$/, 'Retrospective'],
  [/^phases\/[^/]+\/evidence\/.+\.md$/, 'Evidence'],
  [/^adhoc\/[^/]+\/record\.md$/, 'Ad-hoc Record'],
  [/^adhoc\/_TEMPLATE\.md$/, 'Ad-hoc Record'], // scaffold template — copies become record.md
  [/^changelog\/.+\.md$/, 'Changelog'],
  [/^architecture\/.+\.md$/, 'Architecture Spec'],
  [/^vision\/.+\.md$/, 'Vision'],
  [/(^|\/)README\.md$/, 'Guide'],
];

const FALLBACK = 'Note';

/**
 * The `type` for a specs-relative .md path, or null for reserved
 * filenames (which must not carry concept frontmatter).
 */
function typeForPath(relPath) {
  const posix = relPath.replace(/\\/g, '/').replace(/^\.\//, '');
  if (!posix.endsWith('.md')) return null;
  if (isReserved(posix)) return null;
  for (const [pattern, type] of RULES) {
    if (pattern.test(posix)) return type;
  }
  return FALLBACK;
}

module.exports = { typeForPath, isReserved, RESERVED, RULES, FALLBACK };
