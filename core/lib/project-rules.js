'use strict';

/**
 * `specs/project-rules.md` — the single shared home for project-specific PROSE
 * (Phase 28, ADR-0010). Every agent instruction file's `## Project Extensions`
 * section becomes a managed POINTER to this file, so project rules live once and
 * cannot diverge across adapters.
 *
 * This module owns:
 *   - the pointer block that replaces `## Project Extensions`,
 *   - the `project-rules.md` scaffold,
 *   - `migrateProjectExtensions()` — the migrate-never-drop upgrade path that
 *     moves an instruction file's authored extensions into project-rules.md and
 *     rewrites its `## Project Extensions` as the pointer.
 *
 * Pure logic is exported separately from the fs-touching migration so it is
 * unit-testable. Zero dependencies — node builtins only.
 */

const fs = require('fs');
const path = require('path');

const MARKER = '## Project Extensions';
const POINTER_SENTINEL = '<!-- momentum:project-rules-pointer -->';
const PROJECT_RULES_REL = 'project-rules.md';

/** The managed pointer block that IS the `## Project Extensions` section. */
function renderPointerBlock() {
  return [
    MARKER,
    '',
    POINTER_SENTINEL,
    '> **Project-specific rules live in `specs/project-rules.md`** — read it now.',
    '> Session-start self-audits, project constraints, and any project-specific',
    '> guidance are there, shared identically by every agent (ADR-0010). This',
    '> section is a momentum-managed pointer; edit `specs/project-rules.md`, not',
    '> this file.',
    '',
  ].join('\n');
}

/** Fresh `project-rules.md` scaffold (optionally carrying migrated body). */
function renderProjectRules(projectName, migratedBody) {
  const head = [
    '---',
    'type: Project Rules',
    '---',
    '',
    `# Project Rules — ${projectName || 'this project'}`,
    '',
    '> Project-specific rules every agent reads — referenced by each instruction',
    "> file's `## Project Extensions` pointer (ADR-0010). One home, shared by all",
    '> adapters. Edit freely. For a rule that applies to only one agent, annotate',
    '> it inline (e.g. *(Claude Code only)*).',
    '',
  ].join('\n');
  const body = (migratedBody && migratedBody.trim())
    ? migratedBody.trim() + '\n'
    : '_(no project-specific rules yet)_\n';
  return head + body;
}

/**
 * Extract authored prose from a `## Project Extensions` region — everything
 * after the heading and its leading `>` boilerplate note. Returns '' when the
 * region is empty, boilerplate-only, or already the pointer.
 */
function extractAuthoredProse(extensionsRegion) {
  if (!extensionsRegion) return '';
  if (extensionsRegion.includes(POINTER_SENTINEL)) return ''; // already a pointer
  const lines = extensionsRegion.replace(/^\n+/, '').split('\n');
  // drop the `## Project Extensions` heading line
  if (lines[0] && lines[0].trim() === MARKER) lines.shift();
  // drop leading blank + blockquote boilerplate lines
  while (lines.length && (lines[0].trim() === '' || lines[0].trimStart().startsWith('>'))) {
    lines.shift();
  }
  return lines.join('\n').trim();
}

/** Replace a file's `## Project Extensions` region with the pointer block. */
function pointerizeContent(content) {
  const idx = content.indexOf('\n' + MARKER);
  const managed = idx === -1 ? content.replace(/\s+$/, '') : content.slice(0, idx).replace(/\s+$/, '');
  return managed + '\n\n' + renderPointerBlock();
}

/** True when a file's extensions region is already the managed pointer. */
function isPointerized(content) {
  return content.includes(POINTER_SENTINEL);
}

/**
 * Migrate one instruction file's Project Extensions into project-rules.md and
 * rewrite the section as the pointer. Migrate-never-drop, idempotent.
 *
 * @param {string} instructionFile absolute path (CLAUDE.md / AGENTS.md)
 * @param {string} specsDir        absolute path to the project's specs/ dir
 * @param {object} [opts] { dryRun, projectName }
 * @returns {{ changed, appended, alreadyPointer, proseChars }}
 */
function migrateProjectExtensions(instructionFile, specsDir, opts = {}) {
  const dryRun = Boolean(opts.dryRun);
  const result = { changed: false, appended: false, alreadyPointer: false, proseChars: 0 };
  if (!fs.existsSync(instructionFile)) return result;

  const content = fs.readFileSync(instructionFile, 'utf8');
  if (isPointerized(content)) { result.alreadyPointer = true; return result; }

  const idx = content.indexOf('\n' + MARKER);
  const extensionsRegion = idx === -1 ? '' : content.slice(idx);
  const prose = extractAuthoredProse(extensionsRegion);
  result.proseChars = prose.length;

  const rulesPath = path.join(specsDir, PROJECT_RULES_REL);

  if (prose) {
    const label = path.basename(instructionFile);
    const heading = `## Migrated from ${label}`;
    let existing = fs.existsSync(rulesPath) ? fs.readFileSync(rulesPath, 'utf8') : null;
    if (existing === null) {
      existing = renderProjectRules(opts.projectName, '');
    }
    // Idempotent: only append if this file's migration block isn't already there.
    if (!existing.includes(heading)) {
      const block = `\n${heading}\n\n${prose}\n`;
      const next = existing.replace(/\s+$/, '') + '\n' + block;
      if (!dryRun) {
        fs.mkdirSync(specsDir, { recursive: true });
        fs.writeFileSync(rulesPath, next);
      }
      result.appended = true;
    }
  }

  // Rewrite the instruction file's extensions region as the pointer.
  const pointerized = pointerizeContent(content);
  if (pointerized !== content) {
    if (!dryRun) fs.writeFileSync(instructionFile, pointerized);
    result.changed = true;
  }
  return result;
}

module.exports = {
  MARKER,
  POINTER_SENTINEL,
  PROJECT_RULES_REL,
  renderPointerBlock,
  renderProjectRules,
  extractAuthoredProse,
  pointerizeContent,
  isPointerized,
  migrateProjectExtensions,
};
