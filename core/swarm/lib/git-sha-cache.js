'use strict';

/**
 * Git HEAD SHA invalidation — Strategy B from the indexing design.
 *
 * The conductor stores per-repo `last_seen_sha` in the manifest. Each
 * conductor turn:
 *
 *   1. `git rev-parse HEAD` per active-wave repo (no token cost)
 *   2. If unchanged → that repo's cached supervisor state is fresh
 *   3. If changed → re-read details + history tail for that repo only
 *
 * This file isolates the spawnSync call so the rest of the swarm code
 * stays pure (and the spawn is easily stubbed in tests).
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * @param {string} repoPath  absolute path to a repo's working tree
 * @returns {string|null}    7+-char hex SHA, or null if not a git repo
 *                           or HEAD is unborn
 */
function readHeadSha(repoPath) {
  if (typeof repoPath !== 'string' || repoPath.length === 0) return null;
  if (!fs.existsSync(path.join(repoPath, '.git'))) return null;
  const r = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoPath,
    encoding: 'utf8',
    timeout: 3000,
  });
  if (r.status !== 0) return null;
  const out = (r.stdout || '').trim();
  return /^[0-9a-f]{7,40}$/.test(out) ? out : null;
}

/**
 * Given a snapshot of (repoId → lastSeenSha) and a way to find each
 * repo's working tree, return:
 *   { changed: [repoId,…], unchanged: [repoId,…], shas: {repoId: sha} }
 *
 * `resolveRepoPath(repoId)` returns the absolute path. Lets the caller
 * thread ecosystem-root → member.path lookup without coupling this
 * module to ecosystem internals.
 */
function diffSinceLastSeen(lastSeen, resolveRepoPath) {
  const changed = [];
  const unchanged = [];
  const shas = {};
  for (const repoId of Object.keys(lastSeen)) {
    const repoPath = resolveRepoPath(repoId);
    const sha = repoPath ? readHeadSha(repoPath) : null;
    shas[repoId] = sha;
    if (sha == null) {
      // Treat unreadable repos as changed so the caller refreshes.
      changed.push(repoId);
    } else if (sha !== lastSeen[repoId]) {
      changed.push(repoId);
    } else {
      unchanged.push(repoId);
    }
  }
  return { changed, unchanged, shas };
}

module.exports = {
  readHeadSha,
  diffSinceLastSeen,
};
