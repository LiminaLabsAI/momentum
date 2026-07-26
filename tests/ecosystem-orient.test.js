'use strict';

// Phase 31b G1 — fleet orient (ENH-067).
//
// Rule 1 orients you in THIS repo, at session start. Nothing did the equivalent
// when a session reached into a sibling mid-flight — which is how one reviewed
// session rewrote a cost formatter in a repo whose own backlog already tracked
// BUG-001 against that exact formatter. The information existed; nothing put it
// in front of the agent at the moment it mattered.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli, write } = require('./_helpers');
const orient = require('../core/ecosystem/lib/orient');

const STATUS_WITH_PHASE = `---
type: Status
---

# Project Status

## Active Phase

| Phase | Branch | Status | Progress |
|-------|--------|--------|----------|
| 6 — Attachments | \`phase-6-attachments\` | In Progress | G2 of G5 |

## Upcoming Phases

| Phase | Name | Status | Key Deliverables |
|-------|------|--------|-----------------|
| 7 | Later | Not Started | things |
`;

const BACKLOG = `---
type: Backlog
---

## Bugs

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| BUG-001 | Cost formatter shows "Not specified" for sub-cent values | P1 | open | phase-4 | detail |
| BUG-009 | Something already fixed | P1 | resolved | phase-3 | detail |
| BUG-014 | A P3 nobody needs to see | P3 | open | phase-5 | detail |
| TD-002 | Configure linting rules | P0 | open | phase-2 | detail |
`;

function setup() {
  const tmp = mktmp();
  assert.equal(runCli(['ecosystem', 'init', 'eco'], { cwd: tmp }).status, 0);
  const root = path.join(tmp, 'eco');

  for (const id of ['backend', 'frontend']) {
    const dir = path.join(tmp, id);
    fs.mkdirSync(path.join(dir, 'specs', 'backlog'), { recursive: true });
    write(path.join(dir, 'CLAUDE.md'), `# ${id}\n`);
    write(path.join(dir, 'specs', 'status.md'), 'x\n');
    runCli(['ecosystem', 'add', `../${id}`, '--role', 'platform', '--id', id], { cwd: root });
  }
  return { tmp, root };
}

test('orient reads a member active phase, open P0/P1, and skips resolved + P2/P3', () => {
  const { tmp, root } = setup();
  try {
    const fe = path.join(tmp, 'frontend', 'specs');
    write(path.join(fe, 'status.md'), STATUS_WITH_PHASE);
    write(path.join(fe, 'backlog', 'backlog.md'), BACKLOG);

    const [, frontend] = orient.orientFleet(root);
    assert.equal(frontend.id, 'frontend');
    assert.equal(frontend.reachable, true);
    assert.equal(frontend.managed, true);

    assert.equal(frontend.phases.length, 1);
    assert.equal(frontend.phases[0].phase, '6 — Attachments');
    assert.equal(frontend.phases[0].branch, 'phase-6-attachments');

    const ids = frontend.blockers.map((b) => b.id);
    assert.deepEqual(ids, ['TD-002', 'BUG-001'], 'P0 first, then P1; resolved and P2/P3 excluded');
  } finally { rmrf(tmp); }
});

test('AC-4: the member brief names the open bug by id and title', () => {
  const { tmp, root } = setup();
  try {
    const fe = path.join(tmp, 'frontend', 'specs');
    write(path.join(fe, 'status.md'), STATUS_WITH_PHASE);
    write(path.join(fe, 'backlog', 'backlog.md'), BACKLOG);

    const [, frontend] = orient.orientFleet(root);
    const brief = orient.memberBrief(frontend).join('\n');

    // This is the difference between "this is cross-repo work" and
    // "frontend has BUG-001 open on the cost formatter you're about to touch".
    assert.match(brief, /BUG-001/);
    assert.match(brief, /Cost formatter/);
    assert.match(brief, /P0 TD-002/);
    assert.match(brief, /active phase 6 — Attachments/);
  } finally { rmrf(tmp); }
});

test('an empty Active Phase table yields no phases', () => {
  const body = STATUS_WITH_PHASE.replace(
    '| 6 — Attachments | `phase-6-attachments` | In Progress | G2 of G5 |',
    '| _(none active)_ | | | |');
  assert.deepEqual(orient.activePhases(body), []);
});

test('degrades rather than throwing: no specs, missing checkout, corrupt files', () => {
  const { tmp, root } = setup();
  try {
    // Member registered but its directory is gone.
    rmrf(path.join(tmp, 'backend'));
    // Member present but not momentum-managed.
    rmrf(path.join(tmp, 'frontend', 'specs'));

    let summaries;
    assert.doesNotThrow(() => { summaries = orient.orientFleet(root); });
    const [backend, frontend] = summaries;

    assert.equal(backend.reachable, false, 'absent checkout is reported, not crashed on');
    assert.equal(frontend.reachable, true);
    assert.equal(frontend.managed, false);

    // Corrupt inputs must not throw either.
    assert.doesNotThrow(() => orient.activePhases('## Active Phase\n|||\n|'));
    assert.doesNotThrow(() => orient.openBlockers('| garbage |\n|| |'));
    assert.deepEqual(orient.orientFleet(path.join(tmp, 'does-not-exist')), []);
  } finally { rmrf(tmp); }
});

test('long backlog titles are condensed so the fleet view stays scannable', () => {
  // Found by dogfooding against a real 8-member ecosystem: single P1 titles ran
  // to full paragraphs with embedded spec catalogues and markdown links.
  const long = 'Workspace Templates substrate per `specs/planning/x.md` (FEAT-032) '
    + '[→](details/ENH-026.md) — bootstrap entity + port + lifecycle. '.repeat(6);
  const out = orient.condense(long);
  assert.ok(out.length <= orient.MAX_TITLE, `condensed title too long: ${out.length}`);
  assert.doesNotMatch(out, /\[→\]/, 'detail links stripped');
  assert.doesNotMatch(out, /`/, 'code fences stripped');
});

test('fleetLine summarizes, and is null when there is nothing to say', () => {
  assert.equal(orient.fleetLine([
    { phases: [], blockers: [], lanes: [] },
    { phases: [], blockers: [], lanes: [] },
  ]), null);

  const line = orient.fleetLine([
    { phases: [{}], blockers: [{}, {}], lanes: [] },
    { phases: [], blockers: [{}], lanes: [{}] },
  ]);
  assert.match(line, /2 members with open P0\/P1/);
  assert.match(line, /1 active phase/);
  assert.match(line, /1 open lane/);
});

test('orient stays dependency-free so it can ship into installed projects', () => {
  // An installed project receives no copy of core/ — orient.js is copied into
  // scripts/ next to the session hooks, exactly like session-append.sh. A
  // require of a sibling core module would work here and break in every
  // install (the constraint that forced eco-event.js to stand alone in 31a).
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'core', 'ecosystem', 'lib', 'orient.js'), 'utf8');
  const requires = [...src.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map((m) => m[1]);
  assert.deepEqual(requires.sort(), ['fs', 'path'],
    'orient.js must require node builtins only');
});

// ─────────────────────────────────────────────────────────────────────────────
// CLI rendering
// ─────────────────────────────────────────────────────────────────────────────

test('AC-3: `ecosystem status` shows each member phase, P0/P1 and lanes', () => {
  const { tmp, root } = setup();
  try {
    const fe = path.join(tmp, 'frontend', 'specs');
    write(path.join(fe, 'status.md'), STATUS_WITH_PHASE);
    write(path.join(fe, 'backlog', 'backlog.md'), BACKLOG);

    const res = runCli(['ecosystem', 'status', '--no-git'], { cwd: root });
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /phase: 6 — Attachments/);
    assert.match(res.stdout, /P0: TD-002/);
    assert.match(res.stdout, /P1: BUG-001/);
    assert.match(res.stdout, /no active phase, no open P0\/P1/, 'quiet members say so');
  } finally { rmrf(tmp); }
});

test('--brief preserves the pre-31b output for scripts', () => {
  const { tmp, root } = setup();
  try {
    const fe = path.join(tmp, 'frontend', 'specs');
    write(path.join(fe, 'status.md'), STATUS_WITH_PHASE);
    write(path.join(fe, 'backlog', 'backlog.md'), BACKLOG);

    const res = runCli(['ecosystem', 'status', '--no-git', '--brief'], { cwd: root });
    assert.equal(res.status, 0, res.stderr);
    assert.doesNotMatch(res.stdout, /P0: TD-002/);
    assert.doesNotMatch(res.stdout, /phase: 6/);
    assert.match(res.stdout, /frontend/, 'members are still listed');
  } finally { rmrf(tmp); }
});

test('orient.js is installed into a target project by `momentum init`', () => {
  const tmp = mktmp();
  try {
    const target = path.join(tmp, 'proj');
    fs.mkdirSync(target, { recursive: true });
    const res = runCli(['init', '.', '--agent', 'claude-code'], { cwd: target });
    assert.equal(res.status, 0, res.stderr || res.stdout);
    assert.ok(fs.existsSync(path.join(target, 'scripts', 'orient.js')),
      'the SessionStart fleet line needs orient.js to travel with the hooks');
  } finally { rmrf(tmp); }
});
