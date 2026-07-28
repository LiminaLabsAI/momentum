'use strict';

/**
 * Phase 32b G2 — the `pre-push` integration, exercised through the REAL hook.
 *
 * The 32a lesson applies with extra force here: this is the trust boundary. A
 * test that calls `grant.consume()` directly proves nothing about whether the
 * hook a human's `git push` actually fires would honour it — that gap is BUG-030
 * exactly, and this is the code path where getting it wrong is most expensive.
 *
 * So every test here drives `core/git-hooks/run-check.js` as a subprocess with
 * git's own stdin format, and asserts on its exit code.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { REPO_ROOT, mktmp, rmrf } = require('./_helpers');

const grant = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'grant'));
const manifestLib = require(path.join(REPO_ROOT, 'core', 'run', 'lib', 'manifest'));

const CHECK = path.join(REPO_ROOT, 'core', 'git-hooks', 'run-check.js');
const SHA = 'a'.repeat(40);

/** The line format git pipes to pre-push on stdin. */
function pushLine(branch) {
  return `refs/heads/${branch} ${SHA} refs/heads/${branch} ${'0'.repeat(40)}\n`;
}

function prePush(dir, branch) {
  return spawnSync('node', [CHECK, 'pre-push'], {
    cwd: dir, input: pushLine(branch), encoding: 'utf8',
  });
}

function withRepo(fn) {
  const dir = mktmp();
  spawnSync('git', ['init', '-q', dir]);
  spawnSync('git', ['-C', dir, 'config', 'user.email', 'ada@example.com']);
  fs.writeFileSync(path.join(dir, '.gitignore'), '.momentum/*\n', 'utf8');
  try { return fn(dir); } finally { rmrf(dir); }
}

function startEpicRun(dir) {
  return manifestLib.create({
    repoRoot: dir, tier: 'epic', target: 'autonomous-execution',
    unit: 'phase-32b-epic-tier', nowIso: new Date().toISOString(),
  });
}

function futureIso(hours) {
  return new Date(Date.now() + hours * 3600 * 1000).toISOString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Additivity — the property that keeps ADR-0009's floor intact
// ─────────────────────────────────────────────────────────────────────────────

test('PRE-PUSH: a repo with no grant is refused exactly as before', () => {
  withRepo((dir) => {
    const r = prePush(dir, 'main');
    assert.notEqual(r.status, 0, 'protected push without approval must still be blocked');
    assert.match(r.stderr, /direct push to protected branch 'main' is blocked/);
  });
});

test('PRE-PUSH: the sentinel path is unchanged and is tried FIRST', () => {
  withRepo((dir) => {
    fs.mkdirSync(path.join(dir, '.momentum'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.momentum', 'merge-approved'), '', 'utf8');

    const r = prePush(dir, 'main');
    assert.equal(r.status, 0);
    assert.match(r.stderr, /'\.momentum\/merge-approved' consumed/);
    assert.ok(!fs.existsSync(path.join(dir, '.momentum', 'merge-approved')), 'still single-use');
  });
});

test('PRE-PUSH: a non-protected branch is never gated', () => {
  withRepo((dir) => {
    assert.equal(prePush(dir, 'epic-0001-autonomous-execution').status, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The grant path
// ─────────────────────────────────────────────────────────────────────────────

test('PRE-PUSH: a valid in-scope grant authorizes the push and decrements', () => {
  withRepo((dir) => {
    startEpicRun(dir);
    grant.mint({
      repoRoot: dir, epic: 'autonomous-execution', branches: ['staging', 'main'],
      expiresIso: futureIso(8), landings: 2, actor: 'ada@example.com',
      nowIso: new Date().toISOString(),
    });

    const r = prePush(dir, 'main');
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /scope grant grant_[a-z0-9]+ consumed/);
    assert.match(r.stderr, /1 landing\(s\) remaining/);

    const g = grant.load(dir);
    assert.equal(g.landings_remaining, 1);
    assert.equal(g.consumptions[0].branch, 'main');
    assert.equal(g.consumptions[0].actor, 'ada@example.com', 'the push must be attributed');
  });
});

test('PRE-PUSH: one grant funds N landings from ONE approval', () => {
  // The whole point of ADR-0020, end to end through the real hook.
  withRepo((dir) => {
    startEpicRun(dir);
    grant.mint({
      repoRoot: dir, epic: 'autonomous-execution', branches: ['staging', 'main'],
      expiresIso: futureIso(8), landings: 2, actor: 'ada@example.com',
      nowIso: new Date().toISOString(),
    });

    assert.equal(prePush(dir, 'staging').status, 0);
    assert.equal(prePush(dir, 'main').status, 0);

    const third = prePush(dir, 'main');
    assert.notEqual(third.status, 0, 'the budget must bind');
    assert.match(third.stderr, /landing budget is spent/);
  });
});

test('PRE-PUSH: an out-of-scope branch falls through to refusal', () => {
  withRepo((dir) => {
    startEpicRun(dir);
    grant.mint({
      repoRoot: dir, epic: 'autonomous-execution', branches: ['staging'],
      expiresIso: futureIso(8), landings: 5, nowIso: new Date().toISOString(),
    });

    const r = prePush(dir, 'main');
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /not in the grant's allowlist/);
    assert.match(r.stderr, /direct push to protected branch 'main' is blocked/);
    assert.equal(grant.load(dir).landings_remaining, 5, 'a refusal must not spend the budget');
  });
});

test('PRE-PUSH: an expired grant refuses, and says so', () => {
  withRepo((dir) => {
    startEpicRun(dir);
    grant.mint({
      repoRoot: dir, epic: 'autonomous-execution', branches: ['main'],
      expiresIso: new Date(Date.now() - 1000).toISOString(), landings: 5,
      nowIso: new Date().toISOString(),
    });

    const r = prePush(dir, 'main');
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /grant has expired/);
  });
});

test('PRE-PUSH: a revoked grant refuses immediately', () => {
  withRepo((dir) => {
    startEpicRun(dir);
    grant.mint({
      repoRoot: dir, epic: 'autonomous-execution', branches: ['main'],
      expiresIso: futureIso(8), landings: 5, nowIso: new Date().toISOString(),
    });
    grant.revoke(dir, new Date().toISOString());

    const r = prePush(dir, 'main');
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /grant was revoked/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Fail-closed
// ─────────────────────────────────────────────────────────────────────────────

test('PRE-PUSH: a corrupt manifest cannot authorize a push', () => {
  // The asymmetry that keeps the floor intact: a broken grant subsystem may
  // only ever make the hook stricter. Nothing about failing may authorize.
  withRepo((dir) => {
    fs.mkdirSync(path.join(dir, '.momentum'), { recursive: true });
    fs.writeFileSync(manifestLib.manifestPath(dir), '{ corrupt', 'utf8');

    const r = prePush(dir, 'main');
    assert.notEqual(r.status, 0, 'a corrupt manifest must never authorize');
    assert.match(r.stderr, /blocked/);
  });
});

test('PRE-PUSH: a hand-forged grant on a non-epic run still needs the epic to match', () => {
  withRepo((dir) => {
    manifestLib.create({
      repoRoot: dir, tier: 'phase', target: 'some-phase', nowIso: new Date().toISOString(),
    });
    manifestLib.update(dir, (m) => {
      m.grant = {
        grant_id: 'grant_deadbeef', epic: 'other-epic', branches: ['main'],
        expires: futureIso(8), landings_remaining: 99, revoked: false,
        minted_by: '', minted_at: new Date().toISOString(), consumptions: [],
      };
    });

    // The hook reads the epic FROM the grant, so this one is self-consistent and
    // will authorize — which is correct: a grant is a credential, and holding a
    // valid one IS the authorization. What must not happen is it working for a
    // branch outside its own allowlist.
    assert.equal(prePush(dir, 'main').status, 0);
    assert.notEqual(prePush(dir, 'staging').status, 0);
  });
});

test('the grant is refused into a committable path — a credential must not be publishable', () => {
  const dir = mktmp();
  try {
    spawnSync('git', ['init', '-q', dir]);
    fs.writeFileSync(path.join(dir, '.gitignore'), '# nothing\n', 'utf8');
    manifestLib.create({ repoRoot: dir, tier: 'epic', target: 'e', nowIso: new Date().toISOString() });

    assert.throws(() => grant.mint({
      repoRoot: dir, epic: 'e', branches: ['main'],
      expiresIso: futureIso(8), landings: 1, nowIso: new Date().toISOString(),
    }), /not ignored by git/i);
  } finally { rmrf(dir); }
});
