'use strict';

/**
 * Phase 30d G2 (ENH-064) — the opt-in cross-machine lease fence in swarm.
 *
 * Swarm's wall-clock takeover can double-own a repo under clock skew. With
 * MOMENTUM_SWARM_LEASE_CAS=1 (and a git remote on the ecosystem root), taking
 * over an expired lease must ALSO win a refs/momentum/leases/* compare-and-swap,
 * so a machine that has already fenced the repo blocks a second takeover.
 * OFF by default (covered by the 231 swarm tests staying green).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { mktmp, rmrf } = require('./_helpers');
const manifestLib = require('../core/swarm/lib/manifest');
const conductor = require('../core/swarm/conductor');
const boardLib = require('../core/swarm/lib/board');
const lease = require('../core/team/lib/lease');

function git(cwd, ...a) { return spawnSync('git', a, { cwd, encoding: 'utf8' }); }

function ecoFixture(tmp, sessionId) {
  const eco = {
    name: 'test-eco', version: 1, created: '2026-06-14',
    members: [{ id: 'a', path: 'a', role: 'library' }], dependencies: [],
  };
  fs.writeFileSync(path.join(tmp, 'ecosystem.json'), JSON.stringify(eco, null, 2));
  fs.mkdirSync(path.join(tmp, 'a'), { recursive: true });
  const manifest = conductor.planSwarm({
    ecosystemRoot: tmp, swarmId: '0001-foo', initiative: 'foo',
    impactedRepos: ['a'], phaseSlug: 'phase-1-foo', sessionId, mode: 'checkpoint',
    nowIso: '2026-06-14T17:00:00Z', ecosystemManifest: eco,
  });
  manifestLib.writeManifest(tmp, '0001-foo', manifest);
  boardLib.refreshBoard(tmp, '0001-foo', '2026-06-14T17:00:00Z');
}

function gitInitWithRemote(tmp) {
  const bare = path.join(path.dirname(tmp), `remote-${path.basename(tmp)}.git`);
  spawnSync('git', ['init', '--bare', '-q', bare], { encoding: 'utf8' });
  git(tmp, 'init', '-q', '-b', 'main');
  git(tmp, 'config', 'user.email', 'm@x'); git(tmp, 'config', 'user.name', 'M');
  git(tmp, 'config', 'commit.gpgsign', 'false');
  git(tmp, 'remote', 'add', 'origin', bare);
  fs.writeFileSync(path.join(tmp, '.keep'), 'x');
  git(tmp, 'add', '.keep'); git(tmp, 'commit', '-q', '--no-verify', '-m', 'init');
  git(tmp, 'push', '-q', '-u', 'origin', 'main');
  return bare;
}

test('swarm lease-CAS fence: blocks a takeover when another machine holds the ref-CAS lease', () => {
  const tmp = mktmp('swarm-fence-');
  const bare = gitInitWithRemote(tmp);
  ecoFixture(tmp, 'sess-A');
  manifestLib.updateManifest(tmp, '0001-foo', (m) => {
    m.repos.a.owner = 'sess-A'; m.repos.a.lease_expires_at = '2000-01-01T00:00:00Z';
  });
  // another machine already fenced this repo
  lease.acquireLease(tmp, 'swarm-0001-foo-a', 'other-machine');
  process.env.MOMENTUM_SWARM_LEASE_CAS = '1';
  try {
    assert.throws(() => {
      manifestLib.updateManifestAsOwner({
        ecosystemRoot: tmp, swarmId: '0001-foo', sessionId: 'sess-B', repo: 'a',
        nowIso: '2026-07-10T00:00:00Z',
        mutate: (m) => { m.repos.a.owner = 'sess-B'; m.repos.a.lease_expires_at = '2099-01-01T00:00:00Z'; return m; },
      });
    }, /fenced/, 'takeover must be fenced');
    assert.equal(manifestLib.loadManifest(tmp, '0001-foo').repos.a.owner, 'sess-A', 'manifest unchanged');
  } finally {
    delete process.env.MOMENTUM_SWARM_LEASE_CAS;
    rmrf(tmp); rmrf(bare);
  }
});

test('swarm lease-CAS fence: takeover SUCCEEDS when the ref-CAS lease is free', () => {
  const tmp = mktmp('swarm-fence-');
  const bare = gitInitWithRemote(tmp);
  ecoFixture(tmp, 'sess-A');
  manifestLib.updateManifest(tmp, '0001-foo', (m) => {
    m.repos.a.owner = 'sess-A'; m.repos.a.lease_expires_at = '2000-01-01T00:00:00Z';
  });
  process.env.MOMENTUM_SWARM_LEASE_CAS = '1';
  try {
    manifestLib.updateManifestAsOwner({
      ecosystemRoot: tmp, swarmId: '0001-foo', sessionId: 'sess-B', repo: 'a',
      nowIso: '2026-07-10T00:00:00Z',
      mutate: (m) => { m.repos.a.owner = 'sess-B'; m.repos.a.lease_expires_at = '2099-01-01T00:00:00Z'; return m; },
    });
    assert.equal(manifestLib.loadManifest(tmp, '0001-foo').repos.a.owner, 'sess-B');
  } finally {
    delete process.env.MOMENTUM_SWARM_LEASE_CAS;
    rmrf(tmp); rmrf(bare);
  }
});
