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
    assert.match(c.stdout, /worktree: .*feat-b/); // ENH-063: cleanup action output
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

test('ENH-050: a new lane branch bases on main even when another branch is checked out', () => {
  const { container, dir } = makeRepo();
  try {
    // Park the checkout on a side branch with an extra commit.
    git(dir, 'checkout', '-q', '-b', 'side/parked');
    write(path.join(dir, 'side.txt'), 'side\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '--no-verify', '-m', 'feat: side');
    const mainSha = git(dir, 'rev-parse', 'main');
    const r = lanes(dir, 'open', 'feat/from-default', '--grade', 'quick-task');
    assert.equal(r.status, 0, r.stderr);
    const baseSha = git(dir, 'rev-parse', 'feat/from-default');
    assert.equal(baseSha, mainSha, 'new lane must base on main, not the parked HEAD');
    assert.match(r.stdout, /branched from main/, 'open must report the base it used');
  } finally {
    rmrf(container);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ENH-063 — `lanes close` does FULL cleanup, and that is now FENCED.
//
// The original complaint: close flipped status to `closed` and, only with
// `--rm-worktree`, removed the worktree — it never `git branch -d`'d the lane
// branch and never cleared the lane's inbox/manifest. So the one explicit
// cleanup path still left a dangling branch and lingering state.
//
// It was routed through the shared `cleanupTarget()`, which fixed it. But the
// only assertions on close were "worktree gone" and "status === closed" — the
// two things ENH-063 was NOT about. The fix was real and completely unguarded,
// so a regression would silently restore the original bug with the suite green.
//
// This pins the parts that actually were broken.
// ─────────────────────────────────────────────────────────────────────────────

test('ENH-063: close deletes the lane branch and clears lane state, not just the worktree', () => {
  const { container, dir } = makeRepo();
  try {
    assert.equal(lanes(dir, 'open', 'feat-cleanup').status, 0);
    const anchor = state.resolveAnchor(dir);
    const manifest = state.readManifest(anchor, 'feat-cleanup');
    const branch = manifest.branch;

    // Preconditions — the things ENH-063 said were left behind.
    const branches = () => git(dir, 'branch', '--list', branch);
    assert.ok(branches().includes(branch), 'branch exists before close');

    const inbox = state.inboxDir(anchor, 'feat-cleanup');
    fs.mkdirSync(inbox, { recursive: true });
    fs.writeFileSync(path.join(inbox, 'sig.json'), '{"type":"note"}');
    assert.ok(fs.existsSync(path.join(inbox, 'sig.json')), 'inbox has state before close');

    const c = lanes(dir, 'close', 'feat-cleanup', '--rm-worktree');
    assert.equal(c.status, 0, c.stderr);

    // The two ENH-063 assertions.
    assert.equal(branches().trim(), '',
      `local branch '${branch}' must be deleted by close, not left dangling`);
    assert.ok(!fs.existsSync(path.join(inbox, 'sig.json')),
      'lane inbox must be cleared by close, not left lingering');
  } finally {
    rmrf(container);
  }
});

test('ENH-063: close refuses to force-delete an UNMERGED branch, and says so', () => {
  // Full cleanup must not mean destructive cleanup. An unmerged lane branch is
  // unlanded work; deleting it on `close` would discard commits. It is reported
  // as blocked and close still succeeds — cleanup is best-effort by design.
  const { container, dir } = makeRepo();
  try {
    assert.equal(lanes(dir, 'open', 'feat-unmerged').status, 0);
    const anchor = state.resolveAnchor(dir);
    const { branch, worktree } = state.readManifest(anchor, 'feat-unmerged');

    // Real unmerged work on the lane branch.
    write(path.join(worktree, 'work.txt'), 'unlanded\n');
    git(worktree, 'add', '-A');
    git(worktree, 'commit', '-q', '--no-verify', '-m', 'unlanded work');

    const c = lanes(dir, 'close', 'feat-unmerged', '--rm-worktree');
    assert.equal(c.status, 0, 'close still succeeds — cleanup is best-effort');
    assert.match(c.stdout, /not fully merged|some cleanup refused/,
      'an unmerged branch must be reported, not silently force-deleted');
    assert.ok(git(dir, 'branch', '--list', branch).includes(branch),
      'unmerged lane branch must survive close — those commits are unlanded work');
  } finally {
    rmrf(container);
  }
});
