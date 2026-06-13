'use strict';

/**
 * /swarm absorb <other-id> — converge a second swarm back into this one.
 *
 * Phase 17.5 portability primitive — the reunion side of `focus`. The
 * caller (`targetSwarmId`) absorbs `sourceSwarmId`:
 *
 *   1. Load both manifests. Both must exist.
 *   2. Detect repo overlap. For every repo in both, look up the swarms'
 *      contracts on the same surface — if the content_hash diverges,
 *      ABORT cleanly and surface a diff. Both swarms are left untouched.
 *   3. On clean merge:
 *       - repos: union (target wins state on overlap)
 *       - waves: recompute via the existing wave-ordering library
 *       - sessions[]: union by session_id (earliest first_seen, latest
 *         last_seen)
 *       - contracts: union; on overlap the target version is kept (we
 *         already verified compatibility above)
 *       - audit[]: concat + sort by timestamp; append `absorb` event
 *       - inbox/: source pending items copied into the target inbox
 *         with bumped ids; INDEX regenerated
 *       - tokens/ + signals/: not merged (transitional state — discarded
 *         along with the archived source dir)
 *   4. Archive the source swarm directory to
 *      `<eco>/swarms/.absorbed/<source-id>/`. Forensics preserved.
 *   5. Refresh the target board.
 *
 * Returns: {
 *   absorbed: <source-id>,
 *   into: <target-id>,
 *   reposAdded: [...],
 *   reposOverlapped: [...],
 *   inboxMoved: <count>,
 *   archivedTo: '<absolute path>',
 * }
 *
 * On contract conflict, throws `Error` with code 'ECONTRACT' and a
 * `.conflicts` field describing each diff.
 */

const fs = require('fs');
const path = require('path');

const manifestLib = require('./lib/manifest');
const inboxLib = require('./inbox');
const boardLib = require('./lib/board');
const ecosystemLib = require('../ecosystem/lib/index');
const { computeWaves } = require('./lib/wave-ordering');

function detectContractConflicts(sourceContracts, targetContracts) {
  const conflicts = [];
  const tByKey = new Map();
  for (const c of (targetContracts || [])) {
    tByKey.set(c.surface, c);
  }
  for (const s of (sourceContracts || [])) {
    const t = tByKey.get(s.surface);
    if (!t) continue;
    // Owner OR content_hash divergence = conflict. Version drift alone
    // isn't a conflict if hashes are absent (legacy).
    if (s.owner !== t.owner) {
      conflicts.push({
        surface: s.surface, kind: 'owner-divergence',
        source: { owner: s.owner }, target: { owner: t.owner },
      });
      continue;
    }
    if (s.content_hash && t.content_hash && s.content_hash !== t.content_hash) {
      conflicts.push({
        surface: s.surface, kind: 'content-hash-divergence',
        source: { version: s.version, content_hash: s.content_hash },
        target: { version: t.version, content_hash: t.content_hash },
      });
    }
  }
  return conflicts;
}

function mergeRepos(source, target) {
  // Target wins on overlap (kept state); only NEW repos from source are
  // added.
  const merged = { ...target };
  const added = [];
  const overlapped = [];
  for (const [id, repoState] of Object.entries(source)) {
    if (id in target) {
      overlapped.push(id);
    } else {
      merged[id] = repoState;
      added.push(id);
    }
  }
  return { merged, added, overlapped };
}

function mergeSessions(sourceSessions, targetSessions) {
  const byId = new Map();
  for (const s of (targetSessions || [])) byId.set(s.session_id, { ...s });
  for (const s of (sourceSessions || [])) {
    const existing = byId.get(s.session_id);
    if (!existing) {
      byId.set(s.session_id, { ...s });
    } else {
      // Keep earliest first_seen, latest last_seen
      if (s.first_seen && (!existing.first_seen || s.first_seen < existing.first_seen)) {
        existing.first_seen = s.first_seen;
      }
      if (s.last_seen && (!existing.last_seen || s.last_seen > existing.last_seen)) {
        existing.last_seen = s.last_seen;
      }
    }
  }
  // Sort by first_seen ascending for deterministic output
  return Array.from(byId.values()).sort((a, b) => (a.first_seen < b.first_seen ? -1 : 1));
}

function mergeContracts(sourceContracts, targetContracts) {
  const byKey = new Map();
  for (const c of (targetContracts || [])) byKey.set(c.surface, c);
  for (const c of (sourceContracts || [])) {
    if (!byKey.has(c.surface)) byKey.set(c.surface, c);
    // else: target already wins; we validated compatibility upstream
  }
  return Array.from(byKey.values()).sort((a, b) => (a.surface < b.surface ? -1 : 1));
}

function mergeAudit(sourceAudit, targetAudit, absorbEntry) {
  const all = [
    ...(targetAudit || []),
    ...(sourceAudit || []),
    absorbEntry,
  ];
  return all.sort((a, b) => (a.ts < b.ts ? -1 : 1));
}

function copyInboxItems(ecosystemRoot, sourceSwarmId, targetSwarmId) {
  const srcDir = inboxLib.inboxDir(ecosystemRoot, sourceSwarmId);
  if (!fs.existsSync(srcDir)) return 0;
  let moved = 0;
  for (const name of fs.readdirSync(srcDir)) {
    const m = name.match(/^(\d{4})-([a-z][a-z0-9-]*)\.md$/);
    if (!m) continue;
    const [, , slug] = m;
    // Read + re-write via the inbox library so id collision is handled
    const raw = fs.readFileSync(path.join(srcDir, name), 'utf8');
    // Parse repo / question from header
    const repoMatch = raw.match(/^- Repo:\s*`([^`]+)`/m);
    const askedMatch = raw.match(/^- Asked at:\s*(.+)$/m);
    const repo = repoMatch ? repoMatch[1] : 'unknown';
    const asked = askedMatch ? askedMatch[1].trim() : new Date().toISOString();
    // Question body: everything after `## Question` until next `##` or EOF
    const qMatch = raw.match(/## Question\s*\n+([\s\S]*?)(?=\n## |\n*$)/);
    const question = qMatch ? qMatch[1].trim() : 'absorbed from source swarm (body unparseable)';
    inboxLib.writeInboxItem({
      ecosystemRoot, swarmId: targetSwarmId,
      repo, slug: `absorbed-${slug}`,
      question,
      nowIso: asked,
    });
    moved += 1;
  }
  return moved;
}

function archiveSourceSwarm(ecosystemRoot, sourceSwarmId) {
  const srcDir = manifestLib.swarmDir(ecosystemRoot, sourceSwarmId);
  if (!fs.existsSync(srcDir)) return null;
  const absorbedRoot = path.join(ecosystemRoot, manifestLib.SWARMS_DIR, '.absorbed');
  fs.mkdirSync(absorbedRoot, { recursive: true });
  const destDir = path.join(absorbedRoot, sourceSwarmId);
  if (fs.existsSync(destDir)) {
    // Already absorbed — keep both for forensics
    const stamped = `${destDir}.${Date.now()}`;
    fs.renameSync(srcDir, stamped);
    return stamped;
  }
  fs.renameSync(srcDir, destDir);
  return destDir;
}

/**
 * Main entrypoint.
 *
 * @param {object} args
 * @param {string} args.ecosystemRoot
 * @param {string} args.targetSwarmId         the absorbing swarm (caller)
 * @param {string} args.sourceSwarmId         the absorbed swarm (going away)
 * @param {string} args.sessionId             caller session id
 * @param {string} args.nowIso
 */
function absorb(args) {
  const { ecosystemRoot, targetSwarmId, sourceSwarmId, sessionId, nowIso } = args;
  if (!targetSwarmId || !sourceSwarmId) {
    throw new TypeError('absorb: targetSwarmId + sourceSwarmId required');
  }
  if (targetSwarmId === sourceSwarmId) {
    throw new Error('absorb: cannot absorb a swarm into itself');
  }
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    throw new TypeError('absorb: sessionId required');
  }

  const target = manifestLib.loadManifest(ecosystemRoot, targetSwarmId);
  if (!target) throw new Error(`absorb: target swarm ${targetSwarmId} not found`);
  const source = manifestLib.loadManifest(ecosystemRoot, sourceSwarmId);
  if (!source) throw new Error(`absorb: source swarm ${sourceSwarmId} not found`);

  // 1. Contract conflict check
  const conflicts = detectContractConflicts(source.contracts, target.contracts);
  if (conflicts.length > 0) {
    const err = new Error(`absorb: contract conflict on ${conflicts.length} surface(s)`);
    err.code = 'ECONTRACT';
    err.conflicts = conflicts;
    throw err;
  }

  // 2. Recompute waves over the union of repos
  const ecoMfst = ecosystemLib.loadManifest(ecosystemRoot);
  const { merged: mergedRepos, added: reposAdded, overlapped: reposOverlapped } = mergeRepos(source.repos, target.repos);
  const allRepoIds = Object.keys(mergedRepos).sort();
  let mergedWaves;
  try {
    mergedWaves = computeWaves(allRepoIds, (ecoMfst && ecoMfst.dependencies) || []);
  } catch (err) {
    // If the union cycles, abort cleanly
    const e = new Error(`absorb: wave recomputation failed — ${err.message}`);
    e.code = 'EWAVE';
    throw e;
  }

  // Re-assign each repo's wave field to match new wave indices
  const repoWaveById = new Map();
  for (const w of mergedWaves) {
    for (const r of w.repos) repoWaveById.set(r, w.index);
  }
  for (const [id, repoState] of Object.entries(mergedRepos)) {
    repoState.wave = repoWaveById.get(id) || repoState.wave;
  }

  // 3. Merge the other sections
  const mergedSessions = mergeSessions(source.sessions, target.sessions);
  const mergedContracts = mergeContracts(source.contracts, target.contracts);
  const absorbEntry = {
    ts: nowIso, actor: sessionId, event: 'absorb',
    detail: `absorbed ${sourceSwarmId} (added ${reposAdded.length} repo(s), overlapped ${reposOverlapped.length})`,
  };
  const mergedAudit = mergeAudit(source.audit, target.audit, absorbEntry);

  // 4. Write merged manifest atomically
  manifestLib.updateManifest(ecosystemRoot, targetSwarmId, (m) => {
    m.repos = mergedRepos;
    m.waves = mergedWaves.map((w) => ({ index: w.index, repos: w.repos, status: 'queued' }));
    // Preserve existing wave statuses for any wave whose membership is unchanged
    const prevByIndex = new Map((target.waves || []).map((w) => [w.index, w]));
    m.waves = m.waves.map((w) => {
      const prev = prevByIndex.get(w.index);
      if (prev && JSON.stringify(prev.repos) === JSON.stringify(w.repos) && prev.status) {
        return { ...w, status: prev.status };
      }
      return w;
    });
    m.sessions = mergedSessions;
    if (mergedContracts.length) m.contracts = mergedContracts;
    m.audit = mergedAudit;
  });

  // 5. Merge inbox items (additive — source items reappear in target)
  const inboxMoved = copyInboxItems(ecosystemRoot, sourceSwarmId, targetSwarmId);

  // 6. Archive source dir
  const archivedTo = archiveSourceSwarm(ecosystemRoot, sourceSwarmId);

  // 7. Refresh board
  boardLib.refreshBoard(ecosystemRoot, targetSwarmId, nowIso);

  return {
    absorbed: sourceSwarmId,
    into: targetSwarmId,
    reposAdded,
    reposOverlapped,
    inboxMoved,
    archivedTo,
  };
}

module.exports = {
  absorb,
  detectContractConflicts,
  mergeRepos,
  mergeSessions,
  mergeContracts,
  mergeAudit,
};
