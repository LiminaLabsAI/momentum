'use strict';

/**
 * Phase 32b G4 — epic-tier run wiring, `tdd: strict` enforcement, and the
 * `/brainstorm-epic` + `--derive` recipe surfaces.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT, mktmp, rmrf } = require('./_helpers');

const manifestLib = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'manifest'));
const epicLib = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'epic'));

const CLI = path.join(REPO_ROOT, 'bin', 'momentum.js');
const TS = '2026-07-27T10:00:00Z';

function run(cwd, ...args) {
  return spawnSync('node', [CLI, ...args], { cwd, encoding: 'utf8' });
}

function withEpicRepo(fn) {
  const dir = mktmp();
  const specs = path.join(dir, 'specs');
  fs.mkdirSync(path.join(specs, 'phases'), { recursive: true });
  epicLib.create({
    specsDir: specs, slug: 'attachments',
    phases: ['phase-1-api', 'phase-2-ui'], nowIso: TS,
  });
  const mk = (name, fm) => {
    fs.mkdirSync(path.join(specs, 'phases', name), { recursive: true });
    fs.writeFileSync(path.join(specs, 'phases', name, 'overview.md'),
      `---\n${fm}\n---\n\n# ${name}\n`, 'utf8');
  };
  mk('phase-1-api', 'type: Phase\nstatus: in-progress');
  mk('phase-2-ui', 'type: Phase\nstatus: in-progress\ndeps: [phase-1-api]');
  try { return fn(dir); } finally { rmrf(dir); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Epic-tier run start
// ─────────────────────────────────────────────────────────────────────────────

test('an epic-tier run starts at the first READY phase, not at the epic slug', () => {
  // A cursor pointing at the epic itself names no work — nothing would know
  // what to do next.
  withEpicRepo((dir) => {
    const r = run(dir, 'run', 'start', 'epic', 'attachments');
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Unit:\s+phase-1-api/);
    assert.equal(manifestLib.load(dir).cursor.unit, 'phase-1-api');
  });
});

test('the ready phase comes from deps, not from the order phases are listed', () => {
  withEpicRepo((dir) => {
    // Reverse the listed order; phase-2 still depends on phase-1, so phase-1 wins.
    const loaded = epicLib.load(path.join(dir, 'specs'), 'attachments');
    const before = fs.readFileSync(loaded.filePath, 'utf8');
    const after = before.replace('[phase-1-api, phase-2-ui]', '[phase-2-ui, phase-1-api]');
    assert.notEqual(after, before, 'the reversal must actually apply, or this test proves nothing');
    fs.writeFileSync(loaded.filePath, after, 'utf8');

    run(dir, 'run', 'start', 'epic', 'attachments');
    assert.equal(manifestLib.load(dir).cursor.unit, 'phase-1-api');
  });
});

test('an epic-tier start reports phases it cannot yet order', () => {
  withEpicRepo((dir) => {
    const loaded = epicLib.load(path.join(dir, 'specs'), 'attachments');
    const before = fs.readFileSync(loaded.filePath, 'utf8');
    const after = before.replace('[phase-1-api, phase-2-ui]', '[phase-1-api, phase-2-ui, phase-3-later]');
    assert.notEqual(after, before, 'the added phase must actually apply');
    fs.writeFileSync(loaded.filePath, after, 'utf8');

    const r = run(dir, 'run', 'start', 'epic', 'attachments');
    assert.match(r.stdout, /1 phase\(s\) not yet scaffolded/);
  });
});

test('--unit still overrides the computed start', () => {
  withEpicRepo((dir) => {
    run(dir, 'run', 'start', 'epic', 'attachments', '--unit', 'phase-2-ui');
    assert.equal(manifestLib.load(dir).cursor.unit, 'phase-2-ui');
  });
});

test('a phase-tier run is unaffected by the epic resolution', () => {
  withEpicRepo((dir) => {
    run(dir, 'run', 'start', 'phase', 'phase-1-api');
    assert.equal(manifestLib.load(dir).cursor.unit, 'phase-1-api');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// tdd: strict — the control signal
// ─────────────────────────────────────────────────────────────────────────────

test('under tdd: strict a task cannot be marked done without a red→green', () => {
  withEpicRepo((dir) => {
    run(dir, 'run', 'start', 'phase', 'p', '--unit', 'G1', '--tdd', 'strict');

    const before = run(dir, 'run', 'check-task', 'wire the thing');
    assert.equal(before.status, 1);
    assert.match(before.stderr, /no recorded red→green/);
    assert.match(before.stderr, /not the agent's own opinion/);

    assert.equal(run(dir, 'run', 'red-green', 'wire the thing').status, 0);
    assert.equal(run(dir, 'run', 'check-task', 'wire the thing').status, 0);
  });
});

test('under tdd: opt-in the same task passes without evidence', () => {
  withEpicRepo((dir) => {
    run(dir, 'run', 'start', 'phase', 'p', '--unit', 'G1', '--tdd', 'opt-in');
    assert.equal(run(dir, 'run', 'check-task', 'wire the thing').status, 0);
  });
});

test('red→green is recorded per unit, not globally', () => {
  withEpicRepo((dir) => {
    run(dir, 'run', 'start', 'phase', 'p', '--unit', 'G1', '--tdd', 'strict');
    run(dir, 'run', 'red-green', 'shared name');

    assert.equal(run(dir, 'run', 'check-task', 'shared name', '--unit', 'G1').status, 0);
    assert.equal(run(dir, 'run', 'check-task', 'shared name', '--unit', 'G2').status, 1,
      'evidence on one unit must not vouch for another');
  });
});

test('hasRedGreen is pure and tolerant of a manifest with no evidence yet', () => {
  assert.equal(manifestLib.hasRedGreen(null, 'G1', 't'), false);
  assert.equal(manifestLib.hasRedGreen({}, 'G1', 't'), false);
  assert.equal(manifestLib.hasRedGreen({ red_green: { G1: ['t'] } }, 'G1', 't'), true);
  assert.equal(manifestLib.hasRedGreen({ red_green: { G1: ['t'] } }, 'G1', 'other'), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// Recipe surfaces
// ─────────────────────────────────────────────────────────────────────────────

test('/brainstorm-epic exists as a shared recipe, reaching all four adapters', () => {
  const p = path.join(REPO_ROOT, 'core', 'commands', 'brainstorm-epic.md');
  assert.ok(fs.existsSync(p), 'core/commands/ is the shared surface — one file, four adapters');

  const src = fs.readFileSync(p, 'utf8');
  assert.match(src, /Decisions are durable\. Plans are perishable\./);
  assert.match(src, /Two phases IS the trigger/);
  assert.match(src, /Never write a later phase's plan/);
  // The gate contract is what makes a brainstorm command trustworthy.
  assert.match(src, /momentum\/brainstorm-active/);
});

test('/brainstorm-epic tells the operator what per-feature release costs them', () => {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'core', 'commands', 'brainstorm-epic.md'), 'utf8');
  assert.match(src, /one approval will cover code\n   the operator has not read yet \(ADR-0020\)/);
  assert.match(src, /Requires `tdd: strict`/);
});

test('/brainstorm-phase documents the derive mode without disturbing the interview path', () => {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'core', 'commands', 'brainstorm-phase.md'), 'utf8');
  assert.match(src, /Two modes: interview \(cold\) and derive \(inside an epic\)/);
  assert.match(src, /momentum run derive <phase-dir> --epic <slug>/);
  // The interview path must be intact — a cold phase still needs it.
  assert.match(src, /## Steps/);
  assert.match(src, /Define scope with the user \(one question at a time\)/);
  assert.match(src, /Brainstorm Gate Contract/);
});

test('the derive mode explains WHY, not just how', () => {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'core', 'commands', 'brainstorm-phase.md'), 'utf8');
  assert.match(src, /every operator amendment mid-epic then becomes a\n> merge conflict/);
});
