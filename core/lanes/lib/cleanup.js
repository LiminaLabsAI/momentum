'use strict';

/**
 * Shared, forge-neutral cleanup action for a "spent" branch/lane
 * (Phase 27 G0 — BUG-026 / ENH-063; see specs/phases/phase-27-lifecycle-cleanup).
 *
 * A phase/lane branch is "spent" once its work has landed on the terminal
 * integration branch. `cleanupTarget()` removes what it leaves behind, in a
 * fixed, idempotent, DEFAULT-BRANCH-SAFE order:
 *
 *   1. worktree      git worktree remove       (never the caller's own worktree)
 *   2. local branch  git branch -d             (-D only with force; unmerged → blocked)
 *   3. remote branch git push origin --delete  (SKIPPED when it is the forge default)
 *   4. lane state    clear inbox/signals; leave a `cleaned` tombstone by default
 *
 * Pure git + node builtins; ships NO forge code — the optional `gh` default-branch
 * assertion lives in the recipes, config-gated (momentum stays forge-neutral).
 * Idempotent: anything already gone is reported `skipped`, never an error. The
 * remote-default guard is load-bearing: it is the reason a hijacked default
 * branch (BUG-025) can never be deleted out from under the repo.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const state = require('./state');

function git(cwd, ...args) {
  return spawnSync('git', args, { cwd, encoding: 'utf8' });
}
function ok(res) { return res && res.status === 0; }
function out(res) { return ((res && res.stdout) || '').trim(); }
function err(res) { return ((res && res.stderr) || '').trim(); }

/** Real path (resolves symlinks like macOS /var → /private/var), best-effort. */
function realpath(p) {
  try { return fs.realpathSync(p); } catch { return path.resolve(p); }
}
function samePath(a, b) {
  return Boolean(a) && Boolean(b) && realpath(a) === realpath(b);
}

// ─── read-only git predicates ────────────────────────────────────────────

function hasRemote(cwd, remote = 'origin') {
  return ok(git(cwd, 'remote', 'get-url', remote));
}

function localBranchExists(cwd, branch) {
  return ok(git(cwd, 'rev-parse', '--verify', '--quiet', `refs/heads/${branch}`));
}

function remoteBranchExists(cwd, branch, remote = 'origin') {
  const res = git(cwd, 'ls-remote', '--heads', remote, branch);
  return ok(res) && out(res) !== '';
}

/** True when `ref` is contained in `container` (already merged / landed). */
function isMerged(cwd, ref, container) {
  return ok(git(cwd, 'merge-base', '--is-ancestor', ref, container));
}

/**
 * The remote's default branch short name (e.g. "main"), or null when unknown.
 * Prefers the locally-tracked symbolic ref; falls back to asking the remote
 * (network) unless { network:false }.
 */
function remoteDefaultBranch(cwd, { remote = 'origin', network = true } = {}) {
  const local = git(cwd, 'symbolic-ref', '--short', `refs/remotes/${remote}/HEAD`);
  if (ok(local) && out(local)) {
    return out(local).replace(new RegExp(`^${remote}/`), '');
  }
  if (network) {
    const ls = git(cwd, 'ls-remote', '--symref', remote, 'HEAD');
    if (ok(ls)) {
      const m = out(ls).match(/^ref:\s+refs\/heads\/(\S+)\s+HEAD/m);
      if (m) return m[1];
    }
  }
  return null;
}

/** Registered worktrees: [{ path, branch }]. */
function worktreeList(cwd) {
  const res = git(cwd, 'worktree', 'list', '--porcelain');
  if (!ok(res)) return [];
  const trees = [];
  let cur = null;
  for (const line of out(res).split('\n')) {
    if (line.startsWith('worktree ')) { cur = { path: line.slice('worktree '.length), branch: null }; trees.push(cur); }
    else if (line.startsWith('branch ') && cur) cur.branch = line.slice('branch '.length).replace('refs/heads/', '');
  }
  return trees;
}

// ─── the shared cleanup action ───────────────────────────────────────────

/**
 * Remove the artifacts a spent branch/lane leaves behind.
 *
 * @param {object} opts
 *   cwd          where git runs (must NOT be inside `worktree`)
 *   branch       branch to delete (local + remote)
 *   worktree     worktree path to remove (optional)
 *   laneId       lane-state id to clear (optional)
 *   anchor       lane-state anchor (optional; derived from cwd)
 *   deleteRemote delete origin/<branch> when safe (default true)
 *   force        allow `git branch -D` / `worktree remove --force` (default false)
 *   dryRun       report intended actions without performing them
 *   keepState    keep the full lane dir untouched (default false → tombstone)
 *   remote       remote name (default 'origin')
 * @returns {{ ok:boolean, actions:Array<{step,status,detail}>, blocked:string[] }}
 */
function cleanupTarget(opts = {}) {
  const cwd = opts.cwd || process.cwd();
  const {
    branch, worktree, laneId,
    deleteRemote = true, force = false, dryRun = false, keepState = false,
    remote = 'origin',
  } = opts;
  const anchor = opts.anchor || state.resolveAnchor(cwd);
  const actions = [];
  const blocked = [];
  const record = (step, status, detail) => actions.push({ step, status, detail });

  const selfRoot = out(git(cwd, 'rev-parse', '--show-toplevel'));

  // 1. worktree — before the branch, since a checked-out branch blocks `-d`
  if (worktree) {
    const registered = worktreeList(cwd).find((w) => samePath(w.path, worktree));
    if (!registered && !fs.existsSync(worktree)) {
      record('worktree', 'skipped', `${worktree} — not present`);
    } else if (samePath(worktree, selfRoot)) {
      record('worktree', 'blocked', `refusing to remove the current worktree (${worktree}) — run cleanup from the integration checkout`);
      blocked.push('worktree');
    } else if (dryRun) {
      record('worktree', 'would', `git worktree remove ${worktree}${force ? ' --force' : ''}`);
    } else {
      const args = ['worktree', 'remove', worktree];
      if (force) args.push('--force');
      const res = git(cwd, ...args);
      if (ok(res)) {
        record('worktree', 'removed', worktree);
      } else {
        record('worktree', 'blocked', `git worktree remove failed (${err(res) || 'dirty or locked'}) — rerun with --force`);
        blocked.push('worktree');
      }
    }
    git(cwd, 'worktree', 'prune');
  }

  // 2. local branch — skip if its worktree is still present
  if (branch && localBranchExists(cwd, branch)) {
    if (blocked.includes('worktree')) {
      record('local-branch', 'skipped', `'${branch}' — worktree still present`);
    } else if (dryRun) {
      record('local-branch', 'would', `git branch -${force ? 'D' : 'd'} ${branch}`);
    } else {
      const res = git(cwd, 'branch', force ? '-D' : '-d', branch);
      if (ok(res)) {
        record('local-branch', 'deleted', branch);
      } else {
        record('local-branch', 'blocked', `'${branch}' not fully merged (git branch -d refused) — verify it landed, then rerun with --force`);
        blocked.push('local-branch');
      }
    }
  } else if (branch) {
    record('local-branch', 'skipped', `'${branch}' — no local branch`);
  }

  // 3. remote branch — NEVER the forge default (BUG-025 guard)
  if (branch && deleteRemote) {
    if (!hasRemote(cwd, remote)) {
      record('remote-branch', 'skipped', `no '${remote}' remote`);
    } else if (!remoteBranchExists(cwd, branch, remote)) {
      record('remote-branch', 'skipped', `${remote}/${branch} — not on the remote`);
    } else {
      const def = remoteDefaultBranch(cwd, { remote });
      if (def && def === branch) {
        record('remote-branch', 'blocked', `${remote}/${branch} is the forge DEFAULT branch — refusing to delete (BUG-025 guard); reassign the default first`);
        blocked.push('remote-branch');
      } else if (dryRun) {
        record('remote-branch', 'would', `git push ${remote} --delete ${branch}`);
      } else {
        const res = git(cwd, 'push', remote, '--delete', branch);
        if (ok(res)) {
          record('remote-branch', 'deleted', `${remote}/${branch}`);
        } else {
          record('remote-branch', 'blocked', `git push --delete failed (${err(res)})`);
          blocked.push('remote-branch');
        }
      }
    }
  }

  // 4. lane state — clear heavy state, leave a `cleaned` tombstone by default
  if (laneId && anchor) {
    const dir = state.laneDir(anchor, laneId);
    const manifest = state.readManifest(anchor, laneId);
    if (!manifest && !fs.existsSync(dir)) {
      record('lane-state', 'skipped', `no lane '${laneId}'`);
    } else if (keepState) {
      record('lane-state', 'skipped', `'${laneId}' — keepState`);
    } else if (dryRun) {
      record('lane-state', 'would', `clear '${laneId}' inbox + tombstone the manifest`);
    } else {
      try { fs.rmSync(state.inboxDir(anchor, laneId), { recursive: true, force: true }); } catch { /* absent */ }
      if (manifest) {
        try {
          state.updateLane(anchor, laneId, { worktree: null, cleaned: true, cleanedAt: new Date().toISOString() });
        } catch { /* ENOLANE race — nothing to tombstone */ }
      }
      record('lane-state', 'cleared', `'${laneId}' inbox removed; manifest tombstoned (cleaned)`);
    }
  }

  return { ok: blocked.length === 0, actions, blocked };
}

// ─── default-branch establishment (BUG-025) ──────────────────────────────

/**
 * Ensure the terminal integration branch (e.g. main) is the branch a fresh
 * forge repo adopts as its default — by making sure it is on the remote FIRST,
 * before any phase branch is ever pushed. Pure git; the forge-side default
 * assertion (`gh repo edit --default-branch`) is a recipe step, config-gated.
 *
 * Read-only by default (returns a plan the recipe acts on). With { push:true }
 * it performs the founding bootstrap push when the remote lacks the branch.
 *
 * @returns {{ status:string, detail:string, pushed:boolean, defaultBranch?:string }}
 *   status ∈ no-remote | no-local-branch | needs-push | push-failed | ok | default-mismatch
 */
function ensureTerminalBranchIsRemoteDefault(cwd, terminalBranch, opts = {}) {
  const { push = false, remote = 'origin', setLocalHead = true } = opts;
  if (!hasRemote(cwd, remote)) {
    return { status: 'no-remote', detail: `no '${remote}' remote — nothing to establish`, pushed: false };
  }
  if (!localBranchExists(cwd, terminalBranch)) {
    return { status: 'no-local-branch', detail: `local '${terminalBranch}' does not exist yet`, pushed: false };
  }
  let pushed = false;
  if (!remoteBranchExists(cwd, terminalBranch, remote)) {
    if (!push) {
      return {
        status: 'needs-push',
        detail: `'${terminalBranch}' is not on ${remote} — push it FIRST (before any phase branch) so the forge adopts it as default`,
        pushed: false,
      };
    }
    const res = git(cwd, 'push', '-u', remote, terminalBranch);
    if (!ok(res)) return { status: 'push-failed', detail: err(res), pushed: false };
    pushed = true;
  }
  if (setLocalHead) git(cwd, 'remote', 'set-head', remote, terminalBranch);
  const def = remoteDefaultBranch(cwd, { remote });
  const isDefault = def === terminalBranch;
  return {
    status: isDefault || pushed ? 'ok' : 'default-mismatch',
    detail: isDefault
      ? `${remote} default is '${terminalBranch}'`
      : `${remote} default is '${def || 'unknown'}' — run the forge assertion (e.g. gh repo edit --default-branch ${terminalBranch}) to repair`,
    pushed,
    defaultBranch: def,
  };
}

// ─── CLI: `momentum lanes cleanup` ───────────────────────────────────────

function parseCleanupArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force' || a === '--dry-run' || a === '--no-remote' || a === '--keep-state' || a === '--json') {
      flags[a.slice(2)] = true;
    } else if (a.startsWith('--')) {
      flags[a.slice(2)] = argv[++i];
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

/**
 * `momentum lanes cleanup <branch> [--worktree P] [--lane ID] [--no-remote]
 *  [--force] [--dry-run] [--keep-state] [--json]`
 *
 * A thin surface over cleanupTarget() for the recipes (complete-phase) and
 * for manual use. When --lane is given but --branch/--worktree are omitted,
 * they are read from the lane manifest.
 */
function cmdCleanup(cwd, argv) {
  const { flags, positional } = parseCleanupArgs(argv);
  let branch = positional[0];
  const laneId = flags.lane || null;
  let worktree = flags.worktree || null;

  if (laneId) {
    const anchor = state.resolveAnchor(cwd);
    const lane = anchor && state.readManifest(anchor, laneId);
    if (lane) {
      branch = branch || lane.branch;
      worktree = worktree || lane.worktree || null;
    }
  }
  if (!branch && !worktree && !laneId) {
    console.error('✗ usage: momentum lanes cleanup <branch> [--worktree P] [--lane ID] [--no-remote] [--force] [--dry-run] [--keep-state]');
    return 1;
  }

  const result = cleanupTarget({
    cwd, branch, worktree, laneId,
    deleteRemote: !flags['no-remote'],
    force: Boolean(flags.force),
    dryRun: Boolean(flags['dry-run']),
    keepState: Boolean(flags['keep-state']),
  });

  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
    return result.ok ? 0 : 1;
  }

  const glyph = { removed: '✓', deleted: '✓', cleared: '✓', skipped: 'ℹ', would: '·', blocked: '✗' };
  for (const a of result.actions) {
    console.log(`  ${glyph[a.status] || '·'} ${a.step}: ${a.detail}`);
  }
  if (result.ok) {
    console.log(flags['dry-run'] ? '✓ dry-run — nothing changed' : '✓ cleanup complete');
    return 0;
  }
  console.error(`✗ cleanup incomplete — blocked: ${result.blocked.join(', ')}`);
  return 1;
}

module.exports = {
  cleanupTarget,
  ensureTerminalBranchIsRemoteDefault,
  remoteDefaultBranch,
  remoteBranchExists,
  localBranchExists,
  isMerged,
  hasRemote,
  worktreeList,
  cmdCleanup,
};
