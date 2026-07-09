'use strict';

/**
 * Phase 30a — Team-Walk, Group 4 (distributed e2e).
 *
 * The acceptance scenario: two independent clones against one bare remote can
 * each record coordination + claim concurrently, and after integration both see
 * a consistent, conflict-free shared state with correct attribution — and a
 * contested claim has exactly one winner. Proves the whole git-native plane.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const { mktmp, rmrf, REPO_ROOT } = require('./_helpers');
const compile = require(path.join(REPO_ROOT, 'core', 'team', 'lib', 'compile'));
const claimLib = require(path.join(REPO_ROOT, 'core', 'team', 'lib', 'claim'));

function git(cwd, ...a) { return spawnSync('git', a, { cwd, encoding: 'utf8' }); }

test('Team-Walk e2e: conflict-free fragments + one-winner claim across two clones', () => {
  const tmp = mktmp('team-e2e-');
  try {
    const bare = path.join(tmp, 'remote.git');
    git(tmp, 'init', '--bare', '-q', bare);

    // Clone A (alice) seeds main
    const A = path.join(tmp, 'a');
    git(tmp, 'clone', '-q', bare, A);
    git(A, 'config', 'user.email', 'alice@x'); git(A, 'config', 'user.name', 'Alice');
    fs.writeFileSync(path.join(A, 'README.md'), 'seed\n');
    git(A, 'add', '-A'); git(A, 'commit', '-q', '-m', 'init'); git(A, 'branch', '-M', 'main');
    let p = git(A, 'push', '-q', '-u', 'origin', 'main');
    assert.equal(p.status, 0, `seed push: ${p.stderr}`);

    // Clone B (bob)
    const B = path.join(tmp, 'b');
    git(tmp, 'clone', '-q', bare, B);
    git(B, 'config', 'user.email', 'bob@x'); git(B, 'config', 'user.name', 'Bob');

    // A records its Active-Phase row + pushes
    compile.recordActivePhase(A, 'alice', { branch: 'phase-30a-team-walk', phase: '30a', status: 'in-progress', progress: 'G2' });
    git(A, 'add', '-A'); git(A, 'commit', '-q', '-m', 'a: active-phase');
    p = git(A, 'push', '-q', 'origin', 'main');
    assert.equal(p.status, 0, `A push: ${p.stderr}`);

    // B records its OWN row + commits, then pulls A's commit
    compile.recordActivePhase(B, 'bob', { branch: 'phase-30b-team-run', phase: '30b', status: 'open', progress: 'G0' });
    git(B, 'add', '-A'); git(B, 'commit', '-q', '-m', 'b: active-phase');
    const pull = git(B, 'pull', '--no-rebase', '--no-edit', '-q', 'origin', 'main');
    assert.equal(pull.status, 0, `fragment merge must be conflict-free: ${pull.stderr}`);

    // B's board now shows BOTH rows, correctly attributed
    const rows = compile.activePhaseRows(B);
    assert.equal(rows.length, 2, `expected both rows, got ${rows.map((r) => r.payload.branch)}`);
    assert.deepEqual(rows.map((r) => r.payload.branch).sort(), ['phase-30a-team-walk', 'phase-30b-team-run']);
    const alice = rows.find((r) => r.actor === 'alice');
    assert.ok(alice && alice.payload.status === 'in-progress', 'attribution preserved across the merge');

    // Contested claim is independent + atomic: exactly one wins version 0.37.0
    const ra = claimLib.claimKey(A, 'version', '0.37.0', { actor: 'alice' });
    const rb = claimLib.claimKey(B, 'version', '0.37.0', { actor: 'bob' });
    assert.equal([ra.won, rb.won].filter(Boolean).length, 1, `claim race: A=${ra.won} B=${rb.won}`);
  } finally { rmrf(tmp); }
});
