'use strict';

/**
 * Wave ordering — topological sort from ecosystem.json dependency edges.
 *
 * Input: a list of impacted member ids + the ecosystem manifest's
 * `dependencies` array.
 * Output: an ordered list of waves, each a non-empty list of member ids.
 *
 * Algorithm: Kahn's algorithm restricted to the impacted subgraph.
 * Repos with no remaining inbound edges (within the impacted set) form
 * the next wave. Cycle detection: if no progress can be made on a
 * non-empty remaining set, throw with a clear error listing the cycle
 * participants.
 *
 * Stable order within a wave: lexicographic by repo id, so repeated
 * runs from the same input produce identical waves.
 */

/**
 * @typedef {Object} EcoDependency
 * @property {string} from   — the dependent (must produce its work after `to`)
 * @property {string} to     — the dependency (must produce its work first)
 * @property {string} [kind] — informational; not used by ordering
 */

/**
 * @param {string[]} impactedRepos        — non-empty list of member ids
 * @param {EcoDependency[]} dependencies  — full ecosystem dependency array
 * @returns {{ index: number, repos: string[] }[]}
 */
function computeWaves(impactedRepos, dependencies) {
  if (!Array.isArray(impactedRepos) || impactedRepos.length === 0) {
    throw new Error('computeWaves: impactedRepos must be a non-empty array');
  }
  for (const r of impactedRepos) {
    if (typeof r !== 'string' || r.length === 0) {
      throw new TypeError(`computeWaves: impactedRepos must be non-empty strings (got ${JSON.stringify(r)})`);
    }
  }
  const impacted = new Set(impactedRepos);

  // inDegree: for each impacted repo, count of impacted deps (edges from
  // an impacted source to this repo) it must wait on.
  // adj: source → list of targets (within impacted set).
  const inDegree = new Map();
  const adj = new Map();
  for (const r of impacted) {
    inDegree.set(r, 0);
    adj.set(r, []);
  }

  // Honor the convention from ecosystem.schema.json: an edge { from: A,
  // to: B } means A depends on B (B must run first). So B → A in the
  // wave graph.
  if (Array.isArray(dependencies)) {
    for (const dep of dependencies) {
      if (!dep || typeof dep !== 'object') continue;
      const { from, to } = dep;
      if (typeof from !== 'string' || typeof to !== 'string') continue;
      if (!impacted.has(from) || !impacted.has(to)) continue; // skip non-impacted
      if (from === to) {
        throw new Error(`computeWaves: self-dependency on "${from}" — invalid edge`);
      }
      // Edge: to → from (B must run before A)
      adj.get(to).push(from);
      inDegree.set(from, inDegree.get(from) + 1);
    }
  }

  const waves = [];
  let waveIndex = 1;
  const remaining = new Set(impacted);

  while (remaining.size > 0) {
    const ready = [];
    for (const r of remaining) {
      if (inDegree.get(r) === 0) ready.push(r);
    }
    if (ready.length === 0) {
      throw new Error(
        `computeWaves: cycle detected involving ${[...remaining].sort().join(', ')}`
      );
    }
    ready.sort();
    waves.push({ index: waveIndex, repos: ready });
    waveIndex += 1;
    for (const r of ready) {
      remaining.delete(r);
      for (const target of adj.get(r) || []) {
        inDegree.set(target, inDegree.get(target) - 1);
      }
    }
  }
  return waves;
}

/**
 * Given a list of all members and a dependency list, compute the
 * waves for the entire ecosystem (used by /swarm verify + diagnostic
 * tooling). Equivalent to `computeWaves(member_ids, dependencies)`.
 */
function computeFullEcosystemWaves(ecosystemManifest) {
  const members = (ecosystemManifest && Array.isArray(ecosystemManifest.members))
    ? ecosystemManifest.members.map((m) => m && m.id).filter(Boolean)
    : [];
  const deps = (ecosystemManifest && Array.isArray(ecosystemManifest.dependencies))
    ? ecosystemManifest.dependencies : [];
  return computeWaves(members, deps);
}

module.exports = {
  computeWaves,
  computeFullEcosystemWaves,
};
