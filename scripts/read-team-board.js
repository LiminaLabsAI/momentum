#!/usr/bin/env node
'use strict';

/**
 * Sample THIRD-PARTY reader of momentum's published coordination contract
 * (ADR-0014 `core/team/contract`; ecosystem extension ADR-0015).
 *
 * This is a standalone example: a dashboard / CI / bot can read momentum's
 * git-native team state WITHOUT momentum installed — it depends only on Node
 * builtins + `git`, and only touches the two PUBLISHED surfaces:
 *
 *   1. Committed per-actor fragments:  .momentum/team/<view>/<actor>-<seq>-<kind>.json
 *   2. Coordination refs:              refs/momentum/{claims,version,phase,id,queue,leases}/<key>
 *      (each ref = an empty-tree commit whose message is the JSON payload)
 *
 * It deliberately re-implements the fold instead of importing momentum, to prove
 * the contract is genuinely consumable. Run:
 *
 *   node scripts/read-team-board.js [repo-dir] [--json]
 *
 * Copy this file into your own tooling and adapt as needed.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return r.status === 0 ? r.stdout : null;
}

// ── 1. Fragments ────────────────────────────────────────────────────────────

/** Read every fragment JSON in a view dir, stable-sorted by (ts, actor, seq). */
function readView(repo, view) {
  const dir = path.join(repo, '.momentum', 'team', view);
  let names;
  try { names = fs.readdirSync(dir); } catch { return []; }
  const out = [];
  for (const n of names) {
    if (!n.endsWith('.json')) continue;
    try { out.push(JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8'))); } catch { /* skip */ }
  }
  out.sort((a, b) =>
    (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0) ||
    (a.actor < b.actor ? -1 : a.actor > b.actor ? 1 : 0) ||
    (a.seq - b.seq));
  return out;
}

/** Fold to the latest fragment per key (last-writer-wins). */
function foldLatest(frags, keyFn) {
  const m = new Map();
  for (const f of frags) m.set(keyFn(f), f);
  return [...m.values()];
}

// ── 2. Coordination refs ─────────────────────────────────────────────────────

/** List refs/momentum/<ns>/* as { key, payload } (payload = the commit message JSON). */
function readRefs(repo, ns) {
  const listed = git(repo, ['for-each-ref', '--format=%(refname)', `refs/momentum/${ns}`]);
  if (!listed) return [];
  const prefix = `refs/momentum/${ns}/`;
  const out = [];
  for (const ref of listed.split('\n').filter(Boolean)) {
    const key = ref.slice(prefix.length);
    const msg = git(repo, ['log', '-1', '--format=%B', ref]);
    let payload = null;
    if (msg) { try { payload = JSON.parse(msg.trim()); } catch { payload = { raw: msg.trim() }; } }
    out.push({ key, payload });
  }
  return out;
}

// ── Board assembly ────────────────────────────────────────────────────────────

function buildBoard(repo) {
  const activePhase = foldLatest(readView(repo, 'active-phase'), (f) => f.payload && f.payload.branch)
    .map((f) => ({ actor: f.actor, ...f.payload }));
  const activeInitiativeFrags = readView(repo, 'eco-active-initiative');
  const latestInit = activeInitiativeFrags[activeInitiativeFrags.length - 1];
  const activeInitiative = latestInit && latestInit.payload && latestInit.payload.slug
    ? { slug: latestInit.payload.slug, actor: latestInit.actor, ts: latestInit.ts }
    : null;
  const presence = foldLatest(readView(repo, 'presence'), (f) => f.actor)
    .map((f) => ({ actor: f.actor, ...f.payload }));

  return {
    activeInitiative,
    activePhase,
    presence,
    claims: ['claims', 'version', 'phase', 'id'].flatMap((ns) =>
      readRefs(repo, ns).map((r) => ({ namespace: ns, ...r }))),
    queue: readRefs(repo, 'queue'),
    leases: readRefs(repo, 'leases'),
  };
}

function render(board) {
  const L = [];
  L.push('momentum team board (read via the published contract)');
  L.push('='.repeat(52));
  if (board.activeInitiative) {
    L.push(`Active initiative: ${board.activeInitiative.slug}  (set by ${board.activeInitiative.actor})`);
  }
  L.push('');
  L.push('Active phases:');
  if (!board.activePhase.length) L.push('  (none)');
  for (const r of board.activePhase) {
    L.push(`  • ${r.branch}  [${r.actor}]  ${r.phase || ''} ${r.status || ''} ${r.progress || ''}`.trimEnd());
  }
  L.push('');
  L.push('Presence:');
  if (!board.presence.length) L.push('  (none)');
  for (const p of board.presence) L.push(`  • ${p.actor}${p.activity ? '  — ' + p.activity : ''}`);
  L.push('');
  L.push('Claims (ref-CAS allocations):');
  if (!board.claims.length) L.push('  (none)');
  for (const c of board.claims) L.push(`  • ${c.namespace}/${c.key}  → ${c.payload && c.payload.actor}`);
  if (board.leases.length) {
    L.push('');
    L.push('Leases (cross-machine ownership):');
    for (const l of board.leases) L.push(`  • ${l.key}  → ${l.payload && l.payload.actor}`);
  }
  if (board.queue.length) {
    L.push('');
    L.push('Landing turns:');
    for (const q of board.queue) L.push(`  • ${q.key}  → ${q.payload && q.payload.actor}`);
  }
  return L.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const repo = path.resolve(args.find((a) => !a.startsWith('--')) || process.cwd());
  const board = buildBoard(repo);
  process.stdout.write((asJson ? JSON.stringify(board, null, 2) : render(board)) + '\n');
}

if (require.main === module) main();
module.exports = { buildBoard, render };
