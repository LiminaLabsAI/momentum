'use strict';

// Run artifact writer for orchestration primitives.
//
// Writes a structured Markdown artifact to <repo>/.momentum/runs/
// <primitive>-NNN.md. NNN is a monotonic counter scoped per primitive
// per repo — `scout-001`, `dispatch-001`, `handoff-001` count
// independently. Counter persisted via lightweight state file
// `.momentum/runs/.counters.json`.

const fs = require('node:fs');
const path = require('node:path');

const PRIMITIVES = Object.freeze(['scout', 'dispatch', 'handoff']);

/**
 * Allocate the next run id for the given primitive in the given repo.
 *
 * @param {object} opts
 * @param {string} opts.repo       absolute path to originating repo
 * @param {string} opts.primitive  one of: 'scout' | 'dispatch' | 'handoff'
 * @returns {string} zero-padded id like '042'
 */
function allocateRunId(opts) {
  const { repo, primitive } = opts;
  if (!PRIMITIVES.includes(primitive)) {
    throw new Error(`orchestration/run-artifact: unknown primitive "${primitive}"`);
  }
  const runsDir = path.join(repo, '.momentum', 'runs');
  fs.mkdirSync(runsDir, { recursive: true });
  const countersPath = path.join(runsDir, '.counters.json');
  let counters = {};
  if (fs.existsSync(countersPath)) {
    try {
      counters = JSON.parse(fs.readFileSync(countersPath, 'utf8'));
    } catch {
      counters = {};
    }
  }
  const next = (counters[primitive] || 0) + 1;
  counters[primitive] = next;
  fs.writeFileSync(countersPath, JSON.stringify(counters, null, 2) + '\n');
  return String(next).padStart(3, '0');
}

/**
 * Write a primitive's run artifact.
 *
 * @param {object} opts
 * @param {string} opts.repo            absolute path to originating repo
 * @param {string} opts.primitive       one of: 'scout' | 'dispatch' | 'handoff'
 * @param {string} opts.runId           pre-allocated id (use allocateRunId)
 * @param {string} opts.body            full Markdown body
 * @returns {string} absolute path to the artifact
 */
function writeRunArtifact(opts) {
  const { repo, primitive, runId, body } = opts;
  if (!PRIMITIVES.includes(primitive)) {
    throw new Error(`orchestration/run-artifact: unknown primitive "${primitive}"`);
  }
  const runsDir = path.join(repo, '.momentum', 'runs');
  fs.mkdirSync(runsDir, { recursive: true });
  const artifactPath = path.join(runsDir, `${primitive}-${runId}.md`);
  fs.writeFileSync(artifactPath, body);
  return artifactPath;
}

/**
 * Convenience: allocate id + write artifact + return path.
 *
 * @param {object} opts
 * @param {string} opts.repo
 * @param {string} opts.primitive
 * @param {(runId: string) => string} opts.bodyFor   builds body once the id is known
 * @returns {{ runId: string, artifactPath: string }}
 */
function writeWithAllocatedId(opts) {
  const runId = allocateRunId({ repo: opts.repo, primitive: opts.primitive });
  const artifactPath = writeRunArtifact({
    repo: opts.repo,
    primitive: opts.primitive,
    runId,
    body: opts.bodyFor(runId),
  });
  return { runId, artifactPath };
}

module.exports = {
  PRIMITIVES,
  allocateRunId,
  writeRunArtifact,
  writeWithAllocatedId,
};
