'use strict';

/**
 * The recursive wave engine (Phase 21c, FEAT-028 — see ADR-0003).
 *
 * ONE algorithm for every scale of the plan graph (ecosystem ⊃ repos ⊃
 * phases ⊃ tasks): Kahn layering over dependency edges. Nodes with no
 * remaining inbound edges form the next wave; lexicographic order inside
 * a wave keeps repeated runs identical; a stuck non-empty remainder is a
 * cycle, reported with its participants.
 *
 * Extracted from core/swarm/lib/wave-ordering.js (Phase 17) — swarm is
 * now a thin adapter over this engine. The `label` option lets adapters
 * keep their historical error strings byte-for-byte.
 *
 * Edge semantics: { from: A, to: B } means A DEPENDS ON B → B runs first.
 */

/**
 * @param {string[]} nodeIds — non-empty list of node ids
 * @param {{from: string, to: string}[]} edges — dependency edges
 * @param {{label?: string}} [opts] — error-message prefix (default 'computeWaves')
 * @returns {{ index: number, nodes: string[] }[]}
 */
function computeWaveLayers(nodeIds, edges, opts = {}) {
  const label = opts.label || 'computeWaves';
  if (!Array.isArray(nodeIds) || nodeIds.length === 0) {
    throw new Error(`${label}: impactedRepos must be a non-empty array`);
  }
  for (const n of nodeIds) {
    if (typeof n !== 'string' || n.length === 0) {
      throw new TypeError(`${label}: impactedRepos must be non-empty strings (got ${JSON.stringify(n)})`);
    }
  }
  const included = new Set(nodeIds);

  const inDegree = new Map();
  const adj = new Map();
  for (const n of included) {
    inDegree.set(n, 0);
    adj.set(n, []);
  }

  if (Array.isArray(edges)) {
    for (const dep of edges) {
      if (!dep || typeof dep !== 'object') continue;
      const { from, to } = dep;
      if (typeof from !== 'string' || typeof to !== 'string') continue;
      if (!included.has(from) || !included.has(to)) continue; // outside the subgraph
      if (from === to) {
        throw new Error(`${label}: self-dependency on "${from}" — invalid edge`);
      }
      adj.get(to).push(from); // B → A: the dependency unlocks the dependent
      inDegree.set(from, inDegree.get(from) + 1);
    }
  }

  const waves = [];
  let waveIndex = 1;
  const remaining = new Set(included);

  while (remaining.size > 0) {
    const ready = [];
    for (const n of remaining) {
      if (inDegree.get(n) === 0) ready.push(n);
    }
    if (ready.length === 0) {
      throw new Error(`${label}: cycle detected involving ${[...remaining].sort().join(', ')}`);
    }
    ready.sort();
    waves.push({ index: waveIndex, nodes: ready });
    waveIndex += 1;
    for (const n of ready) {
      remaining.delete(n);
      for (const target of adj.get(n) || []) {
        inDegree.set(target, inDegree.get(target) - 1);
      }
    }
  }
  return waves;
}

module.exports = { computeWaveLayers };
