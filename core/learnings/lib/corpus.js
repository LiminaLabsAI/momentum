'use strict';

/**
 * Phase 34 G1 — reading momentum's own evidence.
 *
 * The I/O half of the learnings subsystem. `patterns.js` is pure and takes the
 * corpus this module produces, the same split as `governor.decide()` /
 * `manifest.js` and `parity.check()` / `selfcheck`.
 *
 * ## Why the backlog parser is a real parser
 *
 * Because the hand-rolled version was wrong. On 2026-07-28 an audit of this
 * project's own backlog reported **seven** stale entries including two P1s. The
 * truth was **four**, and none was P1. The audit split each row on every `|`,
 * and three rows carry pipes inside their description text —
 * `apply_patch\|shell`, `Edit\|Write`, and one that was simply unescaped — so
 * the priority cell it read was description text and the status cell was the
 * priority.
 *
 * A tool that reads the backlog to tell you what is true has to be right about
 * what the backlog says. That means honouring markdown's `\|` escape, not
 * approximating it.
 */

const fs = require('fs');
const path = require('path');

/** Markdown escapes a literal pipe as `\|`. Split on the unescaped ones only. */
function splitRow(line) {
  return line
    .split(/(?<!\\)\|/)
    .map((c) => c.trim());
}

/**
 * Parse backlog rows into records.
 *
 * Returns `[]` rather than throwing on junk: this feeds an advisory surface, and
 * a reporter that dies on one malformed row is a reporter nobody keeps.
 */
function parseBacklog(text) {
  const out = [];
  for (const line of String(text || '').split('\n')) {
    if (!/^\|\s*(BUG|FEAT|TD|ENH|VAL)-\d+\s*\|/.test(line)) continue;
    const c = splitRow(line);
    // c[0] is the empty string before the leading pipe.
    const [, id, title, priority, status, phase, ...rest] = c;
    if (!id) continue;
    out.push({
      id,
      title: title || '',
      priority: priority || '',
      status: status || '',
      phase: phase || '',
      detail: rest.join(' ').trim(),
    });
  }
  return out;
}

/** True when a row is still open — the only rows a staleness check should consider. */
function isOpen(row) {
  return /^open\b/i.test(String(row.status || '').trim());
}

/**
 * Parse the `## <ID>` / `file:line: text` marker blocks produced by a grep over
 * `core/ bin/ tests/ scripts/`.
 */
function parseMarkers(text) {
  const byId = {};
  let current = null;
  for (const line of String(text || '').split('\n')) {
    const head = line.match(/^##\s+([A-Z]+-\d+)\s*$/);
    if (head) { current = head[1]; byId[current] = []; continue; }
    if (!current || !line.trim() || line.startsWith('#')) continue;
    const m = line.match(/^([^:]+):(\d+):(.*)$/);
    if (m) byId[current].push({ file: m[1], line: Number(m[2]), text: m[3].trim() });
  }
  return byId;
}

/** Read a frozen benchmark directory into the corpus shape. */
function fromFixture(dir) {
  const read = (f) => {
    try { return fs.readFileSync(path.join(dir, f), 'utf8'); } catch (_e) { return ''; }
  };
  return {
    rows: [
      ...parseBacklog(read(path.join('corpus', 'stale-closure-rows.md'))),
      ...parseBacklog(read(path.join('corpus', 'ships-broken-rows.md'))),
    ],
    markers: parseMarkers(read(path.join('corpus', 'code-markers.md'))),
    prose: [
      read(path.join('corpus', 'phase-33-pattern.md')),
      read(path.join('corpus', 'ships-broken-rows.md')),
    ].filter(Boolean),
  };
}

const SCAN_DIRS = ['core', 'bin', 'scripts', 'tests'];
const SCAN_EXT = /\.(js|sh|md|json)$/;
const SKIP_DIR = /^(node_modules|\.git|benchmarks)$/;

/**
 * Collect `ID → [{file, line, text}]` by scanning source for backlog ids.
 *
 * This exists because without it `findStaleClosure` could never fire in
 * production: it takes `markers`, and a `fromRepo` that returned `{}` would
 * make the whole stale-closure half unreachable outside its fixture. That is
 * BUG-031's shape exactly — a function whose only callers pass it test data —
 * and this project has now shipped that defect three times. Building the
 * reader in the same group as the analyser is how it stops being possible.
 */
function scanMarkers(root, ids) {
  const want = new Set(ids);
  const byId = {};
  if (!want.size) return byId;

  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_e) { return; }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!SKIP_DIR.test(e.name)) walk(path.join(dir, e.name));
        continue;
      }
      if (!SCAN_EXT.test(e.name)) continue;
      const full = path.join(dir, e.name);
      let text;
      try { text = fs.readFileSync(full, 'utf8'); } catch (_e) { continue; }
      const rel = path.relative(root, full);
      text.split('\n').forEach((line, i) => {
        const hits = line.match(/\b(?:BUG|FEAT|TD|ENH|VAL)-\d+\b/g);
        if (!hits) return;
        for (const id of new Set(hits)) {
          if (!want.has(id)) continue;
          (byId[id] = byId[id] || []).push({ file: rel, line: i + 1, text: line.trim() });
        }
      });
    }
  };

  for (const d of SCAN_DIRS) walk(path.join(root, d));
  return byId;
}

/** Read a live momentum project into the same shape. */
function fromRepo(root) {
  const read = (p) => {
    try { return fs.readFileSync(p, 'utf8'); } catch (_e) { return ''; }
  };
  const backlog = read(path.join(root, 'specs', 'backlog', 'backlog.md'));
  const prose = [backlog];
  const phasesDir = path.join(root, 'specs', 'phases');
  let phases = [];
  try { phases = fs.readdirSync(phasesDir); } catch (_e) { phases = []; }
  for (const p of phases) {
    for (const f of ['history.md', 'retrospective.md']) {
      const t = read(path.join(phasesDir, p, f));
      if (t) prose.push(t);
    }
  }
  const rows = parseBacklog(backlog);
  // Only open rows can be stale, so only their ids are worth scanning for.
  const markers = scanMarkers(root, rows.filter(isOpen).map((r) => r.id));
  return { rows, markers, prose };
}

module.exports = { splitRow, parseBacklog, isOpen, parseMarkers, scanMarkers, fromFixture, fromRepo };
