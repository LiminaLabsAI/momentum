'use strict';

/**
 * Phase 26 — Project Preferences.
 *
 * The default `specs/preferences.md` template + the markdown renderer used by
 * `writePreferences()` (core/preferences.js). Pure functions only — no fs.
 *
 * The preference file is a frontmatter-typed (`type: Preferences`) markdown
 * document with a `| Key | Value |` table. Lists (branch_flow,
 * protected_branches) are serialized as comma-separated values. The file is
 * hand-editable; the reader (core/preferences.js) is tolerant of reordering,
 * extra notes, and missing rows (fail-closed to defaults).
 */

const KNOWN_KEYS = [
  'language',
  'framework',
  'test_command',
  'build_command',
  'publish_target',
  'git_forge',
  'release_command',
  'release_flow',
  'end_state',
  'branch_flow',
  'protected_branches',
];

const LIST_KEYS = new Set(['branch_flow', 'protected_branches']);

/**
 * Render the `specs/preferences.md` markdown for a Preferences object.
 * @param {object} prefs     normalized preferences (all keys present)
 * @param {object} [opts]
 * @param {boolean} [opts.inferred]  true when values were machine-inferred
 *        (init/upgrade) — adds the "confirm at /start-project" header note
 * @param {string} [opts.note]       extra text appended under ## Notes
 * @returns {string}
 */
function renderPreferencesMarkdown(prefs, opts = {}) {
  const lines = [];
  lines.push('---');
  lines.push('type: Preferences');
  lines.push('---');
  lines.push('');
  lines.push('# Project Preferences');
  lines.push('');
  if (opts.inferred) {
    lines.push('> Inferred by momentum init — confirm at `/start-project` or edit anytime.');
    lines.push('> Recipes read these at execution time; missing/unknown values fall back to');
    lines.push('> npm/GitHub defaults with a warning. This file is version-controlled project');
    lines.push('> content — edit freely.');
  } else {
    lines.push('> Recipes read these at execution time; missing/unknown values fall back to');
    lines.push('> npm/GitHub defaults with a warning. Edit freely — this file is version-');
    lines.push('> controlled project content.');
  }
  lines.push('');
  lines.push('| Key | Value |');
  lines.push('|-----|-------|');
  for (const key of KNOWN_KEYS) {
    const raw = prefs[key];
    const value = LIST_KEYS.has(key)
      ? (Array.isArray(raw) ? raw.join(', ') : String(raw ?? ''))
      : String(raw ?? '');
    lines.push(`| ${key} | ${value} |`);
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push(opts.note ? opts.note.trim() : '_(none — edit freely)_');
  lines.push('');
  return lines.join('\n');
}

module.exports = { KNOWN_KEYS, LIST_KEYS, renderPreferencesMarkdown };
