'use strict';

/**
 * Swarm sessions[] registry CRUD.
 *
 * Phase 17.5 portability — extracted from manifest.js for cleaner
 * reuse by `/swarm join`. The sessions[] array on the swarm manifest
 * is append-only and de-duped by `session_id`:
 *
 *   - registerSession(eco, swarmId, sessionId, nowIso)
 *       If sessionId is new → append { session_id, first_seen, last_seen }
 *       If sessionId exists → no-op (use touchSession to bump last_seen)
 *
 *   - touchSession(eco, swarmId, sessionId, nowIso)
 *       Updates last_seen. Inserts if missing (idempotent).
 *
 *   - findSession(manifest, sessionId)
 *       Pure helper. Returns the entry or null.
 *
 *   - listSessions(eco, swarmId)
 *       Pure helper. Returns the sessions[] array (or []).
 *
 * All mutating helpers go through `manifestLib.updateManifest` for
 * mkdir-locked, validated writes.
 */

const manifestLib = require('./manifest');

function findSession(manifest, sessionId) {
  if (!manifest || !Array.isArray(manifest.sessions)) return null;
  return manifest.sessions.find((s) => s && s.session_id === sessionId) || null;
}

function listSessions(ecosystemRoot, swarmId) {
  const m = manifestLib.loadManifest(ecosystemRoot, swarmId);
  if (!m || !Array.isArray(m.sessions)) return [];
  return m.sessions.slice();
}

function registerSession(ecosystemRoot, swarmId, sessionId, nowIso) {
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    throw new TypeError('registerSession: sessionId required');
  }
  return manifestLib.updateManifest(ecosystemRoot, swarmId, (m) => {
    if (!Array.isArray(m.sessions)) m.sessions = [];
    const existing = findSession(m, sessionId);
    if (existing) {
      // No-op: registerSession is for the FIRST time. last_seen bumps via touch.
      return;
    }
    m.sessions.push({
      session_id: sessionId,
      first_seen: nowIso,
      last_seen: nowIso,
    });
  });
}

function touchSession(ecosystemRoot, swarmId, sessionId, nowIso) {
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    throw new TypeError('touchSession: sessionId required');
  }
  return manifestLib.updateManifest(ecosystemRoot, swarmId, (m) => {
    if (!Array.isArray(m.sessions)) m.sessions = [];
    const existing = findSession(m, sessionId);
    if (existing) {
      existing.last_seen = nowIso;
    } else {
      m.sessions.push({
        session_id: sessionId,
        first_seen: nowIso,
        last_seen: nowIso,
      });
    }
  });
}

module.exports = {
  findSession,
  listSessions,
  registerSession,
  touchSession,
};
