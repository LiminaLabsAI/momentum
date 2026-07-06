'use strict';

// handoff — cross-session control transfer with a structured context block.
//
// The originating agent (or CLI) calls handoff() to write a context
// block to the receiving repo's `.momentum/inbox/handoff-NNN.md`. The
// receiving agent — when a fresh session starts there — sees a
// SessionStart banner (Claude Code + Codex) or invokes /continue
// explicitly to read and act on the block.
//
// Cheap-layer side effects:
//   - inbox file written in receiving repo
//   - one line appended to the ecosystem session log
//
// Curated-layer side effects (auto, since handoff IS a decision):
//   - [DECISION] entry in originating repo's active phase history
//     (handed off to core/orchestration/tracking once G4 lands;
//     for now the entry is written here directly).

const fs = require('node:fs');
const path = require('node:path');

const eventsLib = require('./events');
const runArtifact = require('./run-artifact');
const sessionLog = require('./session-log');
const types = require('./types');

const INBOX_DIRNAME = path.join('.momentum', 'inbox');
const READ_DIRNAME = 'read';

const SENTINELS = {
  begin: '<!-- MOMENTUM_HANDOFF_BEGIN -->',
  end: '<!-- MOMENTUM_HANDOFF_END -->',
};

/**
 * Write a handoff context block to the receiving repo's inbox.
 *
 * @param {object} opts
 * @param {string} opts.fromRepo               originating repo (absolute path)
 * @param {string} opts.toRepo                 receiving repo (absolute path)
 * @param {string} opts.summary                one-line summary
 * @param {string[]} [opts.decisions]          bullet list
 * @param {string[]} [opts.filesTouched]
 * @param {string[]} [opts.verificationCommands]
 * @param {string[]} [opts.openQuestions]
 * @param {string} [opts.originatingPhase]     e.g. "phase-11-orchestration-handover"
 * @param {object} [opts.ecosystem]            { rootPath, memberId }
 * @param {object} [opts.emitter]
 * @param {boolean} [opts.silent]
 * @returns {Promise<HandoffBlock>}
 */
async function handoff(opts) {
  const {
    fromRepo, toRepo, summary,
    decisions = [], filesTouched = [],
    verificationCommands = [], openQuestions = [],
    ecosystem,
  } = opts;

  if (!fromRepo || !toRepo || !summary) {
    throw new Error('orchestration/handoff: fromRepo, toRepo, summary are required');
  }
  if (!fs.existsSync(toRepo)) {
    throw new Error(`orchestration/handoff: toRepo does not exist: ${toRepo}`);
  }

  const originatingPhase = opts.originatingPhase || detectActivePhase(fromRepo);

  const emitter = opts.emitter || eventsLib.createEmitter({ primitive: 'handoff', repo: fromRepo });
  if (!opts.emitter && !opts.silent) {
    emitter.on(eventsLib.createRenderer({ stream: process.stdout }));
  }
  if (ecosystem) {
    emitter.on(eventsLib.createPersister({
      ecosystemRoot: ecosystem.rootPath,
      memberId: ecosystem.memberId,
    }));
  }

  emitter.emit('started', { message: `${path.basename(fromRepo)} → ${path.basename(toRepo)}` });

  // Allocate handoff id in the RECEIVING repo so multiple originating
  // repos don't collide on the same numeric counter for the same
  // target.
  const handoffId = runArtifact.allocateRunId({ repo: toRepo, primitive: 'handoff' });
  const inboxDir = path.join(toRepo, INBOX_DIRNAME);
  fs.mkdirSync(inboxDir, { recursive: true });
  const inboxPath = path.join(inboxDir, `handoff-${handoffId}.md`);
  const createdAt = new Date().toISOString();

  const block = {
    fromRepo,
    toRepo,
    summary,
    decisions: arrayify(decisions),
    filesTouched: arrayify(filesTouched),
    verificationCommands: arrayify(verificationCommands),
    openQuestions: arrayify(openQuestions),
    originatingPhase,
    originatingHistoryRef: '',  // populated below after history write
    inboxPath,
    handoffId,
    createdAt,
  };

  // Write inbox file with sentinel-fenced sections.
  fs.writeFileSync(inboxPath, renderInbox(block));
  emitter.emit('step', { message: `wrote ${path.relative(fromRepo, inboxPath) || inboxPath}` });

  // Emit [DECISION] in the originating repo's active phase history if
  // a phase directory exists. G4's tracking helper will subsume this;
  // for now we inline the write so the contract holds even before G4
  // wires the dedicated helper.
  if (originatingPhase) {
    const historyRef = appendOriginatingDecision({
      fromRepo,
      originatingPhase,
      handoffId,
      toRepo,
      summary,
      createdAt,
    });
    if (historyRef) block.originatingHistoryRef = historyRef;
  }

  emitter.emit('finished', { runArtifactPath: inboxPath });

  return types.validateHandoffBlock(block);
}

// ── render / parse the inbox block ─────────────────────────────────────────

function renderInbox(block) {
  const lines = [
    `# handoff-${block.handoffId}`,
    '',
    SENTINELS.begin,
    `**fromRepo:** ${block.fromRepo}`,
    `**toRepo:** ${block.toRepo}`,
    `**handoffId:** ${block.handoffId}`,
    `**createdAt:** ${block.createdAt}`,
    `**originatingPhase:** ${block.originatingPhase || ''}`,
    `**originatingHistoryRef:** ${block.originatingHistoryRef || ''}`,
    '',
    '## Summary',
    block.summary,
    '',
  ];
  if (block.decisions.length) {
    lines.push('## Decisions');
    for (const d of block.decisions) lines.push(`- ${d}`);
    lines.push('');
  }
  if (block.filesTouched.length) {
    lines.push('## Files touched');
    for (const f of block.filesTouched) lines.push(`- ${f}`);
    lines.push('');
  }
  if (block.verificationCommands.length) {
    lines.push('## Verification commands');
    for (const v of block.verificationCommands) lines.push(`- \`${v}\``);
    lines.push('');
  }
  if (block.openQuestions.length) {
    lines.push('## Open questions');
    for (const q of block.openQuestions) lines.push(`- ${q}`);
    lines.push('');
  }
  lines.push(SENTINELS.end);
  return lines.join('\n') + '\n';
}

/**
 * Parse an inbox file back into a HandoffBlock. Used by continue.js
 * + the SessionStart hook.
 */
function parseInbox(inboxPath) {
  if (!fs.existsSync(inboxPath)) {
    throw new Error(`orchestration/handoff: inbox file not found: ${inboxPath}`);
  }
  const text = fs.readFileSync(inboxPath, 'utf8');
  const beginIdx = text.indexOf(SENTINELS.begin);
  const endIdx = text.indexOf(SENTINELS.end);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
    throw new Error(`orchestration/handoff: malformed inbox file: ${inboxPath}`);
  }
  // Keep the END sentinel in `inner` so the section regex can anchor
  // its non-greedy capture against it for the LAST section.
  const inner = text.slice(beginIdx + SENTINELS.begin.length, endIdx + SENTINELS.end.length);
  const block = {
    fromRepo: extract(inner, 'fromRepo'),
    toRepo: extract(inner, 'toRepo'),
    handoffId: extract(inner, 'handoffId'),
    createdAt: extract(inner, 'createdAt'),
    originatingPhase: extract(inner, 'originatingPhase'),
    originatingHistoryRef: extract(inner, 'originatingHistoryRef'),
    summary: extractSection(inner, 'Summary') || '',
    decisions: extractBullets(inner, 'Decisions'),
    filesTouched: extractBullets(inner, 'Files touched'),
    verificationCommands: extractBullets(inner, 'Verification commands').map(stripBackticks),
    openQuestions: extractBullets(inner, 'Open questions'),
    inboxPath,
  };
  return types.validateHandoffBlock(block);
}

function extract(text, key) {
  // `\\s*` would consume the trailing newline and pull content from
  // the next line when the value is empty. Use a horizontal-whitespace
  // class (` *|\\t*`) so we stop at end of the same line.
  const re = new RegExp(`^\\*\\*${key}:\\*\\*[ \\t]*(.*)$`, 'm');
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

function extractSection(text, heading) {
  // Capture from "## <heading>\n" up to the NEXT "## " heading or the
  // closing sentinel. Multiline flag for ^ anchors; no `$` alternative
  // (a line-end inside a section would cut off bullets prematurely).
  const re = new RegExp(
    `^## ${heading}\\s*\\n([\\s\\S]*?)(?=^## |^${SENTINELS.end.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`,
    'm',
  );
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

function extractBullets(text, heading) {
  const section = extractSection(text, heading);
  if (!section) return [];
  return section
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('- '))
    .map((l) => l.slice(2).trim());
}

function stripBackticks(s) {
  return s.replace(/^`(.*)`$/, '$1');
}

function arrayify(v) {
  if (v == null || v === false) return [];
  if (Array.isArray(v)) return v;
  return [String(v)];
}

// ── inbox utilities ────────────────────────────────────────────────────────

function listPending(repo) {
  const dir = path.join(repo, INBOX_DIRNAME);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /^handoff-\d{3}\.md$/.test(e.name))
    .map((e) => path.join(dir, e.name))
    .sort();
}

function markRead(inboxPath) {
  const dir = path.dirname(inboxPath);
  const readDir = path.join(dir, READ_DIRNAME);
  fs.mkdirSync(readDir, { recursive: true });
  const dest = path.join(readDir, path.basename(inboxPath));
  fs.renameSync(inboxPath, dest);
  return dest;
}

// ── originating-repo decision write ────────────────────────────────────────

function detectActivePhase(repo) {
  const phasesDir = path.join(repo, 'specs', 'phases');
  if (!fs.existsSync(phasesDir)) return null;
  // Try the most recently modified phase- directory.
  const entries = fs
    .readdirSync(phasesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^phase-/.test(e.name))
    .map((e) => {
      const p = path.join(phasesDir, e.name);
      const stat = fs.statSync(p);
      return { name: e.name, mtime: stat.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
  return entries.length ? entries[0].name : null;
}

function appendOriginatingDecision({ fromRepo, originatingPhase, handoffId, toRepo, summary, createdAt }) {
  const historyPath = path.join(fromRepo, 'specs', 'phases', originatingPhase, 'history.md');
  if (!fs.existsSync(historyPath)) return null;
  const date = createdAt.slice(0, 10);
  const heading = `[DECISION] ${date} — Handoff #${handoffId} → ${path.basename(toRepo)}`;
  const entry = [
    '',
    `### ${heading}`,
    `Topics: orchestration, handoff, handoff-${handoffId}`,
    `Affects-phases: ${originatingPhase} (or "none")`,
    `Affects-specs: ${path.relative(fromRepo, path.join(toRepo, INBOX_DIRNAME, `handoff-${handoffId}.md`))}`,
    `Detail: Handoff #${handoffId} written to ${path.basename(toRepo)}/.momentum/inbox/. Summary: ${summary}`,
    '',
    '---',
    '',
  ].join('\n');
  fs.appendFileSync(historyPath, entry);
  return heading;
}

module.exports = {
  handoff,
  renderInbox,
  parseInbox,
  listPending,
  markRead,
  detectActivePhase,
  SENTINELS,
  INBOX_DIRNAME,
};
