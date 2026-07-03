'use strict';

/**
 * Phase 21b G1 — lane state layer (core/lanes/lib/state.js, ADR-0002).
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, write, REPO_ROOT } = require('./_helpers');

const STATE = path.join(REPO_ROOT, 'core', 'lanes', 'lib', 'state.js');
const state = require(STATE);

function git(cwd, ...args) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(res.status, 0, `git ${args.join(' ')} failed: ${res.stderr}`);
  return res.stdout.trim();
}

function makeRepo() {
  const dir = mktmp('momentum-lanes-state-');
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@example.com');
  git(dir, 'config', 'user.name', 'T');
  git(dir, 'config', 'commit.gpgsign', 'false');
  write(path.join(dir, 'README.md'), 'fixture\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '--no-verify', '-m', 'init');
  return dir;
}

test('anchor resolves to the SAME dir from the main worktree and a linked worktree', () => {
  const repo = makeRepo();
  const wtParent = mktmp('momentum-lanes-wt-');
  const wt = path.join(wtParent, 'lane-x');
  try {
    git(repo, 'worktree', 'add', wt, '-b', 'lane-x', 'main');
    const fromMain = state.resolveAnchor(repo);
    const fromLinked = state.resolveAnchor(wt);
    assert.ok(fromMain, 'anchor from main worktree');
    assert.equal(
      fs.realpathSync(state.gitCommonDir(repo)),
      fs.realpathSync(state.gitCommonDir(wt)),
      'both worktrees share one git common dir'
    );
    assert.match(fromMain, /momentum[/\\]lanes$/);
    assert.match(fromLinked, /momentum[/\\]lanes$/);
    // Writing from the linked worktree must be visible from the main one.
    state.createLane(fromLinked, {
      id: 'lane-x', branch: 'lane-x',
      planNode: { type: 'unbound', ref: null }, grade: 'spike',
    });
    assert.equal(state.listLanes(fromMain).length, 1, 'lane written via linked worktree visible from main');
  } finally {
    rmrf(wtParent);
    rmrf(repo);
  }
});

test('resolveAnchor returns null outside a git repo', () => {
  const dir = mktmp('momentum-lanes-nogit-');
  try {
    assert.equal(state.resolveAnchor(dir), null);
  } finally {
    rmrf(dir);
  }
});

test('createLane + readManifest + listLanes round-trip; duplicate open rejected', () => {
  const repo = makeRepo();
  try {
    const anchor = state.resolveAnchor(repo);
    const lane = state.createLane(anchor, {
      id: state.laneId('phase-9-demo'),
      branch: 'phase-9-demo',
      planNode: { type: 'phase', ref: 'phase-9-demo' },
      grade: 'phase',
      touches: ['core/**'],
    });
    assert.equal(lane.status, 'open');
    assert.equal(lane.stateVersion, state.STATE_VERSION);

    const back = state.readManifest(anchor, 'phase-9-demo');
    assert.equal(back.branch, 'phase-9-demo');
    assert.deepEqual(back.touches, ['core/**']);

    assert.equal(state.listLanes(anchor).length, 1);

    assert.throws(
      () => state.createLane(anchor, { id: 'phase-9-demo', branch: 'phase-9-demo', planNode: { type: 'phase', ref: 'phase-9-demo' }, grade: 'phase' }),
      /already open/
    );

    // closed lanes can be re-opened under the same id
    state.updateLane(anchor, 'phase-9-demo', { status: 'closed' });
    const reopened = state.createLane(anchor, {
      id: 'phase-9-demo', branch: 'phase-9-demo',
      planNode: { type: 'phase', ref: 'phase-9-demo' }, grade: 'phase',
    });
    assert.equal(reopened.status, 'open');
  } finally {
    rmrf(repo);
  }
});

test('updateLane patches status with validation; unknown lane rejected', () => {
  const repo = makeRepo();
  try {
    const anchor = state.resolveAnchor(repo);
    state.createLane(anchor, {
      id: 'fix-BUG-1-x', branch: 'fix/BUG-1-x',
      planNode: { type: 'adhoc', ref: 'fix-BUG-1-x' }, grade: 'quick-task',
    });
    const done = state.updateLane(anchor, 'fix-BUG-1-x', { status: 'done', doneAt: '2026-07-03T00:00:00Z' });
    assert.equal(done.status, 'done');
    assert.throws(() => state.updateLane(anchor, 'fix-BUG-1-x', { status: 'bogus' }), /invalid status/);
    assert.throws(() => state.updateLane(anchor, 'nope', {}), /no such lane/);
  } finally {
    rmrf(repo);
  }
});

test('plan-node inference follows the Rule 15 convention', () => {
  const repo = makeRepo();
  try {
    fs.mkdirSync(path.join(repo, 'specs', 'phases', 'phase-2-x'), { recursive: true });
    assert.deepEqual(state.inferPlanNode('phase-2-x', repo), { type: 'phase', ref: 'phase-2-x', dirExists: true });
    assert.deepEqual(state.inferPlanNode('phase-ghost', repo), { type: 'phase', ref: 'phase-ghost', dirExists: false });
    assert.deepEqual(state.inferPlanNode('fix/BUG-9-y', repo), { type: 'adhoc', ref: 'fix-BUG-9-y' });
    assert.deepEqual(state.inferPlanNode('main', repo), { type: 'unbound', ref: null });
    assert.equal(state.defaultGrade({ type: 'phase' }), 'phase');
    assert.equal(state.defaultGrade({ type: 'adhoc' }), 'quick-task');
  } finally {
    rmrf(repo);
  }
});

test('concurrent createLane from 6 processes: all lanes registered, registry intact', () => {
  const repo = makeRepo();
  try {
    const anchor = state.resolveAnchor(repo);
    const script = (i) => `
      const state = require(${JSON.stringify(STATE)});
      state.createLane(${JSON.stringify(anchor)}, {
        id: 'lane-${'${i}'.replace('${i}', '')}' + ${i},
        branch: 'feat/x' + ${i},
        planNode: { type: 'adhoc', ref: 'feat-x' + ${i} },
        grade: 'quick-task',
      });
    `;
    const procs = [];
    for (let i = 0; i < 6; i++) {
      procs.push(spawnSync('node', ['-e', script(i)], { encoding: 'utf8' }));
    }
    for (const p of procs) {
      assert.equal(p.status, 0, `child failed: ${p.stderr}`);
    }
    const reg = state.readRegistry(anchor);
    assert.equal(reg.lanes.length, 6, `expected 6 registered lanes, got ${reg.lanes.length}`);
    assert.equal(state.listLanes(anchor).length, 6);
  } finally {
    rmrf(repo);
  }
});
