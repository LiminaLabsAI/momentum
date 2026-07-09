'use strict';

/**
 * Collision-free allocation claims (Phase 30a Team-Walk G1, ADR-0012).
 *
 * Thin policy layer over refcas: ensure the coordination refspec is installed
 * (so the claim travels on ordinary `git fetch`), resolve the durable actor,
 * then attempt the ref compare-and-swap. Used by `momentum claim` and, via the
 * recipes, by /brainstorm-phase, /start-phase, /hotfix, and /complete-phase.
 *
 * Folds ENH-057: a release reserves its version with `claim version <X>` before
 * tagging — a stale bump loses the CAS and is refused, so two sessions can never
 * burn a version again.
 *
 * Zero dependencies — node builtins only.
 */

const refcas = require('./refcas');
const identity = require('../../identity');

/**
 * Claim `key` in `namespace`. Returns refcas result:
 * { won, ref, oid, winner, error }.
 */
function claimKey(cwd, namespace, key, opts) {
  opts = opts || {};
  const remote = opts.remote || 'origin';
  const actor = opts.actor || identity.resolveActor(cwd).id;
  refcas.installRefspec(cwd, remote); // idempotent — makes the ref travel on fetch
  return refcas.claim(cwd, { namespace, key, actor, remote, extra: opts.extra || {} });
}

module.exports = { claimKey };
