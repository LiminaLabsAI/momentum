'use strict';

/**
 * Test fixtures for ecosystem state detection.
 *
 * Each helper sets up a directory in a desired state and returns its
 * absolute path. Combine them under one tmpdir to build multi-state
 * scenarios (e.g. an ecosystem with one member and one orphan).
 *
 * Note: these are file-level fixtures — they do NOT shell out to
 * `momentum` CLI. They write the exact files the state detector reads.
 * This keeps tests fast and decoupled from the CLI's full init path
 * (which is exercised by ecosystem-cli.test.js separately).
 */

const fs = require('node:fs');
const path = require('node:path');

const POINTER_BEGIN = '<!-- ecosystem:begin -->';
const POINTER_END = '<!-- ecosystem:end -->';

/**
 * Write a momentum-installed standalone repo at the given path.
 * Creates a `specs/` skeleton + a primary instruction file.
 *
 * Returns the absolute path.
 */
function mkStandaloneRepo(dir, opts = {}) {
  const primary = opts.primary || 'CLAUDE.md';
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'specs'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, primary),
    `# ${path.basename(dir)}\n\n## Some content\n`,
    'utf8',
  );
  return path.resolve(dir);
}

/**
 * Write an ecosystem root at the given path with the given members
 * already registered. Each member is given by `{ id, path, role? }`.
 *
 * Returns the absolute path. Caller is responsible for also creating
 * the member directories (use mkMemberRepo or mkStandaloneRepo for that).
 */
function mkEcosystemRoot(dir, name, members = []) {
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'initiatives'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'sessions'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.state'), { recursive: true });
  const manifest = {
    name,
    version: 1,
    created: '2026-06-07',
    members: members.map((m) => ({
      id: m.id,
      path: m.path,
      role: m.role || 'other',
    })),
    dependencies: [],
  };
  fs.writeFileSync(
    path.join(dir, 'ecosystem.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8',
  );
  return path.resolve(dir);
}

/**
 * Write a momentum-installed member repo: standalone scaffold + pointer
 * block in the primary instruction file. Does NOT touch any
 * ecosystem.json — that is the ecosystem root's job (use mkEcosystemRoot
 * with the member in the members list to make the repo "registered").
 *
 * Returns the absolute path.
 */
function mkMemberRepo(dir, ecosystemName, opts = {}) {
  const repoPath = mkStandaloneRepo(dir, opts);
  injectPointerBlock(repoPath, ecosystemName);
  return repoPath;
}

/**
 * Write a directory that is both an ecosystem root and a member of
 * another ecosystem. Used for the rare `leader-and-member` state.
 */
function mkLeaderAndMember(dir, ownEcosystemName, parentEcosystemName, members = []) {
  mkEcosystemRoot(dir, ownEcosystemName, members);
  // Make this dir ALSO look like a member: needs a primary instruction
  // file with a pointer block.
  fs.writeFileSync(
    path.join(dir, 'CLAUDE.md'),
    `# ${path.basename(dir)}\n`,
    'utf8',
  );
  injectPointerBlock(dir, parentEcosystemName);
  return path.resolve(dir);
}

/**
 * Inject a sentinel-fenced pointer block at the top of the repo's
 * primary instruction file (CLAUDE.md preferred, AGENTS.md fallback).
 */
function injectPointerBlock(repoPath, ecosystemName) {
  const primary = ['CLAUDE.md', 'AGENTS.md'].find((n) =>
    fs.existsSync(path.join(repoPath, n)),
  );
  if (!primary) {
    throw new Error(
      `injectPointerBlock: no CLAUDE.md or AGENTS.md in ${repoPath}`,
    );
  }
  const filePath = path.join(repoPath, primary);
  const original = fs.readFileSync(filePath, 'utf8');
  if (original.includes(POINTER_BEGIN)) return;
  const block =
    `\n${POINTER_BEGIN}\n` +
    `> Member of \`${ecosystemName}\` ecosystem.\n` +
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
 * Corrupt the ecosystem.json at the given root path so validateManifest
 * fails. Useful for triggering the `broken-manifest` state.
 */
function corruptManifest(rootPath) {
  fs.writeFileSync(
    path.join(rootPath, 'ecosystem.json'),
    '{ "version": 1, "members": "this should be an array" }\n',
    'utf8',
  );
}

module.exports = {
  mkStandaloneRepo,
  mkEcosystemRoot,
  mkMemberRepo,
  mkLeaderAndMember,
  injectPointerBlock,
  corruptManifest,
  POINTER_BEGIN,
  POINTER_END,
};
