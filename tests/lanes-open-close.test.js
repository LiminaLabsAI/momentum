'use strict';

/**
 * Phase 21b G2 — `momentum lanes open/done/close` (bin/lanes.js).
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
  const container = mktmp('momentum-lanes-cli-');
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

test('open creates a worktree at ../<repo>.lanes/<id>, registers the lane, infers plan node', () => {
  const { container, dir } = makeRepo();
  try {
    fs.mkdirSync(path.join(dir, 'specs', 'phases', 'phase-3-x'), { recursive: true });
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '--no-verify', '-m', 'phase dir', '--allow-empty');

    const res = lanes(dir, 'open', 'phase-3-x', '--touches', 'core/**,docs/');
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /worktree created at .*proj\.lanes[/\\]phase-3-x/);
    assert.match(res.stdout, /lane 'phase-3-x' open .* plan node phase:phase-3-x, grade phase/);

    assert.ok(fs.existsSync(path.join(container, 'proj.lanes', 'phase-3-x', 'README.md')), 'worktree materialized');

    const anchor = state.resolveAnchor(dir);
    const m = state.readManifest(anchor, 'phase-3-x');
    assert.equal(m.status, 'open');
    assert.equal(m.grade, 'phase');
    assert.deepEqual(m.touches, ['core/**', 'docs/']);
    assert.ok(m.worktree, 'worktree recorded');
  } finally {
    rmrf(container);
  }
});

test('open --no-worktree registers without touching the filesystem substrate', () => {
  const { container, dir } = makeRepo();
  try {
    const res = lanes(dir, 'open', 'fix/BUG-7-z', '--no-worktree', '--note', 'gitbutler lane');
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /plan node adhoc:fix-BUG-7-z, grade quick-task/);
    const anchor = state.resolveAnchor(dir);
    const m = state.readManifest(anchor, 'fix-BUG-7-z');
    assert.equal(m.worktree, null);
    assert.equal(m.note, 'gitbutler lane');
    assert.ok(!fs.existsSync(path.join(container, 'proj.lanes')), 'no worktree home created');
  } finally {
    rmrf(container);
  }
});

test('open warns on touch overlap with another active lane (advisory, exit 0)', () => {
  const { container, dir } = makeRepo();
  try {
    assert.equal(lanes(dir, 'open', 'feat/one', '--no-worktree', '--touches', 'core/lanes/**').status, 0);
    const res = lanes(dir, 'open', 'feat/two', '--no-worktree', '--touches', 'core/**');
    assert.equal(res.status, 0, 'advisory — never blocks');
    assert.match(res.stdout, /touch overlap with lane 'feat-one'/);
  } finally {
    rmrf(container);
  }
});

test('preflight warns when committed *.sh lack the exec bit in the new worktree', () => {
  const { container, dir } = makeRepo();
  try {
    write(path.join(dir, 'scripts', 'hook.sh'), '#!/bin/sh\nexit 0\n');
    git(dir, 'add', '-A'); // added without +x → committed 100644
    git(dir, 'commit', '-q', '--no-verify', '-m', 'add hook');
    const res = lanes(dir, 'open', 'feat/pf', '--touches', 'scripts/');
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /preflight: 1 committed \*\.sh without the exec bit/);
  } finally {
    rmrf(container);
  }
});

test('done stamps doneAt and reports queue position; close --rm-worktree removes it', () => {
  const { container, dir } = makeRepo();
  try {
    assert.equal(lanes(dir, 'open', 'feat/a', '--no-worktree').status, 0);
    assert.equal(lanes(dir, 'open', 'feat/b').status, 0);

    const d1 = lanes(dir, 'done', 'feat-a');
    assert.equal(d1.status, 0, d1.stderr);
    assert.match(d1.stdout, /position 1 of 1 in the landing queue/);
    const d2 = lanes(dir, 'done', 'feat-b');
    assert.match(d2.stdout, /position 2 of 2 in the landing queue/);

    const anchor = state.resolveAnchor(dir);
    const wt = state.readManifest(anchor, 'feat-b').worktree;
    assert.ok(fs.existsSync(wt), 'worktree exists before close');

    const c = lanes(dir, 'close', 'feat-b', '--rm-worktree');
    assert.equal(c.status, 0, c.stderr);
    assert.match(c.stdout, /worktree removed/);
    assert.ok(!fs.existsSync(wt), 'worktree gone after close --rm-worktree');
    assert.equal(state.readManifest(anchor, 'feat-b').status, 'closed');
  } finally {
    rmrf(container);
  }
});

test('open on an already-checked-out branch reuses that worktree; errors surface cleanly', () => {
  const { container, dir } = makeRepo();
  try {
    // current branch (main) is checked out in the primary worktree → reuse
    const res = lanes(dir, 'open', 'main', '--no-worktree');
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /plan node unbound, grade quick-task/);

    // unknown lane id on done/close
    const bad = lanes(dir, 'done', 'nope');
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /no such lane/);

    // duplicate open rejected
    const dup = lanes(dir, 'open', 'main', '--no-worktree');
    assert.equal(dup.status, 1);
    assert.match(dup.stderr, /already open/);
  } finally {
    rmrf(container);
  }
});

test('lanes help prints the surface; unknown subcommand exits 1', () => {
  const { container, dir } = makeRepo();
  try {
    const h = lanes(dir, 'help');
    assert.equal(h.status, 0);
    assert.match(h.stdout, /momentum lanes open <branch>/);
    assert.match(h.stdout, /git-common-dir/);
    const u = lanes(dir, 'frobnicate');
    assert.equal(u.status, 1);
    assert.match(u.stderr, /unknown lanes subcommand/);
  } finally {
    rmrf(container);
  }
});
