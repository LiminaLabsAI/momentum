'use strict';

/**
 * momentum git-hook helper — cross-repo routing detection (Phase 31b G2, ADR-0017).
 *
 * Produces the routing message shown by BOTH enforcement layers (E1):
 *   - the `post-commit` banner (git-native, agent-independent)
 *   - the `cross-repo-gate.sh` PreToolUse nudge (fires before the edit)
 *
 * WHY THIS IS ANOTHER SELF-CONTAINED FILE
 * ---------------------------------------
 * Third time in this arc, so worth stating plainly rather than rediscovering:
 * an installed project receives NO copy of momentum's `core/`. Anything a hook
 * needs must travel with the hook. `core/git-hooks/eco-event.js` (31a) and
 * `core/ecosystem/lib/orient.js` (31b G1) hit the same wall.
 *
 * This file is therefore node-builtins-only, ships into `.githooks/` beside
 * `eco-event.js`, and resolves `orient.js` LAZILY through a candidate list so
 * it degrades to a detail-free message rather than throwing when orient is not
 * installed. TD-012 tracks consolidating this shipped-runtime story.
 *
 * The coverage logic here is a deliberate minimal mirror of
 * `core/ecosystem/lib/detect.js`, fenced by a parity test — the same discipline
 * applied to the eco-event.js/fragments duplication in 31a.
 */

const fs = require('fs');
const path = require('path');

const EVENTS_VIEW = 'eco-events';
const DEFAULT_WINDOW_HOURS = 24;

/** Lazily locate orient.js wherever this file happens to be installed. */
function loadOrient() {
  const here = __dirname;
  const candidates = [
    path.join(here, 'orient.js'),                        // co-installed
    path.join(here, '..', 'scripts', 'orient.js'),       // .githooks/ → scripts/
    path.join(here, 'orient.js'),
    path.join(here, '..', 'ecosystem', 'lib', 'orient.js'),
    path.join(here, '..', '..', 'ecosystem', 'lib', 'orient.js'),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return require(c);
    } catch (_e) { /* try next */ }
  }
  return null;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_e) {
    return null;
  }
}

/** Members with recorded events inside the window (mirrors detect.touchedMembers). */
function touchedMembers(ecosystemRoot, opts) {
  opts = opts || {};
  const manifest = opts.manifest || readJson(path.join(ecosystemRoot, 'ecosystem.json'));
  const cfgHours = manifest && manifest.config && manifest.config.detect_window_hours;
  const hours = opts.hours
    || (typeof cfgHours === 'number' && cfgHours > 0 ? cfgHours : DEFAULT_WINDOW_HOURS);
  const now = opts.now ? new Date(opts.now).getTime() : Date.now();
  const cutoff = now - hours * 3600 * 1000;

  const seen = new Set(Array.isArray(opts.extra) ? opts.extra.filter(Boolean) : []);
  const dir = path.join(ecosystemRoot, '.momentum', 'team', EVENTS_VIEW);
  let names = [];
  try { names = fs.readdirSync(dir); } catch (_e) { names = []; }

  for (const n of names) {
    if (!n.endsWith('.json')) continue;
    const frag = readJson(path.join(dir, n));
    if (!frag || !frag.payload || !frag.payload.member) continue;
    if (opts.actor && frag.actor !== opts.actor) continue;
    const ts = new Date(frag.ts).getTime();
    if (!Number.isFinite(ts) || ts < cutoff) continue;
    seen.add(frag.payload.member);
  }
  return [...seen].sort();
}

/** Member sets of every in-progress initiative (mirrors detect.openInitiatives). */
function openInitiativeMembers(ecosystemRoot) {
  const dir = path.join(ecosystemRoot, 'initiatives');
  let names = [];
  try { names = fs.readdirSync(dir); } catch (_e) { return []; }

  const out = [];
  for (const name of names.sort()) {
    if (!/^\d{4}-.*\.md$/.test(name)) continue;
    let body = '';
    try { body = fs.readFileSync(path.join(dir, name), 'utf8'); } catch (_e) { continue; }
    if (!body.startsWith('---')) continue;
    const end = body.indexOf('\n---', 3);
    if (end === -1) continue;
    const fm = body.slice(3, end);

    if (!/^status:\s*in-progress\s*$/m.test(fm)) continue;
    const slug = (fm.match(/^slug:\s*"?([a-z][a-z0-9-]*)"?\s*$/m) || [])[1];
    if (!slug) continue;

    const members = new Set();
    const repos = (fm.match(/^repos:\s*\[([^\]]*)\]/m) || [])[1];
    if (repos) {
      for (const r of repos.split(',')) {
        const v = r.trim().replace(/^["']|["']$/g, '');
        if (v) members.add(v);
      }
    }
    const contrib = (fm.match(/^contributions:\s*\[([^\]]*)\]/m) || [])[1];
    if (contrib) {
      for (const c of contrib.split(',')) {
        const v = c.trim().replace(/^["']|["']$/g, '');
        const m = v.split(':')[0];
        if (m) members.add(m);
      }
    }
    out.push({ slug, members });
  }
  return out;
}

/**
 * The routing question. Returns
 * `{ crossRepo, covered, shouldRoute, members, initiative }`.
 */
function detect(ecosystemRoot, opts) {
  const members = touchedMembers(ecosystemRoot, opts);
  const crossRepo = members.length >= 2;
  if (!crossRepo) {
    return { crossRepo: false, covered: false, shouldRoute: false, members, initiative: null };
  }
  for (const init of openInitiativeMembers(ecosystemRoot)) {
    if (members.every((m) => init.members.has(m))) {
      return { crossRepo: true, covered: true, shouldRoute: false, members, initiative: init.slug };
    }
  }
  return { crossRepo: true, covered: false, shouldRoute: true, members, initiative: null };
}

/**
 * The routing message. `focus` is the member being entered right now (the
 * PreToolUse case) — its open P0/P1 items are surfaced, which is what turns
 * "this is cross-repo work" into something worth reading (AC-4).
 */
function routingMessage(ecosystemRoot, result, focus) {
  const lines = [];
  lines.push(`⚠ Cross-repo work with no initiative: ${result.members.join(' + ')}`);

  if (focus) {
    const orient = loadOrient();
    if (orient) {
      try {
        const manifest = readJson(path.join(ecosystemRoot, 'ecosystem.json')) || {};
        const member = (manifest.members || []).find((m) => m && m.id === focus);
        if (member) {
          const summary = orient.orientMember(ecosystemRoot, member);
          for (const l of orient.memberBrief(summary)) lines.push(`  ${l}`);
        }
      } catch (_e) { /* detail is a bonus, never a requirement */ }
    }
  }

  lines.push('  → Run /brainstorm-initiative to open one before going further.');
  lines.push('    (Cross-repo work belongs to an initiative — see ADR-0016.)');
  return lines;
}

module.exports = {
  EVENTS_VIEW,
  DEFAULT_WINDOW_HOURS,
  loadOrient,
  touchedMembers,
  openInitiativeMembers,
  detect,
  routingMessage,
};
