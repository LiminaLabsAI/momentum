'use strict';

/**
 * Shared merge-queue turn across contributors (Phase 30b Team-Run, ADR-0013).
 *
 * Walk's `lanes land` FIFO turn was per-clone; Run makes it TEAM-WIDE. The
 * runway is a single-holder ref-CAS lock (`refs/momentum/queue/<runway>-holder`):
 * exactly one contributor holds the landing turn at a time, ACROSS machines, via
 * the same first-push-wins primitive as claims. Extends Rule 6 Landing Order to
 * N humans — the remote arbitrates the turn, no server.
 *
 * Zero dependencies — node builtins only.
 */

const { spawnSync } = require('child_process');
const refcas = require('./refcas');

const QUEUE_NS = 'queue';

function gitRes(cwd, args) { return spawnSync('git', args, { cwd, encoding: 'utf8' }); }

function turnKey(runway) { return `${runway}-holder`; }
function turnRef(runway) { return refcas.refPath(QUEUE_NS, turnKey(runway)); }

/**
 * Try to take the runway's landing turn. Returns { held, holder }.
 * If another contributor holds it, `held:false` and `holder` names them.
 */
function takeTurn(cwd, runway, actor, remote) {
  remote = remote || 'origin';
  const res = refcas.claim(cwd, { namespace: QUEUE_NS, key: turnKey(runway), actor, remote });
  if (res.won) return { held: true, holder: typeof actor === 'string' ? actor : actor.id };
  return { held: false, holder: res.winner && res.winner.actor };
}

/** Release the turn (delete the holder ref locally + on the remote). */
function releaseTurn(cwd, runway, remote) {
  remote = remote || 'origin';
  const ref = turnRef(runway);
  gitRes(cwd, ['push', remote, `:${ref}`]);  // delete on remote (idempotent)
  gitRes(cwd, ['update-ref', '-d', ref]);    // delete locally
  return true;
}

/** Who currently holds the runway (best-effort remote read), or null if free. */
function turnHolder(cwd, runway, remote) {
  const w = refcas.readClaim(cwd, { namespace: QUEUE_NS, key: turnKey(runway), remote: remote || 'origin' });
  return w && w.actor ? w.actor : null;
}

module.exports = { takeTurn, releaseTurn, turnHolder, turnRef, QUEUE_NS };
