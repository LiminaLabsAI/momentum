'use strict';

/**
 * Published coordination contract (Phase 30c Team-Fly, ADR-0014).
 *
 * The versioned, third-party-consumable description of momentum's git-native
 * team-coordination state — the fragment layout and the `refs/momentum/*`
 * namespace — so dashboards, CI, or other tools can read team state without
 * momentum. Realizes the Lanes-arc "publish the lane-state contract" decision
 * (ADR-0003 §5). Breaking changes bump CONTRACT_VERSION (pinned by a test).
 *
 * Zero dependencies.
 */

const CONTRACT_VERSION = '1.0.0';

const CONTRACT = {
  version: CONTRACT_VERSION,
  fragments: {
    location: '.momentum/team/<view>/<actor>-<seq>-<kind>.json  (committed)',
    views: ['active-phase', 'presence', 'approvals'],
    shape: { actor: 'string', seq: 'number', ts: 'iso8601', kind: 'string', payload: 'object' },
    invariant: 'an actor writes only files prefixed with its own <actor>- → conflict-free by construction',
  },
  refs: {
    namespace: 'refs/momentum/*  (fetched via +refs/momentum/*:refs/momentum/*)',
    claims: 'refs/momentum/{claims,version,phase,id}/<key>   first-push-wins allocation',
    queue: 'refs/momentum/queue/<runway>-holder             single-holder landing turn',
    leases: 'refs/momentum/leases/<resource>                single-owner cross-machine lease',
    payload: 'empty-tree commit whose message is JSON { actor, key, ts, ... }',
  },
  relay: {
    optional: true,
    authorityFree: true,
    protocol: 1,
    endpoints: ['POST /publish', 'GET /events?since=N', 'GET /health'],
    absence: 'no relay_url → git-native fallback; nothing depends on it',
  },
};

module.exports = { CONTRACT, CONTRACT_VERSION };
