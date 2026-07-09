'use strict';

/**
 * Compile per-actor fragments into rendered coordination views (Phase 30a
 * Team-Walk G2, ADR-0012).
 *
 * Fragments are collision-free but unreadable on their own; `compile` folds them
 * (last-writer-per-key) into a human view. The Active-Phase table is the first
 * view — each lane writes its OWN row fragment, so Rule 15's "one row per active
 * lane, own-row-touch only" stops being a social convention and becomes
 * mechanical (you can only write files under your own actor prefix).
 *
 * `applyManaged` splices a rendered view between managed markers in a doc
 * (e.g. status.md), inserting the block if the markers are absent — the same
 * marked-region pattern momentum already uses for the ecosystem pointer.
 *
 * Zero dependencies — node builtins only.
 */

const fragments = require('./fragments');

const ACTIVE_PHASE_VIEW = 'active-phase';

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Record this lane's Active-Phase row as a fragment (own-row, last-writer-wins). */
function recordActivePhase(repoRoot, actor, payload, opts) {
  return fragments.writeFragment(repoRoot, ACTIVE_PHASE_VIEW, actor, 'row', payload, opts);
}

/** Read + fold the Active-Phase rows (one per lane branch, latest wins). */
function activePhaseRows(repoRoot) {
  const folded = fragments.foldLatest(
    fragments.readFragments(repoRoot, ACTIVE_PHASE_VIEW),
    (f) => f.payload.branch
  );
  return [...folded.values()].sort((a, b) =>
    String(a.payload.phase || '').localeCompare(String(b.payload.phase || '')) ||
    String(a.payload.branch).localeCompare(String(b.payload.branch)));
}

/** Render the Active-Phase rows as a markdown table. */
function renderActivePhaseTable(rows) {
  const header =
    '| Phase | Branch | Actor | Status | Progress |\n' +
    '|-------|--------|-------|--------|----------|';
  if (!rows.length) return `${header}\n| _(no active lanes)_ | | | | |`;
  const body = rows
    .map((f) => {
      const p = f.payload;
      return `| ${p.phase || ''} | ${p.branch} | ${f.actor} | ${p.status || ''} | ${p.progress || ''} |`;
    })
    .join('\n');
  return `${header}\n${body}`;
}

/** Compile the Active-Phase table for a repo. */
function compileActivePhase(repoRoot) {
  return renderActivePhaseTable(activePhaseRows(repoRoot));
}

/**
 * Splice `rendered` between `<!-- momentum:team:<name>:begin/end -->` markers in
 * `content`, inserting the block at the end if the markers are absent.
 * Idempotent: re-applying with the same rendered text is a no-op.
 */
function applyManaged(content, name, rendered) {
  const begin = `<!-- momentum:team:${name}:begin -->`;
  const end = `<!-- momentum:team:${name}:end -->`;
  const block = `${begin}\n${rendered}\n${end}`;
  const re = new RegExp(`${escapeRe(begin)}[\\s\\S]*?${escapeRe(end)}`);
  if (re.test(content)) return content.replace(re, block);
  return `${content.trimEnd()}\n\n${block}\n`;
}

module.exports = {
  ACTIVE_PHASE_VIEW,
  recordActivePhase,
  activePhaseRows,
  renderActivePhaseTable,
  compileActivePhase,
  applyManaged,
};
