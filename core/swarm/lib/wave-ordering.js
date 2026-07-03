'use strict';

/**
 * Wave ordering — topological sort from ecosystem.json dependency edges.
 *
 * Since Phase 21c this is a thin adapter over the recursive wave engine
 * (core/waves/lib/waves.js, ADR-0003): identical algorithm, identical
 * wave output, identical error strings — swarm is the engine's top-scale
 * consumer. The public surface below is unchanged from Phase 17.
 *
 * Input: a list of impacted member ids + the ecosystem manifest's
 * `dependencies` array ({ from: A, to: B } = A depends on B; B first).
 * Output: an ordered list of waves, each `{ index, repos }` with repos
 * sorted lexicographically for stable repeated runs.
 */

const path = require('path');

const { computeWaveLayers } = require(path.join(__dirname, '..', '..', 'waves', 'lib', 'waves'));

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
  return computeWaveLayers(impactedRepos, dependencies, { label: 'computeWaves' })
    .map(({ index, nodes }) => ({ index, repos: nodes }));
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
