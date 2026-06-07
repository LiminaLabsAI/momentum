'use strict';

/**
 * Pointer block helpers — extracted from bin/ecosystem.js so that
 * `momentum join` / `momentum leave` (Phase 10 Group 1) can reuse the
 * same primitives without duplicating logic.
 *
 * A pointer block is a sentinel-fenced markdown stanza injected at the
 * top of a member repo's primary instruction file (CLAUDE.md / AGENTS.md)
 * stating "this repo is a member of <ecosystem>". The block is the only
 * touch the ecosystem layer makes on a member repo — strictly additive.
 */

const fs = require('fs');
const path = require('path');

const POINTER_BEGIN = '<!-- ecosystem:begin -->';
const POINTER_END = '<!-- ecosystem:end -->';

// Order matters: prefer CLAUDE.md over AGENTS.md when both exist.
// Future adapters can extend this via the adapter contract (Phase 11+).
const PRIMARY_INSTRUCTION_CANDIDATES = ['CLAUDE.md', 'AGENTS.md'];

/**
 * Locate the primary instruction file in a member repo by checking
 * the candidate list in order. Returns the filename (relative) or null.
 */
function findPrimaryInstructionFile(repoPath) {
  for (const name of PRIMARY_INSTRUCTION_CANDIDATES) {
    if (fs.existsSync(path.join(repoPath, name))) {
      return name;
    }
  }
  return null;
}

/**
 * True iff `repoPath` has a primary instruction file containing a
 * pointer block. Returns false on missing file, unreadable file, or
 * absent sentinel.
 */
function hasPointerBlock(repoPath) {
  const primary = findPrimaryInstructionFile(repoPath);
  if (!primary) return false;
  try {
    const content = fs.readFileSync(path.join(repoPath, primary), 'utf8');
    return content.includes(POINTER_BEGIN);
  } catch (_err) {
    return false;
  }
}

/**
 * Inject the pointer block immediately after the first H1 in the
 * primary instruction file, or at the top of file if no H1 exists.
 * Idempotent: re-running on a file that already contains the sentinel
 * is a no-op (preserves any user edits inside the fence).
 *
 * `absRepo` — absolute path to the member repo.
 * `primaryFile` — filename returned by findPrimaryInstructionFile.
 * `root` — absolute path to the ecosystem root.
 * `ecosystemName` — manifest name (used in the human-readable line).
 */
function ensurePointerInjected(absRepo, primaryFile, root, ecosystemName) {
  const filePath = path.join(absRepo, primaryFile);
  const original = fs.readFileSync(filePath, 'utf8');
  if (original.includes(POINTER_BEGIN)) return;

  const relFromMember = path.relative(absRepo, root) || '.';
  const block =
    `\n${POINTER_BEGIN}\n` +
    `> Member of \`${ecosystemName}\` ecosystem at \`${relFromMember}\`.\n` +
    `> See ecosystem.json for siblings and \`momentum ecosystem status\` for live state.\n` +
    `${POINTER_END}\n`;

  const lines = original.split('\n');
  let insertAt = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^#\s+/.test(lines[i])) {
      insertAt = i + 1;
      break;
    }
  }
  const next = lines
    .slice(0, insertAt)
    .concat(block.split('\n').slice(0, -1), lines.slice(insertAt))
    .join('\n');
  fs.writeFileSync(filePath, next, 'utf8');
}

/**
 * Strip the pointer block (and one surrounding blank line) from the
 * given file. Idempotent: silently no-ops if the file is missing or
 * the sentinel is absent.
 */
function stripPointer(filePath) {
  if (!fs.existsSync(filePath)) return;
  const original = fs.readFileSync(filePath, 'utf8');
  if (!original.includes(POINTER_BEGIN)) return;
  const re = new RegExp(
    `\\n?${escapeRegExp(POINTER_BEGIN)}[\\s\\S]*?${escapeRegExp(POINTER_END)}\\n?`,
    'g',
  );
  fs.writeFileSync(filePath, original.replace(re, '\n'), 'utf8');
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  POINTER_BEGIN,
  POINTER_END,
  PRIMARY_INSTRUCTION_CANDIDATES,
  findPrimaryInstructionFile,
  hasPointerBlock,
  ensurePointerInjected,
  stripPointer,
};
