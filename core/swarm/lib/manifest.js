'use strict';

/**
 * Swarm manifest CRUD + structural validation.
 *
 * Mirrors the shape of `core/ecosystem/lib/index.js` and
 * `core/ecosystem/lib/initiative.js`: zero-dependency, hand-rolled
 * structural validator, mkdir-locked writes for race safety. The JSON
 * Schema at `../schema/manifest.schema.json` is the authoritative
 * contract; this validator is its operational counterpart.
 *
 * Locking: we use the same mkdir-based portable lock as
 * `core/ecosystem/scripts/session-append.sh`. `mkdir` is atomic on
 * POSIX filesystems and works across macOS + Linux without flock.
 *
 * Layout on disk:
 *   <ecosystem-root>/swarms/<swarm-id>/
 *     manifest.json        ← this module
 *     board.json           ← lib/board.js
 *     contracts/*.contract.json
 *     inbox/NNNN-<slug>.md + INDEX.md
 *     signals/             ← reserved (Phase 17.5)
 *     tokens/              ← reserved (Phase 17.5)
 *     details/<repo>.json
 *     changes/<id>.md
 */

const fs = require('fs');
const path = require('path');

const SWARMS_DIR = 'swarms';
const MANIFEST_FILENAME = 'manifest.json';
const RESERVED_DIRS = Object.freeze([
  'contracts',
  'inbox',
  'signals',
  'tokens',
  'details',
  'changes',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Locking
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Acquire a mkdir-lock for the duration of `fn`. The lock is bound to a
 * filesystem path (typically the manifest path). Returns whatever `fn`
 * returns. Re-throws fn's exception after releasing the lock.
 *
 * @param {string} filePath  the file being protected
 * @param {() => T} fn       work to do under the lock
 * @returns {T}
 */
function withLock(filePath, fn) {
  const lockDir = `${filePath}.lock`;
  const deadline = Date.now() + 5000; // 5s budget — same as session-append.sh
  while (Date.now() < deadline) {
    try {
      fs.mkdirSync(lockDir);
      try {
        return fn();
      } finally {
        try { fs.rmdirSync(lockDir); } catch (_e) { /* best-effort */ }
      }
    } catch (err) {
      if (err && err.code === 'EEXIST') {
        // contention — short sleep
        const wait = 50;
        const end = Date.now() + wait;
        // busy-wait — keep dependency-free; lock contention is rare
        while (Date.now() < end) { /* spin */ }
        continue;
      }
      throw err;
    }
  }
  throw new Error(`swarm/manifest: could not acquire lock at ${lockDir} within budget`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Path helpers
// ─────────────────────────────────────────────────────────────────────────────

function swarmDir(ecosystemRoot, swarmId) {
  return path.join(ecosystemRoot, SWARMS_DIR, swarmId);
}

function manifestPath(ecosystemRoot, swarmId) {
  return path.join(swarmDir(ecosystemRoot, swarmId), MANIFEST_FILENAME);
}

function ensureSwarmLayout(ecosystemRoot, swarmId) {
  const root = swarmDir(ecosystemRoot, swarmId);
  fs.mkdirSync(root, { recursive: true });
  for (const d of RESERVED_DIRS) {
    fs.mkdirSync(path.join(root, d), { recursive: true });
  }
  return root;
}

// ─────────────────────────────────────────────────────────────────────────────
// ID generators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Next zero-padded swarm id under `<ecosystem-root>/swarms/`. Scans
 * directory names matching `NNNN-<slug>`; returns `NNNN+1-<newSlug>`.
 */
function nextSwarmId(ecosystemRoot, slug) {
  if (typeof slug !== 'string' || !/^[a-z][a-z0-9-]*$/.test(slug)) {
    throw new TypeError(`nextSwarmId: slug must match /^[a-z][a-z0-9-]*$/ (got ${JSON.stringify(slug)})`);
  }
  const dir = path.join(ecosystemRoot, SWARMS_DIR);
  let max = 0;
  if (fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir)) {
      const m = name.match(/^(\d{4})-[a-z][a-z0-9-]*$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > max) max = n;
      }
    }
  }
  const next = String(max + 1).padStart(4, '0');
  return `${next}-${slug}`;
}

/**
 * Generate a saga id. Deterministic given a swarm id + a numeric seed
 * (the seed is the current step counter; tests can pass 0 for
 * reproducibility).
 */
function makeSagaId(swarmId, seed) {
  const s = `${swarmId}-${seed != null ? seed : 0}`;
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return `sg_${hash.toString(36).padStart(6, '0').slice(0, 8)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation — operational counterpart to manifest.schema.json
// ─────────────────────────────────────────────────────────────────────────────

const SLUG = /^[a-z][a-z0-9-]*$/;
const SWARM_ID = /^[0-9]{4}-[a-z][a-z0-9-]*$/;
const SAGA_ID = /^sg_[a-z0-9]{4,16}$/;
const PHASE_SLUG = /^phase-[0-9]+(?:[a-z])?-[a-z][a-z0-9-]*$/;
const SHA_HEX = /^[0-9a-f]{7,40}$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;

const VALID_MODES = ['autopilot', 'checkpoint', 'interactive'];
const VALID_STATUSES = ['running', 'paused', 'complete', 'cancelled', 'failed'];
const VALID_REPO_STATUSES = ['queued', 'running', 'blocked', 'complete', 'failed', 'cancelled'];
const VALID_WAVE_STATUSES = ['queued', 'running', 'complete', 'cancelled'];
const VALID_CONTRACT_KINDS = ['http', 'rpc', 'event', 'library', 'schema', 'other'];
const VALID_AUDIT_EVENTS = [
  'start', 'tell', 'broadcast', 'budget', 'cancel', 'verify',
  'checkpoint', 'complete', 'resume', 'wave-transition',
  'inbox-resolved', 'contract-bump',
];

function validateManifest(obj) {
  const errors = [];
  const push = (p, m) => errors.push({ path: p, message: m });

  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, errors: [{ path: '$', message: 'manifest must be a JSON object' }] };
  }

  // Top-level required fields
  if (typeof obj.swarm_id !== 'string' || !SWARM_ID.test(obj.swarm_id)) {
    push('$.swarm_id', 'must match /^[0-9]{4}-[a-z][a-z0-9-]*$/');
  }
  if (obj.version !== 1) push('$.version', 'must be the integer 1');
  if (typeof obj.saga_id !== 'string' || !SAGA_ID.test(obj.saga_id)) {
    push('$.saga_id', 'must match /^sg_[a-z0-9]{4,16}$/');
  }
  if (!VALID_MODES.includes(obj.mode)) {
    push('$.mode', `must be one of: ${VALID_MODES.join(', ')}`);
  }
  if (typeof obj.initiative !== 'string' || !SLUG.test(obj.initiative)) {
    push('$.initiative', 'must match /^[a-z][a-z0-9-]*$/');
  }
  if (typeof obj.created !== 'string' || !ISO_DATETIME.test(obj.created)) {
    push('$.created', 'must be ISO-8601 date-time');
  }
  if (typeof obj.ecosystem !== 'string' || !SLUG.test(obj.ecosystem)) {
    push('$.ecosystem', 'must match /^[a-z][a-z0-9-]*$/');
  }

  // repos
  if (obj.repos === null || typeof obj.repos !== 'object' || Array.isArray(obj.repos)) {
    push('$.repos', 'must be an object keyed by member id');
  } else {
    const repoKeys = Object.keys(obj.repos);
    if (repoKeys.length === 0) push('$.repos', 'must have at least one repo');
    for (const key of repoKeys) {
      if (!SLUG.test(key)) {
        push(`$.repos["${key}"]`, 'key must match /^[a-z][a-z0-9-]*$/');
        continue;
      }
      const r = obj.repos[key];
      const base = `$.repos.${key}`;
      if (r === null || typeof r !== 'object' || Array.isArray(r)) {
        push(base, 'must be an object');
        continue;
      }
      if (!Number.isInteger(r.wave) || r.wave < 1) {
        push(`${base}.wave`, 'must be a positive integer');
      }
      if (!VALID_REPO_STATUSES.includes(r.status)) {
        push(`${base}.status`, `must be one of: ${VALID_REPO_STATUSES.join(', ')}`);
      }
      if (typeof r.phase_slug !== 'string' || !PHASE_SLUG.test(r.phase_slug)) {
        push(`${base}.phase_slug`, 'must match phase slug pattern');
      }
      if (typeof r.branch !== 'string' || r.branch.length === 0) {
        push(`${base}.branch`, 'required non-empty string');
      }
      if (typeof r.owner !== 'string' || r.owner.length === 0) {
        push(`${base}.owner`, 'required non-empty string');
      }
      if (r.last_seen_sha !== undefined && (typeof r.last_seen_sha !== 'string' || !SHA_HEX.test(r.last_seen_sha))) {
        push(`${base}.last_seen_sha`, 'must be a 7–40 char hex SHA when present');
      }
      if (r.lease_expires_at !== undefined && (typeof r.lease_expires_at !== 'string' || !ISO_DATETIME.test(r.lease_expires_at))) {
        push(`${base}.lease_expires_at`, 'must be ISO-8601 date-time when present');
      }
      if (r.lease_renewed_at !== undefined && (typeof r.lease_renewed_at !== 'string' || !ISO_DATETIME.test(r.lease_renewed_at))) {
        push(`${base}.lease_renewed_at`, 'must be ISO-8601 date-time when present');
      }
      if (r.tokens_budget !== undefined && (!Number.isInteger(r.tokens_budget) || r.tokens_budget < 1)) {
        push(`${base}.tokens_budget`, 'must be a positive integer when present');
      }
    }
  }

  // waves
  if (!Array.isArray(obj.waves) || obj.waves.length === 0) {
    push('$.waves', 'required non-empty array');
  } else {
    const allRepoIds = new Set(
      obj.repos && typeof obj.repos === 'object' && !Array.isArray(obj.repos)
        ? Object.keys(obj.repos) : []
    );
    const seenIndices = new Set();
    obj.waves.forEach((w, i) => {
      const base = `$.waves[${i}]`;
      if (w === null || typeof w !== 'object' || Array.isArray(w)) {
        push(base, 'must be an object');
        return;
      }
      if (!Number.isInteger(w.index) || w.index < 1) {
        push(`${base}.index`, 'must be a positive integer');
      } else {
        if (seenIndices.has(w.index)) push(`${base}.index`, 'duplicate wave index');
        seenIndices.add(w.index);
      }
      if (!Array.isArray(w.repos) || w.repos.length === 0) {
        push(`${base}.repos`, 'required non-empty array');
      } else {
        w.repos.forEach((rid, j) => {
          if (typeof rid !== 'string' || !SLUG.test(rid)) {
            push(`${base}.repos[${j}]`, 'must be a slug');
          } else if (!allRepoIds.has(rid)) {
            push(`${base}.repos[${j}]`, `references unknown repo "${rid}"`);
          }
        });
      }
      if (w.status !== undefined && !VALID_WAVE_STATUSES.includes(w.status)) {
        push(`${base}.status`, `must be one of: ${VALID_WAVE_STATUSES.join(', ')}`);
      }
    });
  }

  // sessions (optional)
  if (obj.sessions !== undefined) {
    if (!Array.isArray(obj.sessions)) {
      push('$.sessions', 'must be array when present');
    } else {
      obj.sessions.forEach((s, i) => {
        const base = `$.sessions[${i}]`;
        if (s === null || typeof s !== 'object') {
          push(base, 'must be an object');
          return;
        }
        if (typeof s.session_id !== 'string' || s.session_id.length === 0) {
          push(`${base}.session_id`, 'required non-empty string');
        }
        if (typeof s.first_seen !== 'string' || !ISO_DATETIME.test(s.first_seen)) {
          push(`${base}.first_seen`, 'required ISO-8601 date-time');
        }
      });
    }
  }

  // contracts (optional)
  if (obj.contracts !== undefined) {
    if (!Array.isArray(obj.contracts)) {
      push('$.contracts', 'must be array when present');
    } else {
      obj.contracts.forEach((c, i) => {
        const base = `$.contracts[${i}]`;
        if (c === null || typeof c !== 'object') {
          push(base, 'must be an object');
          return;
        }
        if (typeof c.surface !== 'string' || !SLUG.test(c.surface)) {
          push(`${base}.surface`, 'must be a slug');
        }
        if (typeof c.owner !== 'string' || !SLUG.test(c.owner)) {
          push(`${base}.owner`, 'must be a slug');
        }
        if (!Array.isArray(c.consumers) || c.consumers.some((s) => typeof s !== 'string' || !SLUG.test(s))) {
          push(`${base}.consumers`, 'must be array of slugs');
        }
        if (!Number.isInteger(c.version) || c.version < 1) {
          push(`${base}.version`, 'must be a positive integer');
        }
      });
    }
  }

  // audit (optional)
  if (obj.audit !== undefined) {
    if (!Array.isArray(obj.audit)) {
      push('$.audit', 'must be array when present');
    } else {
      obj.audit.forEach((a, i) => {
        const base = `$.audit[${i}]`;
        if (a === null || typeof a !== 'object') { push(base, 'must be an object'); return; }
        if (typeof a.ts !== 'string' || !ISO_DATETIME.test(a.ts)) push(`${base}.ts`, 'must be ISO-8601 date-time');
        if (typeof a.actor !== 'string' || a.actor.length === 0) push(`${base}.actor`, 'required non-empty string');
        if (!VALID_AUDIT_EVENTS.includes(a.event)) push(`${base}.event`, `must be one of: ${VALID_AUDIT_EVENTS.join(', ')}`);
      });
    }
  }

  // status (optional, derived but persisted)
  if (obj.status !== undefined && !VALID_STATUSES.includes(obj.status)) {
    push('$.status', `must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────────────

function loadManifest(ecosystemRoot, swarmId) {
  const file = manifestPath(ecosystemRoot, swarmId);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new SyntaxError(`swarm/manifest: invalid JSON in ${file}: ${err.message}`);
  }
  return parsed;
}

/**
 * Initial write. Validates and writes atomically under a mkdir-lock.
 * Throws on validation failure.
 */
function writeManifest(ecosystemRoot, swarmId, manifest) {
  const v = validateManifest(manifest);
  if (!v.ok) {
    const summary = v.errors.map((e) => `  ${e.path}: ${e.message}`).join('\n');
    throw new Error(`swarm/manifest: validation failed:\n${summary}`);
  }
  ensureSwarmLayout(ecosystemRoot, swarmId);
  const file = manifestPath(ecosystemRoot, swarmId);
  return withLock(file, () => {
    fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    return file;
  });
}

/**
 * Read-modify-write under a mkdir-lock. `mutate` receives the current
 * manifest object and may mutate it in-place or return a fresh object.
 * Re-validates before persisting.
 */
function updateManifest(ecosystemRoot, swarmId, mutate) {
  const file = manifestPath(ecosystemRoot, swarmId);
  if (!fs.existsSync(file)) {
    throw new Error(`swarm/manifest: no manifest at ${file}`);
  }
  return withLock(file, () => {
    const current = JSON.parse(fs.readFileSync(file, 'utf8'));
    const result = mutate(current);
    const next = result === undefined ? current : result;
    const v = validateManifest(next);
    if (!v.ok) {
      const summary = v.errors.map((e) => `  ${e.path}: ${e.message}`).join('\n');
      throw new Error(`swarm/manifest: post-mutate validation failed:\n${summary}`);
    }
    fs.writeFileSync(file, JSON.stringify(next, null, 2) + '\n', 'utf8');
    return next;
  });
}

/**
 * Append an entry to the audit array atomically.
 */
function appendAudit(ecosystemRoot, swarmId, entry) {
  return updateManifest(ecosystemRoot, swarmId, (m) => {
    if (!Array.isArray(m.audit)) m.audit = [];
    m.audit.push(entry);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Listing
// ─────────────────────────────────────────────────────────────────────────────

function listSwarms(ecosystemRoot) {
  const dir = path.join(ecosystemRoot, SWARMS_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^[0-9]{4}-[a-z][a-z0-9-]*$/.test(e.name))
    .map((e) => e.name)
    .sort();
}

module.exports = {
  SWARMS_DIR,
  MANIFEST_FILENAME,
  RESERVED_DIRS,
  withLock,
  swarmDir,
  manifestPath,
  ensureSwarmLayout,
  nextSwarmId,
  makeSagaId,
  validateManifest,
  loadManifest,
  writeManifest,
  updateManifest,
  appendAudit,
  listSwarms,
};
