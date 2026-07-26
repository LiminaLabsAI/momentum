'use strict';

// Phase 31b G3 — dependency-ordered cross-repo landing (ENH-068, ADR-0017).
//
// Rule 6's Landing Order is enforced inside a repo by `momentum lanes land`.
// Nothing enforced it ACROSS members — so one reviewed session opened five PRs
// across three repos with a real ordering dependency (a backend wire-contract
// change had to land before the frontend rendered it), tracked the order in
// prose, and shipped two production defects.
//
// AC-5 (refusal) is the headline. AC-6 is the last-member integration verify.
// The solo-safety assertions matter just as much: this must not change anything
// for a repo that is not part of an ecosystem.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, runCli, write } = require('./_helpers');
const landing = require('../core/ecosystem/lib/landing');
const events = require('../core/ecosystem/lib/events');
const fragments = require('../core/team/lib/fragments');

/**
 * Ecosystem + backend/frontend members + an initiative declaring both, with
 * the edge `frontend -> backend` (frontend depends on backend, so backend
 * must land first).
 */
function setup({ config, edge = true } = {}) {
  const tmp = mktmp();
  assert.equal(runCli(['ecosystem', 'init', 'eco'], { cwd: tmp }).status, 0);
  const root = path.join(tmp, 'eco');

  for (const [id, role] of [['backend', 'platform'], ['frontend', 'client']]) {
    const dir = path.join(tmp, id);
    fs.mkdirSync(path.join(dir, 'specs'), { recursive: true });
    write(path.join(dir, 'CLAUDE.md'), `# ${id}\n`);
    write(path.join(dir, 'specs', 'status.md'), 'x\n');
    runCli(['ecosystem', 'add', `../${id}`, '--role', role, '--id', id], { cwd: root });
  }

  runCli(['ecosystem', 'initiative', 'create', 'attachments',
    '--why', 'w', '--repos', 'backend,frontend', '--owner', 'ada'], { cwd: root });

  const startArgs = ['ecosystem', 'initiative', 'start', 'attachments',
    '--contribute', 'backend:phase:phase-12-attachments',
    '--contribute', 'frontend:adhoc:fix-BUG-031'];
  if (edge) startArgs.push('--edge', 'frontend:backend:api-contract');
  assert.equal(runCli(startArgs, { cwd: root }).status, 0);

  if (config) {
    const p = path.join(root, 'ecosystem.json');
    const m = JSON.parse(fs.readFileSync(p, 'utf8'));
    m.config = config;
    fs.writeFileSync(p, JSON.stringify(m, null, 2) + '\n');
  }
  return { tmp, root, backend: path.join(tmp, 'backend'), frontend: path.join(tmp, 'frontend') };
}

function recordLand(root, member, { forced = false, slug = 'attachments' } = {}) {
  fragments.writeFragment(root, events.EVENTS_VIEW, 'ada', 'land',
    { member, summary: `landed ${member}`, context: slug, initiative: slug, forced },
    { ts: new Date().toISOString() });
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-5 — the refusal
// ─────────────────────────────────────────────────────────────────────────────

test('AC-5: frontend is blocked while its upstream backend has not landed', () => {
  const { tmp, root, frontend } = setup();
  try {
    const res = landing.landingCheck(frontend, { ecosystemRoot: root });
    assert.equal(res.applicable, true);
    assert.equal(res.ok, false);
    assert.equal(res.member, 'frontend');
    assert.equal(res.initiative, 'attachments');
    assert.equal(res.blockers.length, 1);
    assert.equal(res.blockers[0].member, 'backend');
    assert.equal(res.blockers[0].contribution, 'phase:phase-12-attachments');
    assert.equal(res.blockers[0].kind, 'api-contract');

    // The message must name member, contribution, and the edge — "not landable"
    // alone leaves the operator to go find out why.
    const line = landing.checkLines(res).join('\n');
    assert.match(line, /'backend' has not landed its contribution/);
    assert.match(line, /phase:phase-12-attachments/);
    assert.match(line, /api-contract edge/);
  } finally { rmrf(tmp); }
});

test('backend (no upstream) is landable immediately', () => {
  const { tmp, root, backend } = setup();
  try {
    const res = landing.landingCheck(backend, { ecosystemRoot: root });
    assert.equal(res.applicable, true);
    assert.equal(res.ok, true, 'nothing is upstream of backend');
    assert.equal(res.isLast, false, 'frontend still owes a contribution');
  } finally { rmrf(tmp); }
});

test('once backend lands, frontend unblocks and becomes the LAST contribution', () => {
  const { tmp, root, frontend } = setup();
  try {
    recordLand(root, 'backend');
    const res = landing.landingCheck(frontend, { ecosystemRoot: root });
    assert.equal(res.ok, true);
    assert.equal(res.isLast, true, 'frontend is now the final outstanding contribution');
    assert.match(landing.checkLines(res).join('\n'), /LAST contribution/);
  } finally { rmrf(tmp); }
});

test('a land event for a DIFFERENT initiative does not unblock', () => {
  const { tmp, root, frontend } = setup();
  try {
    recordLand(root, 'backend', { slug: 'some-other-initiative' });
    const res = landing.landingCheck(frontend, { ecosystemRoot: root });
    assert.equal(res.ok, false, 'landing backend for other work says nothing about this one');
  } finally { rmrf(tmp); }
});

test('an edge to a member with no contribution does not block', () => {
  const { tmp, root, frontend } = setup();
  try {
    // Register an edge to a member this initiative is not changing at all.
    const p = path.join(root, 'ecosystem.json');
    const m = JSON.parse(fs.readFileSync(p, 'utf8'));
    m.members.push({ id: 'infra', path: '../infra', role: 'infra' });
    m.dependencies.push({ from: 'frontend', to: 'infra', kind: 'deploy' });
    fs.writeFileSync(p, JSON.stringify(m, null, 2) + '\n');
    fs.mkdirSync(path.join(tmp, 'infra'), { recursive: true });

    recordLand(root, 'backend');
    const res = landing.landingCheck(frontend, { ecosystemRoot: root });
    assert.equal(res.ok, true,
      'infra has nothing to land for this initiative — a standing dependency is not a blocker');
  } finally { rmrf(tmp); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Config modes and solo safety
// ─────────────────────────────────────────────────────────────────────────────

test('landing_order: off disables the gate entirely', () => {
  const { tmp, root, frontend } = setup({ config: { landing_order: 'off' } });
  try {
    const res = landing.landingCheck(frontend, { ecosystemRoot: root });
    assert.equal(res.applicable, true);
    assert.equal(res.skipped, true);
    assert.match(landing.checkLines(res).join('\n'), /landing order disabled/);
  } finally { rmrf(tmp); }
});

test('landing_order: warn still reports the blocker', () => {
  const { tmp, root, frontend } = setup({ config: { landing_order: 'warn' } });
  try {
    const res = landing.landingCheck(frontend, { ecosystemRoot: root });
    assert.equal(res.mode, 'warn');
    assert.equal(res.ok, false, 'warn changes the CONSEQUENCE, not the finding');
  } finally { rmrf(tmp); }
});

test('SOLO SAFETY: a repo outside any ecosystem is not applicable', () => {
  const tmp = mktmp();
  try {
    const solo = path.join(tmp, 'solo');
    fs.mkdirSync(path.join(solo, 'specs'), { recursive: true });
    const res = landing.landingCheck(solo);
    assert.equal(res.applicable, false);
    assert.deepEqual(landing.checkLines(res), [], 'no ecosystem → no output at all');
  } finally { rmrf(tmp); }
});

test('SOLO SAFETY: a member with no in-progress initiative is not applicable', () => {
  const tmp = mktmp();
  try {
    assert.equal(runCli(['ecosystem', 'init', 'eco'], { cwd: tmp }).status, 0);
    const root = path.join(tmp, 'eco');
    const dir = path.join(tmp, 'backend');
    fs.mkdirSync(path.join(dir, 'specs'), { recursive: true });
    write(path.join(dir, 'CLAUDE.md'), '# backend\n');
    write(path.join(dir, 'specs', 'status.md'), 'x\n');
    runCli(['ecosystem', 'add', '../backend', '--role', 'platform', '--id', 'backend'], { cwd: root });

    const res = landing.landingCheck(dir, { ecosystemRoot: root });
    assert.equal(res.applicable, false,
      'being a member is not enough — an initiative must declare a contribution');
  } finally { rmrf(tmp); }
});

test('a CLOSED initiative stops governing landings', () => {
  const { tmp, root, frontend } = setup();
  try {
    const initLib = require('../core/ecosystem/lib/initiative');
    const loaded = initLib.loadInitiative(root, 'attachments');
    initLib.writeInitiative(loaded.filePath,
      { ...loaded.frontmatter, status: 'closed', closed: '2026-07-27' }, loaded.content);

    const res = landing.landingCheck(frontend, { ecosystemRoot: root });
    assert.equal(res.applicable, false);
  } finally { rmrf(tmp); }
});

// ─────────────────────────────────────────────────────────────────────────────
// The forced override stays visible (the MOMENTUM_SKIP_HOOKS posture)
// ─────────────────────────────────────────────────────────────────────────────

test('a forced land is recorded as forced, so the override is auditable', () => {
  const { tmp, root } = setup();
  try {
    recordLand(root, 'backend', { forced: true });
    const landed = landing.landedMembers(root, 'attachments', '2026-07-20');
    assert.equal(landed.get('backend').forced, true,
      'an override must stay visible in the event stream, not vanish like --no-verify');
  } finally { rmrf(tmp); }
});

test('`--force-order` is a recognized lanes land flag', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'core', 'lanes', 'lib', 'land.js'), 'utf8');
  assert.match(src, /--force-order/);
  assert.match(src, /force-order.*\]/s);
});

test('lanes land wires the ecosystem gate and stays fail-open', () => {
  // The gate must never break single-repo landing if the ecosystem layer is
  // absent or unreadable — solo repos are the overwhelming majority.
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'core', 'lanes', 'lib', 'land.js'), 'utf8');
  assert.match(src, /ecosystem\/lib\/landing/);
  assert.match(src, /catch \(_e\) \{ \/\* ecosystem layer absent/,
    'the ecosystem check must be wrapped so solo landing cannot break');
});
