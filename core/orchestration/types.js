'use strict';

// Structured result types for orchestration primitives.
//
// JSDoc-based — momentum is zero-dependency Node.js, no TypeScript at
// build time. Helpers below provide light runtime shape validation
// used by primitive implementations + tests.

/**
 * @typedef {object} Finding
 * @property {'discovery'|'decision'|'note'} kind
 * @property {string} title           Short human-readable title
 * @property {string} [detail]        Multi-sentence description
 * @property {string} [recommendedBacklogPriority]  P0|P1|P2|P3 if a backlog entry is warranted
 * @property {string} [recommendedBacklogType]      bug|tech-debt|enhancement|feature
 * @property {string[]} [filesTouched]
 */

/**
 * @typedef {object} ScoutResult
 * @property {string} repo               target repo path (absolute or relative to originating CWD)
 * @property {string} prompt             user-provided scope prompt
 * @property {string} summary            structured summary answering the prompt
 * @property {Finding[]} findings        notable findings surfaced during the scout
 * @property {string[]} filesRead        files inspected
 * @property {number} duration           wall-clock milliseconds
 * @property {string} runArtifactPath    absolute path to scout-NNN.md artifact
 * @property {string} [sessionLogRef]    YYYY-MM-DD reference into ecosystem session log
 * @property {object} [error]            present only when scout failed
 */

/**
 * @typedef {object} PerRepoResult
 * @property {string} repo
 * @property {string} prompt           per-repo tailored prompt
 * @property {string} [summary]
 * @property {Finding[]} [findings]
 * @property {string[]} [filesRead]
 * @property {number} [duration]
 * @property {object} [error]          present on failure
 */

/**
 * @typedef {object} DispatchResult
 * @property {string[]} repos
 * @property {string} userIntent
 * @property {'parallel'|'sequential'} mode
 * @property {string[]} modeNotes            degraded-mode labels surfaced to the user
 * @property {PerRepoResult[]} perRepoResults
 * @property {PerRepoResult[]} failures      sub-agents that crashed; their entries also appear in perRepoResults with `error`
 * @property {string} synthesis              top-level answer to userIntent
 * @property {number} duration
 * @property {string} runArtifactPath
 * @property {string} [sessionLogRef]
 */

/**
 * @typedef {object} HandoffBlock
 * @property {string} fromRepo
 * @property {string} toRepo
 * @property {string} summary
 * @property {string[]} decisions
 * @property {string[]} filesTouched
 * @property {string[]} verificationCommands
 * @property {string[]} openQuestions
 * @property {string} originatingPhase           e.g. "phase-11-orchestration-handover"
 * @property {string} originatingHistoryRef      e.g. "[DECISION] 2026-06-07 — Handoff #042"
 * @property {string} inboxPath                  absolute path to .momentum/inbox/handoff-NNN.md
 * @property {string} handoffId                  monotonic id, e.g. "042"
 * @property {string} createdAt                  ISO timestamp
 */

// ── Runtime shape validation (light) ────────────────────────────────────────
//
// These helpers exist to catch obvious shape mistakes in tests and at
// runtime — not as a full type system. Validation is best-effort.

function assertString(value, name) {
  if (typeof value !== 'string') {
    throw new TypeError(`orchestration/types: ${name} must be a string, got ${typeof value}`);
  }
}

function assertArray(value, name) {
  if (!Array.isArray(value)) {
    throw new TypeError(`orchestration/types: ${name} must be an array, got ${typeof value}`);
  }
}

function validateScoutResult(result) {
  assertString(result.repo, 'ScoutResult.repo');
  assertString(result.prompt, 'ScoutResult.prompt');
  assertString(result.summary, 'ScoutResult.summary');
  assertArray(result.findings, 'ScoutResult.findings');
  assertArray(result.filesRead, 'ScoutResult.filesRead');
  if (typeof result.duration !== 'number') {
    throw new TypeError('ScoutResult.duration must be a number');
  }
  return result;
}

function validateDispatchResult(result) {
  assertArray(result.repos, 'DispatchResult.repos');
  assertString(result.userIntent, 'DispatchResult.userIntent');
  if (result.mode !== 'parallel' && result.mode !== 'sequential') {
    throw new TypeError(`DispatchResult.mode must be 'parallel'|'sequential', got ${result.mode}`);
  }
  assertArray(result.modeNotes, 'DispatchResult.modeNotes');
  assertArray(result.perRepoResults, 'DispatchResult.perRepoResults');
  assertArray(result.failures, 'DispatchResult.failures');
  assertString(result.synthesis, 'DispatchResult.synthesis');
  return result;
}

function validateHandoffBlock(block) {
  assertString(block.fromRepo, 'HandoffBlock.fromRepo');
  assertString(block.toRepo, 'HandoffBlock.toRepo');
  assertString(block.summary, 'HandoffBlock.summary');
  assertArray(block.decisions, 'HandoffBlock.decisions');
  assertArray(block.filesTouched, 'HandoffBlock.filesTouched');
  assertArray(block.verificationCommands, 'HandoffBlock.verificationCommands');
  assertArray(block.openQuestions, 'HandoffBlock.openQuestions');
  assertString(block.handoffId, 'HandoffBlock.handoffId');
  return block;
}

module.exports = {
  validateScoutResult,
  validateDispatchResult,
  validateHandoffBlock,
};
