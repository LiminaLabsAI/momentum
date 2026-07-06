'use strict';

/**
 * Materialized board cache for swarms.
 *
 * Strategy A from the indexing design: the conductor reads ONLY
 * board.json on most turns. Inputs: manifest.json + per-repo
 * dispatch-run-NNN.json records. Output: board.json (≈1–3KB).
 *
 * Pre-rendered display strings keep the conductor stateless — no
 * computation per turn. The materializer is invoked from any code path
 * that mutates manifest or supervisor saga records.
 */

const fs = require('fs');
const path = require('path');

const manifestLib = require('./manifest');

const BOARD_FILENAME = 'board.json';

function boardPath(ecosystemRoot, swarmId) {
  return path.join(manifestLib.swarmDir(ecosystemRoot, swarmId), BOARD_FILENAME);
}

// ─────────────────────────────────────────────────────────────────────────────
// Render helpers
// ─────────────────────────────────────────────────────────────────────────────

function tasksDisplay(done, total) {
  if (done == null && total == null) return '';
  return `${done || 0}/${total || 0}`;
}

function tokensDisplay(used, budget) {
  const k = (n) => `${Math.round((n || 0) / 1000)}k`;
  if (used == null && budget == null) return '';
  return `${k(used)}/${k(budget)}`;
}

function shortTs(iso) {
  // "2026-06-12T17:42:11Z" → "17:42"
  if (typeof iso !== 'string') return '';
  const m = iso.match(/T(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : '';
}

function deriveOverallStatus(manifest) {
  const repos = Object.values(manifest.repos || {});
  if (repos.length === 0) return 'running';
  if (repos.every((r) => r.status === 'complete')) return 'complete';
  if (repos.some((r) => r.status === 'failed')) return 'failed';
  if (repos.every((r) => r.status === 'cancelled' || r.status === 'complete')
      && repos.some((r) => r.status === 'cancelled')) {
    return 'cancelled';
  }
  return manifest.status || 'running';
}

function activeWave(manifest) {
  const waves = manifest.waves || [];
  for (const w of waves) {
    if (w.status === 'running') return w.index;
  }
  for (const w of waves) {
    if (w.status === 'queued' || w.status === undefined) return w.index;
  }
  // All complete — return last wave's index
  return waves.length ? waves[waves.length - 1].index : 1;
}

function inboxCount(ecosystemRoot, swarmId) {
  const inboxDir = path.join(manifestLib.swarmDir(ecosystemRoot, swarmId), 'inbox');
  if (!fs.existsSync(inboxDir)) return 0;
  return fs.readdirSync(inboxDir)
    .filter((n) => /^\d{4}-[a-z][a-z0-9-]*\.md$/.test(n))
    .length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Materialization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive a board cache from manifest state. Pure function over manifest
 * — disk reads are limited to the inbox dir for the count. `nowIso` is
 * injected for determinism (the conductor passes current time; tests
 * pass a fixed value).
 */
function materializeBoard(ecosystemRoot, swarmId, manifest, nowIso) {
  if (!manifest || typeof manifest !== 'object') {
    throw new TypeError('materializeBoard: manifest must be an object');
  }
  const board = {
    swarm_id: manifest.swarm_id,
    version: 1,
    saga_id: manifest.saga_id,
    mode: manifest.mode,
    rendered_at: nowIso,
    status: deriveOverallStatus(manifest),
    active_wave: activeWave(manifest),
    repos: [],
    inbox_count: inboxCount(ecosystemRoot, swarmId),
    recent_activity: [],
  };

  for (const [name, r] of Object.entries(manifest.repos || {})) {
    const row = {
      name,
      wave: r.wave,
      status: r.status,
    };
    if (r.tasks_done != null || r.tasks_total != null) {
      row.tasks = tasksDisplay(r.tasks_done, r.tasks_total);
    }
    if (r.tokens_used != null || r.tokens_budget != null) {
      row.tokens = tokensDisplay(r.tokens_used, r.tokens_budget);
    }
    if (r.commits != null) row.commits = r.commits;
    if (r.current_task) row.current = r.current_task;
    if (r.inbox_count != null) row.inbox_count = r.inbox_count;
    if (Array.isArray(r.waiting_on) && r.waiting_on.length) {
      row.waiting_on = r.waiting_on.join(', ');
    }
    board.repos.push(row);
  }

  if (Array.isArray(manifest.audit)) {
    const tail = manifest.audit.slice(-10).reverse();
    for (const a of tail) {
      const msg = a.detail || a.event;
      const entry = { ts: shortTs(a.ts), msg };
      if (a.repo) entry.repo = a.repo;
      board.recent_activity.push(entry);
    }
  }

  return board;
}

function writeBoard(ecosystemRoot, swarmId, board) {
  const file = boardPath(ecosystemRoot, swarmId);
  manifestLib.ensureSwarmLayout(ecosystemRoot, swarmId);
  return manifestLib.withLock(file, () => {
    fs.writeFileSync(file, JSON.stringify(board, null, 2) + '\n', 'utf8');
    return file;
  });
}

function loadBoard(ecosystemRoot, swarmId) {
  const file = boardPath(ecosystemRoot, swarmId);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * Convenience: materialize from current manifest + write atomically.
 */
function refreshBoard(ecosystemRoot, swarmId, nowIso) {
  const manifest = manifestLib.loadManifest(ecosystemRoot, swarmId);
  if (!manifest) throw new Error(`refreshBoard: no manifest for swarm ${swarmId}`);
  const board = materializeBoard(ecosystemRoot, swarmId, manifest, nowIso);
  writeBoard(ecosystemRoot, swarmId, board);
  return board;
}

module.exports = {
  BOARD_FILENAME,
  boardPath,
  materializeBoard,
  writeBoard,
  loadBoard,
  refreshBoard,
  deriveOverallStatus,
  activeWave,
  tasksDisplay,
  tokensDisplay,
};
