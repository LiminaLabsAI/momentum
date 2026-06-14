'use strict';

/**
 * Swarm transfer tokens.
 *
 * Phase 17.5 portability — opaque tokens for `/swarm focus` and
 * `/swarm join`. Each token is a small JSON file at
 * `<eco>/swarms/<id>/tokens/<token>.json`. Single-use: `consumeToken`
 * deletes on read.
 *
 * Shape:
 *   {
 *     token: "<16-hex>",
 *     version: 1,
 *     kind: "focus" | "join",
 *     issued_by: "<session-id>",
 *     issued_at: "<ISO ts>",
 *     expires_at: "<ISO ts>",
 *     target_repo?: "<slug>",     // required for kind=focus
 *     swarm_id?: "<NNNN-slug>"    // required for kind=join (= containing swarm)
 *   }
 *
 * Tokens are NOT secrets in the cryptographic sense — they're
 * single-attempt short-lived strings on the local filesystem, used to
 * avoid embedding session UUIDs in spawn directives the user copy-pastes.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const manifestLib = require('./manifest');

const TOKENS_DIR = 'tokens';
const VALID_KINDS = Object.freeze(['focus', 'join']);
const TOKEN_HEX = /^[0-9a-f]{16}$/;
const SLUG = /^[a-z][a-z0-9-]*$/;
const SWARM_ID = /^[0-9]{4}-[a-z][a-z0-9-]*$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;

const DEFAULT_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function tokensDir(ecosystemRoot, swarmId) {
  return path.join(manifestLib.swarmDir(ecosystemRoot, swarmId), TOKENS_DIR);
}

function tokenPath(ecosystemRoot, swarmId, token) {
  return path.join(tokensDir(ecosystemRoot, swarmId), `${token}.json`);
}

function ensureLayout(ecosystemRoot, swarmId) {
  manifestLib.ensureSwarmLayout(ecosystemRoot, swarmId);
}

function newTokenString() {
  return crypto.randomBytes(8).toString('hex');
}

function isoFromMs(ms) {
  return new Date(ms).toISOString();
}

function nowMsFromIso(iso) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) {
    throw new TypeError(`tokens: invalid ISO timestamp ${JSON.stringify(iso)}`);
  }
  return t;
}

function validateToken(obj) {
  const errors = [];
  const push = (p, m) => errors.push({ path: p, message: m });

  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, errors: [{ path: '$', message: 'token must be a JSON object' }] };
  }
  if (typeof obj.token !== 'string' || !TOKEN_HEX.test(obj.token)) {
    push('$.token', 'must be 16-hex');
  }
  if (obj.version !== 1) push('$.version', 'must be 1');
  if (!VALID_KINDS.includes(obj.kind)) {
    push('$.kind', `must be one of: ${VALID_KINDS.join(', ')}`);
  }
  if (typeof obj.issued_by !== 'string' || obj.issued_by.length === 0) {
    push('$.issued_by', 'required non-empty string');
  }
  if (typeof obj.issued_at !== 'string' || !ISO_DATETIME.test(obj.issued_at)) {
    push('$.issued_at', 'required ISO-8601 date-time');
  }
  if (typeof obj.expires_at !== 'string' || !ISO_DATETIME.test(obj.expires_at)) {
    push('$.expires_at', 'required ISO-8601 date-time');
  }
  if (obj.kind === 'focus') {
    if (typeof obj.target_repo !== 'string' || !SLUG.test(obj.target_repo)) {
      push('$.target_repo', 'required slug for kind=focus');
    }
  }
  if (obj.kind === 'join') {
    if (typeof obj.swarm_id !== 'string' || !SWARM_ID.test(obj.swarm_id)) {
      push('$.swarm_id', 'required swarm-id for kind=join');
    }
  }
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/**
 * Issue a token and persist it. Returns the full token record.
 *
 * @param {object} args
 * @param {string} args.ecosystemRoot
 * @param {string} args.swarmId
 * @param {'focus'|'join'} args.kind
 * @param {string} args.issuedBy           session id
 * @param {string} args.nowIso             ISO timestamp
 * @param {string} [args.targetRepo]       required for kind=focus
 * @param {string} [args.targetSwarmId]    required for kind=join; defaults to swarmId
 * @param {number} [args.expiresInMs]      default 1 hour
 */
function writeToken(args) {
  const {
    ecosystemRoot, swarmId, kind, issuedBy, nowIso,
    targetRepo, targetSwarmId, expiresInMs = DEFAULT_EXPIRY_MS,
  } = args;
  ensureLayout(ecosystemRoot, swarmId);
  const token = newTokenString();
  const issuedMs = nowMsFromIso(nowIso);
  const record = {
    token,
    version: 1,
    kind,
    issued_by: issuedBy,
    issued_at: nowIso,
    expires_at: isoFromMs(issuedMs + expiresInMs),
  };
  if (kind === 'focus') record.target_repo = targetRepo;
  if (kind === 'join') record.swarm_id = targetSwarmId || swarmId;

  const v = validateToken(record);
  if (!v.ok) {
    const summary = v.errors.map((e) => `  ${e.path}: ${e.message}`).join('\n');
    throw new Error(`writeToken: validation failed:\n${summary}`);
  }
  const file = tokenPath(ecosystemRoot, swarmId, token);
  manifestLib.withLock(file, () => {
    fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n', 'utf8');
  });
  return record;
}

/**
 * Read a token without consuming it. Returns null if missing.
 * Validates and surfaces expiry.
 */
function readToken(ecosystemRoot, swarmId, token, nowIso) {
  const file = tokenPath(ecosystemRoot, swarmId, token);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8');
  const record = JSON.parse(raw);
  const v = validateToken(record);
  if (!v.ok) {
    const summary = v.errors.map((e) => `  ${e.path}: ${e.message}`).join('\n');
    throw new Error(`readToken: invalid token at ${file}:\n${summary}`);
  }
  const expired = nowMsFromIso(nowIso) > nowMsFromIso(record.expires_at);
  return { ...record, expired };
}

/**
 * Read and delete a token in one mkdir-locked step. Throws if the
 * token does not exist or is expired.
 */
function consumeToken(ecosystemRoot, swarmId, token, nowIso) {
  const file = tokenPath(ecosystemRoot, swarmId, token);
  if (!fs.existsSync(file)) {
    throw new Error(`consumeToken: token ${token} not found in swarm ${swarmId}`);
  }
  return manifestLib.withLock(file, () => {
    const raw = fs.readFileSync(file, 'utf8');
    const record = JSON.parse(raw);
    const v = validateToken(record);
    if (!v.ok) {
      const summary = v.errors.map((e) => `  ${e.path}: ${e.message}`).join('\n');
      throw new Error(`consumeToken: invalid token at ${file}:\n${summary}`);
    }
    if (nowMsFromIso(nowIso) > nowMsFromIso(record.expires_at)) {
      throw new Error(`consumeToken: token ${token} expired at ${record.expires_at}`);
    }
    fs.unlinkSync(file);
    return record;
  });
}

/**
 * Sweep expired tokens. Returns the list of removed token strings.
 */
function purgeExpired(ecosystemRoot, swarmId, nowIso) {
  ensureLayout(ecosystemRoot, swarmId);
  const dir = tokensDir(ecosystemRoot, swarmId);
  const removed = [];
  const nowMs = nowMsFromIso(nowIso);
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.json')) continue;
    const file = path.join(dir, name);
    try {
      const record = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (nowMs > nowMsFromIso(record.expires_at)) {
        fs.unlinkSync(file);
        removed.push(record.token);
      }
    } catch (_e) {
      // skip malformed files
    }
  }
  return removed;
}

/**
 * List all current (non-expired) tokens. Read-only.
 */
function listTokens(ecosystemRoot, swarmId, nowIso) {
  ensureLayout(ecosystemRoot, swarmId);
  const dir = tokensDir(ecosystemRoot, swarmId);
  const nowMs = nowMsFromIso(nowIso);
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.json')) continue;
    const file = path.join(dir, name);
    try {
      const record = JSON.parse(fs.readFileSync(file, 'utf8'));
      const expired = nowMs > nowMsFromIso(record.expires_at);
      out.push({ ...record, expired });
    } catch (_e) {
      // skip
    }
  }
  out.sort((a, b) => (a.issued_at < b.issued_at ? -1 : 1));
  return out;
}

module.exports = {
  TOKENS_DIR,
  VALID_KINDS,
  DEFAULT_EXPIRY_MS,
  tokensDir,
  tokenPath,
  ensureLayout,
  newTokenString,
  validateToken,
  writeToken,
  readToken,
  consumeToken,
  purgeExpired,
  listTokens,
};
