'use strict';

/**
 * Plan-graph readers for the wave engine (Phase 21c, ADR-0003 §3).
 *
 * Dependency annotations live in the files that already exist:
 *   - task groups:  `## Group N — title (deps: G0, G1)` in tasks.md;
 *     a group whose checkboxes are all `[x]` is SATISFIED and drops out
 *     of the graph (its dependents unblock).
 *   - phases:       optional `"deps": ["phase-…"]` on
 *     specs/phases/index.json entries; deps on `complete` phases are
 *     satisfied; only non-complete phases are scheduled.
 */

const fs = require('fs');
const path = require('path');

const GROUP_HEADING = /^##\s+Group\s+([A-Za-z0-9.\-]+)\s*(?:[—–-]\s*(.*?))?\s*$/;
const DEPS_SUFFIX = /\(deps:\s*([^)]*)\)\s*$/i;
const CHECKBOX = /^\s*-\s*\[( |x|X|\/)\]/;

/** Normalize a group token: bare numbers get the G prefix ("2" → "G2"). */
function groupId(token) {
  const t = String(token).trim();
  return /^\d/.test(t) ? `G${t}` : t.toUpperCase();
}

/**
 * Parse a tasks.md body into group nodes.
 * @returns {{id, title, deps: string[], boxes: number, done: number, satisfied: boolean}[]}
 */
function parseTaskGroups(body) {
  const groups = [];
  let current = null;
  for (const line of String(body).split('\n')) {
    const h = line.match(GROUP_HEADING);
    if (h) {
      let title = (h[2] || '').trim();
      let deps = [];
      const d = title.match(DEPS_SUFFIX) || line.match(DEPS_SUFFIX);
      if (d) {
        deps = d[1].split(',').map((s) => groupId(s)).filter(Boolean);
        title = title.replace(DEPS_SUFFIX, '').trim();
      }
      current = { id: groupId(h[1]), title, deps, boxes: 0, done: 0 };
      groups.push(current);
      continue;
    }
    if (!current) continue;
    const c = line.match(CHECKBOX);
    if (c) {
      current.boxes += 1;
      if (c[1] === 'x' || c[1] === 'X') current.done += 1;
    }
  }
  for (const g of groups) {
    g.satisfied = g.boxes > 0 && g.done === g.boxes;
  }
  return groups;
}

/**
 * Wave input for a tasks.md file: unsatisfied groups only; deps on
 * satisfied (or unknown) groups are dropped.
 * @returns {{ nodes: string[], edges: {from,to}[], groups }} or null when unreadable
 */
function taskGraph(tasksFile) {
  let body;
  try {
    body = fs.readFileSync(tasksFile, 'utf8');
  } catch {
    return null;
  }
  const groups = parseTaskGroups(body);
  const pending = groups.filter((g) => !g.satisfied);
  const pendingIds = new Set(pending.map((g) => g.id));
  const edges = [];
  for (const g of pending) {
    for (const dep of g.deps) {
      if (pendingIds.has(dep)) edges.push({ from: g.id, to: dep });
    }
  }
  return { nodes: pending.map((g) => g.id), edges, groups };
}

/**
 * Wave input for the phase index: non-complete phases; deps on complete
 * phases satisfied.
 * @returns {{ nodes, edges, phases }} or null when unreadable
 */
function phaseGraph(repoRoot) {
  let index;
  try {
    index = JSON.parse(fs.readFileSync(path.join(repoRoot, 'specs', 'phases', 'index.json'), 'utf8'));
  } catch {
    return null;
  }
  const phases = index.phases || {};
  const pending = Object.keys(phases).filter((id) => phases[id].status !== 'complete');
  const pendingSet = new Set(pending);
  const edges = [];
  for (const id of pending) {
    for (const dep of phases[id].deps || []) {
      if (pendingSet.has(dep)) edges.push({ from: id, to: dep });
    }
  }
  return { nodes: pending, edges, phases };
}

module.exports = { parseTaskGroups, taskGraph, phaseGraph, groupId };
