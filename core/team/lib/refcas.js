'use strict';

/**
 * Git-ref compare-and-swap for atomic, cross-machine claims (Phase 30a, ADR-0012).
 *
 * Allocation collisions (two people both picking "the next phase" / version /
 * backlog id) CANNOT be prevented by committed fragments — fragments merge too
 * LATE (you only see the other write after a merge, by which point you've both
 * already picked). A claim needs a pre-merge, atomic, single-winner channel.
 * Git gives us one for free: pushing a NEW ref to the remote is atomic — the
 * first push creates refs/momentum/<ns>/<key>; a second push of a different
 * object is a non-fast-forward and is REJECTED. The remote arbitrates; no
 * server exists.
 *
 * The claim payload rides in the commit message of an empty-tree commit the
 * ref points at, so the winner (and when) is auditable via ordinary git.
 *
 * Zero dependencies — node builtins only.
 */

const { spawnSync } = require('child_process');

const REFNS = 'refs/momentum';

function gitRes(cwd, args, input) {
  return spawnSync('git', args, { cwd, encoding: 'utf8', input });
}
function git(cwd, ...args) {
  const r = gitRes(cwd, args);
  return r.status === 0 ? r.stdout.trim() : null;
}

function refPath(namespace, key) {
  const safe = String(key).replace(/[^A-Za-z0-9._-]+/g, '-');
  return `${REFNS}/${namespace}/${safe}`;
}

/** Empty tree oid for this repo's hash algorithm. */
function emptyTree(cwd) {
  const r = gitRes(cwd, ['mktree'], '');
  return r.status === 0 ? r.stdout.trim() : null;
}

/** Build a claim commit (empty tree, message = claim payload). Returns oid or null. */
function claimCommit(cwd, payload) {
  const tree = emptyTree(cwd);
  if (!tree) return null;
  return git(cwd, 'commit-tree', tree, '-m', JSON.stringify(payload));
}

/**
 * Attempt to atomically claim `key` in `namespace` against `remote`.
 * Returns { won, ref, oid, winner, error }. On loss, `winner` is the payload
 * that currently holds the ref (best-effort read).
 */
function claim(cwd, opts) {
  const { namespace, key, actor, remote = 'origin', extra = {} } = opts;
  const ref = refPath(namespace, key);
  const payload = Object.assign(
    { actor: typeof actor === 'string' ? actor : actor && actor.id, key: String(key), ts: new Date().toISOString() },
    extra
  );
  const oid = claimCommit(cwd, payload);
  if (!oid) {
    const e = new Error('claim: could not create claim object (not a git repo?)');
    e.code = 'ENOGIT';
    throw e;
  }
  // create-only push: NO --force. First writer wins; others are non-ff-rejected.
  const push = gitRes(cwd, ['push', remote, `${oid}:${ref}`]);
  if (push.status === 0) {
    return { won: true, ref, oid, winner: payload };
  }
  const winner = readClaim(cwd, { namespace, key, remote });
  return { won: false, ref, oid, winner, error: (push.stderr || '').trim() };
}

/**
 * Read the payload currently holding a claim ref (fetches it first).
 * Returns the parsed payload, or null if unclaimed / unreachable.
 */
function readClaim(cwd, { namespace, key, remote = 'origin' }) {
  const ref = refPath(namespace, key);
  gitRes(cwd, ['fetch', remote, `${ref}:${ref}`]); // best-effort; ignore failure
  const msg = git(cwd, 'log', '-1', '--format=%B', ref);
  if (!msg) return null;
  try { return JSON.parse(msg.trim()); } catch { return { raw: msg.trim() }; }
}

/** Claimed keys in a namespace (local refs; call fetchAll first for freshness). */
function listClaims(cwd, namespace) {
  const out = git(cwd, 'for-each-ref', '--format=%(refname)', `${REFNS}/${namespace}`);
  if (!out) return [];
  const prefix = `${REFNS}/${namespace}/`;
  return out.split('\n').filter(Boolean).map((r) => r.slice(prefix.length));
}

/** Fetch all coordination refs from remote into local refs/momentum/*. */
function fetchAll(cwd, remote = 'origin') {
  return gitRes(cwd, ['fetch', remote, `+${REFNS}/*:${REFNS}/*`]).status === 0;
}

/** Ensure `git fetch` carries refs/momentum/*. Idempotent — true if it added the spec. */
function installRefspec(cwd, remote = 'origin') {
  const spec = `+${REFNS}/*:${REFNS}/*`;
  const existing = git(cwd, 'config', '--get-all', `remote.${remote}.fetch`) || '';
  if (existing.split('\n').includes(spec)) return false;
  gitRes(cwd, ['config', '--add', `remote.${remote}.fetch`, spec]);
  return true;
}

module.exports = { claim, readClaim, listClaims, fetchAll, installRefspec, refPath, REFNS };
