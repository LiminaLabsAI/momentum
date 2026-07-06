'use strict';

// Orchestration library entry point.
//
// One shared backend that the slash commands (Claude Code, Codex),
// natural-language inference, and CLI all dispatch to. Three primitives
// — scout, dispatch, handoff — composed by the main agent per task.
//
// Hard invariants enforced by this library:
//   1. Every primitive emits typed events via core/orchestration/events.
//      Two default subscribers — a renderer (prints ▸ lines) and a
//      persister (appends to ecosystem session log).
//   2. The "cheap layer" (session log + run artifact + handoff inbox)
//      is always auto-written. The "curated layer" (history.md /
//      backlog.md) is only written when the agent judges a finding
//      meaningful, via core/orchestration/tracking.
//   3. Output shape is identical across slash / NL / CLI doors.

const events = require('./events');
const types = require('./types');
const capabilityRouting = require('./capability-routing');
const sessionLog = require('./session-log');
const runArtifact = require('./run-artifact');

module.exports = {
  // Re-exports for downstream consumers.
  events,
  types,
  capabilityRouting,
  sessionLog,
  runArtifact,

  // Primitive entry points are added by G1/G2/G3 (scout/dispatch/handoff).
  // Re-exported lazily so partial library shapes don't fail to load.
  get scout() {
    return require('./scout');
  },
  get dispatch() {
    return require('./dispatch');
  },
  get handoff() {
    return require('./handoff');
  },
  get continueHandoff() {
    return require('./continue');
  },
  get tracking() {
    return require('./tracking');
  },
};
