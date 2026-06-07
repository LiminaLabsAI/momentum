'use strict';

// Shared session-log writer for orchestration primitives.
//
// Appends a single line to <ecosystem-root>/sessions/YYYY-MM-DD.md per
// primitive invocation. Uses the same mkdir-based lock pattern as
// `core/ecosystem/scripts/session-append.sh` (Phase 10 BUG-004 fix)
// so we don't race with the PostToolUse hook commits.

const fs = require('node:fs');
const path = require('node:path');

const LOCK_BUDGET_MS = 5000;
const LOCK_POLL_MS = 50;

/**
 * Append a single event line to today's ecosystem session log.
 *
 * @param {object} opts
 * @param {string} opts.ecosystemRoot   absolute path to ecosystem root
 * @param {string} opts.memberId        member id of the originating repo
 * @param {string} opts.kind            event kind, e.g. 'scout' | 'dispatch' | 'handoff'
 * @param {string} opts.summary         one-line summary (no embedded newlines)
 * @param {string} [opts.context]       optional context (run id, artifact path, …)
 * @param {Date}   [opts.now]           override clock for tests
 * @returns {{ sessionFile: string, line: string, written: boolean }}
 */
function appendLine(opts) {
  const { ecosystemRoot, memberId, kind, summary, context = '', now = new Date() } = opts || {};
  if (!ecosystemRoot || !memberId || !kind || !summary) {
    return { sessionFile: '', line: '', written: false };
  }
  if (!fs.existsSync(path.join(ecosystemRoot, 'ecosystem.json'))) {
    return { sessionFile: '', line: '', written: false };
  }

  const sessionsDir = path.join(ecosystemRoot, 'sessions');
  fs.mkdirSync(sessionsDir, { recursive: true });
  const today = isoDate(now);
  const sessionFile = path.join(sessionsDir, `${today}.md`);
  const hhmm = isoHourMinute(now);

  const cleanSummary = summary.replace(/\r?\n/g, ' ').trim();
  const cleanContext = context.replace(/\r?\n/g, ' ').trim();
  const line = cleanContext
    ? `${hhmm}Z [${memberId}] ${kind}: ${cleanSummary} (${cleanContext})`
    : `${hhmm}Z [${memberId}] ${kind}: ${cleanSummary}`;

  const lockDir = `${sessionFile}.lock`;
  if (!acquireLock(lockDir)) {
    // Drop event silently rather than corrupt the file. Session events
    // are advisory; momentum's correctness does not depend on every
    // line landing.
    return { sessionFile, line, written: false };
  }

  try {
    if (!fs.existsSync(sessionFile)) {
      const header = [`# Session ${today}`, ''];
      const activePath = path.join(ecosystemRoot, '.state', 'active-initiative');
      if (fs.existsSync(activePath)) {
        const active = fs.readFileSync(activePath, 'utf8').trim();
        if (active) header.splice(1, 0, `Active initiative: ${active}`);
      }
      fs.writeFileSync(sessionFile, header.join('\n') + '\n');
    }
    fs.appendFileSync(sessionFile, line + '\n');

    const statePath = path.join(ecosystemRoot, '.state');
    fs.mkdirSync(statePath, { recursive: true });
    fs.writeFileSync(path.join(statePath, 'last-session'), today + '\n');
  } finally {
    releaseLock(lockDir);
  }

  return { sessionFile, line, written: true };
}

function acquireLock(lockDir) {
  const start = Date.now();
  while (Date.now() - start < LOCK_BUDGET_MS) {
    try {
      fs.mkdirSync(lockDir);
      return true;
    } catch (err) {
      if (err && err.code !== 'EEXIST') throw err;
      // Busy-wait briefly. Acceptable here — the lock holder is on the
      // same machine and releases within milliseconds in practice.
      sleepSync(LOCK_POLL_MS);
    }
  }
  return false;
}

function releaseLock(lockDir) {
  try {
    fs.rmdirSync(lockDir);
  } catch {
    // Lock directory may have already been released or never acquired.
  }
}

function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // intentional spin — only used briefly during lock contention
  }
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function isoHourMinute(d) {
  return d.toISOString().slice(11, 16);
}

module.exports = {
  appendLine,
  // Exported for tests:
  acquireLock,
  releaseLock,
};
