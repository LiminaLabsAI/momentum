'use strict';

/**
 * Phase 32d G1 — the swarm wave SIMULATOR, moved out of production.
 *
 * `pollTurn` and `recordRepoComplete` lived in `core/swarm/conductor.js` and
 * had **no production caller, ever** (BUG-031). `bin/swarm.js` has no `poll`
 * subcommand among its 20 verbs, and wave-1 spawn directives are the only ones
 * ever built — so `--mode autopilot` marked wave 2 "running" and nothing
 * launched it. The board froze at wave-1-start.
 *
 * They were green for a year because THESE TESTS called them directly. That is
 * the whole shape of BUG-031: the tests exercised a path production never took.
 *
 * So this is a MOVE, not a deletion. The functions were only ever a test
 * simulator, and a test simulator belongs in tests. What the e2e scenarios
 * genuinely verify — wave PLANNING, ordering, spawn-directive shape, manifest
 * semantics — is live production behaviour and keeps its coverage. What they
 * were pretending to verify — a conductor that advances waves — never existed,
 * and now the code says so by living here instead of there.
 *
 * Superseded by `momentum run` (Epic 0001), which drives every tier through a
 * governor with a real production entry point and an enumerative guard proving
 * it (`tests/run-reachability.test.js`).
 */

const fs2 = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const manifestLib = require(path.join(REPO_ROOT, 'core', 'swarm', 'lib', 'manifest'));
const boardLib = require(path.join(REPO_ROOT, 'core', 'swarm', 'lib', 'board'));
const sagaLib = require(path.join(REPO_ROOT, 'core', 'swarm', 'lib', 'saga'));
const gitSha = require(path.join(REPO_ROOT, 'core', 'swarm', 'lib', 'git-sha-cache'));
const ecosystemLib = require(path.join(REPO_ROOT, 'core', 'ecosystem', 'lib', 'index'));

/** Mirrors the production helper of the same name in core/swarm/conductor.js. */
function resolveMemberPath(ecosystemRoot, memberId, ecosystemManifest) {
  const m = ecosystemManifest || ecosystemLib.loadManifest(ecosystemRoot);
  for (const member of ecosystemLib.listMembers(m)) {
    if (member && member.id === memberId) return path.resolve(ecosystemRoot, member.path);
  }
  return null;
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

module.exports = { recordRepoComplete, pollTurn };
