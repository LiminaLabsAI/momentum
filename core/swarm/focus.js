'use strict';

/**
 * /swarm focus <repo> — split one repo off a swarm into a focused side
 * session.
 *
 * Phase 17.5 portability primitive. The current owner of `<repo>` runs
 * `focus(swarmId, repo, ...)` to:
 *
 *   1. Validate the repo is part of the swarm.
 *   2. Assert the caller currently owns the repo (rejects otherwise).
 *   3. Issue an opaque single-use focus token (kind=focus, target_repo,
 *      1-hour expiry by default) at `<eco>/swarms/<id>/tokens/<token>.json`.
 *   4. Flip `repos[<repo>].owner` to the FOCUSING sentinel. The lease
 *      fields are cleared so the receiver's claim sets a fresh lease.
 *   5. Write a `focus-request` signal carrying the token + repo so other
 *      conductors / observers see the request next poll.
 *   6. Audit-log `focus`.
 *   7. Return a SpawnDirective object the caller renders to the user —
 *      typically `claude --bg --cwd <ecoRoot>` with the join command as
 *      the seed prompt.
 *
 * The receiving session consumes the token via `cmdJoin --token <token>`
 * (Group 3), which calls `manifestLib.updateManifestAsOwner` against the
 * FOCUSING sentinel (any caller may take over) and sets owner =
 * receiverSession + a fresh lease.
 */

const path = require('path');

const manifestLib = require('./lib/manifest');
const tokensLib = require('./lib/tokens');
const signalsLib = require('./signals');
const boardLib = require('./lib/board');

/**
 * Execute a focus request. Throws on rejection.
 *
 * @param {object} args
 * @param {string} args.ecosystemRoot
 * @param {string} args.swarmId
 * @param {string} args.repo            repo key in the swarm
 * @param {string} args.sessionId       caller session id (must currently own the repo)
 * @param {string} args.nowIso          ISO timestamp
 * @param {number} [args.expiresInMs]   token expiry (default 1 hour)
 * @param {string} [args.detail]        short note surfaced on the signal
 *
 * Returns: {
 *   token: <record>,
 *   signal: { signal_id, filePath },
 *   directive: { command, args, env, prompt },
 * }
 */
function focus(args) {
  const {
    ecosystemRoot, swarmId, repo, sessionId, nowIso,
    expiresInMs, detail,
  } = args;
  if (typeof repo !== 'string' || repo.length === 0) {
    throw new TypeError('focus: repo required');
  }
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    throw new TypeError('focus: sessionId required');
  }
  if (typeof nowIso !== 'string' || nowIso.length === 0) {
    throw new TypeError('focus: nowIso required');
  }

  // Pre-validate the repo exists so we surface a useful error before we
  // touch anything mutable.
  const manifest = manifestLib.loadManifest(ecosystemRoot, swarmId);
  if (!manifest) throw new Error(`focus: no manifest for ${swarmId}`);
  if (!manifest.repos[repo]) throw new Error(`focus: ${repo} not in swarm ${swarmId}`);

  // 1. Issue token (does not mutate manifest)
  const token = tokensLib.writeToken({
    ecosystemRoot, swarmId,
    kind: 'focus', issuedBy: sessionId, targetRepo: repo,
    nowIso, expiresInMs,
  });

  // 2. Mutate manifest under ownership assertion. If the caller doesn't
  //    own the repo, this throws EOWNERSHIP and we clean up the token.
  try {
    manifestLib.updateManifestAsOwner({
      ecosystemRoot, swarmId, sessionId, repo, nowIso,
      mutate: (m) => {
        const previousOwner = m.repos[repo].owner;
        m.repos[repo].owner = manifestLib.FOCUSING;
        delete m.repos[repo].lease_expires_at;
        delete m.repos[repo].lease_renewed_at;
        // claimed_by_session reflects the latest session that holds the claim
        delete m.repos[repo].claimed_by_session;
        if (!Array.isArray(m.audit)) m.audit = [];
        m.audit.push({
          ts: nowIso, actor: sessionId, event: 'focus', repo,
          detail: `${previousOwner} → ${manifestLib.FOCUSING} (token issued)`,
        });
      },
    });
  } catch (err) {
    // Roll back the token if ownership was rejected — keeps the
    // tokens/ directory clean.
    try {
      const fs = require('fs');
      const file = tokensLib.tokenPath(ecosystemRoot, swarmId, token.token);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (_e) { /* best-effort cleanup */ }
    throw err;
  }

  // 3. Write the focus-request signal so any other conductor on this
  //    swarm sees the request and can pick up the token.
  const signal = signalsLib.writeSignal({
    ecosystemRoot, swarmId,
    type: 'focus-request', slug: `${repo}-by-${sessionSlug(sessionId)}`,
    fromSession: sessionId, repo, token: token.token,
    nowIso, detail,
  });

  // 4. Refresh the materialized board so the next conductor read sees
  //    the FOCUSING state immediately.
  boardLib.refreshBoard(ecosystemRoot, swarmId, nowIso);

  // 5. Build the spawn directive the CLI renders to the user.
  const ecoName = path.basename(ecosystemRoot);
  const directive = {
    command: 'claude',
    args: ['--bg', '--cwd', ecosystemRoot],
    env: {
      MOMENTUM_SWARM_ID: swarmId,
      MOMENTUM_FOCUS_TOKEN: token.token,
      MOMENTUM_FOCUS_REPO: repo,
    },
    prompt: [
      `You are a focused swarm side-session for repo "${repo}" in ecosystem "${ecoName}".`,
      `Run: momentum swarm join ${swarmId} --token ${token.token}`,
      `Then drive the repo's phase to completion. The original conductor still owns the rest of the swarm.`,
    ].join('\n'),
  };

  return { token, signal, directive };
}

function sessionSlug(sessionId) {
  return String(sessionId).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'unknown';
}

module.exports = {
  focus,
};
