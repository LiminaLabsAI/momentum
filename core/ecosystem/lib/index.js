'use strict';

/**
 * Ecosystem helpers — pure, dependency-free.
 *
 * Provides four building blocks the rest of Phase 9 depends on:
 *
 *   - findRoot(startPath)        — locate the ecosystem root by walking up
 *   - loadManifest(rootPath)     — read + parse ecosystem.json
 *   - listMembers(manifest)      — convenience accessor
 *   - validateManifest(obj)      — minimal schema check (no external deps)
 *
 * Schema validation is deliberately hand-rolled: momentum has a
 * zero-dependency posture for the CLI (no ajv, no joi). The check
 * is structural — type + required fields — and surfaces the first
 * violation with a human-readable path. The full JSON Schema in
 * `../schema/ecosystem.schema.json` remains the authoritative
 * contract; this validator is its operational counterpart.
 */

const fs = require('fs');
const path = require('path');

// Default upper bound on parent-directory walk-up. Honored by both this
// module's findRoot and core/ecosystem/scripts/session-append.sh. The
// authoritative export lives in core/ecosystem/lib/state.js as of
// Phase 10 (ENH-022); we keep MAX_WALK_DEPTH as a backward-compat alias.
const MAX_PARENT_WALK_DEFAULT = 5;
const MAX_WALK_DEPTH = MAX_PARENT_WALK_DEFAULT;
const MANIFEST_FILENAME = 'ecosystem.json';

function resolveMaxParentWalk() {
  const raw = process.env.MOMENTUM_MAX_PARENT_WALK;
  if (raw === undefined || raw === '') return MAX_PARENT_WALK_DEFAULT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return MAX_PARENT_WALK_DEFAULT;
  return Math.floor(n);
}

// Per-process cache: absolute-startPath-prefix → resolved root (or null)
const rootCache = new Map();

/**
 * Walk up from `startPath` looking for a directory containing
 * `ecosystem.json`. Returns the absolute root path or null.
 * Bounded to `resolveMaxParentWalk()` parents (default 5, override via
 * the `MOMENTUM_MAX_PARENT_WALK` env var) so a misconfigured caller
 * can't scan the entire filesystem.
 *
 * Memoized: repeated calls with paths under the same root return
 * instantly. Cache key is the absolute starting path.
 */
function findRoot(startPath) {
  if (typeof startPath !== 'string' || startPath.length === 0) {
    return null;
  }
  const abs = path.resolve(startPath);
  if (rootCache.has(abs)) {
    return rootCache.get(abs);
  }
  const maxDepth = resolveMaxParentWalk();
  let current = abs;
  for (let i = 0; i <= maxDepth; i++) {
    const candidate = path.join(current, MANIFEST_FILENAME);
    let stat;
    try {
      stat = fs.statSync(candidate);
    } catch (_err) {
      stat = null;
    }
    if (stat && stat.isFile()) {
      rootCache.set(abs, current);
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break; // reached filesystem root
    current = parent;
  }
  rootCache.set(abs, null);
  return null;
}

/**
 * Read + parse the manifest at `rootPath/ecosystem.json`.
 * Throws on missing file or invalid JSON; caller decides recovery.
 */
function loadManifest(rootPath) {
  if (typeof rootPath !== 'string' || rootPath.length === 0) {
    throw new TypeError('loadManifest: rootPath must be a non-empty string');
  }
  const file = path.join(rootPath, MANIFEST_FILENAME);
  const raw = fs.readFileSync(file, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new SyntaxError(`Invalid JSON in ${file}: ${err.message}`);
  }
  return parsed;
}

/**
 * Returns the members array, defaulting to [] if absent.
 * Does not validate; assumes caller already passed validateManifest.
 */
function listMembers(manifest) {
  if (!manifest || typeof manifest !== 'object') return [];
  return Array.isArray(manifest.members) ? manifest.members : [];
}

/**
 * Find a member by id. Returns the member object or null.
 */
function findMember(manifest, id) {
  return listMembers(manifest).find((m) => m && m.id === id) || null;
}

/**
 * Hand-rolled structural validation. Returns
 *   { ok: true } on success
 *   { ok: false, errors: [{ path, message }] } on failure.
 *
 * Catches every issue (does not bail on first); the caller can render
 * a useful error report. Authoritative schema is
 * `core/ecosystem/schema/ecosystem.schema.json` — keep them in sync.
 */
function validateManifest(obj) {
  const errors = [];
  const slug = /^[a-z][a-z0-9-]*$/;

  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, errors: [{ path: '$', message: 'manifest must be a JSON object' }] };
  }

  // name
  if (typeof obj.name !== 'string' || obj.name.length === 0) {
    errors.push({ path: '$.name', message: 'required non-empty string' });
  } else if (!slug.test(obj.name)) {
    errors.push({ path: '$.name', message: 'must match /^[a-z][a-z0-9-]*$/' });
  } else if (obj.name.length > 64) {
    errors.push({ path: '$.name', message: 'must be at most 64 chars' });
  }

  // version
  if (obj.version !== 1) {
    errors.push({ path: '$.version', message: 'must be the integer 1 (no other schema version supported)' });
  }

  // created — optional, must be a valid ISO date if present
  if (obj.created !== undefined) {
    if (typeof obj.created !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(obj.created)) {
      errors.push({ path: '$.created', message: 'must be an ISO-8601 date (YYYY-MM-DD)' });
    }
  }

  // members
  if (!Array.isArray(obj.members)) {
    errors.push({ path: '$.members', message: 'required array' });
  } else {
    const seenIds = new Set();
    obj.members.forEach((m, i) => {
      const base = `$.members[${i}]`;
      if (m === null || typeof m !== 'object' || Array.isArray(m)) {
        errors.push({ path: base, message: 'must be an object' });
        return;
      }
      if (typeof m.id !== 'string' || m.id.length === 0) {
        errors.push({ path: `${base}.id`, message: 'required non-empty string' });
      } else {
        if (!slug.test(m.id)) errors.push({ path: `${base}.id`, message: 'must match slug pattern' });
        if (m.id.length > 64) errors.push({ path: `${base}.id`, message: 'must be at most 64 chars' });
        if (seenIds.has(m.id)) errors.push({ path: `${base}.id`, message: `duplicate member id "${m.id}"` });
        seenIds.add(m.id);
      }
      if (typeof m.path !== 'string' || m.path.length === 0) {
        errors.push({ path: `${base}.path`, message: 'required non-empty string' });
      }
      const validRoles = ['platform', 'client', 'library', 'infra', 'bench', 'other'];
      if (!validRoles.includes(m.role)) {
        errors.push({ path: `${base}.role`, message: `must be one of: ${validRoles.join(', ')}` });
      }
      if (m.owns !== undefined && !isArrayOfStrings(m.owns)) {
        errors.push({ path: `${base}.owns`, message: 'must be array of strings' });
      }
      if (m.consumes !== undefined && !isArrayOfStrings(m.consumes)) {
        errors.push({ path: `${base}.consumes`, message: 'must be array of strings' });
      }
    });
  }

  // dependencies — optional
  if (obj.dependencies !== undefined) {
    if (!Array.isArray(obj.dependencies)) {
      errors.push({ path: '$.dependencies', message: 'must be array if present' });
    } else {
      const memberIds = new Set(
        Array.isArray(obj.members) ? obj.members.map((m) => m && m.id).filter(Boolean) : [],
      );
      const validKinds = ['api-contract', 'library', 'deploy', 'build-time', 'other'];
      obj.dependencies.forEach((d, i) => {
        const base = `$.dependencies[${i}]`;
        if (d === null || typeof d !== 'object' || Array.isArray(d)) {
          errors.push({ path: base, message: 'must be an object' });
          return;
        }
        if (typeof d.from !== 'string' || !memberIds.has(d.from)) {
          errors.push({ path: `${base}.from`, message: 'must reference a known member id' });
        }
        if (typeof d.to !== 'string' || !memberIds.has(d.to)) {
          errors.push({ path: `${base}.to`, message: 'must reference a known member id' });
        }
        if (!validKinds.includes(d.kind)) {
          errors.push({ path: `${base}.kind`, message: `must be one of: ${validKinds.join(', ')}` });
        }
      });
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function isArrayOfStrings(v) {
  return Array.isArray(v) && v.every((s) => typeof s === 'string');
}

/**
 * Clear the findRoot memo cache. Tests use this; production code
 * doesn't need to.
 */
function _clearRootCache() {
  rootCache.clear();
}

module.exports = {
  MAX_WALK_DEPTH,
  MAX_PARENT_WALK_DEFAULT,
  MANIFEST_FILENAME,
  resolveMaxParentWalk,
  findRoot,
  loadManifest,
  listMembers,
  findMember,
  validateManifest,
  _clearRootCache,
};
