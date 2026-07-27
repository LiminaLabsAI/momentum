'use strict';

/**
 * Phase 32b G1 — the epic record library.
 *
 * An epic is ONE repo's multi-phase unit: the rung between `phase` and the
 * ecosystem-tier `initiative`. In-repo at `specs/epics/<NNNN>-<slug>.md`,
 * deliberately — a solo repo must be able to group two phases without first
 * having an ecosystem root, so the lighter unit never depends on the heavier.
 *
 * The project has been running epics for months under a letter-suffix
 * convention (21a/b/c, 30a/b/c/d/e, 31a/b/c) held together by operator memory.
 * This is that convention given a record.
 *
 * TWO THINGS THIS FILE DOES NOT DO, on purpose:
 *   - It does not parse YAML. `core/lib/frontmatter.js` is the one reader, and
 *     its OKF v0.1 subset (ADR-0005) is the constraint — which is why an epic's
 *     policy keys are flat rather than a nested map.
 *   - It does not order phases. Execution order comes from each phase's own
 *     `deps:` frontmatter through `core/waves`, so the codebase keeps exactly
 *     one topological sort (ADR-0003) rather than a second one hiding in a
 *     field that merely looks like a list.
 */

const fs = require('fs');
const path = require('path');

const frontmatter = require('../../lib/frontmatter');
const { computeWaveLayers } = require('../../waves/lib/waves');

const EPICS_DIR = 'epics';
const FILENAME = /^(\d{4})-([a-z][a-z0-9-]*)\.md$/;
const VALID_STATUS = Object.freeze(['planned', 'in-progress', 'complete', 'abandoned']);

function epicsDir(specsDir) {
  return path.join(specsDir, EPICS_DIR);
}

function epicPath(specsDir, id, slug) {
  return path.join(epicsDir(specsDir), `${id}-${slug}.md`);
}

/** Monotonic within the repo. Mirrors initiative numbering one tier down. */
function nextEpicId(specsDir) {
  const dir = epicsDir(specsDir);
  let max = 0;
  let names = [];
  try { names = fs.readdirSync(dir); } catch (_e) { names = []; }
  for (const name of names) {
    const m = name.match(FILENAME);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return String(max + 1).padStart(4, '0');
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation — structural counterpart to schema/epic.schema.json
// ─────────────────────────────────────────────────────────────────────────────

function validate(data) {
  const errors = [];
  if (!data || typeof data !== 'object') return ['epic frontmatter is unreadable'];

  if (data.type !== 'Epic') errors.push(`type must be "Epic" (got ${JSON.stringify(data.type)})`);
  if (typeof data.id !== 'string' || !/^\d{4}$/.test(data.id)) {
    errors.push(`invalid id ${JSON.stringify(data.id)}`);
  }
  if (typeof data.slug !== 'string' || !/^[a-z][a-z0-9-]*$/.test(data.slug)) {
    errors.push(`invalid slug ${JSON.stringify(data.slug)}`);
  }
  if (!VALID_STATUS.includes(data.status)) {
    errors.push(`invalid status ${JSON.stringify(data.status)}`);
  }
  // `phases` may be EMPTY while an epic is still `planned` — an epic is created
  // during the brainstorm, before its phases are decided, and demanding them up
  // front would force the record to lie about work not yet scoped. Once it is
  // `in-progress` an empty list is incoherent: a running epic with no phases is
  // running nothing.
  if (!Array.isArray(data.phases)) {
    errors.push('phases must be a list');
  } else if (data.phases.length === 0 && data.status !== 'planned') {
    errors.push(`phases must be non-empty once status is "${data.status}"`);
  }
  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read / write
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @returns {{data, body, filePath}|null} null when the file is absent OR its
 * frontmatter falls outside the OKF subset — in which case the file is opaque
 * and momentum leaves it alone rather than guessing (ADR-0005 read tolerance).
 */
function load(specsDir, slug) {
  const dir = epicsDir(specsDir);
  let names = [];
  try { names = fs.readdirSync(dir); } catch (_e) { return null; }

  const match = names.find((n) => {
    const m = n.match(FILENAME);
    return m && m[2] === slug;
  });
  if (!match) return null;

  const filePath = path.join(dir, match);
  const parsed = frontmatter.parse(fs.readFileSync(filePath, 'utf8'));
  if (!parsed.data) return null;
  return { data: parsed.data, body: parsed.body, filePath };
}

function list(specsDir) {
  const dir = epicsDir(specsDir);
  let names = [];
  try { names = fs.readdirSync(dir); } catch (_e) { return []; }

  const out = [];
  for (const name of names.sort()) {
    const m = name.match(FILENAME);
    if (!m) continue;
    const parsed = frontmatter.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
    if (!parsed.data) continue;
    out.push({ id: m[1], slug: m[2], status: parsed.data.status, phases: parsed.data.phases || [] });
  }
  return out;
}

function create(args) {
  const { specsDir, slug, objective, owner, phases, policy, nowIso } = args;
  if (typeof slug !== 'string' || !/^[a-z][a-z0-9-]*$/.test(slug)) {
    throw new TypeError(`create: invalid slug ${JSON.stringify(slug)}`);
  }
  if (load(specsDir, slug)) {
    throw new Error(`create: epic "${slug}" already exists — refusing to overwrite`);
  }

  const id = nextEpicId(specsDir);
  const data = {
    type: 'Epic',
    id,
    slug,
    status: 'planned',
    owner: owner || '',
    started: nowIso,
    phases: phases && phases.length ? phases : [],
    policy_release: (policy && policy.release) || 'per-phase',
    policy_push: (policy && policy.push) || 'per-phase',
    policy_tdd: (policy && policy.tdd) || 'strict',
  };

  const body = [
    `# Epic ${id} — ${slug}`,
    '',
    '## Objective',
    '',
    objective || '_(to be written)_',
    '',
    '## Decisions',
    '',
    '> Settled once; never re-asked. Per-phase specs are derived from this table.',
    '',
    '| # | Decision | Rationale |',
    '|---|---|---|',
    '',
    '## Completion criteria',
    '',
    '> Checkable. "It works" is not a criterion.',
    '',
    '## Amendments',
    '',
    '> Operator changes made during the run land here, newest last, and become',
    '> inputs to the derivation of every not-yet-started phase.',
    '',
    '_(none yet)_',
    '',
  ].join('\n');

  const filePath = epicPath(specsDir, id, slug);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, frontmatter.compose(data, body), 'utf8');
  return { id, slug, filePath };
}

function setStatus(specsDir, slug, status, nowIso) {
  if (!VALID_STATUS.includes(status)) throw new Error(`setStatus: invalid status ${status}`);
  const loaded = load(specsDir, slug);
  if (!loaded) throw new Error(`setStatus: no epic "${slug}"`);

  const data = Object.assign({}, loaded.data, { status });
  if (status === 'complete' || status === 'abandoned') data.closed = nowIso;
  fs.writeFileSync(loaded.filePath, frontmatter.compose(data, loaded.body), 'utf8');
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase graph — delegated, never re-implemented
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wave-layer the epic's phases from each phase's OWN `deps:` frontmatter.
 *
 * The epic's `phases` array is a membership list, not an ordering. Reading
 * order from it would put a second topological sort in the codebase, which is
 * exactly what ADR-0003 exists to prevent — so this reads `deps:` and hands the
 * graph to the one engine.
 *
 * Phases already `complete` are treated as satisfied and drop out, matching how
 * `momentum waves` already behaves at phase scale.
 */
function waves(specsDir, slug) {
  const loaded = load(specsDir, slug);
  if (!loaded) return { waves: [], unscaffolded: [], complete: [] };

  const phases = loaded.data.phases || [];
  const nodes = [];
  const edges = [];
  const unscaffolded = [];
  const complete = [];

  for (const phase of phases) {
    const overview = path.join(specsDir, 'phases', phase, 'overview.md');
    let data = null;
    try { data = frontmatter.parse(fs.readFileSync(overview, 'utf8')).data; } catch (_e) { data = null; }

    // A phase with no overview.md has no `deps:` yet. Including it would put it
    // in wave 1 — not because it has no dependencies, but because nobody has
    // written them down. That is a GUESS presented as a plan, and it silently
    // contradicts the epic's own prose graph. Report it instead: an epic in
    // flight legitimately has phases not yet scaffolded (D10 — specs are
    // derived just-in-time), and the caller decides what to do about it.
    if (!data) { unscaffolded.push(phase); continue; }
    if (data.status === 'complete') { complete.push(phase); continue; }

    nodes.push(phase);
    for (const dep of data.deps || []) {
      // Edges to phases outside this epic are ignored — the engine already
      // drops them, and an epic must not be blocked by an unrelated lane.
      if (phases.includes(dep)) edges.push({ from: phase, to: dep });
    }
  }
  return { waves: computeWaveLayers(nodes, edges, { label: 'epic' }), unscaffolded, complete };
}

// `EPICS_DIR`, `VALID_STATUS`, `epicsDir`, `epicPath` and `nextEpicId` are
// deliberately NOT exported — they are internal to this module, and the orphan
// guard (tests/run-reachability.test.js) flagged them the moment they were.
// "Exported for tests" is how dead code starts; 32a learned this the hard way
// and the lesson applies to its successor.
module.exports = {
  validate,
  load,
  list,
  create,
  setStatus,
  waves,
};
