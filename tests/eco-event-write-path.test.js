'use strict';

// Phase 31a G1 — git-native ecosystem event write path (ADR-0016).
//
// The headline assertion is ACCEPTANCE CRITERION 1: a commit made from a LANE
// WORKTREE — outside the member's `members[].path` — still lands in the
// ecosystem log. That is the exact scenario the pre-31a `$PWD`-matching write
// path silently dropped, and lane worktrees are momentum's OWN recommended
// concurrency flow (Rule 15), so its own audit trail was blind to its own
// workflow.
//
// The second block is a PARITY fence. The hook-side writer
// (core/git-hooks/eco-event.js) is a deliberate reimplementation, because an
// installed project receives no copy of core/. Two implementations that
// silently drift is the very bug class 31a closes, so parity is asserted
// rather than assumed.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { mktmp, rmrf, runCli, write } = require('./_helpers');

const REPO_ROOT = path.resolve(__dirname, '..');
const HOOK_WRITER = require('../core/git-hooks/eco-event.js');
const events = require('../core/ecosystem/lib/events');
const fragments = require('../core/team/lib/fragments');

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.com',
};

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', env: GIT_ENV }).trim();
}

/** Ecosystem at <tmp>/eco with one registered, git-initialized member. */
function setupEcosystem() {
  const tmp = mktmp();
  const res = runCli(['ecosystem', 'init', 'eco'], { cwd: tmp });
  assert.equal(res.status, 0, res.stderr || res.stdout);
  const root = path.join(tmp, 'eco');

  const memberDir = path.join(tmp, 'member');
  fs.mkdirSync(path.join(memberDir, 'specs'), { recursive: true });
  write(path.join(memberDir, 'CLAUDE.md'), '# Member\n');
  write(path.join(memberDir, 'specs', 'status.md'), 'x\n');

  const add = runCli(['ecosystem', 'add', '../member', '--role', 'platform', '--id', 'member'],
    { cwd: root });
  assert.equal(add.status, 0, add.stderr || add.stdout);

  git(memberDir, 'init', '-q');
  git(memberDir, 'config', 'user.email', 'test@example.com');
  git(memberDir, 'config', 'user.name', 'Test');
  git(memberDir, 'add', '.');
  git(memberDir, 'commit', '-qm', 'initial');

  return { tmp, root, memberDir };
}

// ─────────────────────────────────────────────────────────────────────────────
// Acceptance criterion 1 — worktree visibility
// ─────────────────────────────────────────────────────────────────────────────

test('AC-1: a commit from a LANE WORKTREE outside members[].path is attributed', () => {
  const { tmp, root, memberDir } = setupEcosystem();
  try {
    // A lane worktree living somewhere else entirely — the Rule 15 flow, and
    // the case the pre-31a $PWD matcher dropped on the floor.
    const worktree = path.join(tmp, 'lanes', 'feat-x');
    git(memberDir, 'worktree', 'add', '-q', '-b', 'feat-x', worktree);

    // Sanity: the worktree is genuinely NOT the registered member path.
    assert.notEqual(fs.realpathSync(worktree), fs.realpathSync(memberDir));

    // $PWD-based resolution (the old way) would find no member here...
    // ...but --git-common-dir resolves to the real repo.
    assert.equal(
      fs.realpathSync(HOOK_WRITER.resolveRepoRoot(worktree)),
      fs.realpathSync(memberDir),
      'worktree must resolve to its main repo root',
    );

    write(path.join(worktree, 'f.txt'), 'hello\n');
    git(worktree, 'add', 'f.txt');
    git(worktree, 'commit', '-qm', 'feat: work done in a lane worktree');

    const res = HOOK_WRITER.postCommit(worktree);
    assert.equal(res.recorded, true, res.reason);
    assert.equal(res.member, 'member');

    const log = events.compileSessionLog(root);
    assert.match(log, /\[member\] commit: feat: work done in a lane worktree/);
  } finally {
    rmrf(tmp);
  }
});

test('a commit from a SUBDIRECTORY of a member is attributed', () => {
  const { tmp, root, memberDir } = setupEcosystem();
  try {
    const sub = path.join(memberDir, 'specs');
    write(path.join(memberDir, 'g.txt'), 'x\n');
    git(memberDir, 'add', 'g.txt');
    git(memberDir, 'commit', '-qm', 'chore: from a subdir');

    const res = HOOK_WRITER.postCommit(sub);
    assert.equal(res.recorded, true, res.reason);
    assert.match(events.compileSessionLog(root), /\[member\] commit: chore: from a subdir/);
  } finally {
    rmrf(tmp);
  }
});

test('fail-open: no ecosystem, unregistered repo, and non-repo are silent no-ops', () => {
  const tmp = mktmp();
  try {
    // Plain git repo, no ecosystem anywhere up the tree.
    const solo = path.join(tmp, 'solo');
    fs.mkdirSync(solo, { recursive: true });
    git(solo, 'init', '-q');
    git(solo, 'config', 'user.email', 'test@example.com');
    git(solo, 'config', 'user.name', 'Test');
    write(path.join(solo, 'a.txt'), 'x\n');
    git(solo, 'add', 'a.txt');
    git(solo, 'commit', '-qm', 'initial');

    const noEco = HOOK_WRITER.postCommit(solo);
    assert.equal(noEco.recorded, false);
    assert.doesNotThrow(() => HOOK_WRITER.postCommit(solo));

    // Not a git repo at all.
    const plain = path.join(tmp, 'plain');
    fs.mkdirSync(plain, { recursive: true });
    const notRepo = HOOK_WRITER.record({ cwd: plain, kind: 'commit', summary: 'x' });
    assert.equal(notRepo.recorded, false);
  } finally {
    rmrf(tmp);
  }
});

test('an unregistered repo inside an ecosystem records nothing', () => {
  const { tmp, root } = setupEcosystem();
  try {
    const stranger = path.join(tmp, 'stranger');
    fs.mkdirSync(stranger, { recursive: true });
    git(stranger, 'init', '-q');
    git(stranger, 'config', 'user.email', 'test@example.com');
    git(stranger, 'config', 'user.name', 'Test');
    write(path.join(stranger, 'a.txt'), 'x\n');
    git(stranger, 'add', 'a.txt');
    git(stranger, 'commit', '-qm', 'initial');

    const res = HOOK_WRITER.postCommit(stranger);
    assert.equal(res.recorded, false);
    assert.match(res.reason, /not a registered member/);
    assert.equal(events.listEvents(root).length, 0);
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Concurrency — the property that replaces session-append.sh's mkdir lock
// ─────────────────────────────────────────────────────────────────────────────

test('concurrent actors produce disjoint fragments — no lock, no conflict', () => {
  const { tmp, root, memberDir } = setupEcosystem();
  try {
    // Two actors recording at the SAME timestamp and sequence. Under the old
    // append-to-one-file design this needed a mkdir lock (BUG-004); under
    // own-prefix fragments it is conflict-free by construction.
    const a = HOOK_WRITER.record({
      cwd: memberDir, kind: 'commit', summary: 'from A', context: 'aaa',
      ts: '2026-07-27T10:00:00.000Z', seq: 1, env: { ...process.env, MOMENTUM_ACTOR: 'alice' },
    });
    const b = HOOK_WRITER.record({
      cwd: memberDir, kind: 'commit', summary: 'from B', context: 'bbb',
      ts: '2026-07-27T10:00:00.000Z', seq: 1, env: { ...process.env, MOMENTUM_ACTOR: 'bob' },
    });
    assert.equal(a.recorded, true, a.reason);
    assert.equal(b.recorded, true, b.reason);
    assert.notEqual(a.file, b.file, 'own-prefix filenames must not collide');

    const log = events.compileSessionLog(root, '2026-07-27');
    assert.match(log, /from A/);
    assert.match(log, /from B/);
    assert.match(log, /— alice/);
    assert.match(log, /— bob/);
  } finally {
    rmrf(tmp);
  }
});

test('writeSessionLog materializes sessions/<date>.md from the fragment stream', () => {
  const { tmp, root, memberDir } = setupEcosystem();
  try {
    HOOK_WRITER.record({
      cwd: memberDir, kind: 'commit', summary: 'feat: a thing', context: 'abc1234',
      ts: '2026-07-27T09:05:00.000Z', seq: 1,
    });
    const file = events.writeSessionLog(root, '2026-07-27');
    const body = fs.readFileSync(file, 'utf8');

    assert.equal(path.basename(file), '2026-07-27.md');
    assert.match(body, /^# Session 2026-07-27$/m);
    // Line format is byte-compatible with what session-append.sh always wrote.
    assert.match(body, /^09:05Z \[member\] commit: feat: a thing \(abc1234\)/m);
  } finally {
    rmrf(tmp);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Parity fence — hook-side writer vs core libs
// ─────────────────────────────────────────────────────────────────────────────

test('parity: hook-side actor slug matches core/identity', () => {
  const { slug } = require('../core/identity');
  for (const s of ['Ada@Example.COM', 'a b c', '@@@', 'x'.repeat(60), 'Zoë-Smith']) {
    assert.equal(HOOK_WRITER.slug(s), slug(s), `slug mismatch for ${JSON.stringify(s)}`);
  }
});

test('parity: hook-side fragment is byte-identical to core/team/lib/fragments', () => {
  const tmp = mktmp();
  try {
    // Same actor, view, kind, payload, ts, seq → the two writers must produce
    // the same filename AND the same bytes. If they ever diverge, the compiled
    // session log would silently disagree with what the hooks wrote.
    const viaCore = path.join(tmp, 'core-side');
    const viaHook = path.join(tmp, 'hook-side');
    fs.mkdirSync(viaCore, { recursive: true });
    fs.mkdirSync(viaHook, { recursive: true });

    const payload = { member: 'member', summary: 'feat: x', context: 'abc1234' };
    const opts = { ts: '2026-07-27T10:00:00.000Z', seq: 7 };

    const coreFrag = fragments.writeFragment(
      viaCore, HOOK_WRITER.EVENTS_VIEW, 'alice', 'commit', payload, opts,
    );

    // Drive the hook-side writer's serialization through the same shape by
    // pointing it at a fake ecosystem whose sole member is the repo itself.
    // It must be a real git repo — the hook-side path resolves the repo root
    // through git before it will record anything.
    fs.writeFileSync(path.join(viaHook, 'ecosystem.json'), JSON.stringify({
      name: 'eco', version: 1,
      members: [{ id: 'member', path: '.', role: 'platform' }],
    }));
    git(viaHook, 'init', '-q');
    git(viaHook, 'config', 'user.email', 'test@example.com');
    git(viaHook, 'config', 'user.name', 'Test');
    const hookRes = HOOK_WRITER.record({
      cwd: viaHook, kind: 'commit', summary: 'feat: x', context: 'abc1234',
      ts: opts.ts, seq: opts.seq, env: { ...process.env, MOMENTUM_ACTOR: 'alice' },
    });
    assert.equal(hookRes.recorded, true, hookRes.reason);

    assert.equal(
      path.basename(hookRes.file), path.basename(coreFrag.file),
      'fragment filenames must match',
    );
    assert.equal(
      fs.readFileSync(hookRes.file, 'utf8'),
      fs.readFileSync(coreFrag.file, 'utf8'),
      'fragment bytes must match — hook-side writer has drifted from core/team/lib/fragments',
    );
  } finally {
    rmrf(tmp);
  }
});

test('parity: hook-side member resolution matches core/ecosystem/lib/events', () => {
  const { tmp, root, memberDir } = setupEcosystem();
  try {
    assert.equal(
      HOOK_WRITER.resolveMemberId(root, memberDir),
      events.resolveMemberId(root, memberDir),
    );
    assert.equal(
      fs.realpathSync(HOOK_WRITER.resolveRepoRoot(memberDir)),
      fs.realpathSync(events.resolveMemberRepoRoot(memberDir)),
    );
  } finally {
    rmrf(tmp);
  }
});

test('the shipped post-commit/post-merge hooks are momentum-owned and upgradeable', () => {
  // installHookFiles() only upgrades files whose content identifies them as
  // momentum's (/momentum[^\n]*hook/i). A hook file failing this check would
  // install once and then never receive another update — silently frozen.
  for (const name of ['post-commit', 'post-merge', 'eco-event.js', 'run-check.js']) {
    const body = fs.readFileSync(path.join(REPO_ROOT, 'core', 'git-hooks', name), 'utf8');
    assert.ok(
      /momentum[^\n]*hook/i.test(body) || body.includes('Lifecycle Hardening'),
      `core/git-hooks/${name} must identify itself as momentum-owned or `
      + 'momentum upgrade will treat it as foreign and never update it',
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// End-to-end through the REAL git hook
// ─────────────────────────────────────────────────────────────────────────────
//
// This is the most important test in the file, and it exists because of how
// BUG-028 shipped: the old session-log test invoked the hook SCRIPT directly
// with a synthesized payload, so it stayed green for the entire life of a
// completely dead wiring. Asserting the library works proves nothing about
// whether git actually calls it.
//
// So: install momentum into a real repo, let `momentum init` wire the hooks
// itself, run a plain `git commit`, and assert the event landed. Nothing is
// invoked by hand.

test('E2E: a plain `git commit` in an installed member writes the session log', () => {
  const tmp = mktmp();
  try {
    const ecoRes = runCli(['ecosystem', 'init', 'eco'], { cwd: tmp });
    assert.equal(ecoRes.status, 0, ecoRes.stderr || ecoRes.stdout);
    const root = path.join(tmp, 'eco');

    // A real repo with momentum installed — hooks wired by the installer.
    const memberDir = path.join(tmp, 'member');
    fs.mkdirSync(memberDir, { recursive: true });
    git(memberDir, 'init', '-q');
    git(memberDir, 'config', 'user.email', 'test@example.com');
    git(memberDir, 'config', 'user.name', 'Test');

    const init = runCli(['init', '.', '--agent', 'claude-code'], { cwd: memberDir });
    assert.equal(init.status, 0, init.stderr || init.stdout);

    const add = runCli(['ecosystem', 'add', '../member', '--role', 'platform', '--id', 'member'],
      { cwd: root });
    assert.equal(add.status, 0, add.stderr || add.stdout);

    // The installer must have wired hooksPath and shipped the post-commit hook.
    assert.equal(git(memberDir, 'config', '--local', '--get', 'core.hooksPath'), '.githooks');
    assert.ok(fs.existsSync(path.join(memberDir, '.githooks', 'post-commit')),
      'post-commit must be installed');
    assert.ok(fs.existsSync(path.join(memberDir, '.githooks', 'eco-event.js')),
      'eco-event.js must be installed alongside it');

    // A completely ordinary commit. No hook invoked by hand.
    write(path.join(memberDir, 'thing.txt'), 'hello\n');
    git(memberDir, 'add', 'thing.txt');
    git(memberDir, 'commit', '-qm', 'feat: an ordinary commit');

    const recorded = events.listEvents(root);
    assert.equal(recorded.length, 1, 'git commit must have produced exactly one event');
    assert.equal(recorded[0].kind, 'commit');
    assert.equal(recorded[0].payload.member, 'member');
    assert.equal(recorded[0].payload.summary, 'feat: an ordinary commit');
    assert.match(events.compileSessionLog(root), /\[member\] commit: feat: an ordinary commit/);
  } finally {
    rmrf(tmp);
  }
});

test('E2E: MOMENTUM_SKIP_HOOKS=1 suppresses event capture', () => {
  const tmp = mktmp();
  try {
    const ecoRes = runCli(['ecosystem', 'init', 'eco'], { cwd: tmp });
    assert.equal(ecoRes.status, 0, ecoRes.stderr || ecoRes.stdout);
    const root = path.join(tmp, 'eco');

    const memberDir = path.join(tmp, 'member');
    fs.mkdirSync(memberDir, { recursive: true });
    git(memberDir, 'init', '-q');
    git(memberDir, 'config', 'user.email', 'test@example.com');
    git(memberDir, 'config', 'user.name', 'Test');
    runCli(['init', '.', '--agent', 'claude-code'], { cwd: memberDir });
    runCli(['ecosystem', 'add', '../member', '--role', 'platform', '--id', 'member'], { cwd: root });

    write(path.join(memberDir, 'thing.txt'), 'hello\n');
    execFileSync('git', ['add', 'thing.txt'], { cwd: memberDir, env: GIT_ENV });
    execFileSync('git', ['commit', '-qm', 'chore: bypassed'], {
      cwd: memberDir,
      env: { ...GIT_ENV, MOMENTUM_SKIP_HOOKS: '1' },
    });

    assert.equal(events.listEvents(root).length, 0,
      'MOMENTUM_SKIP_HOOKS=1 must suppress capture, like every other momentum hook');
  } finally {
    rmrf(tmp);
  }
});
