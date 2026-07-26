'use strict';

// Phase 31b G0 — cross-repo coverage detection (ADR-0017 E2).
//
// The question: is this actor doing cross-repo work no OPEN initiative covers?
//
// Detection is a query over the 31a event stream rather than a new tracker, so
// these tests drive it by writing synthetic fragments — the same shape the
// post-commit hook writes in production.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli, write } = require('./_helpers');
const fragments = require('../core/team/lib/fragments');
const events = require('../core/ecosystem/lib/events');
const detect = require('../core/ecosystem/lib/detect');
const initLib = require('../core/ecosystem/lib/initiative');
const lib = require('../core/ecosystem/lib');

const NOW = '2026-07-27T12:00:00.000Z';

function setup(members = ['backend', 'frontend', 'infra']) {
  const tmp = mktmp();
  assert.equal(runCli(['ecosystem', 'init', 'eco'], { cwd: tmp }).status, 0);
  const root = path.join(tmp, 'eco');
  for (const id of members) {
    const dir = path.join(tmp, id);
    fs.mkdirSync(path.join(dir, 'specs'), { recursive: true });
    write(path.join(dir, 'CLAUDE.md'), `# ${id}\n`);
    write(path.join(dir, 'specs', 'status.md'), 'x\n');
    runCli(['ecosystem', 'add', `../${id}`, '--role', 'platform', '--id', id], { cwd: root });
  }
  return { tmp, root };
}

let seq = 0;
function event(root, member, { actor = 'ada', ts = NOW, kind = 'commit' } = {}) {
  fragments.writeFragment(root, events.EVENTS_VIEW, actor, kind,
    { member, summary: `work in ${member}`, context: 'abc1234' },
    { ts, seq: ++seq });
}

function makeInitiative(root, slug, repos, { status = 'in-progress', contributions } = {}) {
  const dir = path.join(root, 'initiatives');
  fs.mkdirSync(dir, { recursive: true });
  const fm = {
    id: repos.length + slug.length, slug, status, started: '2026-07-20',
    owner: 'ada', repos,
  };
  if (status === 'closed') fm.closed = '2026-07-26';
  if (contributions) fm.contributions = contributions;
  initLib.writeInitiative(path.join(dir, `9999-${slug}.md`), fm, '# x\n');
}

// ─────────────────────────────────────────────────────────────────────────────

test('single member touched is not cross-repo', () => {
  const { tmp, root } = setup();
  try {
    event(root, 'backend');
    const d = detect.detect(root, { now: NOW });
    assert.equal(d.crossRepo, false);
    assert.equal(d.shouldRoute, false);
    assert.deepEqual(d.members, ['backend']);
  } finally { rmrf(tmp); }
});

test('two members with no initiative → shouldRoute', () => {
  const { tmp, root } = setup();
  try {
    event(root, 'backend');
    event(root, 'frontend');
    const d = detect.detect(root, { now: NOW });
    assert.equal(d.crossRepo, true);
    assert.equal(d.covered, false);
    assert.equal(d.shouldRoute, true, 'this is the condition the nudge fires on');
    assert.deepEqual(d.members, ['backend', 'frontend']);
    assert.deepEqual(d.uncovered, ['backend', 'frontend']);
  } finally { rmrf(tmp); }
});

test('an open initiative covering both members suppresses routing', () => {
  const { tmp, root } = setup();
  try {
    event(root, 'backend');
    event(root, 'frontend');
    makeInitiative(root, 'attachments', ['backend', 'frontend']);

    const d = detect.detect(root, { now: NOW });
    assert.equal(d.crossRepo, true);
    assert.equal(d.covered, true);
    assert.equal(d.shouldRoute, false);
    assert.equal(d.initiative, 'attachments');
  } finally { rmrf(tmp); }
});

test('a CLOSED initiative covers nothing — coverage is a live-state question', () => {
  const { tmp, root } = setup();
  try {
    event(root, 'backend');
    event(root, 'frontend');
    makeInitiative(root, 'attachments', ['backend', 'frontend'], { status: 'closed' });

    const d = detect.detect(root, { now: NOW });
    assert.equal(d.shouldRoute, true,
      'an initiative that shipped last month does not license today\'s untracked work');
    assert.equal(d.initiative, null);
  } finally { rmrf(tmp); }
});

test('partial coverage does not count — the unplanned member is the point', () => {
  const { tmp, root } = setup();
  try {
    event(root, 'backend');
    event(root, 'frontend');
    event(root, 'infra');
    makeInitiative(root, 'attachments', ['backend', 'frontend']);

    const d = detect.detect(root, { now: NOW });
    assert.equal(d.shouldRoute, true);
    assert.deepEqual(d.uncovered, ['infra'],
      'infra is exactly the part nobody planned — it must be named');
  } finally { rmrf(tmp); }
});

test('contributions[] count toward coverage, not just repos[]', () => {
  const { tmp, root } = setup();
  try {
    event(root, 'backend');
    event(root, 'frontend');
    // repos lists only backend; frontend arrives via a declared contribution.
    makeInitiative(root, 'attachments', ['backend'],
      { contributions: ['frontend:adhoc:fix-BUG-031'] });

    const d = detect.detect(root, { now: NOW });
    assert.equal(d.covered, true);
    assert.equal(d.shouldRoute, false);
  } finally { rmrf(tmp); }
});

test('events outside the window are ignored', () => {
  const { tmp, root } = setup();
  try {
    event(root, 'backend', { ts: NOW });
    event(root, 'frontend', { ts: '2026-07-01T12:00:00.000Z' }); // 26 days earlier

    const d = detect.detect(root, { now: NOW, hours: 24 });
    assert.equal(d.crossRepo, false, 'last month\'s work is not this stretch of work');
    assert.deepEqual(d.members, ['backend']);
  } finally { rmrf(tmp); }
});

test('detection is per-actor when an actor is given', () => {
  const { tmp, root } = setup();
  try {
    event(root, 'backend', { actor: 'ada' });
    event(root, 'frontend', { actor: 'bob' });

    assert.equal(detect.detect(root, { now: NOW, actor: 'ada' }).crossRepo, false);
    assert.equal(detect.detect(root, { now: NOW, actor: 'bob' }).crossRepo, false);
    // Across all actors it IS cross-repo — but no single person drifted.
    assert.equal(detect.detect(root, { now: NOW }).crossRepo, true);
  } finally { rmrf(tmp); }
});

test('opts.extra folds in a member with no event yet (the PreToolUse case)', () => {
  const { tmp, root } = setup();
  try {
    // The nudge must fire BEFORE the commit, so the member being edited right
    // now has no event on the stream. That is the entire point of firing early.
    event(root, 'backend');
    const d = detect.detect(root, { now: NOW, extra: ['frontend'] });
    assert.equal(d.crossRepo, true);
    assert.equal(d.shouldRoute, true);
    assert.deepEqual(d.members, ['backend', 'frontend']);
  } finally { rmrf(tmp); }
});

test('detection makes no git calls (it runs on every edit)', () => {
  // Guard the property that licenses running this from a PreToolUse hook.
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'core', 'ecosystem', 'lib', 'detect.js'), 'utf8');
  assert.doesNotMatch(src, /spawnSync|execSync|execFile/,
    'detect.js must stay git-call-free — it runs before every write');
});

test('empty / absent ecosystem degrades to no-op rather than throwing', () => {
  const tmp = mktmp();
  try {
    const bogus = path.join(tmp, 'nope');
    fs.mkdirSync(bogus, { recursive: true });
    const d = detect.detect(bogus, { now: NOW });
    assert.equal(d.crossRepo, false);
    assert.equal(d.shouldRoute, false);
    assert.deepEqual(d.members, []);
  } finally { rmrf(tmp); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Config keys
// ─────────────────────────────────────────────────────────────────────────────

test('config: detect_window_hours and landing_order validate', () => {
  const base = {
    name: 'eco', version: 1,
    members: [{ id: 'a', path: '../a', role: 'platform' }],
  };
  const ok = lib.validateManifest({ ...base, config: { detect_window_hours: 8, landing_order: 'warn' } });
  assert.equal(ok.ok, true, JSON.stringify(ok.errors));

  assert.equal(lib.validateManifest({ ...base, config: { detect_window_hours: 0 } }).ok, false);
  assert.equal(lib.validateManifest({ ...base, config: { detect_window_hours: 'lots' } }).ok, false);
  assert.equal(lib.validateManifest({ ...base, config: { landing_order: 'maybe' } }).ok, false);
});

test('readEcosystemConfig: landing_order defaults to enforce; window defaults to null', () => {
  const base = { name: 'eco', version: 1, members: [] };
  const cfg = lib.readEcosystemConfig(base);
  // A gate momentum can derive itself must not silently default to off.
  assert.equal(cfg.landing_order, 'enforce');
  // But an undeclared window stays null so callers can tell declared-24 from
  // defaulted-24, mirroring integration_verify_command's posture.
  assert.equal(cfg.detect_window_hours, null);

  const declared = lib.readEcosystemConfig({ ...base, config: { detect_window_hours: 8, landing_order: 'off' } });
  assert.equal(declared.detect_window_hours, 8);
  assert.equal(declared.landing_order, 'off');
});

test('`land` is a recognized event kind (ADR-0017 E5)', () => {
  assert.ok(events.EVENT_KINDS.includes('land'));
  const { tmp, root } = setup(['backend']);
  try {
    const res = events.recordEvent({
      cwd: root, kind: 'land', summary: 'landed phase-12', context: 'phase-12',
    });
    // Not a member repo, so it won't record — but the kind must be accepted
    // rather than rejected as unknown.
    assert.notEqual(res.reason, "unknown kind 'land'");
  } finally { rmrf(tmp); }
});
