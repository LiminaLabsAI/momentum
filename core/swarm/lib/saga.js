'use strict';

/**
 * Swarm saga record — per-supervisor durable state.
 *
 * Each supervisor writes one `dispatch-run-<NNNNNN>.json` per wave to
 * its own `<repo>/.momentum/runs/`. Distinct from the existing
 * `dispatch-run-NNN.md` artifacts written by Phase 11's
 * `core/orchestration/run-artifact.js` — those are scout/dispatch/
 * handoff markdown artifacts; these are JSON saga steps for the
 * conductor's polling loop + `/swarm resume`.
 *
 * Allocation is independent of the .md counters: a separate
 * `.counters.json` key `swarm-supervise` tracks the swarm sequence.
 */

const fs = require('fs');
const path = require('path');

const RUNS_DIR = '.momentum/runs';
const COUNTERS_FILENAME = '.counters.json';
const PRIMITIVE = 'swarm-supervise';

function runsDir(repoPath) {
  return path.join(repoPath, RUNS_DIR);
}

function countersPath(repoPath) {
  return path.join(runsDir(repoPath), COUNTERS_FILENAME);
}

function allocateRunId(repoPath) {
  const dir = runsDir(repoPath);
  fs.mkdirSync(dir, { recursive: true });
  const cp = countersPath(repoPath);
  let counters = {};
  if (fs.existsSync(cp)) {
    try { counters = JSON.parse(fs.readFileSync(cp, 'utf8')); } catch { counters = {}; }
  }
  const next = (counters[PRIMITIVE] || 0) + 1;
  counters[PRIMITIVE] = next;
  fs.writeFileSync(cp, JSON.stringify(counters, null, 2) + '\n');
  return String(next).padStart(3, '0');
}

function recordPath(repoPath, runId) {
  return path.join(runsDir(repoPath), `dispatch-run-${runId}.json`);
}

function writeRecord(repoPath, runId, record) {
  const file = recordPath(repoPath, runId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n', 'utf8');
  return file;
}

function loadRecord(repoPath, runId) {
  const file = recordPath(repoPath, runId);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function listRecords(repoPath) {
  const dir = runsDir(repoPath);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((n) => /^dispatch-run-\d{3,6}\.json$/.test(n))
    .map((n) => ({
      runId: n.replace(/^dispatch-run-(\d+)\.json$/, '$1'),
      path: path.join(dir, n),
    }));
}

function findActiveByWave(repoPath, swarmId, wave) {
  for (const r of listRecords(repoPath)) {
    try {
      const rec = JSON.parse(fs.readFileSync(r.path, 'utf8'));
      if (rec.swarm_id === swarmId && rec.wave === wave && rec.primitive === PRIMITIVE) {
        return Object.assign({}, rec, { runId: r.runId, path: r.path });
      }
    } catch {
      // ignore malformed
    }
  }
  return null;
}

/**
 * Convenience: open-or-create record for (repo, swarm, wave). Allocates
 * a new run id only if none exists yet for that triple. `seed` is the
 * default state for a fresh record.
 */
function openRecord(repoPath, swarmId, wave, seed) {
  const existing = findActiveByWave(repoPath, swarmId, wave);
  if (existing) return existing;
  const runId = allocateRunId(repoPath);
  const fresh = Object.assign({
    run_id: runId,
    primitive: PRIMITIVE,
    swarm_id: swarmId,
    saga_id: seed.saga_id,
    wave,
    repo: seed.repo,
    phase_slug: seed.phase_slug,
    branch: seed.branch,
    started: seed.started,
    step_n: 0,
    done: false,
    exit_status: 'in-progress',
    tasks_done: 0,
    tasks_total: 0,
    tokens_used: 0,
    inbox_items: [],
    history_tail_offset: 0,
    claimed_by_session: seed.claimed_by_session,
  }, seed.overrides || {});
  writeRecord(repoPath, runId, fresh);
  return Object.assign({}, fresh, { path: recordPath(repoPath, runId) });
}

/**
 * Read-modify-write a saga record. Bumps step_n unless `bumpStep:false`.
 */
function updateRecord(repoPath, runId, mutate, opts = {}) {
  const file = recordPath(repoPath, runId);
  if (!fs.existsSync(file)) throw new Error(`saga: no record at ${file}`);
  const cur = JSON.parse(fs.readFileSync(file, 'utf8'));
  const result = mutate(cur);
  const next = result === undefined ? cur : result;
  if (opts.bumpStep !== false) next.step_n = (next.step_n || 0) + 1;
  fs.writeFileSync(file, JSON.stringify(next, null, 2) + '\n', 'utf8');
  return next;
}

module.exports = {
  PRIMITIVE,
  RUNS_DIR,
  allocateRunId,
  recordPath,
  writeRecord,
  loadRecord,
  listRecords,
  findActiveByWave,
  openRecord,
  updateRecord,
};
