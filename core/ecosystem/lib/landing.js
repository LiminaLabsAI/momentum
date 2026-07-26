'use strict';

/**
 * Cross-repo landing order (Phase 31b G3, ADR-0017 E3/E4/E5 — closes ENH-068).
 *
 * Rule 6's Landing Order — one lane at a time, suite green between, remaining
 * lanes rebase — is enforced inside a repo by `momentum lanes land`. Nothing
 * enforced it ACROSS members.
 *
 * The cost, from the 2026-07-26 review: one session opened five PRs across
 * three repos with a genuine ordering dependency (a backend wire-contract
 * change had to land before the frontend rendered it) and tracked that order
 * in prose. Two production defects followed — including an alembic
 * multiple-heads state created by running `upgrade head` before, rather than
 * after, the cross-repo conflict merge.
 *
 * THREE DESIGN COMMITMENTS (ADR-0017)
 * -----------------------------------
 * E3 — This is a CHECK that `lanes land` calls, not a cross-repo orchestrator.
 *      Each member still lands with its own command. An orchestrator would have
 *      to drive merges in repos it does not own.
 * E4 — Order derives from the REGISTERED edges (`ecosystem.json.dependencies`),
 *      which Phase 31a made automatic. Edge `{from: frontend, to: backend}`
 *      means frontend depends on backend, so backend lands first. Deriving it
 *      means the order cannot drift from the dependency it represents.
 * E5 — "Landed" is a RECORDED `land` event, never inferred from branch or merge
 *      state. This machine may not have the upstream member checked out at all.
 */

const lib = require('./index');
const events = require('./events');
const initiativeLib = require('./initiative');

/**
 * The in-progress initiative that lists `memberId` as a contributor, or null.
 * Contributions are the binding link (a member in `repos[]` that never declared
 * a contribution has nothing to land).
 */
function initiativeForMember(ecosystemRoot, memberId) {
  const detect = require('./detect');
  for (const init of detect.openInitiatives(ecosystemRoot)) {
    const loaded = initiativeLib.loadInitiative(ecosystemRoot, init.slug);
    if (!loaded) continue;
    const contributions = (loaded.frontmatter.contributions || [])
      .map((e) => initiativeLib.parseContribution(e))
      .filter(Boolean);
    if (contributions.some((c) => c.member === memberId)) {
      return { slug: init.slug, frontmatter: loaded.frontmatter, contributions };
    }
  }
  return null;
}

/** Members that have recorded a `land` event for `slug` since it started. */
function landedMembers(ecosystemRoot, slug, startedISO) {
  const cutoff = startedISO ? new Date(`${startedISO}T00:00:00.000Z`).getTime() : 0;
  const out = new Map();
  for (const f of events.listEvents(ecosystemRoot)) {
    if (!f || f.kind !== 'land' || !f.payload) continue;
    if (f.payload.initiative && f.payload.initiative !== slug) continue;
    const ts = new Date(f.ts).getTime();
    if (Number.isFinite(cutoff) && Number.isFinite(ts) && ts < cutoff) continue;
    out.set(f.payload.member, { ts: f.ts, forced: !!f.payload.forced });
  }
  return out;
}

/**
 * Evaluate the cross-repo landing gate for `repoRoot`.
 *
 * Returns `{ applicable: false }` whenever this is ordinary single-repo work —
 * no ecosystem, not a member, or no in-progress initiative declaring a
 * contribution from this member. Solo behavior must be untouched.
 *
 * Otherwise returns:
 *   { applicable, ok, mode, initiative, member, blockers[], isLast, remaining[] }
 */
function landingCheck(repoRoot, opts) {
  opts = opts || {};
  const out = { applicable: false, ok: true, mode: 'enforce', blockers: [] };

  const ecosystemRoot = opts.ecosystemRoot || lib.findRoot(repoRoot);
  if (!ecosystemRoot) return out;

  const member = events.resolveMemberId(ecosystemRoot, repoRoot);
  if (!member) return out;

  let manifest;
  try {
    manifest = lib.loadManifest(ecosystemRoot);
  } catch (_e) {
    return out;
  }

  const init = initiativeForMember(ecosystemRoot, member);
  if (!init) return out;

  const mode = lib.readEcosystemConfig(manifest).landing_order;
  if (mode === 'off') {
    return { ...out, applicable: true, mode, initiative: init.slug, member, skipped: true };
  }

  // E4 — upstream is every edge where THIS member is the dependent (`from`).
  const edges = (manifest.dependencies || []).filter((d) => d && d.from === member);
  const landed = landedMembers(ecosystemRoot, init.slug, init.frontmatter.started);

  const contributors = new Set(init.contributions.map((c) => c.member));
  const blockers = [];
  for (const edge of edges) {
    // Only members actually contributing to THIS initiative can block it. An
    // edge to a member with no contribution describes a dependency that this
    // initiative is not changing, so it has nothing to land.
    if (!contributors.has(edge.to)) continue;
    if (landed.has(edge.to)) continue;
    const contribution = init.contributions.find((c) => c.member === edge.to);
    blockers.push({
      member: edge.to,
      kind: edge.kind,
      contribution: contribution ? `${contribution.kind}:${contribution.ref}` : '(undeclared)',
    });
  }

  // Would this land complete the initiative's final outstanding contribution?
  const remaining = init.contributions
    .map((c) => c.member)
    .filter((m) => m !== member && !landed.has(m));
  const isLast = remaining.length === 0;

  return {
    applicable: true,
    ok: blockers.length === 0,
    mode,
    initiative: init.slug,
    member,
    ecosystemRoot,
    manifest,
    blockers,
    isLast,
    remaining,
  };
}

/**
 * Human-readable checklist lines for `lanes land`'s report.
 * Kept here so the message and the logic that produced it stay together.
 */
function checkLines(result) {
  if (!result.applicable) return [];
  if (result.skipped) {
    return [`⚠ ecosystem[${result.initiative}]: landing order disabled (landing_order: off)`];
  }
  const lines = [];
  if (result.ok) {
    lines.push(
      `✓ ecosystem[${result.initiative}]: upstream members have landed`
      + (result.isLast ? ' — this is the LAST contribution' : ''),
    );
  } else {
    for (const b of result.blockers) {
      lines.push(
        `✗ ecosystem[${result.initiative}]: '${b.member}' has not landed its contribution `
        + `(${b.contribution}) — it is upstream of '${result.member}' via a ${b.kind} edge`,
      );
    }
  }
  return lines;
}

/** Record that `member` landed its contribution (E5). Best-effort. */
function recordLand(repoRoot, slug, opts) {
  opts = opts || {};
  return events.recordEvent({
    cwd: repoRoot,
    kind: 'land',
    summary: opts.summary || `landed contribution for ${slug}`,
    context: opts.context || slug,
    initiative: slug,
    forced: !!opts.forced,
  });
}

module.exports = {
  initiativeForMember,
  landedMembers,
  landingCheck,
  checkLines,
  recordLand,
};
