'use strict';

/**
 * Phase 30e G3 — Swarm leases-as-source-of-truth across machines (ADR-0015).
 *
 * Two ecosystem clones share one bare remote. When a remote is present the
 * ref-CAS lease is the DEFAULT source of truth for swarm repo ownership (no
 * env var needed): concurrent takeovers of the same expired lease resolve to
 * exactly one winner, so clock skew cannot double-own. A later takeover of a
 * FRESH lease generation is not wedged by a crashed owner's stale ref
 * (liveness — the CAS key includes the superseded lease generation). With no
 * remote the wall-clock path is byte-unchanged.
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

function gitOk(cwd, ...a) {
  const r = spawnSync('git', a, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')} failed: ${r.stderr}`);
  return r.stdout.trim();
}

/** Build a swarm projection (repo `a`, owned by sess-old, lease expiring `expiry`). */
function buildSwarm(dir, expiry) {
  const eco = {
    name: 'test-eco', version: 1, created: '2026-06-14',
    members: [{ id: 'a', path: 'a', role: 'library' }], dependencies: [],
  };
  fs.writeFileSync(path.join(dir, 'ecosystem.json'), JSON.stringify(eco, null, 2));
  fs.mkdirSync(path.join(dir, 'a'), { recursive: true });
  const manifest = conductor.planSwarm({
    ecosystemRoot: dir, swarmId: '0001-foo', initiative: 'foo',
    impactedRepos: ['a'], phaseSlug: 'phase-1-foo', sessionId: 'sess-old', mode: 'checkpoint',
    nowIso: '2026-06-14T17:00:00Z', ecosystemManifest: eco,
  });
  manifestLib.writeManifest(dir, '0001-foo', manifest);
  manifestLib.updateManifest(dir, '0001-foo', (m) => {
    m.repos.a.owner = 'sess-old';
    m.repos.a.lease_expires_at = expiry;
  });
  boardLib.refreshBoard(dir, '0001-foo', '2026-06-14T17:00:00Z');
}

function twoClones(tmp) {
  const bare = path.join(tmp, 'eco.git');
  gitOk(tmp, 'init', '--bare', '-q', '-b', 'main', bare);
  const A = path.join(tmp, 'A');
  const B = path.join(tmp, 'B');
  for (const d of [A, B]) {
    gitOk(tmp, 'clone', '-q', bare, d);
    gitOk(d, 'config', 'user.email', 'm@x');
    gitOk(d, 'config', 'user.name', 'M');
    gitOk(d, 'config', 'commit.gpgsign', 'false');
    fs.writeFileSync(path.join(d, '.keep'), 'x');
    gitOk(d, 'add', '.keep');
    gitOk(d, 'commit', '-q', '-m', 'seed');
  }
  return { bare, A, B };
}

const takeover = (root, sessionId, nowIso, newExpiry) => manifestLib.updateManifestAsOwner({
  ecosystemRoot: root, swarmId: '0001-foo', sessionId, repo: 'a', nowIso,
  mutate: (m) => { m.repos.a.owner = sessionId; m.repos.a.lease_expires_at = newExpiry; return m; },
});

// ─── skew cannot double-own (default-on: no env var set) ─────────────────────

test('two clones: ref-CAS arbitrates ownership — skew cannot double-own (default-on)', () => {
  const tmp = mktmp('swarm-eco-');
  try {
    const { A, B } = twoClones(tmp);
    const EXP = '2000-01-01T00:00:00Z';
    buildSwarm(A, EXP);
    buildSwarm(B, EXP);

    // No MOMENTUM_SWARM_LEASE_CAS set → default-on because a remote is present.
    assert.equal(process.env.MOMENTUM_SWARM_LEASE_CAS, undefined);

    // Machine A takes over first → wins the CAS, pushes the ref to the shared remote.
    takeover(A, 'sess-A', '2026-07-10T00:00:00Z', '2099-01-01T00:00:00Z');
    assert.equal(manifestLib.loadManifest(A, '0001-foo').repos.a.owner, 'sess-A');

    // Machine B attempts the SAME takeover → fenced by the shared ref-CAS.
    assert.throws(
      () => takeover(B, 'sess-B', '2026-07-10T00:00:01Z', '2099-01-01T00:00:00Z'),
      /fenced/,
      'B must be fenced — no double-own',
    );
    assert.equal(manifestLib.loadManifest(B, '0001-foo').repos.a.owner, 'sess-old',
      'B stays fenced; ownership did not double');

    // Audit keyed by the durable actor: the ref records WHO won.
    assert.equal(lease.leaseOwner(A, `swarm-0001-foo-a-${EXP}`), 'sess-A');
  } finally {
    rmrf(tmp);
  }
});

// ─── liveness: a fresh generation is not wedged by a stale ref ───────────────

test('two clones: a later takeover of a fresh lease generation is not wedged by a stale ref', () => {
  const tmp = mktmp('swarm-eco-');
  try {
    const { A, B } = twoClones(tmp);
    const GEN1 = '2000-01-01T00:00:00Z';
    buildSwarm(A, GEN1);
    buildSwarm(B, GEN1);

    // A takes over generation GEN1 and installs a NEW lease that is ALSO already
    // expired (GEN2, in the past) — simulating A crashing right after takeover.
    const GEN2 = '2001-01-01T00:00:00Z';
    takeover(A, 'sess-A', '2026-07-10T00:00:00Z', GEN2);
    // A now holds the stale ref for GEN1 forever.
    assert.equal(lease.leaseOwner(A, `swarm-0001-foo-a-${GEN1}`), 'sess-A');

    // B's projection reflects A owning with the (now-expired) GEN2 lease.
    manifestLib.updateManifest(B, '0001-foo', (m) => {
      m.repos.a.owner = 'sess-A';
      m.repos.a.lease_expires_at = GEN2;
    });

    // B legitimately takes over GEN2 — a DIFFERENT CAS key than A's stale GEN1
    // ref, so B is not wedged.
    takeover(B, 'sess-B', '2026-07-10T01:00:00Z', '2099-01-01T00:00:00Z');
    assert.equal(manifestLib.loadManifest(B, '0001-foo').repos.a.owner, 'sess-B');
    assert.equal(lease.leaseOwner(B, `swarm-0001-foo-a-${GEN2}`), 'sess-B');
  } finally {
    rmrf(tmp);
  }
});

// ─── single-machine (no remote) is byte-unchanged: no CAS, wall-clock governs ─

test('single-machine (no remote): expired-lease takeover uses the wall-clock path, no CAS', () => {
  const tmp = mktmp('swarm-solo-');
  try {
    // Not even a git repo → `git remote` fails → fence inactive (as the other 230
    // swarm tests). Wall-clock lease alone governs.
    buildSwarm(tmp, '2000-01-01T00:00:00Z');
    takeover(tmp, 'sess-B', '2026-07-10T00:00:00Z', '2099-01-01T00:00:00Z');
    assert.equal(manifestLib.loadManifest(tmp, '0001-foo').repos.a.owner, 'sess-B');
    // No coordination refs were created.
    assert.equal(fs.existsSync(path.join(tmp, '.git')), false);
  } finally {
    rmrf(tmp);
  }
});
