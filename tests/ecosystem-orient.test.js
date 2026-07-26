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

// ─────────────────────────────────────────────────────────────────────────────
// BUG-029 — lane parsing (shipped broken in v0.41.0)
// ─────────────────────────────────────────────────────────────────────────────
//
// The registry stores lane **id strings**; per-lane detail lives in
// `<anchor>/<id>/manifest.json`. v0.41.0 read the ids as objects, so every entry
// became `{status: undefined}` and `undefined !== 'closed'` let the repo's whole
// lane history through as "open" — 30 on this repo, whose true state was 29
// closed + 1 landed.
//
// The parity test below is the durable fence: it pins orient's independent
// re-read against the real `core/lanes/lib/state` API, which is the check whose
// absence let the format mismatch ship.

const laneState = require('../core/lanes/lib/state');

function seedLanes(repoDir, lanes) {
  const anchor = path.join(repoDir, '.git', 'momentum', 'lanes');
  fs.mkdirSync(anchor, { recursive: true });
  // The REAL shape: ids in the registry, detail in per-lane manifests.
  write(path.join(anchor, 'registry.json'),
    JSON.stringify({ stateVersion: 1, lanes: lanes.map((l) => l.id) }, null, 2));
  for (const l of lanes) {
    fs.mkdirSync(path.join(anchor, l.id), { recursive: true });
    write(path.join(anchor, l.id, 'manifest.json'),
      JSON.stringify({ stateVersion: 1, ...l }, null, 2));
  }
  return anchor;
}

test('BUG-029: only in-flight lanes are reported — landed and closed are spent', () => {
  const tmp = mktmp();
  try {
    const repo = path.join(tmp, 'member');
    fs.mkdirSync(repo, { recursive: true });
    seedLanes(repo, [
      { id: 'lane-open', branch: 'feat/a', status: 'open' },
      { id: 'lane-done', branch: 'feat/b', status: 'done' },
      { id: 'lane-landed', branch: 'feat/c', status: 'landed' },
      { id: 'lane-closed', branch: 'feat/d', status: 'closed' },
    ]);

    const lanes = orient.openLanes(repo);
    assert.deepEqual(lanes.map((l) => l.id).sort(), ['lane-done', 'lane-open'],
      'landed + closed lanes must not be reported as in flight');
    // …and the detail must be real, not undefined (the v0.41.0 symptom).
    for (const l of lanes) {
      assert.ok(l.status, 'status must be populated');
      assert.ok(l.branch, 'branch must be populated');
    }
  } finally { rmrf(tmp); }
});

test('BUG-029: a registry of id strings is not mistaken for objects', () => {
  const tmp = mktmp();
  try {
    const repo = path.join(tmp, 'member');
    fs.mkdirSync(repo, { recursive: true });
    // 3 spent lanes, exactly the shape that produced the false "30 open".
    seedLanes(repo, [
      { id: 'a', branch: 'x', status: 'closed' },
      { id: 'b', branch: 'y', status: 'closed' },
      { id: 'c', branch: 'z', status: 'landed' },
    ]);
    assert.deepEqual(orient.openLanes(repo), [],
      'a history of spent lanes must report as zero in flight');
  } finally { rmrf(tmp); }
});

test('BUG-029: lane state resolves through a linked worktree pointer', () => {
  const tmp = mktmp();
  try {
    // Real repo with lane state…
    const main = path.join(tmp, 'main');
    const anchor = seedLanes(main, [{ id: 'lane-open', branch: 'feat/a', status: 'open' }]);

    // …and a linked worktree whose `.git` is a FILE pointing at the common dir.
    const wt = path.join(tmp, 'wt');
    fs.mkdirSync(wt, { recursive: true });
    const gitdir = path.join(main, '.git', 'worktrees', 'wt');
    fs.mkdirSync(gitdir, { recursive: true });
    write(path.join(gitdir, 'commondir'), '../..\n');
    write(path.join(wt, '.git'), `gitdir: ${gitdir}\n`);

    assert.equal(orient.laneAnchor(wt), anchor,
      'a worktree must resolve to the SHARED lane anchor, not its own gitdir');
    assert.deepEqual(orient.openLanes(wt).map((l) => l.id), ['lane-open'],
      'Rule 15 lane work runs in worktrees — that is where this must be right');
  } finally { rmrf(tmp); }
});

test('BUG-029 parity: orient agrees with the real lanes API on this repo', () => {
  // The fence whose absence let the format mismatch ship. orient re-reads lane
  // state independently (it must stay dependency-free to ship into installs —
  // TD-012), so its answer is pinned against the authority here.
  const repoRoot = path.resolve(__dirname, '..');
  const anchor = laneState.resolveAnchor(repoRoot);
  if (!anchor) return; // no lane state in this checkout — nothing to compare

  const truth = laneState.listLanes(anchor)
    .filter((l) => orient.IN_FLIGHT.has(l.status))
    .map((l) => l.id)
    .sort();

  assert.deepEqual(orient.openLanes(repoRoot).map((l) => l.id).sort(), truth,
    'orient must report exactly what core/lanes/lib/state considers in flight');
});

test('BUG-029: a corrupt or absent registry degrades to no lanes', () => {
  const tmp = mktmp();
  try {
    const repo = path.join(tmp, 'member');
    fs.mkdirSync(path.join(repo, '.git', 'momentum', 'lanes'), { recursive: true });
    assert.deepEqual(orient.openLanes(repo), [], 'no registry → no lanes');

    write(path.join(repo, '.git', 'momentum', 'lanes', 'registry.json'), '{ not json');
    assert.doesNotThrow(() => orient.openLanes(repo));
    assert.deepEqual(orient.openLanes(repo), []);

    // A referenced lane whose manifest is missing is skipped, not guessed at.
    write(path.join(repo, '.git', 'momentum', 'lanes', 'registry.json'),
      JSON.stringify({ stateVersion: 1, lanes: ['ghost'] }));
    assert.deepEqual(orient.openLanes(repo), []);
  } finally { rmrf(tmp); }
});
