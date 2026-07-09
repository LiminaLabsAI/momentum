'use strict';

/**
 * Cross-machine leases via ref-CAS (Phase 30c Team-Fly, ADR-0014).
 *
 * Swarm's leases are WALL-CLOCK with no fencing (core/swarm/lib/manifest.js) —
 * clock skew alone can make two machines both believe they own a repo. Fly moves
 * lease acquisition to `refs/momentum/leases/<resource>` ref-CAS: exactly one
 * owner at a time ACROSS machines; the remote arbitrates, no fencing service.
 * Same first-push-wins primitive as claims and queue turns.
 *
 * Zero dependencies — node builtins only.
 */

const { spawnSync } = require('child_process');
const refcas = require('./refcas');

const LEASE_NS = 'leases';

function gitRes(cwd, args) { return spawnSync('git', args, { cwd, encoding: 'utf8' }); }

/** Acquire an exclusive lease on `resource`. Returns { held, owner }. */
function acquireLease(cwd, resource, actor, remote) {
  const res = refcas.claim(cwd, { namespace: LEASE_NS, key: resource, actor, remote: remote || 'origin' });
  if (res.won) return { held: true, owner: typeof actor === 'string' ? actor : actor.id };
  return { held: false, owner: res.winner && res.winner.actor };
}

/** Release a lease (delete the ref locally + on remote). */
function releaseLease(cwd, resource, remote) {
  const ref = refcas.refPath(LEASE_NS, resource);
  gitRes(cwd, ['push', remote || 'origin', `:${ref}`]);
  gitRes(cwd, ['update-ref', '-d', ref]);
  return true;
}

/** Current owner of a lease (best-effort remote read), or null. */
function leaseOwner(cwd, resource, remote) {
  const w = refcas.readClaim(cwd, { namespace: LEASE_NS, key: resource, remote: remote || 'origin' });
  return w && w.actor ? w.actor : null;
}

module.exports = { acquireLease, releaseLease, leaseOwner, LEASE_NS };
