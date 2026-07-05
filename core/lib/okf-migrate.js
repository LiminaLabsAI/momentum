'use strict';

/**
 * OKF v0.1 bundle migration + index generation + conformance checking
 * (Phase 24, ADR-0005).
 *
 * migrate(targetDir):
 *   1. specs/phases/index.json  → per-phase overview.md frontmatter
 *      (type/status/tags/deps), then the JSON file is deleted. A listed
 *      phase without an overview.md gets a minimal one — no data is lost.
 *   2. specs/decisions/impact-map.json → impact-map.md (one table).
 *   3. Frontmatter sweep: every frontmatter-less specs/**\/*.md gains
 *      `type:` (core/lib/okf-types.js taxonomy) with the body preserved
 *      byte-for-byte; parseable frontmatter missing `type` gets a single
 *      line inserted textually; unparseable frontmatter → file untouched
 *      (reported). Reserved index.md / log.md are never touched.
 *   4. Root specs/index.md (`okf_version: "0.1"`) + generated listings
 *      for phases/ and decisions/.
 *   Idempotent: a second run reports zero changes.
 *
 * All writes are user-content (specs/) — callers must NOT record these
 * paths in the managed-file manifest (orphan cleanup must never touch
 * user specs).
 */

const fs = require('fs');
const path = require('path');

const fm = require('./frontmatter');
const { typeForPath, isReserved } = require('./okf-types');

const OKF_VERSION = '0.1';

function readIf(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function walkMd(dir, base = dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walkMd(abs, base, out);
    else if (e.name.endsWith('.md')) out.push(path.relative(base, abs).split(path.sep).join('/'));
  }
  return out;
}

/** First `# ` heading text, or null. */
function firstHeading(content) {
  const m = String(content).match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

// --- step 1: distribute index.json ----------------------------------------

function distributePhaseIndex(specsRoot, actions, dryRun) {
  const indexPath = path.join(specsRoot, 'phases', 'index.json');
  const rawIndex = readIf(indexPath);
  if (rawIndex === null) return;

  let index;
  try {
    index = JSON.parse(rawIndex);
  } catch {
    actions.warnings.push('phases/index.json is unreadable JSON — left in place');
    return;
  }

  for (const [id, entry] of Object.entries(index.phases || {})) {
    const overviewAbs = path.join(specsRoot, 'phases', id, 'overview.md');
    const existing = readIf(overviewAbs);
    const meta = {
      type: 'Phase',
      status: String(entry.status || 'planned'),
    };
    const topics = Array.isArray(entry.topics) ? entry.topics.map(String) : [];
    if (topics.length) meta.tags = topics;
    const deps = Array.isArray(entry.deps) ? entry.deps.map(String) : [];
    if (deps.length) meta.deps = deps;

    if (existing === null) {
      const body = `\n# ${id}\n\n> Recreated from specs/phases/index.json during the OKF migration —\n> the phase directory had no overview.md.\n`;
      actions.writes.push({ rel: `phases/${id}/overview.md`, content: fm.compose(meta, body), why: 'index.json entry without overview.md' });
      continue;
    }

    const parsed = fm.parse(existing);
    if (parsed.data === null && fm.hasBlock(existing)) {
      actions.warnings.push(`phases/${id}/overview.md has frontmatter outside the momentum subset — index.json data NOT distributed to it`);
      continue;
    }
    if (parsed.data && parsed.data.status) continue; // already migrated

    if (parsed.data === null) {
      // No frontmatter at all — prepend the full block, body byte-preserved.
      actions.writes.push({ rel: `phases/${id}/overview.md`, content: fm.compose(meta, `\n${existing}`), why: 'distributed from index.json' });
    } else {
      // Frontmatter exists (e.g. swarm brief) — merge missing keys, keep order/unknowns.
      const merged = { ...meta, ...parsed.data };
      if (!merged.type) merged.type = 'Phase';
      actions.writes.push({ rel: `phases/${id}/overview.md`, content: fm.compose(merged, parsed.body), why: 'merged index.json data into existing frontmatter' });
    }
  }

  actions.deletes.push({ rel: 'phases/index.json', why: 'distributed into phase overview.md frontmatter' });
  if (!dryRun) {
    for (const w of actions.writes) {
      const abs = path.join(specsRoot, w.rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, w.content);
    }
    fs.unlinkSync(indexPath);
  }
}

// --- step 2: impact-map.json → impact-map.md -------------------------------

function convertImpactMap(specsRoot, actions, dryRun) {
  const jsonPath = path.join(specsRoot, 'decisions', 'impact-map.json');
  const raw = readIf(jsonPath);
  if (raw === null) return;

  let map;
  try {
    map = JSON.parse(raw);
  } catch {
    actions.warnings.push('decisions/impact-map.json is unreadable JSON — left in place');
    return;
  }

  const rows = [];
  for (const [topic, spec] of Object.entries(map.topics || {})) {
    for (const f of spec.files || []) {
      rows.push(`| ${topic} | ${f.path} | ${f.section || ''} |`);
    }
  }
  const body = [
    '',
    '# Impact Map',
    '',
    'Maps topic keywords to the spec files/sections they affect. Used by',
    '`/sync-docs` to find documents needing updates when a phase history',
    'entry carries matching `Topics:`.',
    '',
    '| Topic | File | Section |',
    '|-------|------|---------|',
    ...rows,
    '',
  ].join('\n');
  const content = fm.compose(
    {
      type: 'Impact Map',
      title: 'Decision Impact Map',
      description: 'Topic keywords → spec files/sections, consumed by /sync-docs.',
    },
    body,
  );

  const mdRel = 'decisions/impact-map.md';
  actions.converted.push({ rel: mdRel, content, why: 'converted from impact-map.json' });
  actions.deletes.push({ rel: 'decisions/impact-map.json', why: 'converted to impact-map.md' });
  if (!dryRun) {
    fs.writeFileSync(path.join(specsRoot, mdRel), content);
    fs.unlinkSync(jsonPath);
  }
}

// --- step 3: frontmatter sweep ---------------------------------------------

function sweepFrontmatter(specsRoot, actions, dryRun) {
  // Files the distribute step already (re)wrote carry frontmatter now; in
  // dry-run they are still frontmatter-less on disk — skip to avoid
  // double-counting them in the preview.
  const pendingWrites = new Set(actions.writes.map((w) => w.rel));
  for (const rel of walkMd(specsRoot)) {
    if (isReserved(rel)) continue;
    if (pendingWrites.has(rel)) continue;
    const abs = path.join(specsRoot, rel);
    const content = readIf(abs);
    if (content === null) continue;

    const type = typeForPath(rel);
    if (!type) continue;

    if (!fm.hasBlock(content)) {
      const updated = fm.compose({ type }, `\n${content}`);
      actions.injected.push(rel);
      if (!dryRun) fs.writeFileSync(abs, updated);
      continue;
    }
    const parsed = fm.parse(content);
    if (parsed.data === null) {
      actions.warnings.push(`${rel} has frontmatter outside the momentum subset — left untouched`);
      continue;
    }
    if (!parsed.data.type) {
      const updated = fm.insertTypeLine(content, type);
      actions.injected.push(rel);
      if (!dryRun) fs.writeFileSync(abs, updated);
    }
  }
}

// --- step 4: index generation ----------------------------------------------

function phaseListing(specsRoot) {
  const phasesDir = path.join(specsRoot, 'phases');
  let entries;
  try {
    entries = fs.readdirSync(phasesDir, { withFileTypes: true });
  } catch {
    return null;
  }
  const lines = ['# Phases', ''];
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  for (const id of dirs) {
    const overview = readIf(path.join(phasesDir, id, 'overview.md'));
    if (overview === null) continue;
    const { data } = fm.parse(overview);
    const status = data && data.status ? data.status : 'unknown';
    lines.push(`* [${id}](/phases/${id}/overview.md) - ${status}`);
  }
  const readme = fs.existsSync(path.join(phasesDir, 'README.md'));
  if (readme) lines.push('', '# Guides', '', '* [Phases guide](/phases/README.md) - conventions for phase directories');
  return `${lines.join('\n')}\n`;
}

function decisionListing(specsRoot) {
  const decDir = path.join(specsRoot, 'decisions');
  let entries;
  try {
    entries = fs.readdirSync(decDir, { withFileTypes: true });
  } catch {
    return null;
  }
  const lines = ['# Decisions', ''];
  for (const e of entries.filter((x) => x.isFile() && x.name.endsWith('.md') && x.name !== 'index.md' && x.name !== 'README.md').sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const content = readIf(path.join(decDir, e.name)) || '';
    const { data, body } = fm.parse(content);
    const title = (data && data.title) || firstHeading(body || content) || e.name;
    const desc = data && data.description ? ` - ${data.description}` : '';
    lines.push(`* [${title}](/decisions/${e.name})${desc}`);
  }
  return `${lines.join('\n')}\n`;
}

function rootIndex(specsRoot) {
  const lines = [];
  const entryIf = (rel, title, desc) => {
    if (fs.existsSync(path.join(specsRoot, rel))) lines.push(`* [${title}](/${rel}) - ${desc}`);
  };
  lines.push('# Specs', '');
  entryIf('status.md', 'Status', 'current project state — the first file to read');
  entryIf('backlog/backlog.md', 'Backlog', 'bugs, features, tech debt, enhancements');
  entryIf('planning/roadmap.md', 'Roadmap', 'phase timeline and upcoming work');
  lines.push('', '# Directories', '');
  // The listing files are written in this same pass — key on the source
  // directories, not the listing files, so the output is run-stable.
  if (fs.existsSync(path.join(specsRoot, 'phases'))) {
    lines.push('* [Phases](/phases/index.md) - one directory per phase (overview, plan, tasks, history)');
  }
  if (fs.existsSync(path.join(specsRoot, 'decisions'))) {
    lines.push('* [Decisions](/decisions/index.md) - architecture decision records + impact map');
  }
  if (fs.existsSync(path.join(specsRoot, 'adhoc'))) {
    lines.push('* [Ad-hoc work](/adhoc/) - quick-task and spike records (Rule 14)');
  }
  if (fs.existsSync(path.join(specsRoot, 'changelog'))) {
    lines.push('* [Changelog](/changelog/) - month-by-month change log');
  }
  return `---\nokf_version: ${fm.quoteScalar(OKF_VERSION)}\n---\n\n${lines.join('\n')}\n`;
}

/**
 * Generate/refresh the bundle indexes (root + phases + decisions).
 * Deterministic and idempotent; used by migrate() and `momentum okf index`.
 */
function generateIndexes(targetDir, { dryRun = false } = {}) {
  const specsRoot = path.join(targetDir, 'specs');
  if (!fs.existsSync(specsRoot)) return [];
  const writes = [
    { rel: 'index.md', content: rootIndex(specsRoot) },
    { rel: 'phases/index.md', content: phaseListing(specsRoot) },
    { rel: 'decisions/index.md', content: decisionListing(specsRoot) },
  ].filter((w) => w.content !== null);

  const changed = [];
  for (const w of writes) {
    const abs = path.join(specsRoot, w.rel);
    if (readIf(abs) === w.content) continue;
    changed.push(w.rel);
    if (!dryRun) {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, w.content);
    }
  }
  return changed;
}

/**
 * Run the full OKF migration. Returns a report:
 * { applicable, writes, converted, injected, deletes, indexes, warnings }
 */
function migrate(targetDir, { dryRun = false } = {}) {
  const specsRoot = path.join(targetDir, 'specs');
  const actions = { applicable: true, writes: [], converted: [], injected: [], deletes: [], indexes: [], warnings: [] };
  if (!fs.existsSync(specsRoot)) {
    actions.applicable = false;
    return actions;
  }
  distributePhaseIndex(specsRoot, actions, dryRun);
  convertImpactMap(specsRoot, actions, dryRun);
  sweepFrontmatter(specsRoot, actions, dryRun);
  // Index generation needs the swept files on disk; in dry-run it previews
  // against the current tree instead.
  actions.indexes = generateIndexes(targetDir, { dryRun });
  return actions;
}

// --- conformance check -------------------------------------------------------

/**
 * OKF v0.1 conformance report for targetDir/specs.
 * @returns {{ applicable, files: number, violations: {rel, problem}[], warnings: string[] }}
 */
function check(targetDir) {
  const specsRoot = path.join(targetDir, 'specs');
  const report = { applicable: true, files: 0, violations: [], warnings: [] };
  if (!fs.existsSync(specsRoot)) {
    report.applicable = false;
    return report;
  }
  for (const rel of walkMd(specsRoot)) {
    report.files += 1;
    const content = readIf(path.join(specsRoot, rel));
    if (content === null) continue;

    if (isReserved(rel)) {
      const base = rel.split('/').pop();
      if (base === 'index.md' && rel !== 'index.md' && fm.hasBlock(content)) {
        report.violations.push({ rel, problem: 'reserved index.md must not carry frontmatter (only the bundle root may)' });
      }
      if (base === 'log.md' && fm.hasBlock(content)) {
        report.violations.push({ rel, problem: 'reserved log.md must not carry frontmatter' });
      }
      continue;
    }

    if (!fm.hasBlock(content)) {
      report.violations.push({ rel, problem: 'missing YAML frontmatter' });
      continue;
    }
    const { data } = fm.parse(content);
    if (data === null) {
      report.warnings.push(`${rel}: frontmatter outside the momentum subset — type not verifiable`);
      continue;
    }
    if (!data.type || String(data.type).trim() === '') {
      report.violations.push({ rel, problem: 'frontmatter lacks a non-empty `type`' });
    }
  }
  return report;
}

module.exports = { migrate, generateIndexes, check, OKF_VERSION };
