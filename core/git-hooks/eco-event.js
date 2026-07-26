'use strict';

/**
 * momentum git-hook helper — ecosystem event writer (Phase 31a G1, ADR-0016).
 *
 * NOTE the phrasing of the line above: `installHookFiles()` in bin/momentum.js
 * decides whether an existing `.githooks/` file is momentum-owned (and so may
 * be upgraded) by matching /momentum[^\n]*hook/i against its content. A file
 * that fails that check is treated as foreign and left untouched FOREVER — it
 * would install once and then never receive another update. Keep "momentum"
 * and "hook" on one line here.
 *
 * WHY THIS IS A SEPARATE, SELF-CONTAINED IMPLEMENTATION
 * -----------------------------------------------------
 * An installed momentum project receives NO copy of momentum's `core/` — a
 * fresh install ships exactly four files into `.githooks/` (commit-msg,
 * pre-push, contract.js, run-check.js) and nothing else. So a git hook cannot
 * `require('core/team/lib/fragments')`; there is no such path in the target
 * repo, and downstream projects do not depend on momentum as a package.
 *
 * This file therefore reimplements the small slice the hooks need — repo-root
 * resolution, ecosystem discovery, member matching, actor id, fragment write —
 * with node builtins only. It is copied into `.githooks/` alongside
 * `contract.js`, which sets exactly this precedent.
 *
 * The duplication is real, so it is FENCED BY A PARITY TEST:
 * `tests/eco-event-parity.test.js` asserts this writer produces byte-identical
 * fragments to `core/team/lib/fragments.writeFragment`, and resolves members
 * identically to `core/ecosystem/lib/events.js`. Two implementations that
 * silently drift is precisely the bug class 31a exists to close (BUG-007 /
 * BUG-028), so the parity test is not optional garnish — it is the mechanism
 * that makes this duplication safe.
 *
 * EVERY entry point is fail-open. These run on `post-commit` / `post-merge`;
 * a throw here would surface as a scary error on a commit that already
 * succeeded, and momentum must never make a commit look broken to record an
 * advisory log line.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

// Mirrors core/team/lib/fragments.js
const SEQ_WIDTH = 6;
const EVENTS_VIEW = 'eco-events';
// Mirrors core/ecosystem/lib/state.js — override with MOMENTUM_MAX_PARENT_WALK.
const MAX_PARENT_WALK_DEFAULT = 5;

function git(dir, ...args) {
  try {
    const res = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8', timeout: 5000 });
    if (res.status !== 0) return null;
    return (res.stdout || '').trim() || null;
  } catch (_e) {
    return null;
  }
}

/** Mirrors core/identity/index.js → slug(). */
function slug(s) {
  const out = String(s)
    .toLowerCase()
    .trim()
    .replace(/@.*$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return out || 'anon';
}

/** Mirrors core/identity/index.js → resolveActor(). */
function resolveActorId(dir, env) {
  env = env || process.env;
  const override = env.MOMENTUM_ACTOR && env.MOMENTUM_ACTOR.trim();
  if (override) return slug(override);
  const email = git(dir, 'config', 'user.email');
  if (email) return slug(email);
  const root = git(dir, 'rev-parse', '--show-toplevel') || dir;
  const user = env.USER || env.USERNAME || 'unknown';
  const h = crypto.createHash('sha256').update(`${user}::${root}`).digest('hex').slice(0, 8);
  return `anon-${h}`;
}

/**
 * Resolve the TRUE repo root, worktree-safe.
 *
 * `--git-common-dir` is the load-bearing call: in a linked worktree it points
 * at the MAIN repo's `.git`, where `--show-toplevel` would return the
 * worktree's own path. Resolving via `$PWD`/toplevel is exactly why lane
 * worktrees were invisible to the pre-31a write path.
 */
function resolveRepoRoot(cwd) {
  const dir = cwd || process.cwd();
  const common = git(dir, 'rev-parse', '--git-common-dir');
  if (common) {
    const abs = path.resolve(dir, common);
    if (path.basename(abs) === '.git') return path.dirname(abs);
  }
  const top = git(dir, 'rev-parse', '--show-toplevel');
  return top ? path.resolve(top) : null;
}

function maxParentWalk(env) {
  const raw = (env || process.env).MOMENTUM_MAX_PARENT_WALK;
  const n = parseInt(raw, 10);
  return Number.isInteger(n) && n >= 0 ? n : MAX_PARENT_WALK_DEFAULT;
}

/**
 * Find the ecosystem root: walk up from `start`, checking the directory itself
 * and then each sibling for `ecosystem.json`. Mirrors the walk in
 * core/ecosystem/lib/index.js and session-append.sh.
 */
function findEcosystemRoot(start, env) {
  let current = path.resolve(start);
  const max = maxParentWalk(env);
  for (let depth = 0; depth <= max; depth++) {
    try {
      if (fs.statSync(path.join(current, 'ecosystem.json')).isFile()) return current;
    } catch (_e) { /* keep walking */ }

    const parent = path.dirname(current);
    if (parent === current) return null;
    let siblings = [];
    try { siblings = fs.readdirSync(parent); } catch (_e) { siblings = []; }
    for (const name of siblings) {
      const cand = path.join(parent, name);
      try {
        if (fs.statSync(path.join(cand, 'ecosystem.json')).isFile()) return cand;
      } catch (_e) { /* not it */ }
    }
    current = parent;
  }
  return null;
}

/** Match a repo root against the manifest's members. Returns id or null. */
function resolveMemberId(ecosystemRoot, repoRoot) {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(ecosystemRoot, 'ecosystem.json'), 'utf8'));
  } catch (_e) {
    return null;
  }
  if (!manifest || !Array.isArray(manifest.members)) return null;

  let target;
  try { target = fs.realpathSync(repoRoot); } catch (_e) { target = path.resolve(repoRoot); }

  for (const m of manifest.members) {
    if (!m || !m.path) continue;
    let abs = path.resolve(ecosystemRoot, m.path);
    try { abs = fs.realpathSync(abs); } catch (_e) { /* keep unresolved */ }
    if (abs === target) return m.id;
  }
  return null;
}

/** Mirrors core/team/lib/fragments.js → maxSeq(). */
function maxSeq(dir, actorId) {
  let names;
  try { names = fs.readdirSync(dir); } catch (_e) { return 0; }
  const esc = String(actorId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${esc}-(\\d+)-`);
  let max = 0;
  for (const n of names) {
    const m = n.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

/**
 * Record an event. Returns { recorded: boolean, reason? }.
 * Never throws — see the file header.
 */
function record(opts) {
  opts = opts || {};
  try {
    const cwd = opts.cwd || process.cwd();
    const repoRoot = resolveRepoRoot(cwd);
    if (!repoRoot) return { recorded: false, reason: 'not a git repo' };

    const ecosystemRoot = findEcosystemRoot(repoRoot, opts.env);
    if (!ecosystemRoot) return { recorded: false, reason: 'no ecosystem' };

    const member = resolveMemberId(ecosystemRoot, repoRoot);
    if (!member) return { recorded: false, reason: 'not a registered member' };

    const actorId = resolveActorId(repoRoot, opts.env);
    const dir = path.join(ecosystemRoot, '.momentum', 'team', EVENTS_VIEW);
    fs.mkdirSync(dir, { recursive: true });

    const kind = String(opts.kind).replace(/[^A-Za-z0-9._-]+/g, '-');
    const seq = opts.seq != null ? opts.seq : maxSeq(dir, actorId) + 1;
    const frag = {
      actor: actorId,
      seq,
      ts: opts.ts || new Date().toISOString(),
      kind,
      payload: {
        member,
        summary: String(opts.summary || '').split('\n')[0].slice(0, 500),
        context: opts.context ? String(opts.context).slice(0, 200) : '',
      },
    };
    const file = path.join(dir, `${actorId}-${String(seq).padStart(SEQ_WIDTH, '0')}-${kind}.json`);
    fs.writeFileSync(file, JSON.stringify(frag, null, 2) + os.EOL);
    return { recorded: true, file, ecosystemRoot, member, actor: actorId };
  } catch (e) {
    return { recorded: false, reason: `error: ${e && e.message}` };
  }
}

/** post-commit: record the commit that just landed. */
function postCommit(cwd) {
  const dir = cwd || process.cwd();
  const sha = git(dir, 'rev-parse', '--short', 'HEAD');
  const subject = git(dir, 'log', '-1', '--pretty=%s');
  if (!sha || !subject) return { recorded: false, reason: 'no HEAD' };
  return record({ cwd: dir, kind: 'commit', summary: subject, context: sha });
}

/**
 * post-merge: record a merge that arrived locally.
 *
 * This is the local half of the forge-API blind spot (ADR-0016 Consequences):
 * a `gh pr merge` runs server-side where no local hook can fire, so the merge
 * is captured on the next fetch/pull that brings it down. Honest partial
 * coverage, documented as such rather than papered over.
 */
function postMerge(cwd) {
  const dir = cwd || process.cwd();
  const sha = git(dir, 'rev-parse', '--short', 'HEAD');
  const subject = git(dir, 'log', '-1', '--pretty=%s');
  if (!sha || !subject) return { recorded: false, reason: 'no HEAD' };
  return record({ cwd: dir, kind: 'merge', summary: subject, context: sha });
}

module.exports = {
  EVENTS_VIEW,
  slug,
  resolveActorId,
  resolveRepoRoot,
  findEcosystemRoot,
  resolveMemberId,
  record,
  postCommit,
  postMerge,
};
