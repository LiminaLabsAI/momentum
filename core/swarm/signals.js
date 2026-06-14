'use strict';

/**
 * Swarm signal protocol — typed cross-session messages.
 *
 * Phase 17.5 lights up the `signals/` directory reserved in v0.20.0.
 * Each signal is one file at `<eco>/swarms/<id>/signals/NNNN-<type>-<slug>.json`.
 * The conductor polls the directory each turn, surfaces unprocessed
 * signals, and on processing moves the file to `signals/processed/`.
 *
 * Types:
 *   - focus-request    issued by `/swarm focus <repo>`; receiver consumes the token via `/swarm join --token`
 *   - claim-request    issued by `/swarm claim <repo>` when the requester doesn't yet hold the lease
 *   - absorb-proposed  issued by `/swarm absorb` before performing the merge — gives the other conductor a chance to see it
 *   - lease-expired    issued by enforcement when a write was rejected against an expired lease
 *
 * Concurrency: writes use the same mkdir-lock pattern as manifest.js +
 * inbox.js. Filenames embed the signal type so the poller can branch
 * without reading bodies.
 */

const fs = require('fs');
const path = require('path');

const manifestLib = require('./lib/manifest');

const SIGNALS_DIR = 'signals';
const PROCESSED_DIR = 'processed';
const INDEX_FILENAME = 'INDEX.md';

const VALID_TYPES = Object.freeze([
  'focus-request',
  'claim-request',
  'absorb-proposed',
  'lease-expired',
]);

const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const TYPE_ALT = VALID_TYPES.join('|');
const FILENAME = new RegExp(`^(\\d{4})-(${TYPE_ALT})-([a-z0-9][a-z0-9-]*)\\.json$`);
const SIGNAL_ID = new RegExp(`^[0-9]{4}-(?:${TYPE_ALT})-[a-z0-9][a-z0-9-]*$`);
const TOKEN_HEX = /^[0-9a-f]{16}$/;
const SWARM_ID = /^[0-9]{4}-[a-z][a-z0-9-]*$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;

// ─────────────────────────────────────────────────────────────────────────────
// Path helpers
// ─────────────────────────────────────────────────────────────────────────────

function signalsDir(ecosystemRoot, swarmId) {
  return path.join(manifestLib.swarmDir(ecosystemRoot, swarmId), SIGNALS_DIR);
}

function processedDir(ecosystemRoot, swarmId) {
  return path.join(signalsDir(ecosystemRoot, swarmId), PROCESSED_DIR);
}

function indexPath(ecosystemRoot, swarmId) {
  return path.join(signalsDir(ecosystemRoot, swarmId), INDEX_FILENAME);
}

function ensureLayout(ecosystemRoot, swarmId) {
  manifestLib.ensureSwarmLayout(ecosystemRoot, swarmId);
  fs.mkdirSync(processedDir(ecosystemRoot, swarmId), { recursive: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

function validateSignal(obj) {
  const errors = [];
  const push = (p, m) => errors.push({ path: p, message: m });

  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, errors: [{ path: '$', message: 'signal must be a JSON object' }] };
  }

  if (typeof obj.signal_id !== 'string' || !SIGNAL_ID.test(obj.signal_id)) {
    push('$.signal_id', 'must match /^[0-9]{4}-<type>-[a-z0-9][a-z0-9-]*$/');
  }
  if (obj.version !== 1) push('$.version', 'must be the integer 1');
  if (!VALID_TYPES.includes(obj.type)) {
    push('$.type', `must be one of: ${VALID_TYPES.join(', ')}`);
  }
  if (typeof obj.ts !== 'string' || !ISO_DATETIME.test(obj.ts)) {
    push('$.ts', 'must be ISO-8601 date-time');
  }
  if (typeof obj.from_session !== 'string' || obj.from_session.length === 0) {
    push('$.from_session', 'required non-empty string');
  }
  if (obj.to_session !== undefined && (typeof obj.to_session !== 'string' || obj.to_session.length === 0)) {
    push('$.to_session', 'must be non-empty string when present');
  }
  if (obj.repo !== undefined && (typeof obj.repo !== 'string' || !SLUG.test(obj.repo))) {
    push('$.repo', 'must match /^[a-z0-9][a-z0-9-]*$/ when present');
  }
  if (obj.token !== undefined && (typeof obj.token !== 'string' || !TOKEN_HEX.test(obj.token))) {
    push('$.token', 'must be 16-hex when present');
  }
  if (obj.source_swarm !== undefined && (typeof obj.source_swarm !== 'string' || !SWARM_ID.test(obj.source_swarm))) {
    push('$.source_swarm', 'must match swarm-id pattern when present');
  }
  if (obj.detail !== undefined && typeof obj.detail !== 'string') {
    push('$.detail', 'must be string when present');
  }

  // Per-type required fields
  if (obj.type === 'focus-request' || obj.type === 'claim-request' || obj.type === 'lease-expired') {
    if (typeof obj.repo !== 'string') push('$.repo', `required for ${obj.type}`);
  }
  if (obj.type === 'absorb-proposed') {
    if (typeof obj.source_swarm !== 'string') push('$.source_swarm', 'required for absorb-proposed');
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// ID generation
// ─────────────────────────────────────────────────────────────────────────────

function nextSignalId(ecosystemRoot, swarmId) {
  ensureLayout(ecosystemRoot, swarmId);
  let max = 0;
  const scan = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const m = name.match(FILENAME);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > max) max = n;
      }
    }
  };
  scan(signalsDir(ecosystemRoot, swarmId));
  scan(processedDir(ecosystemRoot, swarmId));
  return String(max + 1).padStart(4, '0');
}

// ─────────────────────────────────────────────────────────────────────────────
// Write
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Write a typed signal. Returns { signal_id, filePath }.
 *
 * @param {object} args
 * @param {string} args.ecosystemRoot
 * @param {string} args.swarmId
 * @param {string} args.type            one of VALID_TYPES
 * @param {string} args.slug            kebab slug (used in filename + signal_id)
 * @param {string} args.fromSession     issuing session id
 * @param {string} args.nowIso          ISO timestamp
 * @param {string} [args.toSession]
 * @param {string} [args.repo]
 * @param {string} [args.token]
 * @param {string} [args.sourceSwarm]
 * @param {string} [args.detail]
 */
function writeSignal(args) {
  const {
    ecosystemRoot, swarmId, type, slug, fromSession, nowIso,
    toSession, repo, token, sourceSwarm, detail,
  } = args;
  if (!VALID_TYPES.includes(type)) {
    throw new TypeError(`writeSignal: invalid type ${JSON.stringify(type)}`);
  }
  if (typeof slug !== 'string' || !SLUG.test(slug)) {
    throw new TypeError(`writeSignal: invalid slug ${JSON.stringify(slug)}`);
  }
  ensureLayout(ecosystemRoot, swarmId);
  const id = nextSignalId(ecosystemRoot, swarmId);
  const signalId = `${id}-${type}-${slug}`;
  const filePath = path.join(signalsDir(ecosystemRoot, swarmId), `${signalId}.json`);

  const payload = {
    signal_id: signalId,
    version: 1,
    type,
    ts: nowIso,
    from_session: fromSession,
  };
  if (toSession) payload.to_session = toSession;
  if (repo) payload.repo = repo;
  if (token) payload.token = token;
  if (sourceSwarm) payload.source_swarm = sourceSwarm;
  if (detail) payload.detail = detail;

  const v = validateSignal(payload);
  if (!v.ok) {
    const summary = v.errors.map((e) => `  ${e.path}: ${e.message}`).join('\n');
    throw new Error(`writeSignal: validation failed:\n${summary}`);
  }

  manifestLib.withLock(filePath, () => {
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  });
  rebuildIndex(ecosystemRoot, swarmId);
  return { signal_id: signalId, filePath };
}

// ─────────────────────────────────────────────────────────────────────────────
// Read / poll
// ─────────────────────────────────────────────────────────────────────────────

function readSignal(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

/**
 * List unprocessed signals (excluding processed/). Optionally filter by
 * `type` and/or `toSession` (broadcast signals — those without
 * `to_session` — always match).
 */
function listPendingSignals(ecosystemRoot, swarmId, opts = {}) {
  const dir = signalsDir(ecosystemRoot, swarmId);
  if (!fs.existsSync(dir)) return [];
  const wantType = opts.type;
  const wantSession = opts.toSession;
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const m = name.match(FILENAME);
    if (!m) continue;
    const filePath = path.join(dir, name);
    let body;
    try { body = readSignal(filePath); } catch (_e) { continue; }
    if (wantType && body.type !== wantType) continue;
    if (wantSession && body.to_session && body.to_session !== wantSession) continue;
    out.push({ ...body, filePath });
  }
  out.sort((a, b) => a.signal_id.localeCompare(b.signal_id));
  return out;
}

/**
 * Move a signal file to processed/. Idempotent — if already in
 * processed/, returns silently.
 */
function markProcessed(ecosystemRoot, swarmId, signalId) {
  ensureLayout(ecosystemRoot, swarmId);
  const dir = signalsDir(ecosystemRoot, swarmId);
  const fromPath = path.join(dir, `${signalId}.json`);
  const toPath = path.join(processedDir(ecosystemRoot, swarmId), `${signalId}.json`);
  if (!fs.existsSync(fromPath)) {
    if (fs.existsSync(toPath)) return { signalId, processedPath: toPath };
    throw new Error(`markProcessed: signal ${signalId} not found`);
  }
  manifestLib.withLock(fromPath, () => {
    fs.renameSync(fromPath, toPath);
  });
  rebuildIndex(ecosystemRoot, swarmId);
  return { signalId, processedPath: toPath };
}

// ─────────────────────────────────────────────────────────────────────────────
// INDEX
// ─────────────────────────────────────────────────────────────────────────────

function rebuildIndex(ecosystemRoot, swarmId) {
  ensureLayout(ecosystemRoot, swarmId);
  const items = listPendingSignals(ecosystemRoot, swarmId);
  const lines = ['# Signals — pending', ''];
  if (items.length === 0) {
    lines.push('_(no pending signals)_');
  } else {
    lines.push('| ID | Type | Repo | From | To | Token |');
    lines.push('|----|------|------|------|----|-------|');
    for (const it of items) {
      lines.push(
        `| ${it.signal_id} | ${it.type} | ${it.repo || '—'} | ${it.from_session} | ${it.to_session || '*'} | ${it.token || '—'} |`
      );
    }
  }
  lines.push('');
  fs.writeFileSync(indexPath(ecosystemRoot, swarmId), lines.join('\n'), 'utf8');
}

module.exports = {
  SIGNALS_DIR,
  PROCESSED_DIR,
  INDEX_FILENAME,
  VALID_TYPES,
  signalsDir,
  processedDir,
  indexPath,
  ensureLayout,
  validateSignal,
  nextSignalId,
  writeSignal,
  readSignal,
  listPendingSignals,
  markProcessed,
  rebuildIndex,
};
