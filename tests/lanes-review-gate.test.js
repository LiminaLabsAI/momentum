'use strict';

/**
 * Phase 30d G1 (ENH-064) — the reviewer≠author gate in `momentum lanes land`.
 * Config-gated (`review_min_approvals`); OFF by default so single-operator
 * behavior is unchanged. When on, a lane can't land on the lander's own approval.
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { mktmp, rmrf, write, runCli } = require('./_helpers');

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}
function makeRepo() {
  const container = mktmp('momentum-review-gate-');
  const dir = path.join(container, 'proj');
  fs.mkdirSync(dir);
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@example.com');
  git(dir, 'config', 'user.name', 'T');
  git(dir, 'config', 'commit.gpgsign', 'false');
  write(path.join(dir, 'README.md'), 'fixture\n');
  git(dir, 'add', '-A'); git(dir, 'commit', '-q', '--no-verify', '-m', 'init');
  return { container, dir };
}
function lane(dir, name, file) {
  git(dir, 'checkout', '-q', '-b', name);
  write(path.join(dir, file), 'x\n');
  git(dir, 'add', '-A'); git(dir, 'commit', '-q', '--no-verify', '-m', `feat: ${name}`);
  git(dir, 'checkout', '-q', 'main');
}
const lanes = (cwd, ...a) => runCli(['lanes', ...a], { cwd });
const mom = (cwd, ...a) => runCli([...a], { cwd });

test('review gate: config on → blocks self-only, passes after a peer approval', () => {
  const { container, dir } = makeRepo();
  try {
    write(path.join(dir, 'specs', 'config.md'),
      '---\ntype: Config\n---\n\n# Config\n\n| Key | Value |\n|-----|-------|\n| review_min_approvals | 1 |\n| branch_flow | main |\n');
    // commit config on main FIRST — otherwise lane()'s `git add -A` sweeps it
    // into the lane branch and it vanishes from main where `land` reads it.
    git(dir, 'add', 'specs/config.md');
    git(dir, 'commit', '-q', '--no-verify', '-m', 'config');
    lane(dir, 'fix/review', 'r.txt');
    assert.equal(lanes(dir, 'open', 'fix/review', '--no-worktree').status, 0);
    assert.equal(lanes(dir, 'done', 'fix-review').status, 0);

    // no peer approval yet → review check FAILS in the checklist
    let res = lanes(dir, 'land', 'fix-review');
    assert.match(res.stdout, /✗ review:.*peer approval/, `expected review-fail line, got:\n${res.stdout}`);

    // a DIFFERENT actor approves
    assert.equal(mom(dir, 'team', 'approve', 'fix-review', '--actor', 'reviewer').status, 0);

    // now the review check PASSES
    res = lanes(dir, 'land', 'fix-review');
    assert.match(res.stdout, /✓ review: 1\/1 approval/, `expected review-pass line, got:\n${res.stdout}`);
  } finally { rmrf(container); }
});

test('review gate: OFF by default (no config key) — no review line, solo unchanged', () => {
  const { container, dir } = makeRepo();
  try {
    lane(dir, 'fix/solo', 's.txt');
    assert.equal(lanes(dir, 'open', 'fix/solo', '--no-worktree').status, 0);
    assert.equal(lanes(dir, 'done', 'fix-solo').status, 0);
    const res = lanes(dir, 'land', 'fix-solo');
    assert.doesNotMatch(res.stdout, /review:/, `review gate must be silent when unconfigured:\n${res.stdout}`);
  } finally { rmrf(container); }
});
