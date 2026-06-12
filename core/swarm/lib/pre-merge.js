'use strict';

/**
 * Pre-merge preview at fan-in.
 *
 * At swarm completion (or at a wave checkpoint where two sibling
 * branches would merge into a common base), preview the merge to
 * surface conflicts BEFORE the destructive commit. The conductor
 * never actually merges — it surfaces conflicts as inbox items the
 * user resolves before authorizing the real merge.
 *
 * The preview shells out:
 *
 *   git merge --no-commit --no-ff <sibling-branch>
 *
 * If there are conflicts, capture the marker file list. Always run
 * `git merge --abort` to leave the working tree clean.
 *
 * This module never writes to disk outside the repo's own git state
 * (which `merge --abort` cleans up). It returns a structured result
 * the caller can render into an inbox item.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * @param {object} args
 * @param {string} args.baseRepoPath  absolute path to repo on the base/merge-target branch
 * @param {string} args.sourceBranch  branch to preview-merge
 * @param {string} [args.targetBranch] branch baseRepoPath should already be on (default: current HEAD)
 * @returns {{ ok: boolean, conflictedFiles: string[], summary: string, error?: string }}
 */
function previewMerge(args) {
  const { baseRepoPath, sourceBranch } = args;
  if (typeof baseRepoPath !== 'string' || !fs.existsSync(path.join(baseRepoPath, '.git'))) {
    return { ok: false, conflictedFiles: [], summary: 'not a git repo', error: `${baseRepoPath} is not a git repo` };
  }
  if (typeof sourceBranch !== 'string' || sourceBranch.length === 0) {
    return { ok: false, conflictedFiles: [], summary: 'sourceBranch required', error: 'sourceBranch required' };
  }

  // Ensure the source branch exists locally
  const exists = spawnSync('git', ['rev-parse', '--verify', `refs/heads/${sourceBranch}`], {
    cwd: baseRepoPath, encoding: 'utf8',
  });
  if (exists.status !== 0) {
    return {
      ok: false, conflictedFiles: [],
      summary: `source branch ${sourceBranch} not found`,
      error: (exists.stderr || '').trim(),
    };
  }

  const merge = spawnSync('git', ['merge', '--no-commit', '--no-ff', sourceBranch], {
    cwd: baseRepoPath, encoding: 'utf8', timeout: 10000,
  });

  // Capture conflicted file list — always, then always abort
  const status = spawnSync('git', ['diff', '--name-only', '--diff-filter=U'], {
    cwd: baseRepoPath, encoding: 'utf8',
  });
  const conflictedFiles = (status.stdout || '')
    .split('\n').map((s) => s.trim()).filter(Boolean);

  // Abort to clean working tree
  spawnSync('git', ['merge', '--abort'], { cwd: baseRepoPath });

  if (merge.status === 0 && conflictedFiles.length === 0) {
    return {
      ok: true, conflictedFiles: [],
      summary: `clean merge — ${sourceBranch} merges into HEAD without conflicts`,
    };
  }

  return {
    ok: false,
    conflictedFiles,
    summary: conflictedFiles.length
      ? `${conflictedFiles.length} file(s) conflict on merge of ${sourceBranch}`
      : 'merge failed (no conflict markers — see error)',
    error: (merge.stderr || '').trim(),
  };
}

/**
 * Run a preview for every (repo, branch) pair the swarm is about to
 * merge. The caller passes a list:
 *   [{ repo, repoPath, branch, intoBranch }, ...]
 *
 * Each entry: if intoBranch differs from the repo's current HEAD,
 * checkout intoBranch first (the caller is responsible — this helper
 * just runs the preview against the working state).
 *
 * @returns Array<{ repo, branch, result }>
 */
function previewMergeBatch(entries) {
  const out = [];
  for (const e of entries) {
    const result = previewMerge({
      baseRepoPath: e.repoPath, sourceBranch: e.branch,
    });
    out.push({ repo: e.repo, branch: e.branch, intoBranch: e.intoBranch, result });
  }
  return out;
}

module.exports = {
  previewMerge,
  previewMergeBatch,
};
