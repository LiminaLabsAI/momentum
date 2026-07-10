'use strict';

/**
 * Phase 30e G4 — the sample third-party contract reader
 * (scripts/read-team-board.js) reads the PUBLISHED coordination surfaces
 * (committed fragments + refs/momentum/*) without importing momentum, and
 * renders the board. Proves the ADR-0014/0015 contract is genuinely consumable.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const { mktmp, rmrf, REPO_ROOT } = require('./_helpers');
const fragments = require('../core/team/lib/fragments');
const teamState = require('../core/ecosystem/lib/team-state');
const lease = require('../core/team/lib/lease');

const READER = path.join(REPO_ROOT, 'scripts', 'read-team-board.js');

function git(cwd, ...a) {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

test('read-team-board renders fragments + refs from the published contract', () => {
  const tmp = mktmp('reader-');
  try {
    const bare = path.join(tmp, 'r.git');
    git(tmp, 'init', '--bare', '-q', '-b', 'main', bare);
    const repo = path.join(tmp, 'repo');
    git(tmp, 'clone', '-q', bare, repo);
    git(repo, 'config', 'user.email', 'a@x');
    git(repo, 'config', 'user.name', 'alice');
    fs.writeFileSync(path.join(repo, '.keep'), 'x');
    git(repo, 'add', '.keep'); git(repo, 'commit', '-q', '-m', 'seed');

    // Fragments: an active-phase row, presence, and a shared active initiative.
    fragments.writeFragment(repo, 'active-phase', 'alice', 'row',
      { branch: 'phase-9-x', phase: '9', status: 'in-progress', progress: 'building' });
    teamState.heartbeat(repo, 'alice', { activity: 'coding' });
    teamState.setActiveInitiative(repo, 'alice', 'big-initiative');

    // Refs: a claim + a lease (ref-CAS against the shared remote).
    const claimLib = require('../core/team/lib/claim');
    claimLib.claimKey(repo, 'phase', '9-x', { actor: 'alice' });
    lease.acquireLease(repo, 'deploy-prod', 'alice');

    const out = spawnSync('node', [READER, repo], { encoding: 'utf8' });
    assert.equal(out.status, 0, out.stderr);
    assert.match(out.stdout, /Active initiative: big-initiative\s+\(set by alice\)/);
    assert.match(out.stdout, /phase-9-x\s+\[alice\]/);
    assert.match(out.stdout, /alice\s+— coding/);
    assert.match(out.stdout, /phase\/9-x\s+→ alice/);
    assert.match(out.stdout, /deploy-prod\s+→ alice/);

    // --json mode is machine-readable.
    const j = spawnSync('node', [READER, repo, '--json'], { encoding: 'utf8' });
    assert.equal(j.status, 0, j.stderr);
    const board = JSON.parse(j.stdout);
    assert.equal(board.activeInitiative.slug, 'big-initiative');
    assert.equal(board.activePhase[0].branch, 'phase-9-x');
    assert.ok(board.leases.find((l) => l.key === 'deploy-prod'));
  } finally {
    rmrf(tmp);
  }
});
