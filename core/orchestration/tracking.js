'use strict';

// tracking — meaningful-only writes to curated docs (history.md / backlog.md).
//
// Cheap layer (session log + run artifact + handoff inbox) is auto-
// written by the individual primitives. This module handles the
// curated layer:
//
//   - proposeDiscovery({ primitive, finding, targetRepo })
//     Applies Rule 3 criteria (real bug, real tech debt, real
//     enhancement). If meaningful, appends a [DISCOVERY] entry to
//     the target repo's active phase history. Otherwise no-op.
//
//   - proposeHistoryNote({ primitive, originatingRepo, message,
//                          runArtifactRef })
//     For dispatch synthesis or other meaningful cross-repo notes.
//     Appends a [NOTE] in originating repo's active phase history.
//
// Hard invariants:
//   - NO new entry types. Reuses [DISCOVERY] / [DECISION] / [NOTE].
//   - NO writes to backlog.md without explicit user confirmation.
//     We propose entries; caller decides whether to materialise them.
//   - Empty/whitespace findings never make it through.

const fs = require('node:fs');
const path = require('node:path');

const handoffLib = require('./handoff');

const VALID_BACKLOG_PRIORITIES = new Set(['P0', 'P1', 'P2', 'P3']);
const VALID_BACKLOG_TYPES = new Set(['bug', 'tech-debt', 'enhancement', 'feature']);

/**
 * Decide whether a Finding warrants a [DISCOVERY] entry in the target
 * repo's active phase history.
 *
 * @param {object} opts
 * @param {string} opts.primitive       'scout' | 'dispatch'
 * @param {Finding} opts.finding
 * @param {string} opts.targetRepo      where the finding was observed
 * @returns {{
 *   shouldWrite: boolean,
 *   reason: string,
 *   historyEntry?: string,
 *   historyPath?: string,
 * }}
 */
function proposeDiscovery(opts) {
  const { primitive, finding, targetRepo } = opts;
  if (!finding || typeof finding !== 'object') {
    return { shouldWrite: false, reason: 'no finding provided' };
  }
  if (!finding.title || typeof finding.title !== 'string' || !finding.title.trim()) {
    return { shouldWrite: false, reason: 'finding has no title' };
  }
  // Rule 3 thresholds — must look like a real backlog candidate.
  if (
    !VALID_BACKLOG_TYPES.has(finding.recommendedBacklogType) &&
    !VALID_BACKLOG_PRIORITIES.has(finding.recommendedBacklogPriority)
  ) {
    return {
      shouldWrite: false,
      reason: 'finding does not declare a recommendedBacklogType or recommendedBacklogPriority — not meaningful per Rule 3',
    };
  }

  const activePhase = handoffLib.detectActivePhase(targetRepo);
  if (!activePhase) {
    return { shouldWrite: false, reason: 'target repo has no active phase to log into' };
  }

  const historyPath = path.join(targetRepo, 'specs', 'phases', activePhase, 'history.md');
  if (!fs.existsSync(historyPath)) {
    return { shouldWrite: false, reason: `history.md missing at ${historyPath}` };
  }

  const date = new Date().toISOString().slice(0, 10);
  const topics = ['orchestration', primitive, 'discovery'];
  if (finding.recommendedBacklogType) topics.push(finding.recommendedBacklogType);

  const entry = [
    '',
    `### [DISCOVERY] ${date} — ${finding.title}`,
    `Topics: ${topics.join(', ')}`,
    `Affects-phases: ${activePhase}`,
    `Affects-specs: ${(finding.filesTouched || []).join(', ') || 'none'}`,
    `Detail: ${finding.detail || finding.title}${formatBacklogHint(finding)}`,
    '',
    '---',
    '',
  ].join('\n');

  fs.appendFileSync(historyPath, entry);
  return {
    shouldWrite: true,
    reason: 'meaningful per Rule 3',
    historyEntry: entry,
    historyPath,
  };
}

/**
 * Append a [NOTE] entry in the originating repo's active phase history.
 *
 * Used for dispatch synthesis and any other cross-repo orchestration
 * note worth a future reader's time. Does NOT use a new entry type.
 *
 * @param {object} opts
 * @param {string} opts.primitive
 * @param {string} opts.originatingRepo
 * @param {string} opts.message            one-line description
 * @param {string} [opts.runArtifactRef]   relative path to .momentum/runs/<primitive>-NNN.md
 * @returns {{ shouldWrite: boolean, reason: string, historyEntry?: string, historyPath?: string }}
 */
function proposeHistoryNote(opts) {
  const { primitive, originatingRepo, message, runArtifactRef } = opts;
  if (!message || typeof message !== 'string' || !message.trim()) {
    return { shouldWrite: false, reason: 'empty message' };
  }

  const activePhase = handoffLib.detectActivePhase(originatingRepo);
  if (!activePhase) {
    return { shouldWrite: false, reason: 'originating repo has no active phase' };
  }

  const historyPath = path.join(originatingRepo, 'specs', 'phases', activePhase, 'history.md');
  if (!fs.existsSync(historyPath)) {
    return { shouldWrite: false, reason: `history.md missing at ${historyPath}` };
  }

  const date = new Date().toISOString().slice(0, 10);
  const entry = [
    '',
    `### [NOTE] ${date} — ${primitive} synthesis`,
    `Topics: orchestration, ${primitive}, synthesis`,
    `Affects-phases: ${activePhase}`,
    `Affects-specs: ${runArtifactRef || 'none'}`,
    `Detail: ${message}`,
    '',
    '---',
    '',
  ].join('\n');

  fs.appendFileSync(historyPath, entry);
  return {
    shouldWrite: true,
    reason: 'meaningful synthesis',
    historyEntry: entry,
    historyPath,
  };
}

/**
 * Helper: would this finding pass the Rule 3 threshold? Used by tests
 * and orchestrator code that wants to decide BEFORE proposing.
 */
function isMeaningfulFinding(finding) {
  if (!finding || typeof finding !== 'object') return false;
  if (!finding.title || !finding.title.trim()) return false;
  return (
    VALID_BACKLOG_TYPES.has(finding.recommendedBacklogType) ||
    VALID_BACKLOG_PRIORITIES.has(finding.recommendedBacklogPriority)
  );
}

function formatBacklogHint(finding) {
  const parts = [];
  if (finding.recommendedBacklogType) parts.push(finding.recommendedBacklogType);
  if (finding.recommendedBacklogPriority) parts.push(finding.recommendedBacklogPriority);
  if (parts.length === 0) return '';
  return ` (backlog candidate: ${parts.join(' / ')})`;
}

module.exports = {
  proposeDiscovery,
  proposeHistoryNote,
  isMeaningfulFinding,
  VALID_BACKLOG_PRIORITIES,
  VALID_BACKLOG_TYPES,
};
