'use strict';

/**
 * Phase-brief frontmatter — swarm-context extension.
 *
 * A solo (non-swarm) phase brief has NO frontmatter — it's plain
 * markdown beginning with `# Phase N — ...`. A swarm-member phase
 * brief MAY have an optional YAML frontmatter block declaring its
 * swarm context. The fields are:
 *
 *   swarm: NNNN-<slug>            # swarm directory name
 *   wave: <integer>               # 1-based wave index
 *   initiative: <slug>            # /eco/initiatives/<NNNN>-<slug>.md
 *   claimed_by_session: <uuid>    # current owning session
 *
 * All four are optional individually — a brief with `swarm:` but no
 * `wave:` is malformed and validation fails. Solo briefs (no
 * frontmatter at all) are byte-shape-compatible with v0.19.0.
 *
 * This module is intentionally narrow: parseSwarmFrontmatter,
 * serializeSwarmFrontmatter, validateSwarmFrontmatter,
 * injectSwarmFrontmatter (rewrites an existing brief atomically). It
 * does NOT duplicate the broader markdown parsing already in
 * ecosystem/lib/initiative.js — it's a focused helper for the
 * supervisor recipe + /validate.
 */

const fs = require('fs');

const FENCE = '---';

const SLUG = /^[a-z][a-z0-9-]*$/;
const SWARM_ID = /^[0-9]{4}-[a-z][a-z0-9-]*$/;

const SWARM_FIELDS = Object.freeze([
  'swarm',
  'wave',
  'initiative',
  'claimed_by_session',
]);

function parseSwarmFrontmatter(content) {
  if (typeof content !== 'string') {
    return { frontmatter: null, body: content == null ? '' : String(content) };
  }
  const trimmed = content.replace(/^﻿/, '');
  if (!trimmed.startsWith(FENCE)) {
    return { frontmatter: null, body: content };
  }
  const lines = trimmed.split('\n');
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === FENCE) { end = i; break; }
  }
  if (end === -1) return { frontmatter: null, body: content };
  const fm = {};
  for (const raw of lines.slice(1, end)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (/^-?\d+$/.test(value)) {
      value = parseInt(value, 10);
    }
    fm[key] = value;
  }
  const body = lines.slice(end + 1).join('\n').replace(/^\n+/, '');
  return { frontmatter: fm, body };
}

function serializeSwarmFrontmatter(fm) {
  const lines = [FENCE];
  for (const key of SWARM_FIELDS) {
    if (fm[key] === undefined || fm[key] === null) continue;
    const v = fm[key];
    if (typeof v === 'number') {
      lines.push(`${key}: ${v}`);
    } else {
      const s = String(v);
      lines.push(`${key}: ${s}`);
    }
  }
  lines.push(FENCE);
  return lines.join('\n') + '\n';
}

function validateSwarmFrontmatter(fm) {
  const errors = [];
  if (fm == null) return { ok: true }; // solo brief — no frontmatter required
  if (typeof fm !== 'object' || Array.isArray(fm)) {
    return { ok: false, errors: [{ path: '$', message: 'frontmatter must be an object' }] };
  }

  // If ANY swarm field is present, swarm + wave are both required (the
  // pair locks the brief into a swarm context).
  const present = SWARM_FIELDS.filter((k) => fm[k] !== undefined);
  const anyPresent = present.length > 0;
  if (anyPresent) {
    if (typeof fm.swarm !== 'string' || !SWARM_ID.test(fm.swarm)) {
      errors.push({ path: '$.swarm', message: 'required when any swarm field is set; must match NNNN-<slug>' });
    }
    if (!Number.isInteger(fm.wave) || fm.wave < 1) {
      errors.push({ path: '$.wave', message: 'required when any swarm field is set; positive integer' });
    }
  }

  if (fm.initiative !== undefined) {
    if (typeof fm.initiative !== 'string' || !SLUG.test(fm.initiative)) {
      errors.push({ path: '$.initiative', message: 'must be a slug' });
    }
  }
  if (fm.claimed_by_session !== undefined) {
    if (typeof fm.claimed_by_session !== 'string' || fm.claimed_by_session.length === 0) {
      errors.push({ path: '$.claimed_by_session', message: 'must be a non-empty string' });
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/**
 * Atomically inject (or update) swarm frontmatter in an existing brief
 * file. Preserves the body verbatim. Validates the merged frontmatter
 * before writing.
 *
 * If the brief has no frontmatter, prepends a new block. If it already
 * has frontmatter, merges (new keys override existing).
 */
function injectSwarmFrontmatter(filePath, swarmFields) {
  if (typeof filePath !== 'string' || filePath.length === 0) {
    throw new TypeError('injectSwarmFrontmatter: filePath required');
  }
  const exists = fs.existsSync(filePath);
  const raw = exists ? fs.readFileSync(filePath, 'utf8') : '';
  const { frontmatter, body } = parseSwarmFrontmatter(raw);
  const merged = Object.assign({}, frontmatter || {}, swarmFields);
  const v = validateSwarmFrontmatter(merged);
  if (!v.ok) {
    const summary = v.errors.map((e) => `  ${e.path}: ${e.message}`).join('\n');
    throw new Error(`injectSwarmFrontmatter: validation failed:\n${summary}`);
  }
  const fmBlock = serializeSwarmFrontmatter(merged);
  fs.writeFileSync(filePath, fmBlock + body, 'utf8');
  return merged;
}

module.exports = {
  SWARM_FIELDS,
  parseSwarmFrontmatter,
  serializeSwarmFrontmatter,
  validateSwarmFrontmatter,
  injectSwarmFrontmatter,
};
