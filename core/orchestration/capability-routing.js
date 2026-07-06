'use strict';

// Capability-driven routing for orchestration primitives.
//
// Reads an adapter's uniform-boolean capability declarations
// (post-ENH-023 + ENH-024 cleanup in Phase 11 G0) and decides which
// mode each primitive should run in. Every degraded mode is labeled —
// the user is told up front when their adapter forces sequential mode
// or a missing hook surface.

const fs = require('node:fs');
const path = require('node:path');

const PRIMITIVES = Object.freeze(['scout', 'dispatch', 'handoff', 'continue']);

/**
 * Choose the execution mode for a primitive on a given adapter.
 *
 * @param {object} adapter        adapter module (the export of adapters/<name>/adapter.js)
 * @param {string} primitive      one of: 'scout' | 'dispatch' | 'handoff' | 'continue'
 * @returns {{ mode: 'parallel'|'sequential', notes: string[] }}
 */
function chooseMode(adapter, primitive) {
  if (!PRIMITIVES.includes(primitive)) {
    throw new Error(
      `orchestration/capability-routing: unknown primitive "${primitive}". ` +
      `Valid primitives: ${PRIMITIVES.join(', ')}`,
    );
  }
  const caps = (adapter && adapter.capabilities) || {};
  const roadmap = (adapter && adapter.roadmap) || {};
  const notes = [];

  // scout, handoff, continue are inherently single-target — there's no
  // parallel/sequential distinction. They run "parallel" by default
  // (i.e., a single sub-agent / single in-process invocation). The
  // only useful degradation note is when the adapter lacks subagents
  // entirely — then CLI is the only path.
  if (primitive === 'scout' || primitive === 'handoff' || primitive === 'continue') {
    if (caps.subagents === false) {
      notes.push(
        `this adapter does not declare subagents — ${primitive} runs in-process via the CLI floor`,
      );
    }
    return { mode: 'parallel', notes };
  }

  // dispatch is where parallel vs sequential matters.
  if (primitive === 'dispatch') {
    if (caps.parallelSubagents === true) {
      return { mode: 'parallel', notes };
    }
    if (caps.subagents === true && caps.parallelSubagents === false) {
      const reason = roadmap.parallelSubagents
        ? ` (${roadmap.parallelSubagents})`
        : '';
      notes.push(
        `this adapter does not declare parallel subagents — running sequentially${reason}`,
      );
      return { mode: 'sequential', notes };
    }
    if (caps.subagents === false) {
      notes.push(
        'this adapter does not declare subagents — dispatch runs sequentially via the CLI floor',
      );
      return { mode: 'sequential', notes };
    }
    // Default conservative path: sequential with a note.
    notes.push('subagent capability undeclared — running sequentially as a safe default');
    return { mode: 'sequential', notes };
  }

  // Shouldn't reach — guarded by the early PRIMITIVES check above.
  return { mode: 'parallel', notes };
}

/**
 * Returns true if the adapter has a SessionStart hook surface that can
 * print the handoff auto-greet banner. Otherwise, callers should fall
 * back to a primary-instruction banner or rely on explicit
 * `/continue` / `momentum continue`.
 */
function supportsSessionStartHook(adapter) {
  return Boolean(adapter && adapter.capabilities && adapter.capabilities.sessionStartHook === true);
}

/**
 * Returns true if the adapter has slash commands. Antigravity is the
 * notable false today — its users invoke primitives via NL inference
 * or the momentum CLI.
 */
function supportsSlashCommands(adapter) {
  return Boolean(adapter && adapter.capabilities && adapter.capabilities.slashCommands === true);
}

/**
 * Load an adapter by name from a momentum source tree.
 *
 * @param {string} momentumRoot   absolute path to the momentum repo root
 *                                (the directory containing `adapters/`)
 * @param {string} name           adapter directory name (e.g., 'claude-code')
 * @returns {object}              adapter module
 */
function loadAdapter(momentumRoot, name) {
  const adapterPath = path.join(momentumRoot, 'adapters', name, 'adapter.js');
  if (!fs.existsSync(adapterPath)) {
    throw new Error(
      `orchestration/capability-routing: adapter "${name}" not found at ${adapterPath}`,
    );
  }
  return require(adapterPath);
}

module.exports = {
  PRIMITIVES,
  chooseMode,
  supportsSessionStartHook,
  supportsSlashCommands,
  loadAdapter,
};
