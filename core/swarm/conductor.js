'use strict';

/**
 * Swarm conductor — orchestration helpers used by the CLI floor
 * (`bin/swarm.js`) and the Claude Code `/swarm` recipes.
 *
 * Pure, no-spawn: this module never executes the supervisor agent
 * itself. Instead it (a) builds + persists swarm state on disk and
 * (b) emits a structured "spawn directive" that the platform-adapter
 * layer (bin/swarm.js wrapping `claude --bg --cwd <repo>` for Claude
 * Code) actually launches.
 *
 * Separation rationale: keeping the spawn out of core means the
 * library is platform-agnostic — Codex / Antigravity in Phase 18 will
 * reuse this without changes; only their adapter spawn wrappers need
 * to be written.
 */

const fs = require('fs');
const path = require('path');

const manifestLib = require('./lib/manifest');
const boardLib = require('./lib/board');
const waveLib = require('./lib/wave-ordering');
const briefLib = require('./lib/brief');
const gitSha = require('./lib/git-sha-cache');
const sagaLib = require('./lib/saga');

const ecosystemLib = require('../ecosystem/lib/index');

const DEFAULT_TOKEN_BUDGET = 300000;
const DEFAULT_LEASE_HOURS = 24;
const DEFAULT_MODE = 'checkpoint';

// ─────────────────────────────────────────────────────────────────────────────
// Spawn directive (what the platform adapter consumes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} SpawnDirective
 * @property {string} platform       — 'claude-code' | 'codex' | 'antigravity'
 * @property {string} swarmId
 * @property {number} wave
 * @property {string} repoId
 * @property {string} repoPath       — absolute path to the repo working tree
 * @property {string} phaseSlug
 * @property {string} branch
 * @property {string} sessionId
 * @property {string} recipePath     — absolute path to supervise.md (or adapter override)
 * @property {string} contextPath    — absolute path to per-supervisor working brief
 * @property {Record<string,string>} env  — env vars to inject in the spawn
 */

// ─────────────────────────────────────────────────────────────────────────────
// Plan a swarm — pure: take inputs, return manifest seed
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the initial manifest object for a new swarm. Does not write —
 * the caller persists with manifestLib.writeManifest after final
 * review.
 *
 * @param {object} args
 * @param {string} args.ecosystemRoot   absolute path to ecosystem root
 * @param {string} args.swarmId         result of nextSwarmId(root, slug)
 * @param {string} args.initiative      initiative slug
 * @param {string[]} args.impactedRepos ecosystem member ids
 * @param {string} args.phaseSlug       phase slug each supervisor will drive (one slug — all repos share it for simplicity)
 * @param {string} args.sessionId       conductor session uuid
 * @param {string} [args.mode]          default DEFAULT_MODE
 * @param {string} [args.nowIso]        timestamp (default required by caller for determinism)
 * @param {object} [args.ecosystemManifest] for wave ordering — if omitted we'll loadManifest
 * @returns {object} manifest
 */
function planSwarm(args) {
  const {
    ecosystemRoot, swarmId, initiative, impactedRepos, phaseSlug,
    sessionId, mode = DEFAULT_MODE, nowIso,
    ecosystemManifest,
  } = args;

  if (typeof ecosystemRoot !== 'string' || ecosystemRoot.length === 0) {
    throw new TypeError('planSwarm: ecosystemRoot required');
  }
  if (!/^[0-9]{4}-[a-z][a-z0-9-]*$/.test(swarmId)) {
    throw new TypeError(`planSwarm: invalid swarmId ${JSON.stringify(swarmId)}`);
  }
  if (typeof initiative !== 'string' || !/^[a-z][a-z0-9-]*$/.test(initiative)) {
    throw new TypeError(`planSwarm: invalid initiative ${JSON.stringify(initiative)}`);
  }
  if (!Array.isArray(impactedRepos) || impactedRepos.length === 0) {
    throw new TypeError('planSwarm: impactedRepos must be non-empty');
  }
  if (typeof phaseSlug !== 'string' || !/^phase-[0-9]+(?:[a-z])?-[a-z][a-z0-9-]*$/.test(phaseSlug)) {
    throw new TypeError(`planSwarm: invalid phaseSlug ${JSON.stringify(phaseSlug)}`);
  }
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    throw new TypeError('planSwarm: sessionId required');
  }
  if (typeof nowIso !== 'string' || nowIso.length === 0) {
    throw new TypeError('planSwarm: nowIso required');
  }
  if (!['autopilot', 'checkpoint', 'interactive'].includes(mode)) {
    throw new TypeError(`planSwarm: invalid mode ${JSON.stringify(mode)}`);
  }

  const ecoMfst = ecosystemManifest || ecosystemLib.loadManifest(ecosystemRoot);
  const deps = (ecoMfst && Array.isArray(ecoMfst.dependencies)) ? ecoMfst.dependencies : [];

  const waves = waveLib.computeWaves(impactedRepos, deps);
  const repoWaveIndex = {};
  for (const w of waves) {
    for (const r of w.repos) repoWaveIndex[r] = w.index;
  }

  const leaseExpires = new Date(Date.parse(nowIso) + DEFAULT_LEASE_HOURS * 3600 * 1000).toISOString();

  const repos = {};
  for (const repoId of impactedRepos) {
    repos[repoId] = {
      wave: repoWaveIndex[repoId],
      status: 'queued',
      phase_slug: phaseSlug,
      branch: phaseSlug,
      owner: sessionId,
      lease_expires_at: leaseExpires,
      lease_renewed_at: nowIso,
      claimed_by_session: sessionId,
      tasks_done: 0,
      tasks_total: 0,
      tokens_used: 0,
      tokens_budget: DEFAULT_TOKEN_BUDGET,
      inbox_count: 0,
      commits: 0,
    };
  }

  return {
    swarm_id: swarmId,
    version: 1,
    saga_id: manifestLib.makeSagaId(swarmId, 0),
    mode,
    initiative,
    created: nowIso,
    ecosystem: (ecoMfst && ecoMfst.name) || 'unknown',
    repos,
    waves: waves.map((w) => Object.assign({}, w, { status: w.index === 1 ? 'queued' : 'queued' })),
    sessions: [{ session_id: sessionId, first_seen: nowIso, last_seen: nowIso }],
    audit: [{
      ts: nowIso, actor: sessionId, event: 'start',
      detail: `Swarm ${swarmId} planned (${impactedRepos.length} repos, ${waves.length} waves)`,
    }],
    status: 'running',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolve member repo path from ecosystem manifest
// ─────────────────────────────────────────────────────────────────────────────

function resolveMemberPath(ecosystemRoot, memberId, ecosystemManifest) {
  const m = ecosystemManifest || ecosystemLib.loadManifest(ecosystemRoot);
  for (const member of ecosystemLib.listMembers(m)) {
    if (member && member.id === memberId) {
      return path.resolve(ecosystemRoot, member.path);
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build spawn directives for an active wave
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return an array of SpawnDirective for every repo in the wave. The
 * caller (platform adapter wrapper in bin/swarm.js) iterates these and
 * actually launches sessions.
 */
function buildSpawnDirectives(args) {
  const { ecosystemRoot, swarmId, waveIndex, platform = 'claude-code' } = args;
  const manifest = manifestLib.loadManifest(ecosystemRoot, swarmId);
  if (!manifest) throw new Error(`buildSpawnDirectives: no manifest for ${swarmId}`);
  const wave = (manifest.waves || []).find((w) => w.index === waveIndex);
  if (!wave) throw new Error(`buildSpawnDirectives: no wave ${waveIndex} in ${swarmId}`);

  const ecoMfst = ecosystemLib.loadManifest(ecosystemRoot);
  const recipePath = path.resolve(__dirname, 'supervise.md');

  const directives = [];
  for (const repoId of wave.repos) {
    const repo = manifest.repos[repoId];
    if (!repo) continue;
    const repoPath = resolveMemberPath(ecosystemRoot, repoId, ecoMfst);
    if (!repoPath) {
      throw new Error(`buildSpawnDirectives: cannot resolve path for member "${repoId}"`);
    }
    const contextPath = path.join(
      repoPath, 'specs', 'phases', repo.phase_slug, 'swarm-context.md'
    );
    directives.push({
      platform,
      swarmId,
      wave: waveIndex,
      repoId,
      repoPath,
      phaseSlug: repo.phase_slug,
      branch: repo.branch,
      sessionId: repo.owner,
      recipePath,
      contextPath,
      env: {
        MOMENTUM_SWARM_ID: swarmId,
        MOMENTUM_SWARM_WAVE: String(waveIndex),
        MOMENTUM_SWARM_INITIATIVE: manifest.initiative,
        MOMENTUM_SWARM_SESSION: repo.owner,
        MOMENTUM_ECOSYSTEM_ROOT: ecosystemRoot,
        MOMENTUM_SWARM_RECIPE: recipePath,
        MOMENTUM_SWARM_CONTEXT: contextPath,
      },
    });
  }
  return directives;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-repo supervisor brief injection — called from /start-phase
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inject swarm frontmatter into a supervisor's phase brief. Called
 * from /start-phase when the env vars MOMENTUM_SWARM_* are set.
 *
 * Idempotent — re-running with the same values is a no-op.
 */
function injectBriefFrontmatter(repoPath, phaseSlug, swarmFields) {
  const briefPath = path.join(repoPath, 'specs', 'phases', phaseSlug, 'overview.md');
  return briefLib.injectSwarmFrontmatter(briefPath, swarmFields);
}

/**
 * Read from env (compatible with the supervisor recipe) and return
 * { swarmId, wave, initiative, claimedBySession } or null when not in
 * a swarm context.
 */
function readEnvSwarmContext(env = process.env) {
  if (!env.MOMENTUM_SWARM_ID) return null;
  return {
    swarm: env.MOMENTUM_SWARM_ID,
    wave: parseInt(env.MOMENTUM_SWARM_WAVE, 10),
    initiative: env.MOMENTUM_SWARM_INITIATIVE,
    claimed_by_session: env.MOMENTUM_SWARM_SESSION,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Wave lifecycle — mark started / complete
// ─────────────────────────────────────────────────────────────────────────────

function markWaveStatus(ecosystemRoot, swarmId, waveIndex, status, nowIso) {
  return manifestLib.updateManifest(ecosystemRoot, swarmId, (m) => {
    const w = (m.waves || []).find((x) => x.index === waveIndex);
    if (w) {
      w.status = status;
      if (status === 'running') {
        for (const r of w.repos) {
          if (m.repos[r] && m.repos[r].status === 'queued') m.repos[r].status = 'running';
        }
      }
      if (status === 'complete' && nowIso) {
        w.checkpoint_resolved_at = nowIso;
      }
    }
  });
}

function recordRepoComplete(ecosystemRoot, swarmId, repoId, opts = {}) {
  return manifestLib.updateManifest(ecosystemRoot, swarmId, (m) => {
    if (!m.repos[repoId]) return;
    m.repos[repoId].status = 'complete';
    if (opts.tasksDone != null) m.repos[repoId].tasks_done = opts.tasksDone;
    if (opts.tasksTotal != null) m.repos[repoId].tasks_total = opts.tasksTotal;
    if (opts.commits != null) m.repos[repoId].commits = opts.commits;
    if (opts.lastSeenSha) m.repos[repoId].last_seen_sha = opts.lastSeenSha;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-turn poll — Strategies A + B + C in one call
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run one conductor poll. Cheap by design — ~3KB of file reads when
 * nothing changed. The conductor recipe calls this on every turn.
 *
 *   1. For each active-wave repo, read git HEAD SHA — Strategy B.
 *   2. For repos whose SHA changed since last_seen_sha, refresh their
 *      saga record into the manifest. Repos unchanged → cache fresh.
 *   3. If every repo in the current running wave is done, advance the
 *      wave (queued → running) and emit a transition audit event.
 *   4. Re-materialize board.json so the next read is fresh.
 *
 * Returns a summary: { changedRepos, completedWave?, advancedToWave? }.
 */
function pollTurn(args) {
  const { ecosystemRoot, swarmId, nowIso } = args;
  if (typeof ecosystemRoot !== 'string' || ecosystemRoot.length === 0) {
    throw new TypeError('pollTurn: ecosystemRoot required');
  }
  if (typeof nowIso !== 'string' || nowIso.length === 0) {
    throw new TypeError('pollTurn: nowIso required');
  }
  const manifest = manifestLib.loadManifest(ecosystemRoot, swarmId);
  if (!manifest) throw new Error(`pollTurn: no manifest for ${swarmId}`);

  const ecoMfst = ecosystemLib.loadManifest(ecosystemRoot);
  const runningWave = (manifest.waves || []).find((w) => w.status === 'running');
  const activeRepoIds = runningWave ? runningWave.repos : [];

  // Build (repoId → lastSeenSha) for the active wave
  const lastSeen = {};
  for (const id of activeRepoIds) {
    lastSeen[id] = (manifest.repos[id] && manifest.repos[id].last_seen_sha) || '';
  }
  const repoIdToPath = {};
  for (const id of activeRepoIds) {
    repoIdToPath[id] = resolveMemberPath(ecosystemRoot, id, ecoMfst);
  }
  const diff = gitSha.diffSinceLastSeen(lastSeen, (id) => repoIdToPath[id]);

  // Pull updated saga records for changed repos
  manifestLib.updateManifest(ecosystemRoot, swarmId, (m) => {
    for (const id of diff.changed) {
      const repoPath = repoIdToPath[id];
      if (!repoPath) continue;
      const saga = runningWave
        ? sagaLib.findActiveByWave(repoPath, swarmId, runningWave.index)
        : null;
      if (saga) {
        const r = m.repos[id];
        r.tasks_done = saga.tasks_done || r.tasks_done;
        r.tasks_total = saga.tasks_total || r.tasks_total;
        r.tokens_used = saga.tokens_used || r.tokens_used;
        if (saga.head_sha) r.last_seen_sha = saga.head_sha;
        if (saga.done && r.status !== 'complete') r.status = 'complete';
        if (saga.exit_status === 'failed') r.status = 'failed';
      }
      if (diff.shas[id]) m.repos[id].last_seen_sha = diff.shas[id];
    }
  });

  // Refresh state via re-load
  const after = manifestLib.loadManifest(ecosystemRoot, swarmId);

  // Wave advancement
  let completedWave = null;
  let advancedToWave = null;
  if (runningWave) {
    const wave = (after.waves || []).find((w) => w.index === runningWave.index);
    const allDone = wave.repos.every((id) =>
      after.repos[id] && (after.repos[id].status === 'complete' || after.repos[id].status === 'cancelled'));
    if (allDone) {
      completedWave = wave.index;
      // For autopilot mode we auto-advance; for checkpoint we mark the
      // wave complete but the recipe is responsible for the user
      // approval prompt before advancing.
      manifestLib.updateManifest(ecosystemRoot, swarmId, (m) => {
        const w = m.waves.find((x) => x.index === completedWave);
        w.status = 'complete';
        w.checkpoint_resolved_at = w.checkpoint_resolved_at || nowIso;
        if (!Array.isArray(m.audit)) m.audit = [];
        m.audit.push({
          ts: nowIso, actor: 'conductor', event: 'wave-transition',
          detail: `Wave ${completedWave} complete`,
        });
        if (m.mode === 'autopilot') {
          const next = m.waves.find((x) => x.index === completedWave + 1);
          if (next && next.status === 'queued') {
            next.status = 'running';
            for (const id of next.repos) {
              if (m.repos[id] && m.repos[id].status === 'queued') m.repos[id].status = 'running';
            }
            advancedToWave = next.index;
          } else if (!next) {
            m.status = 'complete';
          }
        }
      });
    }
  } else {
    // No running wave — try to start wave 1 if everything is queued
    const w1 = (after.waves || []).find((w) => w.index === 1);
    if (w1 && (w1.status === 'queued' || w1.status === undefined)) {
      manifestLib.updateManifest(ecosystemRoot, swarmId, (m) => {
        const w = m.waves.find((x) => x.index === 1);
        w.status = 'running';
        for (const id of w.repos) {
          if (m.repos[id] && m.repos[id].status === 'queued') m.repos[id].status = 'running';
        }
      });
      advancedToWave = 1;
    }
  }

  // Always refresh board after a turn
  boardLib.refreshBoard(ecosystemRoot, swarmId, nowIso);

  return {
    changedRepos: diff.changed,
    unchangedRepos: diff.unchanged,
    completedWave,
    advancedToWave,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cancel — graceful halt
// ─────────────────────────────────────────────────────────────────────────────

function cancelSwarm(ecosystemRoot, swarmId, reason, nowIso) {
  manifestLib.updateManifest(ecosystemRoot, swarmId, (m) => {
    for (const r of Object.values(m.repos || {})) {
      if (r.status === 'queued' || r.status === 'running' || r.status === 'blocked') {
        r.status = 'cancelled';
      }
    }
    for (const w of m.waves || []) {
      if (w.status === 'queued' || w.status === 'running') w.status = 'cancelled';
    }
    m.status = 'cancelled';
    if (!Array.isArray(m.audit)) m.audit = [];
    m.audit.push({
      ts: nowIso, actor: 'conductor', event: 'cancel',
      detail: reason || 'swarm cancelled',
    });
  });
  boardLib.refreshBoard(ecosystemRoot, swarmId, nowIso);
}

// ─────────────────────────────────────────────────────────────────────────────
// Resume — disk-only reconstitution
// ─────────────────────────────────────────────────────────────────────────────

function resumeSwarm(ecosystemRoot, swarmId, sessionId, nowIso) {
  const manifest = manifestLib.loadManifest(ecosystemRoot, swarmId);
  if (!manifest) throw new Error(`resumeSwarm: no manifest for ${swarmId}`);

  manifestLib.updateManifest(ecosystemRoot, swarmId, (m) => {
    if (!Array.isArray(m.sessions)) m.sessions = [];
    const existing = m.sessions.find((s) => s.session_id === sessionId);
    if (existing) {
      existing.last_seen = nowIso;
    } else {
      m.sessions.push({ session_id: sessionId, first_seen: nowIso, last_seen: nowIso });
    }
    if (!Array.isArray(m.audit)) m.audit = [];
    m.audit.push({
      ts: nowIso, actor: sessionId, event: 'resume',
      detail: `session ${sessionId} attached to swarm`,
    });
  });

  // Refresh board so the next conductor turn sees a fresh snapshot.
  boardLib.refreshBoard(ecosystemRoot, swarmId, nowIso);
  return manifestLib.loadManifest(ecosystemRoot, swarmId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Lease renewal — Phase 17.5 hooks
// ─────────────────────────────────────────────────────────────────────────────

function renewLeases(ecosystemRoot, swarmId, sessionId, nowIso) {
  const leaseExpires = new Date(Date.parse(nowIso) + DEFAULT_LEASE_HOURS * 3600 * 1000).toISOString();
  manifestLib.updateManifest(ecosystemRoot, swarmId, (m) => {
    for (const r of Object.values(m.repos || {})) {
      if (r.owner === sessionId) {
        r.lease_renewed_at = nowIso;
        r.lease_expires_at = leaseExpires;
      }
    }
  });
}

module.exports = {
  DEFAULT_TOKEN_BUDGET,
  DEFAULT_LEASE_HOURS,
  DEFAULT_MODE,
  planSwarm,
  resolveMemberPath,
  buildSpawnDirectives,
  injectBriefFrontmatter,
  readEnvSwarmContext,
  markWaveStatus,
  recordRepoComplete,
  pollTurn,
  cancelSwarm,
  resumeSwarm,
  renewLeases,
};
