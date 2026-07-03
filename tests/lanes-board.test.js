'use strict';

/**
 * Phase 21b G3 — `momentum lanes` board + `momentum lanes queue`
 * (core/lanes/lib/board.js).
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, write, runCli, REPO_ROOT } = require('./_helpers');

const state = require(path.join(REPO_ROOT, 'core', 'lanes', 'lib', 'state'));

function git(cwd, ...args) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(res.status, 0, `git ${args.join(' ')} failed: ${res.stderr}`);
  return res.stdout.trim();
}

/** Repo inside a container dir so default lane worktrees land in the container. */
function makeRepo() {
  const container = mktmp('momentum-lanes-board-');
  const dir = path.join(container, 'proj');
  fs.mkdirSync(dir);
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@example.com');
  git(dir, 'config', 'user.name', 'T');
  git(dir, 'config', 'commit.gpgsign', 'false');
  write(path.join(dir, 'README.md'), 'fixture\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '--no-verify', '-m', 'init');
  return { container, dir };
}

function lanes(cwd, ...args) {
  return runCli(['lanes', ...args], { cwd });
}

test('empty registry: board prints the open hint + empty footer; queue empty; non-repo errors', () => {
  const { container, dir } = makeRepo();
  try {
    const board = lanes(dir);
    assert.equal(board.status, 0, board.stderr);
    assert.match(board.stdout, /no lanes — open one with: momentum lanes open <branch>/);
    assert.match(board.stdout, /queue: empty — nothing awaiting landing/);

    const queue = lanes(dir, 'queue');
    assert.equal(queue.status, 0, queue.stderr);
    assert.match(queue.stdout, /landing queue empty/);

    const outside = mktmp('momentum-lanes-norepo-');
    try {
      const bad = lanes(outside);
      assert.equal(bad.status, 1);
      assert.match(bad.stderr, /not inside a git repository/);
    } finally {
      rmrf(outside);
    }
  } finally {
    rmrf(container);
  }
});

test('board: one line per non-closed lane with plan node, grade, status, age; closed hidden', () => {
  const { container, dir } = makeRepo();
  try {
    fs.mkdirSync(path.join(dir, 'specs', 'phases', 'phase-9-b'), { recursive: true });
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '--no-verify', '-m', 'phase dir', '--allow-empty');

    assert.equal(lanes(dir, 'open', 'phase-9-b', '--no-worktree').status, 0);
    assert.equal(lanes(dir, 'open', 'fix/BUG-1-x', '--no-worktree').status, 0);
    assert.equal(lanes(dir, 'open', 'feat/gone', '--no-worktree').status, 0);
    assert.equal(lanes(dir, 'close', 'feat-gone').status, 0);

    const res = lanes(dir);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /● phase-9-b {2}phase:phase-9-b {2}phase {2}open {2}\d+[mhd]/);
    assert.match(res.stdout, /● fix-BUG-1-x {2}adhoc:fix-BUG-1-x {2}quick-task {2}open {2}\d+[mhd]/);
    assert.ok(!res.stdout.includes('feat-gone'), 'closed lane hidden from the board');
  } finally {
    rmrf(container);
  }
});

test('queue-pressure footer counts done lanes and reports the oldest wait', () => {
  const { container, dir } = makeRepo();
  try {
    assert.equal(lanes(dir, 'open', 'feat/a', '--no-worktree').status, 0);
    assert.equal(lanes(dir, 'open', 'feat/b', '--no-worktree').status, 0);
    assert.equal(lanes(dir, 'done', 'feat-a').status, 0);
    assert.equal(lanes(dir, 'done', 'feat-b').status, 0);

    // Age the older entry so the footer has a distinct wait to report.
    const anchor = state.resolveAnchor(dir);
    state.updateLane(anchor, 'feat-a', {
      doneAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    });

    const res = lanes(dir);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /queue: 2 done awaiting landing — oldest waiting 3h/);
  } finally {
    rmrf(container);
  }
});

test('board shows the ✉ unread badge when a signal file sits in the lane inbox', () => {
  const { container, dir } = makeRepo();
  try {
    assert.equal(lanes(dir, 'open', 'feat/sig', '--no-worktree').status, 0);
    // Plant the signal file directly — G4's signals module must not be a dependency.
    const anchor = state.resolveAnchor(dir);
    write(
      path.join(anchor, 'feat-sig', 'inbox', '0001-message.json'),
      JSON.stringify({ seq: 1, type: 'message', text: 'ping' }) + '\n'
    );

    const res = lanes(dir);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /● feat-sig .*✉1/);
  } finally {
    rmrf(container);
  }
});

test('board flags ⚠overlap between active lanes with intersecting touches', () => {
  const { container, dir } = makeRepo();
  try {
    assert.equal(lanes(dir, 'open', 'feat/one', '--no-worktree', '--touches', 'core/lanes/**').status, 0);
    assert.equal(lanes(dir, 'open', 'feat/two', '--no-worktree', '--touches', 'core/**').status, 0);
    assert.equal(lanes(dir, 'open', 'feat/three', '--no-worktree', '--touches', 'docs/**').status, 0);

    const res = lanes(dir);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /● feat-one .*⚠overlap/);
    assert.match(res.stdout, /● feat-two .*⚠overlap/);
    assert.doesNotMatch(res.stdout, /● feat-three .*⚠overlap/);
  } finally {
    rmrf(container);
  }
});

test('queue: FIFO by doneAt with fresh/stale vs HEAD of the current worktree', () => {
  const { container, dir } = makeRepo();
  try {
    // feat/old branches at C1; main then advances → HEAD not in feat/old → stale.
    git(dir, 'branch', 'feat/old');
    assert.equal(lanes(dir, 'open', 'feat/old', '--no-worktree').status, 0);
    assert.equal(lanes(dir, 'done', 'feat-old').status, 0);

    write(path.join(dir, 'later.txt'), 'C2\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '--no-verify', '-m', 'advance main');

    // feat/new branches at C2 → contains HEAD → fresh.
    git(dir, 'branch', 'feat/new');
    assert.equal(lanes(dir, 'open', 'feat/new', '--no-worktree').status, 0);
    assert.equal(lanes(dir, 'done', 'feat-new').status, 0);

    const res = lanes(dir, 'queue');
    assert.equal(res.status, 0, res.stderr);
    const lines = res.stdout.trim().split('\n');
    assert.match(lines[0], /^1\. feat-old {2}grade=quick-task {2}done=\S+ {2}stale — rebase onto main before landing$/);
    assert.match(lines[1], /^2\. feat-new {2}grade=quick-task {2}done=\S+ {2}fresh$/);
  } finally {
    rmrf(container);
  }
});

test('--json: board and queue emit parseable internal shapes marked unstable', () => {
  const { container, dir } = makeRepo();
  try {
    assert.equal(lanes(dir, 'open', 'feat/j1', '--no-worktree', '--touches', 'core/**').status, 0);
    assert.equal(lanes(dir, 'open', 'feat/j2', '--no-worktree', '--touches', 'core/lanes/**').status, 0);
    assert.equal(lanes(dir, 'done', 'feat-j2').status, 0);

    const b = lanes(dir, 'board', '--json');
    assert.equal(b.status, 0, b.stderr);
    const board = JSON.parse(b.stdout);
    assert.equal(board.unstable, true, 'board JSON marked unstable (internal per ADR-0002)');
    assert.equal(board.stateVersion, 1);
    assert.equal(board.lanes.length, 2);
    const j1 = board.lanes.find((l) => l.id === 'feat-j1');
    assert.equal(typeof j1.unread, 'number');
    assert.ok(Array.isArray(j1.overlaps) && j1.overlaps.length > 0, 'overlaps carried in JSON');
    assert.equal(board.queue.doneCount, 1);
    assert.ok(board.queue.oldestDoneAt, 'oldestDoneAt present');

    const q = lanes(dir, 'queue', '--json');
    assert.equal(q.status, 0, q.stderr);
    const queue = JSON.parse(q.stdout);
    assert.equal(queue.unstable, true, 'queue JSON marked unstable (internal per ADR-0002)');
    assert.equal(queue.queue.length, 1);
    assert.equal(queue.queue[0].id, 'feat-j2');
    assert.equal(queue.queue[0].position, 1);
    assert.equal(typeof queue.queue[0].fresh, 'boolean');
  } finally {
    rmrf(container);
  }
});
