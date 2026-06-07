'use strict';

// scout — read-only single-repo context fetch.
//
// Walks the target repo's spec tree + recent history, summarises what
// it finds relative to the user's prompt, and returns a structured
// ScoutResult. Cheap-layer side effects: writes a scout-NNN.md run
// artifact and appends one line to the ecosystem session log.
//
// In-process mode (CLI floor): file-system walker only. Returns a
// summary stitched from file contents — no LLM synthesis available
// from raw Node.
//
// In-agent mode (invoked from a slash command on Claude Code / Codex /
// Antigravity): the agent does the reading + summarising in its own
// context (via Task tool or equivalent). The agent then calls back
// into this library with a structured result to record the artifact +
// session log line.

const fs = require('node:fs');
const path = require('node:path');

const eventsLib = require('./events');
const runArtifact = require('./run-artifact');
const sessionLog = require('./session-log');
const types = require('./types');

const DEFAULT_SCAN_FILES = [
  'specs/status.md',
  'specs/backlog/backlog.md',
  'README.md',
  'CLAUDE.md',
  'AGENTS.md',
  'package.json',
];

const DEFAULT_SCAN_DIRS = [
  'specs/architecture',
  'specs/phases',
  'specs/decisions',
];

const MAX_FILE_BYTES = 64 * 1024;
const MAX_FILES_READ = 30;

/**
 * Run a scout in-process against the target repo.
 *
 * @param {object} opts
 * @param {string}  opts.repo              absolute path to target repo
 * @param {string}  opts.prompt            user-provided scope prompt
 * @param {string}  [opts.originatingRepo] absolute path to invoking repo (defaults to opts.repo)
 * @param {object}  [opts.adapter]         adapter module (only used for events context)
 * @param {object}  [opts.emitter]         pre-built event emitter (otherwise a quiet one is created)
 * @param {object}  [opts.ecosystem]       { rootPath, memberId } — when present, session log is written
 * @param {boolean} [opts.silent]          suppress default renderer (tests)
 * @returns {Promise<ScoutResult>}
 */
async function scout(opts) {
  const { repo, prompt } = opts;
  if (!repo || !prompt) {
    throw new Error('orchestration/scout: opts.repo and opts.prompt are required');
  }
  const originatingRepo = opts.originatingRepo || repo;
  const start = Date.now();

  const emitter = opts.emitter || eventsLib.createEmitter({ primitive: 'scout', repo });
  if (!opts.emitter && !opts.silent) {
    emitter.on(eventsLib.createRenderer({ stream: process.stdout }));
  }
  if (opts.ecosystem) {
    emitter.on(eventsLib.createPersister({
      ecosystemRoot: opts.ecosystem.rootPath,
      memberId: opts.ecosystem.memberId,
    }));
  }

  emitter.emit('started', { message: prompt });

  const filesRead = [];
  const sections = [];

  for (const rel of DEFAULT_SCAN_FILES) {
    const abs = path.join(repo, rel);
    if (!fs.existsSync(abs)) continue;
    if (filesRead.length >= MAX_FILES_READ) break;
    const content = readClampedFile(abs);
    if (content == null) continue;
    filesRead.push(rel);
    emitter.emit('step', { message: `reading ${rel}` });
    const snippet = extractRelevantSnippet(content, prompt);
    if (snippet) sections.push({ source: rel, snippet });
  }

  for (const relDir of DEFAULT_SCAN_DIRS) {
    if (filesRead.length >= MAX_FILES_READ) break;
    const absDir = path.join(repo, relDir);
    if (!fs.existsSync(absDir)) continue;
    for (const file of listMarkdownFiles(absDir, MAX_FILES_READ - filesRead.length)) {
      const abs = path.join(absDir, file);
      const rel = path.join(relDir, file);
      const content = readClampedFile(abs);
      if (content == null) continue;
      filesRead.push(rel);
      emitter.emit('step', { message: `reading ${rel}` });
      const snippet = extractRelevantSnippet(content, prompt);
      if (snippet) sections.push({ source: rel, snippet });
    }
  }

  const summary = renderSummary({ repo, prompt, sections });
  const findings = []; // in-process scout does not infer findings; agent-driven scout adds them via record()
  const duration = Date.now() - start;

  const { runId, artifactPath } = runArtifact.writeWithAllocatedId({
    repo: originatingRepo,
    primitive: 'scout',
    bodyFor: (id) => renderArtifact({ runId: id, repo, prompt, filesRead, sections, summary, findings, duration }),
  });

  emitter.context.runId = runId;
  emitter.emit('finished', { duration, runArtifactPath: artifactPath });

  const result = {
    repo,
    prompt,
    summary,
    findings,
    filesRead,
    duration,
    runArtifactPath: artifactPath,
    runId,
  };
  return types.validateScoutResult(result);
}

/**
 * Record a scout that was performed by an external agent (e.g., a
 * Claude Code subagent invoked via a slash command). The agent passes
 * in the result fields; we write the artifact + log line uniformly so
 * slash + CLI doors produce identical output shape.
 *
 * @param {object} opts
 * @param {string} opts.repo
 * @param {string} opts.prompt
 * @param {string} opts.summary
 * @param {Finding[]} [opts.findings]
 * @param {string[]} [opts.filesRead]
 * @param {string} [opts.originatingRepo]
 * @param {object} [opts.ecosystem]
 * @param {number} [opts.duration]
 * @returns {ScoutResult}
 */
function record(opts) {
  const {
    repo, prompt, summary,
    findings = [], filesRead = [],
    originatingRepo = repo,
    ecosystem,
    duration = 0,
  } = opts;
  if (!repo || !prompt || !summary) {
    throw new Error('orchestration/scout.record: repo, prompt, summary required');
  }
  const { runId, artifactPath } = runArtifact.writeWithAllocatedId({
    repo: originatingRepo,
    primitive: 'scout',
    bodyFor: (id) => renderArtifact({ runId: id, repo, prompt, filesRead, sections: [], summary, findings, duration }),
  });
  if (ecosystem && ecosystem.rootPath && ecosystem.memberId) {
    sessionLog.appendLine({
      ecosystemRoot: ecosystem.rootPath,
      memberId: ecosystem.memberId,
      kind: 'scout',
      summary: `${repo}: ${prompt}`,
      context: `run-${runId} → ${path.relative(originatingRepo, artifactPath)}`,
    });
  }
  // Tracking contract: each finding proposed as [DISCOVERY] in the
  // SCOUTED repo's active phase history when meaningful per Rule 3.
  // No backlog.md writes — tracking returns a hint the caller can act
  // on with explicit user confirmation.
  const tracking = require('./tracking');
  for (const finding of findings) {
    tracking.proposeDiscovery({ primitive: 'scout', finding, targetRepo: repo });
  }
  const result = {
    repo, prompt, summary,
    findings, filesRead,
    duration,
    runArtifactPath: artifactPath,
    runId,
  };
  return types.validateScoutResult(result);
}

// ── helpers ────────────────────────────────────────────────────────────────

function readClampedFile(abs) {
  try {
    const stat = fs.statSync(abs);
    if (!stat.isFile()) return null;
    if (stat.size === 0) return '';
    const buf = Buffer.alloc(Math.min(stat.size, MAX_FILE_BYTES));
    const fd = fs.openSync(abs, 'r');
    try {
      const bytes = fs.readSync(fd, buf, 0, buf.length, 0);
      return buf.slice(0, bytes).toString('utf8');
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return null;
  }
}

function listMarkdownFiles(dir, max) {
  const out = [];
  function walk(rel) {
    if (out.length >= max) return;
    const abs = path.join(dir, rel);
    let entries = [];
    try {
      entries = fs.readdirSync(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (out.length >= max) return;
      if (e.name.startsWith('.') || e.name.startsWith('_')) continue;
      const next = rel ? path.join(rel, e.name) : e.name;
      if (e.isDirectory()) {
        walk(next);
      } else if (e.isFile() && /\.md$/.test(e.name)) {
        out.push(next);
      }
    }
  }
  walk('');
  return out;
}

function extractRelevantSnippet(content, prompt) {
  const keywords = tokenize(prompt);
  if (keywords.length === 0) {
    return clampSnippet(content.split('\n').slice(0, 12).join('\n'));
  }
  const lines = content.split('\n');
  const hits = [];
  const lower = lines.map((l) => l.toLowerCase());
  for (let i = 0; i < lines.length; i++) {
    if (keywords.some((k) => lower[i].includes(k))) {
      const start = Math.max(0, i - 2);
      const end = Math.min(lines.length, i + 4);
      hits.push(lines.slice(start, end).join('\n'));
      if (hits.length >= 3) break;
    }
  }
  if (hits.length === 0) return null;
  return clampSnippet(hits.join('\n…\n'));
}

function tokenize(prompt) {
  return prompt
    .toLowerCase()
    .split(/[^a-z0-9_-]+/i)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'from', 'are', 'was',
  'have', 'has', 'will', 'what', 'how', 'why', 'when', 'where', 'shape',
  'state', 'current', 'status',
]);

function clampSnippet(s) {
  if (s.length <= 800) return s;
  return s.slice(0, 800) + '\n…[truncated]';
}

function renderSummary({ repo, prompt, sections }) {
  if (sections.length === 0) {
    return `No content matching "${prompt}" was found in ${repo}'s spec tree.`;
  }
  const head = `Found ${sections.length} relevant section(s) in ${repo} for prompt "${prompt}":`;
  const bullets = sections.map((s) => `  - ${s.source}`).join('\n');
  return `${head}\n${bullets}`;
}

function renderArtifact({ runId, repo, prompt, filesRead, sections, summary, findings, duration }) {
  const lines = [
    `# scout-${runId} — ${repo}`,
    '',
    `**Prompt:** ${prompt}`,
    `**Duration:** ${duration}ms`,
    `**Files read (${filesRead.length}):**`,
    filesRead.length ? filesRead.map((f) => `  - ${f}`).join('\n') : '  (none)',
    '',
    '## Summary',
    '',
    summary,
    '',
  ];
  if (findings.length) {
    lines.push('## Findings', '');
    for (const f of findings) {
      lines.push(`- **${f.kind || 'note'}**: ${f.title}`);
      if (f.detail) lines.push(`  ${f.detail}`);
    }
    lines.push('');
  }
  if (sections.length) {
    lines.push('## Sections', '');
    for (const s of sections) {
      lines.push(`### ${s.source}`, '', '```', s.snippet, '```', '');
    }
  }
  return lines.join('\n');
}

module.exports = {
  scout,
  record,
  // exported for tests:
  extractRelevantSnippet,
  tokenize,
};
