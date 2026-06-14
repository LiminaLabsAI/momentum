'use strict';

/**
 * /swarm join <swarm-id> — register a session with an existing swarm.
 *
 * Phase 17.5 portability primitive. Three call shapes:
 *
 *   join(swarmId, sessionId)
 *     Registration only. Adds to sessions[] (idempotent — touch on
 *     re-join), auto-renews any repos this session already owns.
 *
 *   join(swarmId, sessionId, { token })
 *     Consume an opaque transfer token. If kind=focus, claim ONLY the
 *     token's target_repo (FOCUSING sentinel allows takeover). If
 *     kind=join, no automatic claim — equivalent to plain registration.
 *
 *   join(swarmId, sessionId, { claim: <repo> })
 *     Explicit claim shortcut. Composes `manifestLib.updateManifestAsOwner`
 *     on the named repo — bound by the same lease rules as `/swarm claim`.
 *
 * Returns: {
 *   swarmId,
 *   sessionId,
 *   sessions: <new sessions[] array>,
 *   claimed?: { repo, owner, lease_expires_at },
 *   token?: <consumed token record>,
 * }
 *
 * Throws on:
 *   - swarm missing
 *   - token missing / expired
 *   - claim rejected (EOWNERSHIP propagates)
 */

const manifestLib = require('./lib/manifest');
const tokensLib = require('./lib/tokens');
const sessionsLib = require('./lib/sessions');
const boardLib = require('./lib/board');

const DEFAULT_LEASE_MS = 24 * 60 * 60 * 1000;

function join(args) {
  const {
    ecosystemRoot, swarmId, sessionId, nowIso,
    token: tokenStr, claim: claimRepo,
    leaseMs = DEFAULT_LEASE_MS,
  } = args;

  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    throw new TypeError('join: sessionId required');
  }
  if (typeof nowIso !== 'string' || nowIso.length === 0) {
    throw new TypeError('join: nowIso required');
  }

  const manifest = manifestLib.loadManifest(ecosystemRoot, swarmId);
  if (!manifest) throw new Error(`join: swarm ${swarmId} not found at ${ecosystemRoot}`);

  // 1. Register / touch session
  sessionsLib.touchSession(ecosystemRoot, swarmId, sessionId, nowIso);

  let claimed = null;
  let consumedToken = null;
  let claimTargetRepo = claimRepo || null;

  // 2. Optional token consumption — may set claimTargetRepo
  if (tokenStr) {
    consumedToken = tokensLib.consumeToken(ecosystemRoot, swarmId, tokenStr, nowIso);
    if (consumedToken.kind === 'focus') {
      // Focus token narrows the claim to its target_repo
      claimTargetRepo = consumedToken.target_repo;
    }
    // kind=join: no implicit claim, registration is enough
  }

  // 3. Optional / token-implied repo claim
  if (claimTargetRepo) {
    const expiresAt = isoFromMs(Date.parse(nowIso) + leaseMs);
    manifestLib.updateManifestAsOwner({
      ecosystemRoot, swarmId, sessionId, repo: claimTargetRepo, nowIso,
      mutate: (m, decision) => {
        const previousOwner = m.repos[claimTargetRepo].owner;
        m.repos[claimTargetRepo].owner = sessionId;
        m.repos[claimTargetRepo].claimed_by_session = sessionId;
        m.repos[claimTargetRepo].lease_renewed_at = nowIso;
        m.repos[claimTargetRepo].lease_expires_at = expiresAt;
        if (!Array.isArray(m.audit)) m.audit = [];
        m.audit.push({
          ts: nowIso, actor: sessionId, event: 'claim', repo: claimTargetRepo,
          detail: `${previousOwner} → ${sessionId} (via join${consumedToken ? ` --token kind=${consumedToken.kind}` : ''})`,
        });
        if (decision.expired) {
          m.audit.push({
            ts: nowIso, actor: sessionId, event: 'lease-takeover', repo: claimTargetRepo,
            detail: `previous owner ${previousOwner} lease expired`,
          });
        }
      },
    });
    claimed = { repo: claimTargetRepo, owner: sessionId, lease_expires_at: expiresAt };
  }

  // 4. Audit-log the join itself
  manifestLib.appendAudit(ecosystemRoot, swarmId, {
    ts: nowIso, actor: sessionId, event: 'join',
    detail: tokenStr
      ? `via token kind=${consumedToken.kind}${claimTargetRepo ? ` (claimed ${claimTargetRepo})` : ''}`
      : (claimRepo ? `with --claim ${claimRepo}` : 'registration only'),
  });

  // 5. Auto-renew owned-repo leases. Pulls conductor.renewLeases without
  //    requiring it as a hard dep — the conductor module does require
  //    this file's siblings, so we lazy-require here to avoid cycles.
  const conductor = require('./conductor');
  conductor.renewLeases(ecosystemRoot, swarmId, sessionId, nowIso);

  // 6. Refresh board
  boardLib.refreshBoard(ecosystemRoot, swarmId, nowIso);

  return {
    swarmId,
    sessionId,
    sessions: sessionsLib.listSessions(ecosystemRoot, swarmId),
    claimed,
    token: consumedToken,
  };
}

function isoFromMs(ms) {
  // Match the same no-millis format `bin/swarm.js::nowIso()` produces so
  // joined manifest timestamps look consistent across writers.
  return new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');
}

module.exports = {
  join,
  DEFAULT_LEASE_MS,
};
