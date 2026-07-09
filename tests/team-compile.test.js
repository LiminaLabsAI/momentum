'use strict';

/**
 * Phase 30a — Team-Walk, Group 2 (fragment compile + board).
 * Fragments fold into a rendered Active-Phase table; own-row (last-writer-wins)
 * is mechanical; `applyManaged` splices the view between managed markers.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const { mktmp, rmrf, REPO_ROOT } = require('./_helpers');
const compile = require(path.join(REPO_ROOT, 'core', 'team', 'lib', 'compile'));
const MOMENTUM = path.join(REPO_ROOT, 'bin', 'momentum.js');

function git(cwd, ...a) { return spawnSync('git', a, { cwd, encoding: 'utf8' }); }
function momentum(cwd, ...a) { return spawnSync('node', [MOMENTUM, ...a], { cwd, encoding: 'utf8', env: { ...process.env } }); }
function initRepo(dir, email) {
  fs.mkdirSync(dir, { recursive: true });
  git(dir, 'init', '-q'); git(dir, 'config', 'user.email', email); git(dir, 'config', 'user.name', 'T');
}

test('compile: two actors → two rows', () => {
  const tmp = mktmp('team-comp-');
  try {
    const r = path.join(tmp, 'r'); fs.mkdirSync(r, { recursive: true });
    compile.recordActivePhase(r, 'alice', { branch: 'phase-30a', phase: '30a', status: 'in-progress', progress: 'G2' }, { ts: '2026-07-10T00:00:00Z' });
    compile.recordActivePhase(r, 'bob', { branch: 'phase-30b', phase: '30b', status: 'open', progress: 'G0' }, { ts: '2026-07-10T00:00:01Z' });
    const rows = compile.activePhaseRows(r);
    assert.equal(rows.length, 2);
    const table = compile.renderActivePhaseTable(rows);
    assert.match(table, /phase-30a/); assert.match(table, /phase-30b/);
    assert.match(table, /alice/); assert.match(table, /bob/);
  } finally { rmrf(tmp); }
});

test('compile: same actor updates own row (foldLatest)', () => {
  const tmp = mktmp('team-comp-');
  try {
    const r = path.join(tmp, 'r'); fs.mkdirSync(r, { recursive: true });
    compile.recordActivePhase(r, 'alice', { branch: 'phase-30a', phase: '30a', status: 'open', progress: 'G0' }, { ts: '2026-07-10T00:00:00Z' });
    compile.recordActivePhase(r, 'alice', { branch: 'phase-30a', phase: '30a', status: 'in-progress', progress: 'G2' }, { ts: '2026-07-10T00:00:05Z' });
    const rows = compile.activePhaseRows(r);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].payload.status, 'in-progress');
    assert.equal(rows[0].payload.progress, 'G2');
  } finally { rmrf(tmp); }
});

test('applyManaged: insert then replace idempotently', () => {
  const base = '# Status\n\nsome text\n';
  const once = compile.applyManaged(base, 'active-phase', 'TABLE-1');
  assert.match(once, /momentum:team:active-phase:begin/);
  assert.match(once, /TABLE-1/);
  const twice = compile.applyManaged(once, 'active-phase', 'TABLE-2');
  assert.match(twice, /TABLE-2/);
  assert.doesNotMatch(twice, /TABLE-1/);
  assert.equal((twice.match(/active-phase:begin/g) || []).length, 1); // one block only
});

test('momentum team record + board round-trip', () => {
  const tmp = mktmp('team-comp-');
  try {
    const r = path.join(tmp, 'r'); initRepo(r, 'alice@x');
    const rec = momentum(r, 'team', 'record', '--branch', 'phase-30a-team-walk', '--phase', '30a', '--status', 'in-progress', '--progress', 'G2');
    assert.equal(rec.status, 0, rec.stderr);
    const board = momentum(r, 'team', 'board');
    assert.equal(board.status, 0, board.stderr);
    assert.match(board.stdout, /phase-30a-team-walk/);
    assert.match(board.stdout, /alice/);
  } finally { rmrf(tmp); }
});
