'use strict';

/**
 * Phase 31c G5 — end-to-end (ADR-0018).
 *
 * Two criteria that only a full round-trip can prove:
 *
 *   AC-6  a FRESH CLONE has working hooks with no `upgrade` run — the reason
 *         R4 commits the runtime instead of gitignoring it
 *   AC-1  `lanes land`'s ecosystem gate applies in a real sibling layout with
 *         no injected root — BUG-030, exercised through the CLI rather than
 *         through a library call
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const { mktmp, rmrf, runCli, write } = require('./_helpers');
const closure = require('../core/runtime/closure');

const ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@x',
  GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@x',
};
const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', env: ENV }).trim();

test('AC-6: a fresh clone has a working runtime with NO upgrade run', () => {
  const tmp = mktmp();
  try {
    // ── an installed, committed project ───────────────────────────────────
    const origin = path.join(tmp, 'origin');
    fs.mkdirSync(origin, { recursive: true });
    git(origin, 'init', '-q');
    git(origin, 'config', 'user.email', 't@x');
    git(origin, 'config', 'user.name', 'T');
    assert.equal(runCli(['init', '.', '--agent', 'claude-code'], { cwd: origin }).status, 0);
    git(origin, 'add', '-A');
    git(origin, 'commit', '-qm', 'chore: momentum install');

    // The runtime must be IN THE COMMIT, not merely on disk — that is the
    // whole of R4. A gitignored runtime would clone into dead hooks.
    const tracked = git(origin, 'ls-files', '.momentum/runtime').split('\n').filter(Boolean);
    assert.ok(tracked.length >= closure.computeClosure().length,
      `expected the runtime to be committed, git tracks ${tracked.length} file(s)`);

    // ── clone it, and touch nothing ───────────────────────────────────────
    const clone = path.join(tmp, 'clone');
    execFileSync('git', ['clone', '-q', origin, clone], { encoding: 'utf8', env: ENV });

    for (const rel of closure.computeClosure()) {
      assert.ok(fs.existsSync(closure.destPath(clone, rel)),
        `fresh clone is missing runtime module ${rel} — hooks would silently no-op`);
    }
    assert.ok(fs.existsSync(path.join(clone, '.momentum', 'runtime', 'discover.js')),
      'the shell discovery entry point must survive a clone too');

    // ── and the runtime must actually RUN from the clone ──────────────────
    const runtimeIndex = closure.destPath(clone, 'ecosystem/lib/index.js');
    const probe = spawnSync(process.execPath,
      ['-e', `const m=require(${JSON.stringify(runtimeIndex)});`
        + 'process.stdout.write(typeof m.findRoot);'],
      { encoding: 'utf8' });
    assert.equal(probe.stdout, 'function',
      'a cloned runtime module must load — verbatim copies keep their relative requires');
  } finally { rmrf(tmp); }
});

test('AC-1: `lanes land` applies the ecosystem gate through the CLI, no injected root', () => {
  const tmp = mktmp();
  try {
    // ── sibling layout with two real momentum members ─────────────────────
    assert.equal(runCli(['ecosystem', 'init', 'eco'], { cwd: tmp }).status, 0);
    const root = path.join(tmp, 'eco');

    const dirs = {};
    for (const [id, role] of [['backend', 'platform'], ['frontend', 'client']]) {
      const dir = path.join(tmp, id);
      fs.mkdirSync(dir, { recursive: true });
      git(dir, 'init', '-q');
      git(dir, 'config', 'user.email', 't@x');
      git(dir, 'config', 'user.name', 'T');
      assert.equal(runCli(['init', '.', '--agent', 'claude-code'], { cwd: dir }).status, 0);
      write(path.join(dir, 'README.md'), `# ${id}\n`);
      git(dir, 'add', '-A');
      git(dir, 'commit', '-qm', 'chore: init');
      assert.equal(
        runCli(['ecosystem', 'add', `../${id}`, '--role', role, '--id', id], { cwd: root }).status, 0);
      dirs[id] = dir;
    }

    assert.equal(runCli(['ecosystem', 'initiative', 'create', 'attachments',
      '--why', 'w', '--repos', 'backend,frontend', '--owner', 'ada'], { cwd: root }).status, 0);
    assert.equal(runCli(['ecosystem', 'initiative', 'start', 'attachments',
      '--contribute', 'backend:phase:p12',
      '--contribute', 'frontend:adhoc:fix-a1',
      '--edge', 'frontend:backend:api-contract'], { cwd: root }).status, 0);

    // ── a frontend lane, ready to land ────────────────────────────────────
    git(dirs.frontend, 'checkout', '-qb', 'fix/a1');
    fs.mkdirSync(path.join(dirs.frontend, 'specs', 'adhoc', 'fix-a1'), { recursive: true });
    write(path.join(dirs.frontend, 'specs', 'adhoc', 'fix-a1', 'record.md'), '# rec\n');
    git(dirs.frontend, 'add', '-A');
    git(dirs.frontend, 'commit', '-qm', 'fix: a1');
    assert.equal(runCli(['lanes', 'open', 'fix-a1', '--branch', 'fix/a1',
      '--grade', 'quick-task', '--no-worktree'], { cwd: dirs.frontend }).status, 0);
    runCli(['lanes', 'done', 'fix-a1'], { cwd: dirs.frontend });
    git(dirs.frontend, 'checkout', '-q', 'main');

    // ── THE production call: `lanes land`, nothing injected ───────────────
    const res = runCli(['lanes', 'land', 'fix-a1'], { cwd: dirs.frontend });
    const out = `${res.stdout}${res.stderr}`;

    assert.match(out, /ecosystem\[attachments\]/,
      'AC-1: the ecosystem gate must APPEAR — pre-31c it was skipped silently');
    assert.match(out, /backend/, 'the blocking upstream member must be named');
    assert.notEqual(res.status, 0, 'an unlanded upstream must refuse the landing');
  } finally { rmrf(tmp); }
});

test('the runtime survives `upgrade` and stays byte-identical', () => {
  const tmp = mktmp();
  try {
    const target = path.join(tmp, 'proj');
    fs.mkdirSync(target, { recursive: true });
    assert.equal(runCli(['init', '.', '--agent', 'codex'], { cwd: target }).status, 0);
    assert.equal(runCli(['upgrade', '.'], { cwd: target }).status, 0);

    for (const rel of closure.computeClosure()) {
      assert.deepEqual(
        fs.readFileSync(closure.destPath(target, rel)),
        fs.readFileSync(closure.sourcePath(rel)),
        `${rel} drifted across upgrade`);
    }
  } finally { rmrf(tmp); }
});
