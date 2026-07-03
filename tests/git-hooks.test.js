'use strict';

/**
 * Phase 19 — Lifecycle Hardening, Group 1.
 *
 * Integration tests for the vendor-neutral git-lifecycle hooks:
 *   - install wiring (bin/momentum.js → .githooks/ + core.hooksPath)
 *   - warn-not-clobber on a pre-existing custom hooks path (BUG-008 lesson)
 *   - commit-msg enforcement via REAL `git commit` (bad/good/escape-hatch)
 *   - pre-push enforcement via the dispatcher (protected branch + single-use
 *     sentinel; release-tag verification-evidence gate; escape hatch)
 *
 * These exercise the hooks against real temp git repos — they catch wiring
 * bugs that the pure-function unit tests (lifecycle-contract.test.js) cannot.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, runCli, read, REPO_ROOT } = require('./_helpers');

function git(repo, args, opts = {}) {
  return spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', ...opts });
}

/** Fresh git repo with identity configured + momentum installed. */
function setupInstalledRepo() {
  const tmp = mktmp('momentum-githooks-');
  const repo = path.join(tmp, 'proj');
  fs.mkdirSync(repo);
  const initGit = git(repo, ['init', '-q']);
  assert.equal(initGit.status, 0, 'git init failed');
  git(repo, ['config', 'user.email', 'test@momentum.test']);
  git(repo, ['config', 'user.name', 'Momentum Test']);
  const res = runCli(['init', repo, '--agent', 'claude-code']);
  assert.equal(res.status, 0, `momentum init failed: ${res.stderr}`);
  return { tmp, repo, initStdout: res.stdout };
}

/** Run the installed pre-push dispatcher with a ref line on stdin. */
function runPrePush(repo, refLine, extraEnv = {}) {
  return spawnSync('node', [path.join(repo, '.githooks', 'run-check.js'), 'pre-push', 'origin', 'git@example:repo.git'], {
    cwd: repo,
    input: refLine.endsWith('\n') ? refLine : refLine + '\n',
    encoding: 'utf8',
    env: { ...process.env, ...extraEnv },
  });
}

const NZ = 'a1b2c3d4'; // non-zero local sha (not a deletion)

test('init installs git hooks and points core.hooksPath at .githooks', () => {
  const { tmp, repo } = setupInstalledRepo();
  try {
    for (const f of ['commit-msg', 'pre-push', 'run-check.js', 'contract.js']) {
      assert.ok(fs.existsSync(path.join(repo, '.githooks', f)), `missing .githooks/${f}`);
    }
    // entrypoints executable
    for (const f of ['commit-msg', 'pre-push']) {
      const mode = fs.statSync(path.join(repo, '.githooks', f)).mode;
      assert.ok(mode & 0o100, `.githooks/${f} should be executable`);
    }
    const hp = git(repo, ['config', '--local', '--get', 'core.hooksPath']);
    assert.equal(hp.stdout.trim(), '.githooks');
  } finally {
    rmrf(tmp);
  }
});

test('commit-msg: rejects non-conventional, accepts conventional, honors escape hatch', () => {
  const { tmp, repo } = setupInstalledRepo();
  try {
    const bad = git(repo, ['commit', '--allow-empty', '-m', 'just some changes']);
    assert.notEqual(bad.status, 0, 'non-conventional commit should be rejected');
    assert.match(bad.stderr, /Conventional Commit/);

    const good = git(repo, ['commit', '--allow-empty', '-m', 'feat(hooks): add enforcement']);
    assert.equal(good.status, 0, `conventional commit should pass: ${good.stderr}`);

    const skipped = git(repo, ['commit', '--allow-empty', '-m', 'totally not conventional'], {
      env: { ...process.env, MOMENTUM_SKIP_HOOKS: '1' },
    });
    assert.equal(skipped.status, 0, `escape hatch should bypass: ${skipped.stderr}`);
  } finally {
    rmrf(tmp);
  }
});

test('BUG-011: init installs ADDITIVELY into a configured core.hooksPath (no skip, no relocate)', () => {
  const tmp = mktmp('momentum-githooks-configured-');
  const repo = path.join(tmp, 'proj');
  fs.mkdirSync(repo);
  git(repo, ['init', '-q']);
  git(repo, ['config', 'user.email', 'test@momentum.test']);
  git(repo, ['config', 'user.name', 'Momentum Test']);
  // Reproduce the reported bug: core.hooksPath explicitly set to the git
  // default, holding only .sample files (no real hooks).
  git(repo, ['config', 'core.hooksPath', '.git/hooks']);
  try {
    const res = runCli(['init', repo, '--agent', 'claude-code']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    // momentum hooks installed INTO the configured path...
    for (const f of ['commit-msg', 'pre-push', 'run-check.js', 'contract.js']) {
      assert.ok(fs.existsSync(path.join(repo, '.git', 'hooks', f)), `missing .git/hooks/${f}`);
    }
    for (const f of ['commit-msg', 'pre-push']) {
      assert.ok(fs.statSync(path.join(repo, '.git', 'hooks', f)).mode & 0o100, `.git/hooks/${f} not executable`);
    }
    // ...the user's path choice is respected (NOT relocated to .githooks)...
    assert.equal(git(repo, ['config', '--local', '--get', 'core.hooksPath']).stdout.trim(), '.git/hooks');
    // ...and enforcement is actually live at that path.
    const bad = git(repo, ['commit', '--allow-empty', '-m', 'nope not conventional']);
    assert.notEqual(bad.status, 0, 'commit-msg should enforce at the configured path');
    assert.match(bad.stderr, /Conventional Commit/);
  } finally {
    rmrf(tmp);
  }
});

test('git hooks: a foreign hook of the same name is never clobbered (warn-not-clobber)', () => {
  const tmp = mktmp('momentum-githooks-foreign-');
  const repo = path.join(tmp, 'proj');
  fs.mkdirSync(repo);
  git(repo, ['init', '-q']);
  git(repo, ['config', 'core.hooksPath', '.git/hooks']);
  const foreign = '#!/bin/sh\necho "my own hook"\nexit 0\n';
  fs.writeFileSync(path.join(repo, '.git', 'hooks', 'commit-msg'), foreign);
  try {
    const res = runCli(['init', repo, '--agent', 'claude-code']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    // foreign commit-msg left byte-for-byte untouched...
    assert.equal(fs.readFileSync(path.join(repo, '.git', 'hooks', 'commit-msg'), 'utf8'), foreign);
    assert.match(res.stdout, /not momentum's — left untouched/i);
    // ...but pre-push (name was free) still installs.
    assert.ok(fs.existsSync(path.join(repo, '.git', 'hooks', 'pre-push')), 'pre-push should still install');
  } finally {
    rmrf(tmp);
  }
});

test('git hooks: a husky setup is a genuine skip', () => {
  const tmp = mktmp('momentum-githooks-husky-');
  const repo = path.join(tmp, 'proj');
  fs.mkdirSync(repo);
  git(repo, ['init', '-q']);
  fs.mkdirSync(path.join(repo, '.husky'));
  try {
    const res = runCli(['init', repo, '--agent', 'claude-code']);
    assert.equal(res.status, 0, `init failed: ${res.stderr}`);
    assert.match(res.stdout, /uses husky.*skipping/i);
    assert.ok(!fs.existsSync(path.join(repo, '.githooks', 'commit-msg')), 'must not install over husky');
  } finally {
    rmrf(tmp);
  }
});

test('BUG-011: upgrade self-heals a repo missing momentum hooks (idempotent backfill)', () => {
  const { tmp, repo } = setupInstalledRepo();
  try {
    // Simulate a pre-fix install: no momentum hooks present, repo on the git
    // default hooks dir.
    rmrf(path.join(repo, '.githooks'));
    git(repo, ['config', 'core.hooksPath', '.git/hooks']);
    assert.ok(!fs.existsSync(path.join(repo, '.git', 'hooks', 'commit-msg')), 'precondition: no momentum hook yet');
    const res = runCli(['upgrade', repo]);
    assert.equal(res.status, 0, `upgrade failed: ${res.stderr}`);
    for (const f of ['commit-msg', 'pre-push', 'run-check.js', 'contract.js']) {
      assert.ok(fs.existsSync(path.join(repo, '.git', 'hooks', f)), `upgrade should backfill .git/hooks/${f}`);
    }
  } finally {
    rmrf(tmp);
  }
});

test('pre-push: blocks direct push to a protected branch without the sentinel', () => {
  const { tmp, repo } = setupInstalledRepo();
  try {
    const r = runPrePush(repo, `refs/heads/feature ${NZ} refs/heads/main ${NZ}`);
    assert.equal(r.status, 1, 'push to main without sentinel should be blocked');
    assert.match(r.stderr, /protected branch 'main'/);
  } finally {
    rmrf(tmp);
  }
});

test('pre-push: single-use merge-approved sentinel authorizes one push then is consumed', () => {
  const { tmp, repo } = setupInstalledRepo();
  try {
    const sentinel = path.join(repo, '.momentum', 'merge-approved');
    fs.mkdirSync(path.dirname(sentinel), { recursive: true });
    fs.writeFileSync(sentinel, '');
    const ok = runPrePush(repo, `refs/heads/feature ${NZ} refs/heads/main ${NZ}`);
    assert.equal(ok.status, 0, `sentinel should authorize: ${ok.stderr}`);
    assert.ok(!fs.existsSync(sentinel), 'sentinel must be consumed (deleted) on use');
    // second push has no sentinel → blocked again
    const blocked = runPrePush(repo, `refs/heads/feature ${NZ} refs/heads/main ${NZ}`);
    assert.equal(blocked.status, 1, 'sentinel is single-use');
  } finally {
    rmrf(tmp);
  }
});

test('pre-push: non-protected branch pushes freely', () => {
  const { tmp, repo } = setupInstalledRepo();
  try {
    const r = runPrePush(repo, `refs/heads/feature ${NZ} refs/heads/phase-19-x ${NZ}`);
    assert.equal(r.status, 0, `feature-branch push should not be blocked: ${r.stderr}`);
  } finally {
    rmrf(tmp);
  }
});

test('pre-push: release-tag gate — blocks without evidence, allows with evidence', () => {
  const { tmp, repo } = setupInstalledRepo();
  try {
    const retroDir = path.join(repo, 'specs', 'phases', 'phase-x');
    fs.mkdirSync(retroDir, { recursive: true });
    const retro = path.join(retroDir, 'retrospective.md');

    fs.writeFileSync(retro, '# Retrospective\n\n## Verification Evidence\n\n_TBD_\n');
    // empty section (only a placeholder line counts as content? "_TBD_" is a
    // non-blank line, so it passes; use a truly empty section to prove the gate)
    fs.writeFileSync(retro, '# Retrospective\n\n## Verification Evidence\n\n## Next\n');
    const blocked = runPrePush(repo, `refs/tags/v1.0.0 ${NZ} refs/tags/v1.0.0 ${NZ}`);
    assert.equal(blocked.status, 1, 'release tag without evidence should be blocked');
    assert.match(blocked.stderr, /Verification Evidence/);

    fs.writeFileSync(retro, '# Retrospective\n\n## Verification Evidence\n\n```\n$ npm test\n591 passing\n```\n');
    const allowed = runPrePush(repo, `refs/tags/v1.0.0 ${NZ} refs/tags/v1.0.0 ${NZ}`);
    assert.equal(allowed.status, 0, `release tag with evidence should pass: ${allowed.stderr}`);
  } finally {
    rmrf(tmp);
  }
});

test('pre-push: release-tag gate is inert when no retrospective convention is in use', () => {
  const tmp = mktmp('momentum-githooks-noretro-');
  const repo = path.join(tmp, 'proj');
  fs.mkdirSync(repo);
  git(repo, ['init', '-q']);
  // Install only the hooks (no specs/ scaffold) by copying core/git-hooks.
  const dest = path.join(repo, '.githooks');
  fs.cpSync(path.join(REPO_ROOT, 'core', 'git-hooks'), dest, { recursive: true });
  try {
    const r = runPrePush(repo, `refs/tags/v9.9.9 ${NZ} refs/tags/v9.9.9 ${NZ}`);
    assert.equal(r.status, 0, `tag push should pass when no retrospective exists: ${r.stderr}`);
  } finally {
    rmrf(tmp);
  }
});

test('pre-push: escape hatch bypasses all checks', () => {
  const { tmp, repo } = setupInstalledRepo();
  try {
    const r = runPrePush(repo, `refs/heads/feature ${NZ} refs/heads/main ${NZ}`, {
      MOMENTUM_SKIP_HOOKS: '1',
    });
    assert.equal(r.status, 0, 'escape hatch should bypass protected-branch block');
  } finally {
    rmrf(tmp);
  }
});

test("BUG-015: commit-msg accepts the house 'merge: ' subject style alongside git's default", () => {
  const { tmp, repo } = setupInstalledRepo();
  try {
    const house = git(repo, ['commit', '--allow-empty', '-m', 'merge: a → b (v0.25.0)']);
    assert.equal(house.status, 0, `house 'merge: ' subject should pass: ${house.stderr}`);

    const gitDefault = git(repo, ['commit', '--allow-empty', '-m', "Merge branch 'x'"]);
    assert.equal(gitDefault.status, 0, `git-default Merge subject should still pass: ${gitDefault.stderr}`);

    const bad = git(repo, ['commit', '--allow-empty', '-m', 'merged stuff']);
    assert.notEqual(bad.status, 0, "'merged stuff' must still be rejected");
    assert.match(bad.stderr, /Conventional Commit/);
  } finally {
    rmrf(tmp);
  }
});

test('self-repo .githooks/contract.js mirrors the core copy byte-for-byte', () => {
  const core = read(path.join(REPO_ROOT, 'core', 'git-hooks', 'contract.js'));
  const mirrored = read(path.join(REPO_ROOT, '.githooks', 'contract.js'));
  assert.equal(mirrored, core, 'self-repo mirror drifted from core/git-hooks/contract.js');
});
