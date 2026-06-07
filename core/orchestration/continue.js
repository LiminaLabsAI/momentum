'use strict';

// continueHandoff — receiving-side counterpart to handoff.
//
// Reads a pending inbox file, parses the HandoffBlock, marks the file
// as read (move to .momentum/inbox/read/), and emits a [NOTE] in the
// receiving repo's active phase history. Returns the HandoffBlock so
// the agent or CLI can act on it.

const fs = require('node:fs');
const path = require('node:path');

const eventsLib = require('./events');
const handoffLib = require('./handoff');
const sessionLog = require('./session-log');

/**
 * Pick up a pending handoff in the receiving repo.
 *
 * @param {object} opts
 * @param {string} opts.repo            absolute path to receiving repo
 * @param {string} [opts.handoffId]     pick a specific id; default: oldest pending
 * @param {object} [opts.ecosystem]
 * @param {object} [opts.emitter]
 * @param {boolean} [opts.silent]
 * @returns {Promise<HandoffBlock|null>}  null when no pending handoff
 */
async function continueHandoff(opts) {
  const { repo, ecosystem } = opts;
  if (!repo) throw new Error('orchestration/continue: opts.repo required');

  const pending = handoffLib.listPending(repo);
  if (pending.length === 0) return null;

  let chosen;
  if (opts.handoffId) {
    const id = String(opts.handoffId).padStart(3, '0');
    chosen = pending.find((p) => path.basename(p) === `handoff-${id}.md`);
    if (!chosen) {
      throw new Error(`orchestration/continue: handoff-${id}.md not found in ${repo}`);
    }
  } else {
    chosen = pending[0];
  }

  const emitter = opts.emitter || eventsLib.createEmitter({ primitive: 'continue', repo });
  if (!opts.emitter && !opts.silent) {
    emitter.on(eventsLib.createRenderer({ stream: process.stdout }));
  }
  if (ecosystem) {
    emitter.on(eventsLib.createPersister({
      ecosystemRoot: ecosystem.rootPath,
      memberId: ecosystem.memberId,
    }));
  }

  const block = handoffLib.parseInbox(chosen);
  emitter.emit('started', { message: `picking up ${path.basename(chosen)} from ${path.basename(block.fromRepo)}` });
  const readPath = handoffLib.markRead(chosen);
  emitter.emit('step', { message: `marked ${path.basename(readPath)} read` });

  // Append a [NOTE] entry in the receiving repo's active phase history.
  const activePhase = handoffLib.detectActivePhase(repo);
  if (activePhase) {
    appendReceivingNote({ repo, activePhase, block });
  }

  emitter.emit('finished', { runArtifactPath: readPath });
  return block;
}

/**
 * List pending handoffs (paths) in the given repo. Convenience wrapper
 * over handoffLib.listPending so callers don't have to know about the
 * inbox layout.
 */
function listPending(repo) {
  return handoffLib.listPending(repo);
}

function appendReceivingNote({ repo, activePhase, block }) {
  const historyPath = path.join(repo, 'specs', 'phases', activePhase, 'history.md');
  if (!fs.existsSync(historyPath)) return;
  const date = new Date().toISOString().slice(0, 10);
  const entry = [
    '',
    `### [NOTE] ${date} — Picked up handoff-${block.handoffId} from ${path.basename(block.fromRepo)}`,
    `Topics: orchestration, handoff-pickup, handoff-${block.handoffId}`,
    `Affects-phases: ${activePhase} (or "none")`,
    `Affects-specs: ${path.relative(repo, path.join(repo, handoffLib.INBOX_DIRNAME, 'read', `handoff-${block.handoffId}.md`))}`,
    `Detail: Received handoff from ${path.basename(block.fromRepo)}. Summary: ${block.summary}`,
    '',
    '---',
    '',
  ].join('\n');
  fs.appendFileSync(historyPath, entry);
}

module.exports = {
  continueHandoff,
  listPending,
};
